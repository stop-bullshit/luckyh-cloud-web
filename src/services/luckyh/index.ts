import type { RequestOptions } from '@@/plugin-request/request';
import { request } from '@umijs/max';
import type {
  AccountUser,
  ApiResult,
  BusinessUser,
  LoginResult,
  OrderInput,
  OrderRecord,
  PageData,
  RegisterInput,
  UserInput,
} from './types';

export type * from './types';

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
