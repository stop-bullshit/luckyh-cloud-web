import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  ModalForm,
  PageContainer,
  type ProColumns,
  ProFormDigit,
  ProFormText,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message } from 'antd';
import { useRef, useState } from 'react';
import {
  createProduct,
  getProducts,
  type InventoryRecord,
  type ProductInput,
  replenishInventory,
  updateProduct,
} from '@/services/luckyh';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});

// 逻辑变动: 商品管理与独立补货-20261002-1518-01
// 逻辑变动: 商品列表统一查询库存-20261004-1206-01
export default function Products() {
  const actionRef = useRef<ActionType | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [formOpen, setFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryRecord>();
  const [replenishingProduct, setReplenishingProduct] =
    useState<InventoryRecord>();

  const columns: ProColumns<InventoryRecord>[] = [
    {
      title: '商品名称',
      dataIndex: 'productName',
      fieldProps: { placeholder: '输入商品名称查询', allowClear: true },
    },
    {
      title: '单价',
      dataIndex: 'productPrice',
      search: false,
      renderText: (value: number) => money.format(value),
    },
    { title: '可用库存', dataIndex: 'availableQuantity', search: false },
    { title: '商品编号', dataIndex: 'productId', search: false },
    {
      title: '更新时间',
      dataIndex: 'updateTime',
      valueType: 'dateTime',
      width: 168,
      search: false,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 128,
      fixed: 'right',
      render: (_, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          onClick={() => {
            setEditingProduct(record);
            setFormOpen(true);
          }}
        >
          编辑
        </Button>,
        <Button
          key="replenish"
          type="link"
          size="small"
          onClick={() => setReplenishingProduct(record)}
        >
          补货
        </Button>,
      ],
    },
  ];

  return (
    <PageContainer
      title="商品管理"
      subTitle="列表直接查看可用库存，按商品名称搜索；新增商品初始库存为 0，通过补货增加库存"
    >
      {contextHolder}
      <ProTable<InventoryRecord, { productName?: string }>
        actionRef={actionRef}
        rowKey="productId"
        columns={columns}
        headerTitle="商品与库存列表"
        size="middle"
        scroll={{ x: 900 }}
        search={{ labelWidth: 'auto', defaultCollapsed: false }}
        pagination={{ defaultPageSize: 10, showSizeChanger: true }}
        request={async ({ current, pageSize, productName }) => {
          try {
            const page = await getProducts({
              current,
              size: pageSize,
              productName: productName?.trim() || undefined,
            });
            return { data: page.records, total: page.total, success: true };
          } catch {
            return { data: [], total: 0, success: false };
          }
        }}
        toolBarRender={() => [
          <Button
            key="create"
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => {
              setEditingProduct(undefined);
              setFormOpen(true);
            }}
          >
            新增商品
          </Button>,
        ]}
      />
      {formOpen && (
        <ModalForm<ProductInput>
          key={editingProduct?.productId ?? 'new'}
          title={editingProduct ? '编辑商品' : '新增商品'}
          open={formOpen}
          onOpenChange={setFormOpen}
          width={480}
          initialValues={editingProduct}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async (values) => {
            const input: ProductInput = {
              productName: values.productName.trim(),
              productPrice: values.productPrice,
            };
            try {
              if (editingProduct) {
                await updateProduct(editingProduct.productId, input);
              } else {
                await createProduct(input);
              }
              messageApi.success(
                editingProduct ? '商品已更新' : '商品已创建，请补货',
              );
              actionRef.current?.reload();
              return true;
            } catch {
              return false;
            }
          }}
        >
          <ProFormText
            name="productName"
            label="商品名称"
            placeholder="请输入商品名称"
            fieldProps={{ maxLength: 128 }}
            rules={[
              { required: true, whitespace: true, message: '请输入商品名称' },
              { max: 128, message: '商品名称不能超过 128 个字符' },
            ]}
          />
          <ProFormDigit
            name="productPrice"
            label="商品单价（元）"
            min={0.01}
            max={99999999.99}
            fieldProps={{ precision: 2, step: 0.01 }}
            rules={[
              { required: true, message: '请输入商品单价' },
              {
                type: 'number',
                min: 0.01,
                max: 99999999.99,
                message: '单价应在 0.01 至 99999999.99 元之间',
              },
              { pattern: /^\d+(\.\d{1,2})?$/, message: '单价最多保留两位小数' },
            ]}
          />
        </ModalForm>
      )}
      {replenishingProduct && (
        <ModalForm<{ quantity: number }>
          key={replenishingProduct.productId}
          title={`补货：${replenishingProduct.productName}`}
          open
          onOpenChange={(open) => {
            if (!open) setReplenishingProduct(undefined);
          }}
          width={480}
          modalProps={{ destroyOnHidden: true }}
          onFinish={async ({ quantity }) => {
            try {
              await replenishInventory(replenishingProduct.productId, quantity);
              messageApi.success('补货成功');
              actionRef.current?.reload();
              return true;
            } catch {
              return false;
            }
          }}
        >
          <ProFormDigit
            name="quantity"
            label="补货数量"
            min={1}
            max={2147483647}
            fieldProps={{ precision: 0 }}
            rules={[
              { required: true, message: '请输入补货数量' },
              {
                type: 'integer',
                min: 1,
                max: 2147483647,
                message: '请输入 1 至 2147483647 的整数',
              },
            ]}
          />
        </ModalForm>
      )}
    </PageContainer>
  );
}
