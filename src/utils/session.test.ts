import { afterEach, describe, expect, it } from 'vitest';
import { readSession, safeRedirect } from './session';

afterEach(() => {
  sessionStorage.clear();
  localStorage.clear();
});

describe('登录会话', () => {
  it('过期或损坏的会话不会继续用于认证', () => {
    sessionStorage.setItem(
      'luckyh-cloud.session',
      JSON.stringify({ accessToken: 'expired', expiresAt: Date.now() - 1 }),
    );
    expect(readSession()).toBeUndefined();
    expect(sessionStorage.getItem('luckyh-cloud.session')).toBeNull();
    sessionStorage.setItem('luckyh-cloud.session', '{invalid');
    expect(readSession()).toBeUndefined();
  });

  it('登录后仅返回站内业务页面', () => {
    expect(safeRedirect('/business/orders?userId=1')).toBe(
      '/business/orders?userId=1',
    );
    for (const path of [
      'https://example.com',
      '//example.com',
      '/\\example.com',
      '/user/login',
      null,
    ]) {
      expect(safeRedirect(path)).toBe('/');
    }
  });
});
