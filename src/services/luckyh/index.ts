import type { RequestOptions } from '@@/plugin-request/request';
import { request } from '@umijs/max';
import type {
  AccountBalance,
  AccountBalanceLog,
  AccountUser,
  ApiResult,
  BusinessUser,
  InventoryRecord,
  LoginResult,
  ManagedUser,
  ManagedUserInput,
  OrderInput,
  OrderRecord,
  PageData,
  ProductInput,
  PurchaseInput,
  RegisterInput,
  SeataInfo,
  UserInput,
} from './types';

export type * from './types';

// 订单网关超时为 60 秒，购买事务请求预留 5 秒网络余量。
const PURCHASE_TRANSACTION_TIMEOUT_MS = 65_000;

async function api<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const response = await request<ApiResult<T>>(url, options);
  return response.data;
}

export function login(input: { username: string; password: string }) {
  return api<LoginResult>('/api/auth/login', { method: 'POST', data: input });
}

export function register(input: RegisterInput) {
  return api<string>('/api/auth/register', { method: 'POST', data: input });
}

export function getCurrentUser(options?: RequestOptions) {
  return api<AccountUser>('/api/auth/validate', options);
}

export function logout() {
  return api<string>('/api/auth/logout', { method: 'POST' });
}

export function getUsers(params: { current?: number; size?: number; username?: string }) {
  return api<PageData<BusinessUser>>('/api/user/users', { params });
}

export function getUser(id: number) {
  return api<BusinessUser>(`/api/user/users/${id}`);
}

export function createUser(input: UserInput) {
  return api<number>('/api/user/users', { method: 'POST', data: input });
}

export function updateUser(id: number, input: UserInput) {
  return api<string>(`/api/user/users/${id}`, { method: 'PUT', data: input });
}

export function deleteUser(id: number) {
  return api<string>(`/api/user/users/${id}`, { method: 'DELETE' });
}

export function getManagedUsers(params: {
  current?: number;
  size?: number;
  username?: string;
}) {
  return api<PageData<ManagedUser>>('/api/auth/users', { params });
}

export function getManagedUser(id: number) {
  return api<ManagedUser>(`/api/auth/users/${id}`);
}

export function createManagedUser(input: ManagedUserInput) {
  return api<number>('/api/auth/users', { method: 'POST', data: input });
}

export function updateManagedUser(id: number, input: ManagedUserInput) {
  return api<string>(`/api/auth/users/${id}`, { method: 'PUT', data: input });
}

export function deleteManagedUser(id: number) {
  return api<string>(`/api/auth/users/${id}`, { method: 'DELETE' });
}

export function getOrders(params: { current?: number; size?: number; userId?: number }) {
  return api<PageData<OrderRecord>>('/api/order/orders', { params });
}

export function getOrder(id: number) {
  return api<OrderRecord>(`/api/order/orders/${id}`);
}

export function createOrder(input: OrderInput) {
  return api<number>('/api/order/orders', { method: 'POST', data: input });
}

export function payOrder(id: number) {
  return api<string>(`/api/order/orders/${id}/pay`, { method: 'POST' });
}

export function cancelOrder(id: number) {
  return api<string>(`/api/order/orders/${id}/cancel`, { method: 'POST' });
}

export function refundOrder(id: number) {
  return api<string>(`/api/order/orders/${id}/refund`, { method: 'POST' });
}

export function getProducts(params: { current?: number; size?: number; productName?: string }) {
  return api<PageData<InventoryRecord>>('/api/inventory/inventory', { params });
}

export function createProduct(input: ProductInput) {
  return api<number>('/api/inventory/inventory', { method: 'POST', data: input });
}

export function updateProduct(productId: number, input: ProductInput) {
  return api<string>(`/api/inventory/inventory/${productId}`, { method: 'PUT', data: input });
}

export function replenishInventory(productId: number, quantity: number) {
  return api<string>(`/api/inventory/inventory/${productId}/replenish`, {
    method: 'POST',
    data: { quantity },
  });
}

export function getAccount(userId: number) {
  return api<AccountBalance>(`/api/account/accounts/${userId}`);
}

export function getAccounts(userIds: number[]) {
  return api<AccountBalance[]>('/api/account/accounts/batch', {
    params: { ids: userIds.join(',') },
  });
}

export function getAccountBalanceLogs(
  userId: number,
  params: { current?: number; size?: number },
) {
  return api<PageData<AccountBalanceLog>>(
    `/api/account/accounts/${userId}/balance-logs`,
    { params },
  );
}

export function rechargeAccount(userId: number, amount: number) {
  return api<string>(`/api/account/accounts/${userId}/recharge`, {
    method: 'POST',
    data: { amount },
  });
}

export function deductAccount(userId: number, amount: number) {
  return api<string>(`/api/account/accounts/${userId}/deduct`, {
    method: 'POST',
    data: { amount },
  });
}

export function purchaseOrder(input: PurchaseInput) {
  return api<number>('/api/order/orders/purchase', {
    method: 'POST',
    data: input,
    timeout: PURCHASE_TRANSACTION_TIMEOUT_MS,
  });
}

export function testPurchaseRollback(input: PurchaseInput) {
  return api<string>('/api/order/seata-demo/test-rollback', {
    method: 'POST',
    data: input,
    timeout: PURCHASE_TRANSACTION_TIMEOUT_MS,
  });
}

export function getSeataInfo() {
  return api<SeataInfo>('/api/order/seata-demo/info');
}
