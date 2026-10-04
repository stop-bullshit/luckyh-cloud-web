import { PageContainer, ProFormSelect } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Form,
  InputNumber,
  Popconfirm,
  Space,
} from 'antd';
import { useRef, useState } from 'react';
import {
  getManagedUsers,
  getProducts,
  getSeataInfo,
  type PurchaseInput,
  purchaseOrder,
  type SeataInfo,
  testPurchaseRollback,
} from '@/services/luckyh';

type PurchaseResult =
  | { type: 'purchase'; orderId: number }
  | { type: 'rollback'; detail: string }
  | { type: 'failure'; detail: string }
  | { type: 'uncertain' };

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});

export default function Transactions() {
  const [form] = Form.useForm<PurchaseInput>();
  const busy = useRef(false);
  const [pending, setPending] = useState<'purchase' | 'rollback' | 'info'>();
  const [result, setResult] = useState<PurchaseResult>();
  const [info, setInfo] = useState<SeataInfo>();

  const submit = async (
    action: 'purchase' | 'rollback',
    input: PurchaseInput,
  ) => {
    if (busy.current) return;
    busy.current = true;
    setPending(action);
    setResult(undefined);
    try {
      if (action === 'purchase') {
        setResult({ type: 'purchase', orderId: await purchaseOrder(input) });
      } else {
        setResult({
          type: 'rollback',
          detail: await testPurchaseRollback(input),
        });
      }
    } catch (error) {
      setResult(
        error instanceof Error && error.name === 'BusinessError'
          ? { type: 'failure', detail: error.message }
          : { type: 'uncertain' },
      );
    } finally {
      busy.current = false;
      setPending(undefined);
    }
  };

  const loadInfo = async () => {
    if (busy.current) return;
    busy.current = true;
    setPending('info');
    try {
      setInfo(await getSeataInfo());
    } catch {
      setInfo(undefined);
    } finally {
      busy.current = false;
      setPending(undefined);
    }
  };

  return (
    <PageContainer
      title="分布式购买演示"
      subTitle="订单服务统一创建订单并调用库存、账户分支"
    >
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Card title="购买请求">
          <Form<PurchaseInput>
            form={form}
            layout="vertical"
            disabled={pending !== undefined}
            initialValues={{ quantity: 1 }}
            onValuesChange={() => setResult(undefined)}
          >
            <ProFormSelect
              name="userId"
              label="登录用户"
              placeholder="输入用户名搜索并选择用户"
              showSearch={{ filterOption: false }}
              debounceTime={300}
              rules={[
                { required: true, message: '请选择登录用户' },
                { type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER },
              ]}
              request={async ({ keyWords }) => {
                try {
                  const page = await getManagedUsers({
                    current: 1,
                    size: 20,
                    username: keyWords || undefined,
                  });
                  return page.records.map((user) => ({
                    label: `${user.realName || user.username} · ${user.username}（ID: ${user.id}）· ${user.userType === 1 ? '管理员' : '普通用户'}${user.status === 0 ? ' · 已禁用' : ''}`,
                    value: user.id,
                    disabled: user.status === 0,
                  }));
                } catch {
                  return [];
                }
              }}
            />
            <ProFormSelect
              name="productId"
              label="商品"
              placeholder="输入商品名称搜索并选择商品"
              showSearch={{ filterOption: false }}
              debounceTime={300}
              extra={
                <span>
                  单价、库存以购买时为准。新增商品或补货请前往
                  <Link to="/business/products">商品管理</Link>。
                </span>
              }
              rules={[
                { required: true, message: '请选择商品' },
                { type: 'integer', min: 1, max: Number.MAX_SAFE_INTEGER },
              ]}
              request={async ({ keyWords }) => {
                try {
                  const page = await getProducts({
                    current: 1,
                    size: 20,
                    productName: keyWords || undefined,
                  });
                  return page.records.map((product) => ({
                    label: `${product.productName} · ${money.format(product.productPrice)} · 可用库存 ${product.availableQuantity}`,
                    value: product.productId,
                  }));
                } catch {
                  return [];
                }
              }}
            />
            <Form.Item
              name="quantity"
              label="购买数量"
              rules={[
                { required: true, message: '请输入购买数量' },
                { type: 'integer', min: 1, max: 2147483647 },
              ]}
            >
              <InputNumber
                min={1}
                max={2147483647}
                precision={0}
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Alert
              style={{ marginBottom: 16 }}
              type="warning"
              showIcon
              title="正常购买会真实扣减库存和登录用户账户余额"
              description="订单服务会通过认证服务校验登录用户；请确认所选用户、商品和数量。购买订单为已支付状态，可在订单管理中执行整单退款并返还余额与库存。"
            />
            <Space wrap>
              <Popconfirm
                title="确认发起真实购买？"
                description="请核对所填用户、商品和数量。"
                okText="确认购买"
                cancelText="返回检查"
                disabled={pending !== undefined}
                onConfirm={() => {
                  void form.validateFields().then(
                    (values) => submit('purchase', values),
                    () => undefined,
                  );
                }}
              >
                <Button
                  type="primary"
                  htmlType="button"
                  loading={pending === 'purchase'}
                  disabled={pending !== undefined}
                >
                  正常购买
                </Button>
              </Popconfirm>
              <Button
                danger
                loading={pending === 'rollback'}
                disabled={pending !== undefined}
                onClick={() => {
                  void form.validateFields().then(
                    (values) => submit('rollback', values),
                    () => undefined,
                  );
                }}
              >
                主动回滚演示
              </Button>
            </Space>
          </Form>
        </Card>

        {result?.type === 'purchase' && (
          <Alert
            type="success"
            showIcon
            title={`购买成功，订单 ID：${result.orderId}`}
            description={<Link to="/business/orders">查看订单</Link>}
          />
        )}
        {result?.type === 'rollback' && (
          <Alert
            type="warning"
            showIcon
            title="已触发主动回滚"
            description={`${result.detail}。请核对订单、库存、余额与协调器状态；此响应不代表最终回滚结果。`}
          />
        )}
        {result?.type === 'failure' && (
          <Alert
            type="error"
            showIcon
            title="服务端返回失败"
            description={result.detail}
          />
        )}
        {result?.type === 'uncertain' && (
          <Alert
            type="warning"
            showIcon
            title="请求未获得明确结果"
            description="请先核对订单、库存、余额与协调器状态，再决定下一步；不要直接重试购买。"
          />
        )}

        <Card title="手动核对">
          <Space wrap>
            <Link to="/business/orders">订单</Link>
            {/* 逻辑变动: 库存入口合并到商品管理-20261004-1209-02 */}
            <Link to="/business/products">商品与库存</Link>
            <Link to="/business/accounts">账户余额</Link>
            <Button
              type="link"
              loading={pending === 'info'}
              disabled={pending !== undefined}
              onClick={() => void loadInfo()}
            >
              查看 Seata 接入说明
            </Button>
          </Space>
          {info && (
            <Alert
              style={{ marginTop: 16 }}
              type="info"
              showIcon
              title={`Seata ${info.mode} · ${info.version}`}
              description={`${info.description}。这里展示的是接口说明，不代表协调器的实时状态。`}
            />
          )}
        </Card>
      </Space>
    </PageContainer>
  );
}
