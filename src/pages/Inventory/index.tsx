import { PageContainer, ProFormSelect } from '@ant-design/pro-components';
import { Link } from '@umijs/max';
import { Button, Card, Descriptions, Form } from 'antd';
import { useState } from 'react';
import {
  getInventory,
  getProducts,
  type InventoryRecord,
} from '@/services/luckyh';

const money = new Intl.NumberFormat('zh-CN', {
  style: 'currency',
  currency: 'CNY',
});

export default function Inventory() {
  const [record, setRecord] = useState<InventoryRecord>();
  const [loading, setLoading] = useState(false);

  return (
    <PageContainer title="库存查询" subTitle="选择商品，查看最新库存">
      <Card>
        <Form<{ productId: number }>
          layout="inline"
          onValuesChange={() => setRecord(undefined)}
          onFinish={async ({ productId }) => {
            setRecord(undefined);
            setLoading(true);
            try {
              setRecord(await getInventory(productId));
            } catch {
              return;
            } finally {
              setLoading(false);
            }
          }}
        >
          <ProFormSelect
            name="productId"
            label="商品"
            placeholder="输入商品名称搜索并选择商品"
            width={420}
            disabled={loading}
            showSearch={{ filterOption: false }}
            debounceTime={300}
            extra={
              <span>
                找不到商品或需要补货？前往
                <Link to="/business/products">商品管理</Link>。
              </span>
            }
            rules={[
              { required: true, message: '请选择商品' },
              {
                type: 'integer',
                min: 1,
                max: Number.MAX_SAFE_INTEGER,
                message: '请选择有效商品',
              },
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
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading}>
              查询
            </Button>
          </Form.Item>
        </Form>
      </Card>
      {record && (
        <Card title="库存详情" style={{ marginTop: 16 }}>
          <Descriptions
            bordered
            column={1}
            items={[
              {
                key: 'productId',
                label: '商品 ID',
                children: record.productId,
              },
              {
                key: 'productName',
                label: '商品名称',
                children: record.productName,
              },
              {
                key: 'productPrice',
                label: '商品单价',
                children: money.format(record.productPrice),
              },
              {
                key: 'availableQuantity',
                label: '可用库存',
                children: record.availableQuantity,
              },
              {
                key: 'updateTime',
                label: '更新时间',
                children: record.updateTime,
              },
            ]}
          />
        </Card>
      )}
    </PageContainer>
  );
}
