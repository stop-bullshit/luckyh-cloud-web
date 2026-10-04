import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProTable,
} from '@ant-design/pro-components';
import { Alert, Button, Drawer, message, Space, Typography } from 'antd';
import { useRef, useState } from 'react';
import {
  type AccountBalance,
  type AccountBalanceLog,
  deductAccount,
  getAccountBalanceLogs,
  getAccounts,
  getManagedUsers,
  type ManagedUser,
  rechargeAccount,
} from '@/services/luckyh';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});

type AccountRow = AccountBalance & Pick<ManagedUser, 'username' | 'realName'>;

// 逻辑变动: 余额明细查看-20261004-1149-01
// 明细金额保留后端十进制字符串，避免大额余额转换为浮点数后丢失分位。
function formatBalanceAmount(amount: string) {
  const negative = amount.startsWith('-');
  const [integer, fraction] = (negative ? amount.slice(1) : amount).split('.');
  return `${negative ? '-' : ''}¥${integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${fraction}`;
}

const balanceLogColumns: ProColumns<AccountBalanceLog>[] = [
  { title: '时间', dataIndex: 'createTime', width: 190 },
  {
    title: '类型',
    dataIndex: 'changeType',
    width: 110,
    valueEnum: {
      RECHARGE: '充值',
      DEDUCT: '管理扣减',
      DEBIT: '订单扣款',
      CREDIT: '订单退款',
    },
  },
  {
    title: '变动金额',
    dataIndex: 'changeAmount',
    width: 180,
    render: (_, record) => {
      const deducted = record.changeAmount.startsWith('-');
      return (
        <Typography.Text type={deducted ? 'danger' : 'success'}>
          {deducted ? '' : '+'}
          {formatBalanceAmount(record.changeAmount)}
        </Typography.Text>
      );
    },
  },
  {
    title: '变动前余额',
    dataIndex: 'beforeBalance',
    width: 180,
    render: (_, record) => formatBalanceAmount(record.beforeBalance),
  },
  {
    title: '变动后余额',
    dataIndex: 'afterBalance',
    width: 180,
    render: (_, record) => formatBalanceAmount(record.afterBalance),
  },
  {
    title: '订单号',
    dataIndex: 'orderNo',
    width: 260,
    render: (_, record) => record.orderNo || '—',
  },
  {
    title: '事务号',
    dataIndex: 'transactionId',
    width: 300,
    render: (_, record) => record.transactionId || '—',
  },
];

// 逻辑变动: 余额管理列表操作-20261004-1210-01
export default function Accounts() {
  const [account, setAccount] = useState<AccountRow>();
  const [listError, setListError] = useState(false);
  const actionRef = useRef<ActionType | null>(null);
  const listRequestSequence = useRef(0);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logsError, setLogsError] = useState(false);
  const logsActionRef = useRef<ActionType | null>(null);
  const logsGeneration = useRef(0);
  const logsRequestSequence = useRef(0);
  const [messageApi, contextHolder] = message.useMessage();

  const columns: ProColumns<AccountRow>[] = [
    { title: '用户 ID', dataIndex: 'userId', width: 100, search: false },
    { title: '登录用户名', dataIndex: 'username', width: 180 },
    { title: '姓名', dataIndex: 'realName', width: 160, search: false },
    {
      title: '可用余额',
      dataIndex: 'balance',
      width: 180,
      search: false,
      render: (_, record) => money.format(record.balance),
    },
    {
      title: '余额更新时间',
      dataIndex: 'updateTime',
      width: 200,
      search: false,
      render: (_, record) =>
        record.updateTime?.replace('T', ' ') || '尚未发生余额变动',
    },
    {
      title: '操作',
      valueType: 'option',
      width: 250,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="recharge"
          type="link"
          onClick={() => {
            if (account?.userId !== record.userId) logsGeneration.current += 1;
            setAccount(record);
            setLogsError(false);
            setRechargeOpen(true);
          }}
        >
          充值
        </Button>,
        <Button
          key="deduct"
          type="link"
          danger
          disabled={record.balance <= 0}
          onClick={() => {
            if (account?.userId !== record.userId) logsGeneration.current += 1;
            setAccount(record);
            setLogsError(false);
            setDeductOpen(true);
          }}
        >
          扣减余额
        </Button>,
        <Button
          key="logs"
          type="link"
          onClick={() => {
            logsGeneration.current += 1;
            setAccount(record);
            setLogsError(false);
            setLogsOpen(true);
          }}
        >
          余额明细
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      title="余额管理"
      subTitle="搜索登录用户，在列表中充值、扣减或查看余额明细"
    >
      {contextHolder}
      {listError && (
        <Alert
          type="error"
          showIcon
          title="账户列表加载失败"
          description="请重试以获取用户及余额。"
          action={
            <Button onClick={() => actionRef.current?.reload()}>重试</Button>
          }
        />
      )}
      <div hidden={listError}>
        <ProTable<AccountRow>
          rowKey="userId"
          actionRef={actionRef}
          columns={columns}
          headerTitle="账户余额"
          search={{ labelWidth: 'auto', defaultCollapsed: false }}
          scroll={{ x: 1100 }}
          pagination={{
            defaultPageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: [10, 20, 50, 100],
            showTotal: (total) => `共 ${total} 个用户`,
          }}
          locale={{ emptyText: '暂无符合条件的用户' }}
          request={async (params) => {
            const sequence = ++listRequestSequence.current;
            setListError(false);
            try {
              const page = await getManagedUsers({
                current: params.current,
                size: Math.min(params.pageSize || 10, 100),
                username: params.username || undefined,
              });
              const balances = page.records.length
                ? await getAccounts(page.records.map((user) => user.id))
                : [];
              const balanceByUser = new Map(
                balances.map((item) => [item.userId, item]),
              );
              const rows = page.records.map((user) => {
                const balance = balanceByUser.get(user.id);
                if (!balance) throw new Error('批量余额结果缺少用户');
                return {
                  ...balance,
                  username: user.username,
                  realName: user.realName,
                };
              });
              if (sequence !== listRequestSequence.current)
                return { data: [], total: 0, success: false };
              setAccount(
                (current) =>
                  rows.find((row) => row.userId === current?.userId) || current,
              );
              return { data: rows, total: page.total, success: true };
            } catch {
              if (sequence === listRequestSequence.current) setListError(true);
              return { data: [], total: 0, success: false };
            }
          }}
        />
      </div>
      {account && rechargeOpen && (
        <ModalForm<{ amount: number }>
          title={`账户充值：${account.username}（ID ${account.userId}）`}
          open={rechargeOpen}
          onOpenChange={setRechargeOpen}
          width={480}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async ({ amount }) => {
            try {
              await rechargeAccount(account.userId, amount);
              await actionRef.current?.reload();
              if (logsOpen) logsActionRef.current?.reload();
              messageApi.success('充值成功');
              return true;
            } catch {
              return false;
            }
          }}
        >
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <div>当前余额：{money.format(account.balance)}</div>
            <ProFormDigit
              name="amount"
              label="充值金额（元）"
              min={0.01}
              max={99999999.99}
              fieldProps={{ precision: 2, step: 0.01 }}
              rules={[
                { required: true, message: '请输入充值金额' },
                {
                  type: 'number',
                  min: 0.01,
                  max: 99999999.99,
                  message: '充值金额应在 0.01 至 99999999.99 元之间',
                },
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: '充值金额最多保留两位小数',
                },
              ]}
            />
          </Space>
        </ModalForm>
      )}
      {account && deductOpen && (
        <ModalForm<{ amount: number }>
          title={`扣减余额：${account.username}（ID ${account.userId}）`}
          open={deductOpen}
          onOpenChange={setDeductOpen}
          width={480}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async ({ amount }) => {
            try {
              await deductAccount(account.userId, amount);
              await actionRef.current?.reload();
              if (logsOpen) logsActionRef.current?.reload();
              messageApi.success('扣减成功');
              return true;
            } catch {
              return false;
            }
          }}
        >
          <Space orientation="vertical" size="small" style={{ width: '100%' }}>
            <div>当前余额：{money.format(account.balance)}</div>
            <ProFormDigit
              name="amount"
              label="扣减金额（元）"
              min={0.01}
              max={account.balance}
              fieldProps={{ precision: 2, step: 0.01 }}
              rules={[
                { required: true, message: '请输入扣减金额' },
                {
                  type: 'number',
                  min: 0.01,
                  max: account.balance,
                  message: `扣减金额应在 0.01 至 ${account.balance} 元之间`,
                },
                {
                  pattern: /^\d+(\.\d{1,2})?$/,
                  message: '扣减金额最多保留两位小数',
                },
              ]}
            />
          </Space>
        </ModalForm>
      )}
      {account && logsOpen && (
        <Drawer
          key={account.userId}
          title={`余额明细：${account.username}（ID ${account.userId}）`}
          size="large"
          open={logsOpen}
          destroyOnHidden
          onClose={() => {
            setLogsOpen(false);
            logsGeneration.current += 1;
          }}
        >
          {logsError && (
            <Alert
              type="error"
              showIcon
              title="余额明细加载失败"
              description="请重试以获取当前分页数据。"
              action={
                <Button onClick={() => logsActionRef.current?.reload()}>
                  重试
                </Button>
              }
            />
          )}
          <div hidden={logsError}>
            <ProTable<AccountBalanceLog>
              key={account.userId}
              rowKey="id"
              actionRef={logsActionRef}
              columns={balanceLogColumns}
              headerTitle="余额变动记录（最新在前）"
              search={false}
              options={{ density: false, setting: false, fullScreen: false }}
              scroll={{ x: 1400 }}
              pagination={{
                defaultPageSize: 10,
                showSizeChanger: true,
                pageSizeOptions: [10, 20, 50, 100],
                showTotal: (total) => `共 ${total} 条明细`,
              }}
              locale={{ emptyText: '暂无余额明细，仅记录功能启用后的余额变动' }}
              request={async (params) => {
                const generation = logsGeneration.current;
                const sequence = ++logsRequestSequence.current;
                setLogsError(false);
                try {
                  const page = await getAccountBalanceLogs(account.userId, {
                    current: params.current,
                    size: Math.min(params.pageSize || 10, 100),
                  });
                  if (
                    generation !== logsGeneration.current ||
                    sequence !== logsRequestSequence.current
                  )
                    return { data: [], total: 0, success: false };
                  return {
                    data: page.records,
                    total: page.total,
                    success: true,
                  };
                } catch {
                  if (
                    generation === logsGeneration.current &&
                    sequence === logsRequestSequence.current
                  )
                    setLogsError(true);
                  return { data: [], total: 0, success: false };
                }
              }}
            />
          </div>
        </Drawer>
      )}
    </PageContainer>
  );
}
