'use client';

import { useEffect, useState } from 'react';
import api from '@/lib/api';
import { WHATSAPP_AVAILABLE } from '@/lib/features';

/**
 * Returns true iff BuonApp's WhatsApp integration is enabled and currently
 * connected. Polls /whatsapp/status every 5s. Single boolean — the rest of
 * the status payload is not needed by any current consumer.
 *
 * With WhatsApp switched off (lib/features.ts) it asks nothing and stays
 * false: the backend no longer answers there, and every open order panel was
 * asking every five seconds.
 */
export function useWhatsAppReady(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!WHATSAPP_AVAILABLE) return;
    let active = true;
    const tick = async () => {
      try {
        const { data } = await api.get('/whatsapp/status');
        if (active) {
          setReady(!!data?.enabled && data?.state === 'connected');
        }
      } catch {
        // not logged in or backend down — keep last known value
      }
    };
    void tick();
    const id = setInterval(() => {
      if (document.visibilityState !== 'hidden') void tick();
    }, 5000);
    const handleVisibilityChange = () => {
      if (document.visibilityState !== 'hidden') void tick();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      active = false;
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  return ready;
}
