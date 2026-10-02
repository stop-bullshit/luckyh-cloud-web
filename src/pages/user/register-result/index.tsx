import { Link, useSearchParams } from '@umijs/max';
import { Button, Result } from 'antd';
import React from 'react';
import useStyles from './style.style';

const RegisterResult: React.FC<Record<string, unknown>> = () => {
  const { styles } = useStyles();
  const [params] = useSearchParams();

  const actions = (
    <div className={styles.actions}>
      <Link to="/user/login" prefetch>
        <Button size="large" type="primary">
          立即登录
        </Button>
      </Link>
    </div>
  );

  const email = params?.get('account') || 'AntDesign@example.com';
  return (
    <Result
      className={styles.registerResult}
      status="success"
      title={
        <div className={styles.title}>
          <span>你的账户：{email} 注册成功</span>
        </div>
      }
      subTitle="账号已创建，请使用注册的用户名和密码登录。"
      extra={actions}
    />
  );
};
export default RegisterResult;
