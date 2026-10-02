import { register } from '@/services/luckyh';

export interface StateType {
  status?: 'ok' | 'error';
  currentAuthority?: 'user' | 'guest' | 'admin';
}

export interface UserRegisterParams {
  username: string;
  realName: string;
  mail: string;
  password: string;
  confirm: string;
  mobile: string;
  captcha: string;
  prefix: string;
}

export async function fakeRegister(params: UserRegisterParams) {
  await register({
    username: params.username,
    realName: params.realName,
    email: params.mail || undefined,
    phone: params.mobile || undefined,
    password: params.password,
    confirmPassword: params.confirm,
    userType: 2,
  });
  return { status: 'ok' as const };
}
