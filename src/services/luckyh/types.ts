export interface ApiResult<T> {
  code: number;
  message: string;
  data: T;
}

export interface PageData<T> {
  records: T[];
  total: number;
  current: number;
  size: number;
}

export interface AccountUser {
  id: number;
  username: string;
  realName: string;
  email?: string;
  phone?: string;
  avatar?: string;
  userType: number;
  lastLoginTime?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  userInfo: AccountUser;
  roles: string[];
  permissions: string[];
}

export interface RegisterInput {
  username: string;
  password: string;
  confirmPassword: string;
  realName: string;
  email?: string;
  phone?: string;
  userType: 2;
}

export interface BusinessUser {
  id: number;
  username: string;
  realName: string;
  email?: string;
  phone?: string;
  status: number;
  createTime?: string;
  updateTime?: string;
}

export interface ManagedUser {
  id: number;
  username: string;
  realName: string;
  email?: string;
  phone?: string;
  userType: 1 | 2;
  status: 0 | 1;
  lastLoginTime?: string;
  createTime?: string;
  updateTime?: string;
}

export interface ManagedUserInput {
  username: string;
  password?: string;
  realName: string;
  email?: string;
  phone?: string;
  userType: 1 | 2;
  status: 0 | 1;
}

export interface UserInput {
  username: string;
  realName: string;
  email?: string;
  phone?: string;
}

export interface OrderRecord {
  id: number;
  orderNo: string;
  userId: number;
  userInfo?: BusinessUser | null;
  productId?: number;
  productName: string;
  productPrice: number;
  quantity: number;
  totalAmount: number;
  status: number;
  statusDesc?: string;
  payTime?: string;
  cancelTime?: string;
  refundTime?: string;
  operationLogs?: OrderOperation[];
  createTime?: string;
  updateTime?: string;
}

export interface OrderOperation {
  operationType: 'CREATE' | 'PURCHASE' | 'PAY' | 'CANCEL' | 'REFUND';
  fromStatus?: number;
  toStatus: number;
  xid?: string;
  createTime: string;
}

export interface OrderInput {
  userId: number;
  productId: number;
  quantity: number;
}

export interface InventoryRecord {
  productId: number;
  productName: string;
  productPrice: number;
  availableQuantity: number;
  updateTime: string;
}

export interface ProductInput {
  productName: string;
  productPrice: number;
}

export interface AccountBalance {
  userId: number;
  balance: number;
  updateTime?: string;
}

export interface PurchaseInput {
  userId: number;
  productId: number;
  quantity: number;
}

export interface SeataInfo {
  enabled: boolean;
  mode: string;
  version: string;
  description: string;
  transactionMethods: string[];
}
