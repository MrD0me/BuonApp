'use client';

import { useState } from 'react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Ltr } from '@/components/layout/Ltr';
import { useTranslations } from 'use-intl';
import { useAuthStore } from '@/store/auth';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useDateTimeFormatters } from '@/components/service-days/day-formatters';
import type { ServiceDay, ServiceDayBlockers } from '@/lib/types';

/**
 * The close-day ritual, opened from wherever the day is being worked. Closing
 * asks two questions the floor answers differently on different evenings —
 * whether to clear the map and whether to print the report — and refuses to
 * proceed past open orders or unpaid bills unless the owner forces it.
 */
interface CloseDayModalProps {
  day: ServiceDay;
  blockers: ServiceDayBlockers;
  onClose: () => void;
  onClosed: () => void;
}

export function CloseDayModal({ day, blockers, onClose, onClosed }: CloseDayModalProps) {
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
