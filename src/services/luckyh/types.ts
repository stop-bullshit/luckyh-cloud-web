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
  productName: string;
  productPrice: number;
  quantity: number;
  totalAmount: number;
  status: number;
  statusDesc?: string;
  createTime?: string;
  updateTime?: string;
}

export interface OrderInput {
  userId: number;
  productName: string;
  productPrice: number;
  quantity: number;
}
