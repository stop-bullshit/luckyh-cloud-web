import type { LoginResult } from '@/services/luckyh';

const SESSION_KEY = 'luckyh-cloud.session';

interface LoginSession {
  accessToken: string;
  expiresAt: number;
}

export function readSession(): LoginSession | undefined {
  const raw =
    sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
  if (!raw) return undefined;
  try {
    const session = JSON.parse(raw) as LoginSession;
    if (!session.accessToken || session.expiresAt <= Date.now()) {
      clearSession();
      return undefined;
    }
    return session;
  } catch {
    clearSession();
    return undefined;
  }
}

export function saveSession(result: LoginResult, remember = false) {
  clearSession();
  const storage = remember ? localStorage : sessionStorage;
  storage.setItem(
    SESSION_KEY,
    JSON.stringify({
      accessToken: result.accessToken,
      expiresAt: Date.now() + result.expiresIn * 1000,
    } satisfies LoginSession),
  );
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function safeRedirect(value: string | null) {
  if (
    !value?.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\') ||
    value.startsWith('/user/')
  )
    return '/';
  return value;
}
