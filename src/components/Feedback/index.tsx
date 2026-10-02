import { App } from 'antd';
import { type ReactNode, useEffect } from 'react';

type ErrorMessage = { key: string; content: string };
let pendingError: ErrorMessage | undefined;

export const feedback: {
  message?: ReturnType<typeof App.useApp>['message'];
  showError: (error: ErrorMessage) => void;
} = {
  showError: (error) => {
    if (feedback.message) {
      feedback.message.error(error);
      return;
    }
    // 逻辑变动: 首屏消息组件未挂载时暂存用户信息错误-20261002-2132-1
    pendingError = error;
  },
};

export default function Feedback({ children }: { children: ReactNode }) {
  const { message } = App.useApp();
  useEffect(() => {
    // 请求拦截器在 React 外执行，复用当前主题下的消息实例。
    feedback.message = message;
    if (pendingError) {
      message.error(pendingError);
      pendingError = undefined;
    }
    return () => {
      feedback.message = undefined;
    };
  }, [message]);
  return children;
}
