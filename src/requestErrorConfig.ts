import type { RequestOptions } from '@@/plugin-request/request';
import type { RequestConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { feedback } from '@/components/Feedback';
import type { ApiResult } from '@/services/luckyh';
import { clearSession, readSession } from '@/utils/session';

type RequestFailure = Error & {
  code?: number;
  response?: {
    status: number;
    data?: { message?: string; errorMessage?: string };
  };
  request?: unknown;
};

export const errorConfig: RequestConfig = {
  timeout: 15000,
  errorConfig: {
    errorThrower: (result) => {
      const failure = result as { errorCode?: number; errorMessage?: string };
      throw Object.assign(
        new Error(failure.errorMessage || '操作失败，请重试'),
        {
          name: 'BusinessError',
          code: failure.errorCode,
        },
      );
    },
    errorHandler: (requestError, options) => {
      const error = requestError as RequestFailure;
      const unauthorized = error.code === 401 || error.response?.status === 401;
      if (unauthorized && !history.location.pathname.startsWith('/user/')) {
        clearSession();
        const redirect = history.location.pathname + history.location.search;
        history.replace(`/user/login?redirect=${encodeURIComponent(redirect)}`);
        feedback.message?.warning({
          key: 'session-expired',
          content: '登录已失效，请重新登录',
        });
        if (!options?.skipErrorHandler) return;
      }
      if (options?.skipErrorHandler) throw error;
      const content =
        error.response?.data?.message ||
        error.response?.data?.errorMessage ||
        (error.name === 'BusinessError'
          ? error.message
          : '连接服务失败，请确认后端已启动后重试');
      feedback.message?.error({ key: 'request-error', content });
    },
  },
  requestInterceptors: [
    (config: RequestOptions) => {
      const session = readSession();
      if (session)
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${session.accessToken}`,
        };
      return config;
    },
  ],
  responseInterceptors: [
    (response) => {
      const result = response.data as ApiResult<unknown>;
      if (typeof result.code === 'number' && result.code !== 200) {
        throw Object.assign(new Error(result.message || '操作失败，请重试'), {
          name: 'BusinessError',
          code: result.code,
        });
      }
      return response;
    },
  ],
};
