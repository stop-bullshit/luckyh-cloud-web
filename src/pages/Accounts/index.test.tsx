import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AccountBalanceLog, PageData } from '@/services/luckyh';

const api = vi.hoisted(() => ({
  getAccounts: vi.fn(),
  getAccountBalanceLogs: vi.fn(),
  getManagedUsers: vi.fn(),
  rechargeAccount: vi.fn(),
  deductAccount: vi.fn(),
}));

vi.mock('@/services/luckyh', () => api);

vi.mock('@ant-design/pro-components', async () => {
  const React = await import('react');

  function ProTable({
    request,
    actionRef,
    columns,
    locale,
    pagination,
    headerTitle,
    search,
  }: any) {
    const [records, setRecords] = React.useState<any[]>([]);
    const [username, setUsername] = React.useState('');
    const mounted = React.useRef(false);
    const sequence = React.useRef(0);
    const requestRef = React.useRef(request);
    requestRef.current = request;
    const page = React.useRef<{
      current: number;
      pageSize: number;
      username?: string;
    }>({
      current: 1,
      pageSize: pagination.defaultPageSize,
    });
    const load = async () => {
      const currentSequence = ++sequence.current;
      const result = await requestRef.current(page.current);
      if (
        mounted.current &&
        currentSequence === sequence.current &&
        result.success
      )
        setRecords(result.data);
    };
    React.useImperativeHandle(actionRef, () => ({ reload: load }));
    React.useEffect(() => {
      mounted.current = true;
      void load();
      return () => {
        mounted.current = false;
      };
    }, []);
    return (
      <div
        data-testid={search === false ? 'balance-log-table' : 'account-table'}
      >
        <div>{headerTitle}</div>
        {search !== false && (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              page.current = { ...page.current, current: 1, username };
              void load();
            }}
          >
            <input
              aria-label="登录用户名"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
            <button type="submit">查询</button>
          </form>
        )}
        <table>
          <tbody>
            {records.map((record) => (
              <tr
                key={record.id || record.userId}
                data-testid={
                  search === false ? undefined : `account-row-${record.userId}`
                }
              >
                {columns.map((column: any) => (
                  <td key={column.dataIndex || column.title}>
                    {column.render
                      ? column.render(record[column.dataIndex], record)
                      : column.valueEnum?.[String(record[column.dataIndex])] ||
                        record[column.dataIndex]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {records.length === 0 && <div>{locale.emptyText}</div>}
        <button
          type="button"
          onClick={() => {
            page.current = { ...page.current, current: 2 };
            void load();
          }}
        >
          下一页
        </button>
        <select
          aria-label="每页条数"
          defaultValue={pagination.defaultPageSize}
          onChange={(event) => {
            page.current = {
              ...page.current,
              current: 1,
              pageSize: Number(event.target.value),
            };
            void load();
          }}
        >
          {pagination.pageSizeOptions.map((size: number) => (
            <option value={size} key={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return {
    PageContainer: ({ children }: any) => <div>{children}</div>,
    ProFormDigit: () => null,
    ModalForm: ({ title, open, onFinish, onOpenChange }: any) =>
      open ? (
        <div role="dialog" aria-label={title}>
          <button
            type="button"
            onClick={async () => {
              if (await onFinish({ amount: 1.23 })) onOpenChange(false);
            }}
          >
            确认操作
          </button>
        </div>
      ) : null,
    ProTable,
  };
});

import Accounts from './index';

function page(records: AccountBalanceLog[] = []): PageData<AccountBalanceLog> {
  return { records, total: records.length, current: 1, size: 10 };
}

const debit: AccountBalanceLog = {
  id: 2,
  userId: 1,
  changeType: 'DEBIT',
  changeAmount: '-0.01',
  beforeBalance: '9999999999999999.99',
  afterBalance: '9999999999999999.98',
  orderNo: 'ORDER_2',
  transactionId: 'transaction-2',
  createTime: '2026-10-04T11:49:00',
};

async function selectAccount(userId: number) {
  return screen.findByTestId(`account-row-${userId}`);
}

async function openLogs(userId = 1) {
  const row = await selectAccount(userId);
  fireEvent.click(within(row).getByRole('button', { name: '余额明细' }));
  await waitFor(() => expect(api.getAccountBalanceLogs).toHaveBeenCalled());
}

describe('账户余额明细', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getManagedUsers.mockResolvedValue({
      records: [
        { id: 1, username: 'user1', realName: '用户一' },
        { id: 2, username: 'user2', realName: '用户二' },
      ],
      total: 2,
      current: 1,
      size: 10,
    });
    api.getAccounts.mockImplementation(async (ids: number[]) =>
      ids.map((userId) => ({ userId, balance: 100, updateTime: null })),
    );
    api.getAccountBalanceLogs.mockResolvedValue(page());
    api.rechargeAccount.mockResolvedValue('充值成功');
    api.deductAccount.mockResolvedValue('扣减成功');
  });

  afterEach(cleanup);

  it('进入自动展示用户和余额，每页只批量查询一次，未开户用户可充值或查看明细', async () => {
    api.getAccounts.mockResolvedValue([
      { userId: 1, balance: 100, updateTime: '2026-10-04T15:50:00' },
      { userId: 2, balance: 0, updateTime: null },
    ]);
    render(<Accounts />);
    const first = await selectAccount(1);
    const second = await selectAccount(2);
    expect(first).toHaveTextContent('user1用户一¥100.00');
    expect(second).toHaveTextContent('user2用户二¥0.00尚未发生余额变动');
    expect(api.getManagedUsers).toHaveBeenCalledExactlyOnceWith({
      current: 1,
      size: 10,
      username: undefined,
    });
    expect(api.getAccounts).toHaveBeenCalledExactlyOnceWith([1, 2]);
    expect(
      within(second).getByRole('button', { name: /充\s*值/ }),
    ).toBeEnabled();
    expect(
      within(second).getByRole('button', { name: '扣减余额' }),
    ).toBeDisabled();
    expect(
      within(second).getByRole('button', { name: '余额明细' }),
    ).toBeEnabled();
    expect(api.getAccountBalanceLogs).not.toHaveBeenCalled();
  });

  it('用户名搜索与服务端分页一致，每页至多100条，空结果不调用批量接口', async () => {
    render(<Accounts />);
    await selectAccount(1);
    const table = screen.getByTestId('account-table');
    fireEvent.change(
      within(table).getByRole('textbox', { name: '登录用户名' }),
      { target: { value: 'user2' } },
    );
    fireEvent.click(within(table).getByRole('button', { name: '查询' }));
    await waitFor(() =>
      expect(api.getManagedUsers).toHaveBeenLastCalledWith({
        current: 1,
        size: 10,
        username: 'user2',
      }),
    );
    await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(2));
    fireEvent.click(within(table).getByRole('button', { name: '下一页' }));
    await waitFor(() =>
      expect(api.getManagedUsers).toHaveBeenLastCalledWith({
        current: 2,
        size: 10,
        username: 'user2',
      }),
    );
    await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(3));
    fireEvent.change(
      within(table).getByRole('combobox', { name: '每页条数' }),
      { target: { value: '100' } },
    );
    await waitFor(() =>
      expect(api.getManagedUsers).toHaveBeenLastCalledWith({
        current: 1,
        size: 100,
        username: 'user2',
      }),
    );
    await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(4));
    api.getManagedUsers.mockResolvedValue({
      records: [],
      total: 0,
      current: 1,
      size: 100,
    });
    fireEvent.click(within(table).getByRole('button', { name: '查询' }));
    await within(table).findByText('暂无符合条件的用户');
    expect(api.getAccounts).toHaveBeenCalledTimes(4);
  });

  it.each([
    'failed',
    'missing',
  ] as const)('批量余额%s时不显示伪造的零余额，整页可重试', async (scenario) => {
    if (scenario === 'failed')
      api.getAccounts.mockRejectedValueOnce(new Error('余额服务不可用'));
    else api.getAccounts.mockResolvedValueOnce([{ userId: 1, balance: 100 }]);
    render(<Accounts />);
    expect(await screen.findByText('账户列表加载失败')).toBeVisible();
    expect(screen.queryByText('¥0.00')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    await selectAccount(2);
    expect(screen.queryByText('账户列表加载失败')).not.toBeInTheDocument();
  });

  it('新列表分页已成功时，上一批量请求迟到失败不会隐藏当前余额', async () => {
    let rejectFirst!: (reason: Error) => void;
    api.getAccounts
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValue([
        { userId: 1, balance: 120 },
        { userId: 2, balance: 80 },
      ]);
    render(<Accounts />);
    await waitFor(() => expect(api.getAccounts).toHaveBeenCalledTimes(1));
    fireEvent.click(
      within(screen.getByTestId('account-table')).getByRole('button', {
        name: '下一页',
      }),
    );
    const row = await selectAccount(1);
    expect(row).toHaveTextContent('¥120.00');
    await act(async () => rejectFirst(new Error('上一页批量余额失败')));
    expect(screen.queryByText('账户列表加载失败')).not.toBeInTheDocument();
    expect(row).toHaveTextContent('¥120.00');
  });

  it('点击才加载当前账户明细，并准确显示大额分位、带符号金额和空关联号', async () => {
    api.getAccountBalanceLogs.mockResolvedValue(
      page([
        debit,
        {
          ...debit,
          id: 1,
          changeType: 'RECHARGE',
          changeAmount: '10.00',
          orderNo: null,
          transactionId: null,
        },
      ]),
    );
    render(<Accounts />);
    await selectAccount(1);
    expect(api.getAccountBalanceLogs).not.toHaveBeenCalled();
    await openLogs();
    expect(api.getAccountBalanceLogs).toHaveBeenCalledWith(1, {
      current: 1,
      size: 10,
    });
    const table = screen.getByTestId('balance-log-table');
    await within(table).findByText('-¥0.01');
    expect(within(table).getByText('+¥10.00')).toBeVisible();
    expect(
      within(table).getAllByText('¥9,999,999,999,999,999.99'),
    ).toHaveLength(2);
    expect(
      within(table).getAllByText('¥9,999,999,999,999,999.98'),
    ).toHaveLength(2);
    const rows = within(table).getAllByRole('row');
    expect(rows[0]).toHaveTextContent('订单扣款');
    expect(rows[1]).toHaveTextContent('充值');
    expect(within(rows[1]).getAllByText('—')).toHaveLength(2);
  });

  it('服务端分页传current和size，每页最多选择100条', async () => {
    render(<Accounts />);
    await selectAccount(1);
    await openLogs();
    const table = screen.getByTestId('balance-log-table');
    fireEvent.click(within(table).getByRole('button', { name: '下一页' }));
    await waitFor(() =>
      expect(api.getAccountBalanceLogs).toHaveBeenLastCalledWith(1, {
        current: 2,
        size: 10,
      }),
    );
    const size = within(table).getByRole('combobox', { name: '每页条数' });
    expect(
      within(size)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['10', '20', '50', '100']);
    fireEvent.change(size, { target: { value: '100' } });
    await waitFor(() =>
      expect(api.getAccountBalanceLogs).toHaveBeenLastCalledWith(1, {
        current: 1,
        size: 100,
      }),
    );
  });

  it('失败提示可重试，成功无记录时明确只记录启用后的变动', async () => {
    api.getAccountBalanceLogs.mockRejectedValueOnce(new Error('服务暂不可用'));
    render(<Accounts />);
    await selectAccount(1);
    await openLogs();
    expect(await screen.findByText('余额明细加载失败')).toBeVisible();
    expect(
      screen.getByText('暂无余额明细，仅记录功能启用后的余额变动'),
    ).not.toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: /重\s*试/ }));
    await waitFor(() =>
      expect(api.getAccountBalanceLogs).toHaveBeenCalledTimes(2),
    );
    await waitFor(() =>
      expect(screen.queryByText('余额明细加载失败')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText('暂无余额明细，仅记录功能启用后的余额变动'),
    ).toBeVisible();
  });

  it('切换用户卸载旧明细，旧请求失败不会覆盖新用户结果', async () => {
    let rejectOld!: (reason: Error) => void;
    api.getAccountBalanceLogs
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectOld = reject;
          }),
      )
      .mockResolvedValue(
        page([{ ...debit, userId: 2, orderNo: 'ORDER_USER_2' }]),
      );
    render(<Accounts />);
    await selectAccount(1);
    await openLogs();
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(screen.queryByTestId('balance-log-table')).not.toBeInTheDocument();
    await openLogs(2);
    await screen.findByText('ORDER_USER_2');
    await act(async () => rejectOld(new Error('旧请求失败')));
    expect(screen.queryByText('余额明细加载失败')).not.toBeInTheDocument();
    expect(screen.getByText('ORDER_USER_2')).toBeVisible();
    expect(api.getAccountBalanceLogs).toHaveBeenLastCalledWith(2, {
      current: 1,
      size: 10,
    });
  });

  it('同一用户的新分页成功后，上一请求迟到失败不会隐藏新结果', async () => {
    let rejectFirst!: (reason: Error) => void;
    api.getAccountBalanceLogs
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectFirst = reject;
          }),
      )
      .mockResolvedValue(page([{ ...debit, orderNo: 'FIXTURE_LATEST_PAGE' }]));
    render(<Accounts />);
    await selectAccount(1);
    await openLogs();
    fireEvent.click(
      within(screen.getByTestId('balance-log-table')).getByRole('button', {
        name: '下一页',
      }),
    );
    await screen.findByText('FIXTURE_LATEST_PAGE');
    await act(async () => rejectFirst(new Error('上一请求迟到失败')));
    expect(screen.queryByText('余额明细加载失败')).not.toBeInTheDocument();
    expect(screen.getByText('FIXTURE_LATEST_PAGE')).toBeVisible();
    expect(api.getAccountBalanceLogs).toHaveBeenLastCalledWith(1, {
      current: 2,
      size: 10,
    });
  });

  it('新明细分页已展示后，上一页迟到成功也不能覆盖当前记录', async () => {
    let resolveFirst!: (result: PageData<AccountBalanceLog>) => void;
    api.getAccountBalanceLogs
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockResolvedValue(page([{ ...debit, orderNo: 'FIXTURE_NEW_PAGE' }]));
    render(<Accounts />);
    await openLogs();
    const table = screen.getByTestId('balance-log-table');
    fireEvent.click(within(table).getByRole('button', { name: '下一页' }));
    await screen.findByText('FIXTURE_NEW_PAGE');
    await act(async () =>
      resolveFirst(page([{ ...debit, orderNo: 'FIXTURE_OLD_PAGE' }])),
    );
    expect(screen.getByText('FIXTURE_NEW_PAGE')).toBeVisible();
    expect(screen.queryByText('FIXTURE_OLD_PAGE')).not.toBeInTheDocument();
  });

  it.each([
    ['充值', 'rechargeAccount'],
    ['扣减余额', 'deductAccount'],
  ] as const)('%s成功后刷新已打开的明细', async (button, operation) => {
    render(<Accounts />);
    await selectAccount(2);
    await openLogs(2);
    const row = screen.getByTestId('account-row-2');
    fireEvent.click(
      within(row).getByRole('button', {
        name: button === '充值' ? /充\s*值/ : button,
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '确认操作' }));
    await waitFor(() => expect(api[operation]).toHaveBeenCalledWith(2, 1.23));
    await waitFor(() =>
      expect(api.getAccountBalanceLogs).toHaveBeenCalledTimes(2),
    );
    expect(api.getAccounts).toHaveBeenCalledTimes(2);
  });
});
