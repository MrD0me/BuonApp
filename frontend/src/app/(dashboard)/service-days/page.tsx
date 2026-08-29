'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Unlock, Printer } from 'lucide-react';
import type { ServiceDay, ServiceDaySummary, Order } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';
import { useDateTimeFormatters } from '@/components/service-days/day-formatters';
import { Stat } from '@/components/service-days/Stat';

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

  const [days, setDays] = useState<ServiceDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | null>(null);

  // Promise chain rather than await: the state update then lands in a microtask
  // instead of synchronously inside the effect below, which is what React wants.
  const loadDays = useCallback(() => api.get('/service-days')
    .then(({ data }) => setDays(data.days || []))
    .catch(() => toast.error(t('loadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    loadDays();
    // The list only moves when a day is closed or reopened, and both refetch
    // on their own — nothing here to poll.
  }, [loadDays]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">{t('title')}</h1>

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

      {detailId && (
        <DayDetailModal
          dayId={detailId}
          onClose={() => setDetailId(null)}
          onChanged={loadDays}
        />
      )}
    </div>
  );
}
