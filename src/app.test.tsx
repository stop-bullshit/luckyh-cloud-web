import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  history: {
    location: {
      pathname: '/business/orders',
      search: '?page=2',
      hash: '#list',
    },
    replace: vi.fn(),
  },
  getCurrentUser: vi.fn(),
  readSession: vi.fn(),
  clearSession: vi.fn(),
  error: vi.fn(),
}));

vi.mock('@umijs/max', () => ({
  history: mocks.history,
  Link: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('@/services/luckyh', () => ({ getCurrentUser: mocks.getCurrentUser }));
vi.mock('@/utils/session', () => ({
  readSession: mocks.readSession,
  clearSession: mocks.clearSession,
}));
vi.mock('@/components/Feedback', () => ({
  default: ({ children }: { children: ReactNode }) => children,
  feedback: { showError: mocks.error },
}));
vi.mock('@/components', () => ({
  AvatarDropdown: () => null,
  DocLink: () => null,
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
  Footer: () => null,
  LangDropdown: () => null,
  OfflineBanner: () => null,
  VersionDropdown: () => null,
}));
vi.mock('@ant-design/pro-components', () => ({ SettingDrawer: () => null }));
vi.mock('@ant-design/icons', () => ({ LinkOutlined: () => null }));
vi.mock('./requestErrorConfig', () => ({ errorConfig: {} }));
vi.mock('../config/defaultSettings', () => ({
  default: { navTheme: 'light' },
}));

import { getInitialState, layout } from './app';

describe('初始用户信息与登录跳转', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.readSession.mockReturnValue({
      accessToken: 'token',
      expiresAt: Date.now() + 60000,
    });
    mocks.history.location = {
      pathname: '/business/orders',
      search: '?page=2',
      hash: '#list',
    };
  });

  it('有会话时读取当前用户并转换字段', async () => {
    mocks.getCurrentUser.mockResolvedValue({
      id: 7,
      username: 'admin',
      realName: '管理员',
      userType: 1,
    });
    const state = await getInitialState();
    expect(mocks.getCurrentUser).toHaveBeenCalledWith({
      skipErrorHandler: true,
    });
    expect(state.currentUser).toMatchObject({
      userid: '7',
      name: '管理员',
      access: 'admin',
    });
    expect(state.settings).toEqual({ navTheme: 'light' });
    expect(mocks.history.replace).not.toHaveBeenCalled();
  });

  it('本地无会话时跳登录并保留回跳地址', async () => {
    mocks.readSession.mockReturnValue(undefined);
    const state = await getInitialState();
    expect(state.currentUser).toBeUndefined();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    expect(mocks.history.replace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/business/orders?page=2#list')}`,
    );
  });

  it.each([
    { code: 401 },
    { response: { status: 401 } },
  ])('明确 401 时清理会话并跳登录：%o', async (failure) => {
    mocks.getCurrentUser.mockRejectedValue(
      Object.assign(new Error('unauthorized'), failure),
    );
    const state = await getInitialState();
    expect(state.currentUser).toBeUndefined();
    expect(mocks.clearSession).toHaveBeenCalledOnce();
    expect(mocks.history.replace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/business/orders?page=2#list')}`,
    );
    expect(mocks.error).not.toHaveBeenCalled();
  });

  it('503 显示后端消息并保留会话', async () => {
    mocks.getCurrentUser.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        response: { status: 503, data: { message: '认证服务不可用' } },
      }),
    );
    const state = await getInitialState();
    expect(state.currentUser).toBeUndefined();
    expect(mocks.error).toHaveBeenCalledWith({
      key: 'user-info-error',
      content: '认证服务不可用',
    });
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.history.replace).not.toHaveBeenCalled();
  });

  it('504 显示超时并保留会话', async () => {
    mocks.getCurrentUser.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        response: { status: 504 },
      }),
    );
    await getInitialState();
    expect(mocks.error).toHaveBeenCalledWith({
      key: 'user-info-error',
      content: '请求超时，请稍后重试',
    });
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.history.replace).not.toHaveBeenCalled();
  });

  it.each([
    {
      error: new Error('Network Error'),
      content: '连接服务失败，请确认后端已启动后重试',
    },
    {
      error: Object.assign(new Error('timeout'), { code: 'ECONNABORTED' }),
      content: '请求超时，请稍后重试',
    },
  ])('网络故障与超时不登出：$content', async ({ error, content }) => {
    mocks.getCurrentUser.mockRejectedValue(error);
    await getInitialState();
    expect(mocks.error).toHaveBeenCalledWith({
      key: 'user-info-error',
      content,
    });
    expect(mocks.clearSession).not.toHaveBeenCalled();
    expect(mocks.history.replace).not.toHaveBeenCalled();
  });

  it('有会话但暂未取到用户信息时切换页面不跳登录', () => {
    const config = layout({
      initialState: { currentUser: undefined },
      loading: false,
      error: undefined,
      refresh: vi.fn(),
      setInitialState: vi.fn(),
    });
    config.onPageChange?.();
    expect(mocks.history.replace).not.toHaveBeenCalled();
  });

  it('页面切换时会话失效才跳登录', () => {
    mocks.readSession.mockReturnValue(undefined);
    const config = layout({
      initialState: { currentUser: undefined },
      loading: false,
      error: undefined,
      refresh: vi.fn(),
      setInitialState: vi.fn(),
    });
    config.onPageChange?.();
    expect(mocks.history.replace).toHaveBeenCalledWith(
      `/user/login?redirect=${encodeURIComponent('/business/orders?page=2#list')}`,
    );
  });

  it('登录页获取用户资料失败不误报密码错误或强制重定向', async () => {
    mocks.history.location.pathname = '/user/login';
    const state = await getInitialState();
    expect(mocks.getCurrentUser).not.toHaveBeenCalled();
    mocks.getCurrentUser.mockRejectedValue(
      Object.assign(new Error('Request failed'), {
        response: { status: 503 },
      }),
    );
    expect(await state.fetchUserInfo?.()).toBeUndefined();
    expect(mocks.error).toHaveBeenCalledWith({
      key: 'user-info-error',
      content: '服务暂时不可用，请稍后重试',
    });
    expect(mocks.history.replace).not.toHaveBeenCalled();
    expect(mocks.clearSession).not.toHaveBeenCalled();
  });
});
