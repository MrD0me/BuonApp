import axios, { type AxiosInstance } from 'axios';

/**
 * The handheld's own HTTP client.
 *
 * It talks to the Server App on its own port, which forwards an allowlist to
 * the main API (main/server-app.ts), and it keeps its own token under its own
 * key. It must never share `@/lib/api`: that client's 401 handler sends the
 * browser to the desktop login, which a phone in the dining room has no
 * business seeing.
 */
export const SERVER_APP_TOKEN_KEY = 'buonapp:server-app-token';
const LEGACY_TOKEN_KEY = 'flocafe:server-app-token';

/** The paired device's token, carried over from the pre-rename key if needed. */
export function readServerToken(): string | null {
  try {
    const token = localStorage.getItem(SERVER_APP_TOKEN_KEY);
    if (token) return token;
    const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
    if (legacy) {
      localStorage.setItem(SERVER_APP_TOKEN_KEY, legacy);
      localStorage.removeItem(LEGACY_TOKEN_KEY);
    }
    return legacy;
  } catch {
    return null;
  }
}

export function storeServerToken(token: string): void {
  try { localStorage.setItem(SERVER_APP_TOKEN_KEY, token); } catch { /* private mode */ }
}

export function clearServerToken(): void {
  try { localStorage.removeItem(SERVER_APP_TOKEN_KEY); } catch { /* private mode */ }
}

/**
 * Builds the client. `onUnauthorized` fires when the server no longer knows
 * the token — expired, revoked, or the account switched off — so the shell
 * can fall back to the login form instead of showing a screen that fails
 * on every tap.
 */
export function createServerApi(onUnauthorized?: () => void): AxiosInstance {
  const api = axios.create({ baseURL: window.location.origin, timeout: 10000 });
  api.interceptors.request.use((config) => {
    const token = readServerToken();
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        clearServerToken();
        onUnauthorized?.();
      }
      return Promise.reject(error);
    },
  );
  return api;
}

/** A key the order routes accept as Idempotency-Key: printable ASCII, under 128 chars. */
export function newIdempotencyKey(): string {
  const random = typeof globalThis.crypto?.randomUUID === 'function'
    ? globalThis.crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  return `server-app-${random}`;
}

/** The stable `code` a backend refusal carries, when it carries one. */
export function apiErrorCode(error: unknown): string | undefined {
  const data = (error as { response?: { data?: { code?: string; reason?: string } } })?.response?.data;
  return data?.code || data?.reason;
}

export function httpStatusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } })?.response?.status;
}
