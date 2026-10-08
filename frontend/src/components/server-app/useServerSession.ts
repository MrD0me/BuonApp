'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AxiosInstance } from 'axios';
import { clearServerToken, createServerApi, readServerToken, storeServerToken } from './server-api';

export interface ServerUser {
  id: string;
  name: string;
  username: string;
  role: string;
}

export interface ServerSession {
  api: AxiosInstance | null;
  user: ServerUser | null;
  /** Still finding out whether the device is paired and the feature is on. */
  loading: boolean;
  /**
   * The phone was signed in, and the PC has not answered yet: it is asked
   * again by itself, and `retry` asks at once.
   */
  connecting: boolean;
  /** The owner switched the Server App off: nothing to log into. */
  disabled: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
  retry: () => void;
}

/** First wait before asking a silent PC again, and the longest. */
const FIRST_RETRY_MS = 2_000;
const LONGEST_RETRY_MS = 15_000;

/**
 * Who is holding the phone.
 *
 * On mount it asks the Server App whether it is enabled at all (a 404 on the
 * info endpoint is the owner's off switch), then whether the stored token is
 * still good. A 401 from any later call, caught by the client itself, drops
 * the user back to the login form: the token is gone, and every screen past
 * this one assumes it is not.
 *
 * A PC that does not answer is not a reason to sign anybody out. The page can
 * load and the next request still find the Wi-Fi gone; it used to land on the
 * login form with the token still stored, and the waiter, who could not sign
 * in either, reloaded. Now the phone says it is reaching the PC and asks
 * again, a little less often each time, until it answers.
 */
export function useServerSession(): ServerSession {
  const [user, setUser] = useState<ServerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const retryDelay = useRef(FIRST_RETRY_MS);
  // Built once; the state setter it closes over is stable for the component's life.
  const api = useMemo(
    () => (typeof window !== 'undefined' ? createServerApi(() => setUser(null)) : null),
    [],
  );

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    let timer = 0;
    api.get('/api/server-app/info')
      .then(() => {
        if (!readServerToken()) return null;
        return api.get('/api/auth/me');
      })
      .then((res) => {
        if (cancelled) return;
        if (res) setUser(res.data.user);
        retryDelay.current = FIRST_RETRY_MS;
        setConnecting(false);
        setLoading(false);
      })
      .catch((error) => {
        if (cancelled) return;
        const status: number | undefined = error?.response?.status;
        if (status === 404) {
          setDisabled(true);
          setConnecting(false);
          setLoading(false);
          return;
        }
        // No answer, or the forwarder could not reach the API: the PC is not
        // there yet. Signed in, the phone waits for it.
        if ((status === undefined || status >= 500) && readServerToken()) {
          setConnecting(true);
          timer = window.setTimeout(() => setAttempt((count) => count + 1), retryDelay.current);
          retryDelay.current = Math.min(retryDelay.current * 2, LONGEST_RETRY_MS);
          return;
        }
        setConnecting(false);
        setLoading(false);
      });
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, attempt]);

  const retry = useCallback(() => {
    retryDelay.current = FIRST_RETRY_MS;
    setAttempt((count) => count + 1);
  }, []);

  const login = useCallback(async (username: string, password: string, rememberMe: boolean) => {
    if (!api) return;
    const res = await api.post('/api/auth/login', { username, password, remember_me: rememberMe });
    storeServerToken(res.data.access_token);
    setUser(res.data.user);
  }, [api]);

  const logout = useCallback(async () => {
    try { await api?.post('/api/auth/logout'); } catch { /* the token is dropped regardless */ }
    clearServerToken();
    setUser(null);
  }, [api]);

  return { api, user, loading, connecting, disabled, login, logout, retry };
}
