import { describe, expect, it, vi } from 'vitest';

vi.mock('@umijs/max', () => ({
  history: {
    location: { pathname: '/business/orders', search: '' },
    replace: vi.fn(),
  },
}));

import { errorConfig } from './requestErrorConfig';

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
