import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { InventoryRecord } from '@/services/luckyh';
import routes from '../../../config/routes';

const api = vi.hoisted(() => ({
  getProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  replenishInventory: vi.fn(),
}));

vi.mock('@/services/luckyh', () => api);
vi.mock('@ant-design/pro-components', async () => {
  const React = await import('react');

  function ProTable({ request, actionRef, columns, toolBarRender }: any) {
    const [records, setRecords] = React.useState<InventoryRecord[]>([]);
    const [productName, setProductName] = React.useState('');
    const params = React.useRef({ current: 1, pageSize: 10, productName: '' });
    const load = async () => {
      const result = await request(params.current);
      if (result.success) setRecords(result.data);
    };
    React.useImperativeHandle(actionRef, () => ({ reload: load }));
    React.useEffect(() => {
      void load();
    }, []);
    return (
      <div>
        <input
          aria-label="商品名称"
          value={productName}
          onChange={(event) => setProductName(event.target.value)}
        />
        <button
          type="button"
          onClick={() => {
            params.current = { ...params.current, productName };
            void load();
          }}
        >
          查询
        </button>
        {toolBarRender()}
        {records.map((record) => (
          <div key={record.productId}>
            <span>{record.productName}</span>
            <span>可用库存 {record.availableQuantity}</span>
            {columns
              .find((column: any) => column.valueType === 'option')
              .render(undefined, record)}
          </div>
        ))}
      </div>
    );
  }

  return {
    PageContainer: ({ children }: any) => <div>{children}</div>,
    ProTable,
    ProFormText: () => null,
    ProFormDigit: () => null,
    ModalForm: ({ title, open, onFinish, onOpenChange }: any) =>
      open ? (
        <div role="dialog" aria-label={title}>
          <button
            type="button"
            onClick={async () => {
              if (await onFinish({ quantity: 5 })) onOpenChange(false);
            }}
          >
            确认补货
          </button>
        </div>
      ) : null,
  };
});

import Products from './index';

describe('商品管理合并库存查询', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getProducts.mockResolvedValue({
      records: [
        {
          productId: 7,
          productName: '测试商品',
          productPrice: 12,
          availableQuantity: 8,
        },
      ],
      total: 1,
    });
    api.replenishInventory.mockResolvedValue('补货成功');
  });
  afterEach(cleanup);

  it('打开即展示商品库存，搜索和补货共用列表并在成功后刷新', async () => {
    render(<Products />);
    expect(await screen.findByText('可用库存 8')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /新增商品/ }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: '商品名称' }), {
      target: { value: ' 测试商品 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: '查询' }));
    await waitFor(() =>
      expect(api.getProducts).toHaveBeenLastCalledWith({
        current: 1,
        size: 10,
        productName: '测试商品',
      }),
    );
    fireEvent.click(screen.getByRole('button', { name: '补货' }));
    fireEvent.click(screen.getByRole('button', { name: '确认补货' }));
    await waitFor(() =>
      expect(api.replenishInventory).toHaveBeenCalledWith(7, 5),
    );
    await waitFor(() => expect(api.getProducts).toHaveBeenCalledTimes(3));
  });

  it('旧库存地址跳转商品管理且不再显示独立菜单', () => {
    const business = routes.find((route) => route.path === '/business');
    const inventory = business?.routes?.find(
      (route) => route.path === '/business/inventory',
    );
    expect(inventory).toMatchObject({
      redirect: '/business/products',
      hideInMenu: true,
    });
    expect(inventory).not.toHaveProperty('component');
    expect(inventory).not.toHaveProperty('name');
  });
});
