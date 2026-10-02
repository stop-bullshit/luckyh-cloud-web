import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/Feedback', () => ({
  feedback: { message: { error: vi.fn(), warning: vi.fn() } },
}));

vi.mock('@umijs/max', () => ({
  history: {
    location: { pathname: '/business/orders', search: '' },
    replace: vi.fn(),
  },
}));

import { history } from '@umijs/max';
import { feedback } from '@/components/Feedback';
import { errorConfig } from './requestErrorConfig';

describe('请求错误提示', () => {
  const handler = errorConfig.errorConfig?.errorHandler;

  beforeEach(() => vi.clearAllMocks());

  it('优先显示后端 HTTP 错误消息', () => {
    if (!handler) throw new Error('缺少请求错误处理器');
    handler(
      Object.assign(new Error('Request failed'), {
        response: { status: 503, data: { message: '订单服务不可用' } },
      }),
      {},
    );
    expect(feedback.message?.error).toHaveBeenCalledWith({
      key: 'request-error',
      content: '订单服务不可用',
    });
  });

  it.each([
    [500, '服务处理失败，请稍后重试'],
    [503, '服务暂不可用，请稍后重试'],
    [504, '请求超时，请稍后重试'],
    [502, '请求失败（HTTP 502）'],
  ])('HTTP %i 无后端消息时显示相应提示', (status, content) => {
    if (!handler) throw new Error('缺少请求错误处理器');
    handler(
      Object.assign(new Error('Request failed'), {
        response: { status, data: {} },
      }),
      {},
    );
    expect(feedback.message?.error).toHaveBeenCalledWith({
      key: 'request-error',
      content,
    });
  });

  it('无响应的网络错误显示连接失败', () => {
    if (!handler) throw new Error('缺少请求错误处理器');
    handler(new Error('Network Error'), {});
    expect(feedback.message?.error).toHaveBeenCalledWith({
      key: 'request-error',
      content: '连接服务失败，请确认后端已启动后重试',
    });
  });

  it.each([
    'ECONNABORTED',
    'ETIMEDOUT',
  ])('无响应的浏览器超时 %s 显示超时提示', (code) => {
    if (!handler) throw new Error('缺少请求错误处理器');
    handler(Object.assign(new Error('timeout'), { code }), {});
    expect(feedback.message?.error).toHaveBeenCalledWith({
      key: 'request-error',
      content: '请求超时，请稍后重试',
    });
  });

  it('业务错误仍显示业务消息', () => {
    if (!handler) throw new Error('缺少请求错误处理器');
    handler(
      Object.assign(new Error('订单已经支付'), { name: 'BusinessError' }),
      {},
    );
    expect(feedback.message?.error).toHaveBeenCalledWith({
      key: 'request-error',
      content: '订单已经支付',
    });
  });

  it('HTTP 401 仍跳转登录且只显示过期提示', () => {
    if (!handler) throw new Error('缺少请求错误处理器');
    handler(
      Object.assign(new Error('Unauthorized'), {
        response: { status: 401, data: {} },
      }),
      {},
    );
    expect(history.replace).toHaveBeenCalledWith(
      '/user/login?redirect=%2Fbusiness%2Forders',
    );
    expect(feedback.message?.warning).toHaveBeenCalledWith({
      key: 'session-expired',
      content: '登录已失效，请重新登录',
    });
    expect(feedback.message?.error).not.toHaveBeenCalled();
  });
});

describe('后端业务状态码', () => {
  const interceptor = errorConfig.responseInterceptors?.[0];

  it('HTTP 200 中的业务失败仍会被拒绝', () => {
    if (typeof interceptor !== 'function')
      throw new Error('缺少业务响应拦截器');
    const response = {
      data: { code: 500, message: '订单已经支付', data: null },
    };
    expect(() => interceptor(response as never)).toThrow('订单已经支付');
  });

  it('后端不含 success 字段的正常响应能够通过', () => {
    if (typeof interceptor !== 'function')
      throw new Error('缺少业务响应拦截器');
    const response = { data: { code: 200, message: 'success', data: 1 } };
    expect(interceptor(response as never)).toBe(response);
  });

  it('兼容原版示例 success 为 false 的错误响应', () => {
    const thrower = errorConfig.errorConfig?.errorThrower;
    if (!thrower) throw new Error('缺少原版错误响应处理');
    expect(() =>
      thrower({ success: false, errorCode: 500, errorMessage: '示例请求失败' }),
    ).toThrow('示例请求失败');
  });
});
