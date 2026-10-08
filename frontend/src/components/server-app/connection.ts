'use client';

import { useEffect, useRef, useSyncExternalStore } from 'react';
import type { AxiosInstance } from 'axios';

/**
 * Whether the phone can reach the PC right now.
 *
 * Told by every request the handheld makes (the client in `server-api.ts`
 * reports each answer, and each request that got none) and by the browser's
 * own `online`/`offline`. Any answer counts as reachable, a refusal included:
 * the PC is there and said no. No answer at all — the Wi-Fi gone, a timeout —
 * is what "not reachable" means, and it is what the send queue waits on.
 *
 * Module state rather than React state: the axios client is built once, long
 * before any screen, and has to be able to say so from anywhere.
 */
let reachable = typeof navigator === 'undefined' || navigator.onLine !== false;
const listeners = new Set<() => void>();

export function reportReachability(ok: boolean): void {
  if (reachable === ok) return;
  reachable = ok;
  for (const listener of listeners) listener();
}

export function isReachable(): boolean {
  return reachable;
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

/** How often a phone that has lost the PC asks whether it is back, while its screen is on. */
const PROBE_MS = 5_000;
const PROBE_TIMEOUT_MS = 4_000;

/**
 * The connection, for a screen: true while the PC answers.
 *
 * While it does not, the phone asks the Server App's health route every few
 * seconds — it runs in the PC's own process, so an answer from it is an
 * answer from the PC — instead of waiting for the next read of the floor, so
 * that a ticket waiting in the queue leaves within seconds of the Wi-Fi
 * coming back. `onBack` runs once each time the connection returns.
 */
export function useConnection(api: AxiosInstance | null, onBack: () => void): boolean {
  const ok = useSyncExternalStore(subscribe, isReachable, () => true);
  const backHandler = useRef(onBack);
  useEffect(() => { backHandler.current = onBack; });

  useEffect(() => {
    const goOffline = () => reportReachability(false);
    const goOnline = () => {
      api?.get('/api/health', { timeout: PROBE_TIMEOUT_MS }).catch(() => { /* reported by the client */ });
    };
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [api]);

  useEffect(() => {
    if (ok || !api) return;
    const probe = () => {
      if (document.hidden) return;
      api.get('/api/health', { timeout: PROBE_TIMEOUT_MS }).catch(() => { /* reported by the client */ });
    };
    probe();
    const interval = window.setInterval(probe, PROBE_MS);
    document.addEventListener('visibilitychange', probe);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', probe);
    };
  }, [ok, api]);

  const wasReachable = useRef(ok);
  useEffect(() => {
    if (ok && !wasReachable.current) backHandler.current();
    wasReachable.current = ok;
  }, [ok]);

  return ok;
}
