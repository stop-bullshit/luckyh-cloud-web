import { describe, expect, it, vi } from 'vitest';
import { getAccountBalanceLogs, getAccounts } from '@/services/luckyh';

const request = vi.hoisted(() => vi.fn());
vi.mock('@umijs/max', () => ({ request }));

describe('余额明细API', () => {
  it('当前页用户仅发送一次逗号分隔的批量余额请求', async () => {
    const data = [
      { userId: 1, balance: 100, updateTime: '2026-10-04T15:50:00' },
      { userId: 2, balance: 0, updateTime: null },
    ];
    request.mockResolvedValueOnce({ code: 200, message: 'success', data });
    expect(await getAccounts([1, 2])).toBe(data);
    expect(request).toHaveBeenCalledWith('/api/account/accounts/batch', {
      params: { ids: '1,2' },
    });
  });

  it('使用共享REST路径和分页参数，保留后端金额字符串', async () => {
    const data = {
      records: [
        { id: 1, changeAmount: '-0.01', afterBalance: '9999999999999999.98' },
      ],
      total: 1,
      size: 10,
      current: 2,
      pages: 1,
    };
    request.mockResolvedValueOnce({ code: 200, message: 'success', data });
    const result = await getAccountBalanceLogs(123, { current: 2, size: 10 });
    expect(request).toHaveBeenCalledWith(
      '/api/account/accounts/123/balance-logs',
      {
        params: { current: 2, size: 10 },
      },
    );
    expect(result).toBe(data);
    expect(result.records[0].afterBalance).toBe('9999999999999999.98');
  });
});
