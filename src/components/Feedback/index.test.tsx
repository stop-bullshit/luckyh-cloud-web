import { render } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

const messageError = vi.hoisted(() => vi.fn());
vi.mock('antd', () => ({
  App: { useApp: () => ({ message: { error: messageError } }) },
}));

import Feedback, { feedback } from './index';

it('首屏错误在 Feedback 挂载后显示，之后的错误直接显示', () => {
  const startupError = { key: 'user-info-error', content: '认证服务不可用' };
  feedback.showError(startupError);
  expect(messageError).not.toHaveBeenCalled();

  const view = render(<Feedback>页面</Feedback>);
  expect(messageError).toHaveBeenCalledWith(startupError);

  const laterError = {
    key: 'user-info-error',
    content: '请求超时，请稍后重试',
  };
  feedback.showError(laterError);
  expect(messageError).toHaveBeenCalledWith(laterError);
  expect(messageError).toHaveBeenCalledTimes(2);

  view.unmount();
  expect(feedback.message).toBeUndefined();
});
