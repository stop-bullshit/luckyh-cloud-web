import {
  ModalForm,
  PageContainer,
  ProFormDigit,
  ProFormSelect,
} from '@ant-design/pro-components';
import { Button, Card, Descriptions, Form, message, Space } from 'antd';
import { useState } from 'react';
import {
  type AccountBalance,
  deductAccount,
  getAccount,
  getManagedUsers,
  rechargeAccount,
} from '@/services/luckyh';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});

// 逻辑变动: 账户余额增量充值-20261002-1556-01
export default function Accounts() {
  const [account, setAccount] = useState<AccountBalance>();
  const [loading, setLoading] = useState(false);
  const [rechargeOpen, setRechargeOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const loadAccount = async (userId: number) => {
    setLoading(true);
    try {
      setAccount(await getAccount(userId));
    } catch {
      setAccount(undefined);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer
      title="余额管理"
      subTitle="选择登录用户查询余额，并执行充值或扣减"
    >
      {contextHolder}
      <Card>
        <Form<{ userId: number }>
          layout="inline"
          onValuesChange={() => setAccount(undefined)}
          onFinish={({ userId }) => loadAccount(userId)}
        >
          <ProFormSelect
            name="userId"
            label="登录用户"
            width={420}
            placeholder="输入用户名搜索并选择用户"
            disabled={loading}
            showSearch={{ filterOption: false }}
            debounceTime={300}
            rules={[{ required: true, message: '请选择登录用户' }]}
            request={async ({ keyWords }) => {
              try {
                // 逻辑变动: 余额关联登录用户-20261002-1725-01
                const page = await getManagedUsers({
                  current: 1,
                  size: 20,
                  username: keyWords || undefined,
                });
                return page.records.map((user) => ({
                  label: `${user.username} · ${user.realName} · ${
                    user.userType === 1 ? '管理员' : '普通用户'
                  } · ID ${user.id}`,
                  value: user.id,
                }));
              } catch {
                return [];
              }
            }}
          />
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>
      {account && (
        <Card
          title="账户余额"
          style={{ marginTop: 16 }}
          extra={
            <Space>
              <Button type="primary" onClick={() => setRechargeOpen(true)}>
                充值
              </Button>
              <Button
                danger
                disabled={account.balance <= 0}
                onClick={() => setDeductOpen(true)}
              >
                扣减余额
              </Button>
            </Space>
          }
        >
          <Descriptions
            bordered
            column={1}
            items={[
              { key: 'userId', label: '用户 ID', children: account.userId },
              {
                key: 'balance',
                label: '可用余额',
                children: money.format(account.balance),
              },
              {
                key: 'updateTime',
                label: '更新时间',
                children: account.updateTime || '尚未发生余额变动',
              },
            ]}
          />
        </Card>
      )}
      {account && rechargeOpen && (
        <ModalForm<{ amount: number }>
          title={`账户充值：用户 ID ${account.userId}`}
          open={rechargeOpen}
          onOpenChange={setRechargeOpen}
          width={480}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async ({ amount }) => {
            try {
              await rechargeAccount(account.userId, amount);
              await loadAccount(account.userId);
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
          title={`扣减余额：用户 ID ${account.userId}`}
          open={deductOpen}
          onOpenChange={setDeductOpen}
          width={480}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async ({ amount }) => {
            try {
              await deductAccount(account.userId, amount);
              await loadAccount(account.userId);
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
    </PageContainer>
  );
}
