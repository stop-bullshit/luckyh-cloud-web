import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProFormSelect,
  ProTable,
} from '@ant-design/pro-components';
import { useLocation } from '@umijs/max';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  message,
  Popconfirm,
  Space,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import { useRef, useState } from 'react';
import {
  cancelOrder,
  createOrder,
  getManagedUsers,
  getOrder,
  getOrders,
  getProducts,
  type OrderInput,
  type OrderRecord,
  payOrder,
  refundOrder,
} from '@/services/luckyh';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});
const orderStatus: Record<number, { text: string; color: string }> = {
  0: { text: '待支付', color: 'gold' },
  1: { text: '已支付', color: 'green' },
  2: { text: '已取消', color: 'default' },
  3: { text: '已退款', color: 'blue' },
};
const operationNames: Record<string, string> = {
  CREATE: '创建订单',
  PURCHASE: '直接购买',
  PAY: '支付订单',
  CANCEL: '取消订单',
  REFUND: '订单退款',
};

export default function Orders() {
  const actionRef = useRef<ActionType | null>(null);
  const location = useLocation();
  const urlUserId = Number(new URLSearchParams(location.search).get('userId'));
  const filterUserId =
    Number.isSafeInteger(urlUserId) && urlUserId > 0 ? urlUserId : undefined;
  const [messageApi, contextHolder] = message.useMessage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detail, setDetail] = useState<OrderRecord>();
  const [pendingId, setPendingId] = useState<number>();

  const showDetail = async (id: number) => {
    setDrawerOpen(true);
    setDetail(undefined);
    setDetailLoading(true);
    try {
      setDetail(await getOrder(id));
    } catch {
      setDrawerOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const changeStatus = async (
    record: OrderRecord,
    action: 'pay' | 'cancel' | 'refund',
  ) => {
    setPendingId(record.id);
    try {
      if (action === 'pay') {
        await payOrder(record.id);
      } else if (action === 'cancel') {
        await cancelOrder(record.id);
      } else {
        await refundOrder(record.id);
      }
      messageApi.success(
        action === 'pay'
          ? '订单支付成功'
          : action === 'cancel'
            ? '订单已取消'
            : '订单退款成功',
      );
      actionRef.current?.reload();
      if (detail?.id === record.id) {
        setDetail(await getOrder(record.id));
      }
      return true;
    } catch {
      return false;
    } finally {
      setPendingId(undefined);
    }
  };

  const statusActions = (record: OrderRecord) => {
    if (record.status === 1) {
      return (
        <Popconfirm
          title="确认全额退款？"
          description="退款会退回账户余额并返还商品库存。"
          okText="确认退款"
          cancelText="返回"
          onConfirm={() => changeStatus(record, 'refund')}
        >
          <Button type="link" disabled={pendingId !== undefined}>
            退款
          </Button>
        </Popconfirm>
      );
    }
    return record.status === 0 ? (
      <Space size={0}>
        <Popconfirm
          title="确认支付这笔订单？"
          description={`订单金额 ${money.format(record.totalAmount)}`}
          okText="确认支付"
          cancelText="返回"
          onConfirm={() => changeStatus(record, 'pay')}
        >
          <Button type="link" disabled={pendingId !== undefined}>
            支付
          </Button>
        </Popconfirm>
        <Popconfirm
          title="确认取消这笔订单？"
          description="取消后将无法支付。"
          okText="确认取消"
          cancelText="返回"
          okButtonProps={{ danger: true }}
          onConfirm={() => changeStatus(record, 'cancel')}
        >
          <Button type="link" danger disabled={pendingId !== undefined}>
            取消
          </Button>
        </Popconfirm>
      </Space>
    ) : null;
  };

  const columns: ProColumns<OrderRecord>[] = [
    {
      title: '订单编号',
      dataIndex: 'orderNo',
      copyable: true,
      search: false,
      width: 245,
    },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      valueType: 'digit',
      width: 100,
      fieldProps: { min: 1, precision: 0, placeholder: '输入用户 ID' },
    },
    {
      title: '商品名称',
      dataIndex: 'productName',
      search: false,
      ellipsis: true,
      width: 200,
    },
    {
      title: '单价',
      dataIndex: 'productPrice',
      search: false,
      align: 'right',
      width: 115,
      renderText: (value: number) => money.format(value),
    },
    {
      title: '数量',
      dataIndex: 'quantity',
      search: false,
      align: 'right',
      width: 75,
    },
    {
      title: '订单金额',
      dataIndex: 'totalAmount',
      search: false,
      align: 'right',
      width: 130,
      render: (_, record) => (
        <Typography.Text strong>
          {money.format(record.totalAmount)}
        </Typography.Text>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 100,
      render: (_, record) => (
        <Tag color={orderStatus[record.status]?.color}>
          {orderStatus[record.status]?.text || record.statusDesc || '未知状态'}
        </Tag>
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      valueType: 'dateTime',
      search: false,
      copyable: true,
      width: 185,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 190,
      render: (_, record) => (
        <Space size={0}>
          <Button
            type="link"
            disabled={detailLoading}
            onClick={() => showDetail(record.id)}
          >
            详情
          </Button>
          {statusActions(record)}
        </Space>
      ),
    },
  ];

  return (
    <PageContainer
      title="订单管理"
      subTitle="查询业务订单，完成创建、支付和取消"
    >
      {contextHolder}
      <ProTable<OrderRecord>
        key={location.search}
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        headerTitle="订单列表"
        form={{ initialValues: { userId: filterUserId } }}
        search={{ labelWidth: 'auto' }}
        scroll={{ x: 1445 }}
        pagination={{
          defaultPageSize: 10,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 笔订单`,
        }}
        request={async (params) => {
          try {
            const page = await getOrders({
              current: params.current,
              size: params.pageSize,
              userId: params.userId || undefined,
            });
            return { data: page.records, total: page.total, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <ModalForm<OrderInput>
            key="create"
            title="新建订单"
            width={560}
            initialValues={{ quantity: 1 }}
            modalProps={{ destroyOnHidden: true }}
            trigger={
              <Button type="primary" icon={<PlusOutlined />}>
                新建订单
              </Button>
            }
            onFinish={async (values) => {
              try {
                await createOrder({
                  userId: values.userId,
                  productId: values.productId,
                  quantity: values.quantity,
                });
                messageApi.success('订单创建成功');
                actionRef.current?.reload();
                return true;
              } catch {
                return false;
              }
            }}
          >
            <ProFormSelect
              name="userId"
              label="登录用户"
              placeholder="输入用户名搜索并选择用户"
              showSearch={{ filterOption: false }}
              debounceTime={300}
              rules={[{ required: true, message: '请选择登录用户' }]}
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
            <ProFormDigit
              name="quantity"
              label="购买数量"
              min={1}
              max={2147483647}
              fieldProps={{ precision: 0, step: 1 }}
              rules={[
                { required: true, message: '请输入购买数量' },
                { type: 'integer', min: 1, max: 2147483647 },
              ]}
            />
            <Alert
              type="info"
              showIcon
              title="商品名称、单价和订单金额以服务端商品数据为准"
            />
          </ModalForm>,
        ]}
      />
      <Drawer
        title="订单详情"
        size="large"
        open={drawerOpen}
        loading={detailLoading}
        destroyOnHidden
        onClose={() => setDrawerOpen(false)}
        extra={detail ? statusActions(detail) : undefined}
      >
        {detail && (
          <Space orientation="vertical" size={24} style={{ width: '100%' }}>
            <Descriptions
              title="订单信息"
              column={2}
              bordered
              items={[
                {
                  key: 'orderNo',
                  label: '订单编号',
                  span: 2,
                  children: (
                    <Typography.Text copyable>{detail.orderNo}</Typography.Text>
                  ),
                },
                {
                  key: 'status',
                  label: '订单状态',
                  children: (
                    <Tag color={orderStatus[detail.status]?.color}>
                      {orderStatus[detail.status]?.text ||
                        detail.statusDesc ||
                        '未知状态'}
                    </Tag>
                  ),
                },
                { key: 'userId', label: '用户 ID', children: detail.userId },
                {
                  key: 'productId',
                  label: '商品 ID',
                  children: detail.productId ?? '-',
                },
                {
                  key: 'productName',
                  label: '商品名称',
                  span: 2,
                  children: detail.productName,
                },
                {
                  key: 'productPrice',
                  label: '商品单价',
                  children: money.format(detail.productPrice),
                },
                {
                  key: 'quantity',
                  label: '购买数量',
                  children: detail.quantity,
                },
                {
                  key: 'totalAmount',
                  label: '订单金额',
                  span: 2,
                  children: (
                    <Typography.Text strong>
                      {money.format(detail.totalAmount)}
                    </Typography.Text>
                  ),
                },
                {
                  key: 'createTime',
                  label: '创建时间',
                  span: 2,
                  children: detail.createTime ? (
                    <Typography.Text copyable>
                      {detail.createTime}
                    </Typography.Text>
                  ) : (
                    '—'
                  ),
                },
                {
                  key: 'updateTime',
                  label: '更新时间',
                  span: 2,
                  children: detail.updateTime ? (
                    <Typography.Text copyable>
                      {detail.updateTime}
                    </Typography.Text>
                  ) : (
                    '—'
                  ),
                },
                {
                  key: 'payTime',
                  label: '支付时间',
                  children: detail.payTime || '—',
                },
                {
                  key: 'cancelTime',
                  label: '取消时间',
                  children: detail.cancelTime || '—',
                },
                {
                  key: 'refundTime',
                  label: '退款时间',
                  children: detail.refundTime || '—',
                },
              ]}
            />
            {detail.operationLogs && detail.operationLogs.length > 0 && (
              <Timeline
                items={detail.operationLogs.map((operation) => ({
                  children: (
                    <Space orientation="vertical" size={0}>
                      <Typography.Text strong>
                        {operationNames[operation.operationType] ||
                          operation.operationType}
                      </Typography.Text>
                      <Typography.Text type="secondary">
                        {operation.createTime} ·{' '}
                        {operation.fromStatus ?? '创建'} → {operation.toStatus}
                      </Typography.Text>
                      {operation.xid && (
                        <Typography.Text copyable type="secondary">
                          XID: {operation.xid}
                        </Typography.Text>
                      )}
                    </Space>
                  ),
                }))}
              />
            )}
            {detail.userInfo ? (
              <Descriptions
                title="关联用户"
                column={2}
                bordered
                items={[
                  {
                    key: 'username',
                    label: '用户名',
                    children: detail.userInfo.username,
                  },
                  {
                    key: 'realName',
                    label: '姓名',
                    children: detail.userInfo.realName || '—',
                  },
                  {
                    key: 'phone',
                    label: '手机号',
                    children: detail.userInfo.phone || '—',
                  },
                  {
                    key: 'email',
                    label: '邮箱',
                    children: detail.userInfo.email || '—',
                  },
                ]}
              />
            ) : (
              <Alert type="warning" showIcon title="关联用户信息暂不可用" />
            )}
          </Space>
        )}
      </Drawer>
    </PageContainer>
  );
}
