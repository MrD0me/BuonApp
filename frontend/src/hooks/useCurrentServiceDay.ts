'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'use-intl';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import type { ServiceDay, ServiceDayBlockers, ServiceDaySummary } from '@/lib/types';

export interface CurrentDayPayload {
  day: ServiceDay | null;
  summary?: ServiceDaySummary;
  blockers?: ServiceDayBlockers;
}

/**
 * The service day in progress, kept fresh.
 *
 * One hook for the two places that show it — the chip in the page header of
 * Giornata (where the day is closed) and of Sala (read-only). The endpoints
 * behind it are owner/manager only, so for a cashier it loads nothing and
 * says so through `canManageDays`.
 */
export function useCurrentServiceDay(pollMs = 20000) {
  const t = useTranslations('serviceDays');
  const role = useAuthStore((s) => s.currentTenant?.role) || 'cashier';
  const canManageDays = role === 'owner' || role === 'manager' || role === 'admin';

  const [current, setCurrent] = useState<CurrentDayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);

  // Promise chains rather than await: the state updates then land in a
  // microtask instead of synchronously inside the effect below.
  const reload = useCallback(() => api.get('/service-days/current')
    .then(({ data }) => setCurrent(data))
    .catch(() => toast.error(t('loadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    if (!canManageDays) return;
    reload();
    // Blockers shift as the service runs, so the close button has to stay
    // honest about what is still open.
    const interval = setInterval(reload, pollMs);
    return () => clearInterval(interval);
  }, [canManageDays, reload, pollMs]);

  const open = useCallback(async (): Promise<boolean> => {
    setOpening(true);
    try {
      await api.post('/service-days/open');
      toast.success(t('dayOpened'));
      await reload();
      return true;
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'service_day_already_open' ? t('alreadyOpen') : t('openFailed'));
      return false;
    } finally {
      setOpening(false);
    }
  }, [reload, t]);

  const blockers: ServiceDayBlockers = current?.blockers ?? { openOrders: [], unpaidBills: [] };

  return {
    canManageDays,
    loading,
    day: current?.day ?? null,
    summary: current?.summary,
    blockers,
    blockedCount: blockers.openOrders.length + blockers.unpaidBills.length,
    reload,
    open,
    opening,
  };
}
