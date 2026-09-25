'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
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
  /** The owner switched the Server App off: nothing to log into. */
  disabled: boolean;
  login: (username: string, password: string, rememberMe: boolean) => Promise<void>;
  logout: () => Promise<void>;
}

/**
 * Who is holding the phone.
 *
 * On mount it asks the Server App whether it is enabled at all (a 404 on the
 * info endpoint is the owner's off switch), then whether the stored token is
 * still good. A 401 from any later call, caught by the client itself, drops
 * the user back to the login form: the token is gone, and every screen past
 * this one assumes it is not.
 */
export function useServerSession(): ServerSession {
  const [user, setUser] = useState<ServerUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  // Built once; the state setter it closes over is stable for the component's life.
  const api = useMemo(
    () => (typeof window !== 'undefined' ? createServerApi(() => setUser(null)) : null),
    [],
  );

  useEffect(() => {
    if (!api) return;
    let cancelled = false;
    api.get('/api/server-app/info')
      .then(() => {
        if (!readServerToken()) return null;
        return api.get('/api/auth/me');
      })
      .then((res) => {
        if (!cancelled && res) setUser(res.data.user);
      })
      .catch((error) => {
        if (!cancelled && error.response?.status === 404) setDisabled(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [api]);

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

  return { api, user, loading, disabled, login, logout };
}
