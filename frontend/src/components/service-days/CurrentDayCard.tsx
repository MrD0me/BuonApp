'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { AlertTriangle, Lock, Sunrise } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'use-intl';
import { useAuthStore } from '@/store/auth';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useDateTimeFormatters } from '@/components/service-days/day-formatters';
import { Stat } from '@/components/service-days/Stat';
import { CloseDayModal } from '@/components/service-days/CloseDayModal';
import type { ServiceDay, ServiceDaySummary, ServiceDayBlockers } from '@/lib/types';

interface CurrentDayPayload {
  day: ServiceDay | null;
  summary?: ServiceDaySummary;
  blockers?: ServiceDayBlockers;
}

interface Props {
  /** Fired after the day is opened or closed: the page around it goes stale. */
  onChanged?: () => void;
}

/**
 * The service day in progress — what it has taken so far, and the ritual that
 * ends it. It lives above the day's orders, because that is where the day is
 * actually worked and where closing it belongs; the archive holds the days
 * that are already over.
 *
 * Renders nothing for a role that cannot manage days: the endpoints behind it
 * are owner/manager only, so a cashier would get an error card instead of a
 * page.
 */
export function CurrentDayCard({ onChanged }: Props) {
  const t = useTranslations('serviceDays');
  const formatCurrency = useFormatCurrency();
  const fmt = useDateTimeFormatters();
  const role = useAuthStore((s) => s.currentTenant?.role) || 'cashier';
  const canManageDays = role === 'owner' || role === 'manager' || role === 'admin';

  const [current, setCurrent] = useState<CurrentDayPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [closing, setClosing] = useState<ServiceDay | null>(null);

  // Promise chains rather than await: the state updates then land in a microtask
  // instead of synchronously inside the effect below, which is what React wants.
  const loadCurrent = useCallback(() => api.get('/service-days/current')
    .then(({ data }) => setCurrent(data))
    .catch(() => toast.error(t('loadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    // Nothing to load for a role that will not see the card anyway.
    if (!canManageDays) return;
    loadCurrent();
    // Blockers shift as the service runs, so the close button has to stay
    // honest about what is still open.
    const interval = setInterval(loadCurrent, 20000);
    return () => clearInterval(interval);
  }, [canManageDays, loadCurrent]);

  const handleOpen = async () => {
    setOpening(true);
    try {
      await api.post('/service-days/open');
      toast.success(t('dayOpened'));
      loadCurrent();
      onChanged?.();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'service_day_already_open' ? t('alreadyOpen') : t('openFailed'));
    } finally {
      setOpening(false);
    }
  };

  if (!canManageDays || loading) return null;

  const openDay = current?.day ?? null;
  const summary = current?.summary;
  const blockers = current?.blockers ?? { openOrders: [], unpaidBills: [] };
  const blockedCount = blockers.openOrders.length + blockers.unpaidBills.length;

  return (
    <>
      {openDay ? (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-4">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
                <h2 className="font-bold text-gray-900">{t('currentDay')}</h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {fmt.day(openDay.business_date)} · {t('openedAt', { date: fmt.dateTime(openDay.opened_at) })}
              </p>
            </div>
            <Button onClick={() => setClosing(openDay)}>
              <Lock size={16} className="me-1" /> {t('closeDay')}
            </Button>
          </div>

          {summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Stat label={t('orders')} value={summary.orders.total} />
              <Stat label={t('covers')} value={summary.covers} />
              <Stat label={t('takings')} value={formatCurrency(summary.takings.total)} />
              <Stat label={t('bills')} value={`${summary.bills.paid}/${summary.bills.count}`} />
            </div>
          )}

          {blockedCount > 0 && (
            <p className="mt-3 text-xs text-amber-700 flex items-center gap-1.5">
              <AlertTriangle size={13} />
              {t('blockersCount', { count: blockedCount })}
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 p-6 mb-4 text-center">
          <Sunrise size={28} className="mx-auto text-gray-300 mb-2" />
          <p className="font-medium text-gray-700">{t('noOpenDay')}</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">{t('noOpenDayHint')}</p>
          <Button onClick={handleOpen} disabled={opening}>{t('openDay')}</Button>
        </div>
      )}

      {closing && (
        <CloseDayModal
          day={closing}
          blockers={blockers}
          onClose={() => setClosing(null)}
          onClosed={() => {
            setClosing(null);
            loadCurrent();
            onChanged?.();
          }}
        />
      )}
    </>
  );
}
