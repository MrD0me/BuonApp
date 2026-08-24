'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Sunrise, Lock, Unlock, AlertTriangle, Printer } from 'lucide-react';
import type { ServiceDay, ServiceDaySummary, ServiceDayBlockers, Order } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { parseDbTimestamp } from '@/lib/utils';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';

interface CurrentDayPayload {
  day: ServiceDay | null;
  summary?: ServiceDaySummary;
  blockers?: ServiceDayBlockers;
}

/** Tenant timezone when configured, otherwise whatever this machine is set to. */
function useTimeZone() {
  const tenant = useAuthStore((s) => s.currentTenant);
  return tenant?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function useDateTimeFormatters() {
  const timeZone = useTimeZone();
  const locale = typeof navigator !== 'undefined' ? navigator.language : 'en';
  return {
    /** `business_date` is a bare calendar date — rendering it through a timezone would shift it. */
    day: (businessDate: string) => {
      const [year, month, date] = businessDate.split('-').map(Number);
      if (!year || !month || !date) return businessDate;
      return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' })
        .format(new Date(Date.UTC(year, month - 1, date)));
    },
    time: (timestamp: string | null) => {
      if (!timestamp) return '—';
      const parsed = parseDbTimestamp(timestamp);
      if (isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', timeZone }).format(parsed);
    },
    dateTime: (timestamp: string | null) => {
      if (!timestamp) return '—';
      const parsed = parseDbTimestamp(timestamp);
      if (isNaN(parsed.getTime())) return '—';
      return new Intl.DateTimeFormat(locale, {
        day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone,
      }).format(parsed);
    },
  };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900"><Ltr>{String(value)}</Ltr></p>
    </div>
  );
}

interface CloseDayModalProps {
  day: ServiceDay;
  blockers: ServiceDayBlockers;
  onClose: () => void;
  onClosed: () => void;
}

function CloseDayModal({ day, blockers, onClose, onClosed }: CloseDayModalProps) {
  const t = useTranslations('serviceDays');
  const tCommon = useTranslations('common');
  const formatCurrency = useFormatCurrency();
  const fmt = useDateTimeFormatters();
  const role = useAuthStore((s) => s.currentTenant?.role) || 'cashier';

  const [clearTables, setClearTables] = useState(false);
  const [printReport, setPrintReport] = useState(true);
  const [force, setForce] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const blocked = blockers.openOrders.length > 0 || blockers.unpaidBills.length > 0;
  const canForce = role === 'owner';

  const handleClose = async () => {
    setSaving(true);
    try {
      const { data } = await api.post(`/service-days/${day.id}/close`, {
        clear_tables: clearTables,
        ...(force ? { force: true, reason } : {}),
      });
      const dayLabel = fmt.day(day.business_date);
      toast.success(data.tablesCleared > 0
        ? t('dayClosedWithTables', { date: dayLabel, count: data.tablesCleared })
        : t('dayClosed', { date: dayLabel }));
      if (data.tablesKept > 0) toast(t('tablesKept', { count: data.tablesKept }));

      // The day is closed either way — a printer that is off or unreachable
      // must not read as a failed close.
      if (printReport) {
        try {
          await api.post(`/service-days/${day.id}/print`);
          toast.success(t('reportPrinted'));
        } catch {
          toast.error(t('closedButPrintFailed'));
        }
      }
      onClosed();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(
        code === 'service_day_has_blockers' ? t('closeBlocked')
          : code === 'force_close_requires_owner' ? t('forceRequiresOwner')
            : code === 'force_close_requires_reason' ? t('forceRequiresReason')
              : t('closeFailed'),
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('closeDay')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {blocked && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
            <div className="flex items-center gap-2 mb-2 text-amber-800">
              <AlertTriangle size={16} />
              <p className="font-semibold text-sm">{t('blockersTitle')}</p>
            </div>
            <p className="text-xs text-amber-700 mb-3">{t('blockersHint')}</p>

            {blockers.openOrders.length > 0 && (
              <div className="mb-2">
                <p className="text-xs font-medium text-amber-800 mb-1">{t('openOrders')}</p>
                <ul className="space-y-1">
                  {blockers.openOrders.map((order) => (
                    <li key={order.id} className="text-xs text-amber-900 flex justify-between gap-2">
                      <span>#<Ltr>{order.order_number}</Ltr>{order.table_label ? ` · ${order.table_label}` : ''}</span>
                      <span className="text-amber-700">{order.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {blockers.unpaidBills.length > 0 && (
              <div>
                <p className="text-xs font-medium text-amber-800 mb-1">{t('unpaidBills')}</p>
                <ul className="space-y-1">
                  {blockers.unpaidBills.map((bill) => (
                    <li key={bill.id} className="text-xs text-amber-900 flex justify-between gap-2">
                      <span>#<Ltr>{bill.bill_number}</Ltr></span>
                      <span className="text-amber-700">{formatCurrency(bill.total - bill.paid_amount)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <label className="flex items-start gap-2 mb-2 cursor-pointer select-none">
          <input type="checkbox" checked={clearTables} onChange={(e) => setClearTables(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
          <span>
            <span className="block text-sm font-medium text-gray-800">{t('clearTables')}</span>
            <span className="block text-xs text-gray-500">{t('clearTablesHint')}</span>
          </span>
        </label>

        <label className="flex items-start gap-2 cursor-pointer select-none">
          <input type="checkbox" checked={printReport} onChange={(e) => setPrintReport(e.target.checked)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
          <span>
            <span className="block text-sm font-medium text-gray-800">{t('printReport')}</span>
            <span className="block text-xs text-gray-500">{t('printReportHint')}</span>
          </span>
        </label>

        {blocked && canForce && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <label className="flex items-start gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={force} onChange={(e) => setForce(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500" />
              <span>
                <span className="block text-sm font-medium text-gray-800">{t('forceClose')}</span>
                <span className="block text-xs text-gray-500">{t('forceCloseHint')}</span>
              </span>
            </label>
            {force && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('forceReason')}</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                  placeholder={t('forceReasonPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand text-sm" />
              </div>
            )}
          </div>
        )}

        {blocked && !canForce && (
          <p className="mt-4 text-xs text-gray-500">{t('forceRequiresOwner')}</p>
        )}

        <div className="flex gap-3 mt-6">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            {tCommon('cancel')}
          </Button>
          <Button type="button" className="flex-1" onClick={handleClose}
            disabled={saving || (blocked && (!force || !reason.trim()))}>
            {saving ? t('closing') : t('closeDay')}
          </Button>
        </div>
      </div>
    </div>
  );
}

interface DayDetailModalProps {
  dayId: string;
  onClose: () => void;
  onChanged: () => void;
}

function DayDetailModal({ dayId, onClose, onChanged }: DayDetailModalProps) {
  const t = useTranslations('serviceDays');
  const formatCurrency = useFormatCurrency();
  const fmt = useDateTimeFormatters();
  const role = useAuthStore((s) => s.currentTenant?.role) || 'cashier';

  const [day, setDay] = useState<ServiceDay | null>(null);
  const [summary, setSummary] = useState<ServiceDaySummary | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [reopening, setReopening] = useState(false);
  const [printing, setPrinting] = useState(false);

  useEffect(() => {
    api.get(`/service-days/${dayId}`)
      .then(({ data }) => {
        setDay(data.day);
        setSummary(data.summary);
        setOrders(data.orders || []);
      })
      .catch(() => toast.error(t('loadFailed')))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dayId]);

  const handlePrint = async () => {
    if (!day) return;
    setPrinting(true);
    try {
      await api.post(`/service-days/${day.id}/print`);
      toast.success(t('reportPrinted'));
    } catch {
      toast.error(t('printFailed'));
    } finally {
      setPrinting(false);
    }
  };

  const handleReopen = async () => {
    if (!day) return;
    setReopening(true);
    try {
      await api.post(`/service-days/${day.id}/reopen`);
      toast.success(t('dayReopened'));
      onChanged();
      onClose();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'service_day_another_open' ? t('reopenBlocked') : t('reopenFailed'));
      setReopening(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">
            {day ? t('detailTitle', { date: fmt.day(day.business_date) }) : t('title')}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !day || !summary ? (
          <p className="text-center text-gray-500 py-8">{t('loadFailed')}</p>
        ) : (
          <>
            <p className="text-xs text-gray-500 mb-4">
              {day.summary ? t('summaryNote') : t('liveNote')}
              {day.closed_at ? ` · ${t('closedAt')} ${fmt.dateTime(day.closed_at)}` : ''}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              <Stat label={t('orders')} value={summary.orders.total} />
              <Stat label={t('covers')} value={summary.covers} />
              <Stat label={t('takings')} value={formatCurrency(summary.takings.total)} />
              <Stat label={t('discounts')} value={formatCurrency(summary.discounts)} />
            </div>

            {summary.takings.byMethod.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('byMethod')}</h3>
                <div className="space-y-1">
                  {summary.takings.byMethod.map((row) => (
                    <div key={row.method} className="flex justify-between text-sm px-3 py-1.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 capitalize">{row.method}</span>
                      <span className="font-medium text-gray-900">{formatCurrency(row.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {summary.topProducts.length > 0 && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('topProducts')}</h3>
                <div className="space-y-1">
                  {summary.topProducts.map((row) => (
                    <div key={row.name} className="flex justify-between text-sm px-3 py-1.5 bg-gray-50 rounded-lg">
                      <span className="text-gray-700 truncate">{row.name}</span>
                      <span className="text-gray-500 ms-3 shrink-0">×{row.quantity}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="text-sm font-semibold text-gray-800 mb-2">{t('ordersOfDay')}</h3>
            {orders.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">{t('noOrders')}</p>
            ) : (
              <div className="space-y-1">
                {orders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between gap-3 text-sm px-3 py-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-800">#<Ltr>{order.order_number}</Ltr></span>
                    <span className="text-gray-500 truncate flex-1">{order.table_label || '—'}</span>
                    <span className="text-xs text-gray-400">{fmt.time(order.created_at)}</span>
                    <span className="font-medium text-gray-900">{formatCurrency(order.total || 0)}</span>
                  </div>
                ))}
              </div>
            )}

            {day.notes && (
              <p className="mt-4 text-xs text-gray-500">{t('notes')}: {day.notes}</p>
            )}

            <div className="mt-6 border-t border-gray-100 pt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={handlePrint} disabled={printing}>
                <Printer size={14} className="me-1" /> {printing ? t('printing') : t('printReport')}
              </Button>
              {day.status === 'closed' && role === 'owner' && (
                <Button type="button" variant="outline" onClick={handleReopen} disabled={reopening}>
                  <Unlock size={14} className="me-1" /> {t('reopen')}
                </Button>
              )}
            </div>
            {day.status === 'closed' && role === 'owner' && (
              <p className="text-xs text-gray-500 mt-2">{t('reopenHint')}</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ServiceDaysPage() {
  const t = useTranslations('serviceDays');
  const formatCurrency = useFormatCurrency();
  const fmt = useDateTimeFormatters();

  const [current, setCurrent] = useState<CurrentDayPayload | null>(null);
  const [days, setDays] = useState<ServiceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState(false);
  const [closingDay, setClosingDay] = useState<ServiceDay | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Promise chains rather than await: the state updates then land in a microtask
  // instead of synchronously inside the effect below, which is what React wants.
  const loadCurrent = useCallback(() => api.get('/service-days/current')
    .then(({ data }) => setCurrent(data))
    .catch(() => toast.error(t('loadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const loadDays = useCallback(() => api.get('/service-days')
    .then(({ data }) => setDays(data.days || []))
    .catch(() => { /* the card above already surfaced the failure */ }),
  []);

  const reload = useCallback(
    () => Promise.all([loadCurrent(), loadDays()]),
    [loadCurrent, loadDays],
  );

  useEffect(() => {
    loadCurrent();
    loadDays();
    // Blockers shift as the service runs, so the close button has to stay
    // honest. The history below only moves when a day opens or closes, and both
    // go through reload() — no reason to re-query it every twenty seconds.
    const interval = setInterval(loadCurrent, 20000);
    return () => clearInterval(interval);
  }, [loadCurrent, loadDays]);

  const handleOpen = async () => {
    setOpening(true);
    try {
      await api.post('/service-days/open');
      toast.success(t('dayOpened'));
      reload();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'service_day_already_open' ? t('alreadyOpen') : t('openFailed'));
    } finally {
      setOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const openDay = current?.day ?? null;
  const summary = current?.summary;
  const blockers = current?.blockers ?? { openOrders: [], unpaidBills: [] };
  const blockedCount = blockers.openOrders.length + blockers.unpaidBills.length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>

      {openDay ? (
        <div className="bg-white rounded-xl border border-gray-100 p-5 mb-8">
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
            <Button onClick={() => setClosingDay(openDay)}>
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
        <div className="bg-white rounded-xl border border-gray-100 p-8 mb-8 text-center">
          <Sunrise size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">{t('noOpenDay')}</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">{t('noOpenDayHint')}</p>
          <Button onClick={handleOpen} disabled={opening}>{t('openDay')}</Button>
        </div>
      )}

      <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('pastDays')}</h2>
      {days.length === 0 ? (
        <p className="text-center text-gray-500 py-8">{t('noDays')}</p>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-start font-medium px-4 py-2.5">{t('date')}</th>
                  <th className="text-start font-medium px-4 py-2.5">{t('status')}</th>
                  <th className="text-end font-medium px-4 py-2.5">{t('orders')}</th>
                  <th className="text-end font-medium px-4 py-2.5">{t('covers')}</th>
                  <th className="text-end font-medium px-4 py-2.5">{t('takings')}</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.id} onClick={() => setDetailId(day.id)}
                    className="border-t border-gray-50 hover:bg-gray-50 cursor-pointer">
                    <td className="px-4 py-2.5 font-medium text-gray-900">{fmt.day(day.business_date)}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        day.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {day.status === 'open' ? t('statusOpen') : t('statusClosed')}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-end text-gray-700"><Ltr>{String(day.orders_count ?? 0)}</Ltr></td>
                    <td className="px-4 py-2.5 text-end text-gray-700"><Ltr>{String(day.covers ?? 0)}</Ltr></td>
                    <td className="px-4 py-2.5 text-end font-medium text-gray-900">{formatCurrency(day.takings ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {closingDay && (
        <CloseDayModal
          day={closingDay}
          blockers={blockers}
          onClose={() => setClosingDay(null)}
          onClosed={() => { setClosingDay(null); reload(); }}
        />
      )}

      {detailId && (
        <DayDetailModal
          dayId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={reload}
        />
      )}
    </div>
  );
}
