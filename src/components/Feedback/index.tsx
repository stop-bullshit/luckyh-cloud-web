import { App } from 'antd';
import { type ReactNode, useEffect } from 'react';

export const feedback: { message?: ReturnType<typeof App.useApp>['message'] } =
  {};

export default function Feedback({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  useEffect(() => {
    // 请求拦截器在 React 外执行，复用当前主题下的消息实例。
    feedback.message = message;
    return () => {
      feedback.message = undefined;
    };
  }, [message]);
  return children;
}
