'use client';

import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useTranslations } from 'use-intl';
import { usePrinterStore } from '@/hooks/usePrinter';
import { usePosSettingsStore } from '@/store/pos-settings';
import { showPrintWarningsToast } from '@/lib/printer/warnings-toast';
import type { Order } from '@/lib/types';

/** What the POS shows in its support banner when a print goes wrong. */
export interface KotSupportError {
  code: string;
  message: string;
  payload: Record<string, unknown>;
}

/**
 * Sends an order's pending rows to the kitchen.
 *
 * Placing or extending an order always fires the ticket — a send that quietly
 * does nothing leaves the kitchen unaware of food the floor believes it
 * ordered. `kot_printing_enabled` remains the one switch, for businesses that
 * print no kitchen tickets at all (issue #133).
 *
 * `auto` only decides how talkative the result is: calls that fire on their
 * own after an order write stay quiet on success, while an explicit "send to
 * kitchen" button confirms what it did.
 *
 * `onSupportError` is how the POS raises its diagnostics banner; callers
 * without one just get the toast.
 */
export function useSendKot(onSupportError?: (error: KotSupportError) => void) {
  const { printKot } = usePrinterStore();
  const kotPrintingEnabled = usePosSettingsStore((s) => s.kotPrintingEnabled);
  const t = useTranslations('pos');

  return useCallback(async (order: Order, { auto }: { auto: boolean }) => {
    if (!kotPrintingEnabled) return;

    try {
      const result = await printKot(order);
      showPrintWarningsToast(result.warnings);
      if (!result.printed) {
        // Nothing pending is a normal outcome (double tap, or every dish has
        // already gone out) — say so instead of implying a ticket printed.
        if (!auto) toast(t('kotNothingPending'), { icon: 'ℹ️' });
        return;
      }
      if (!auto) {
        toast.success(result.batch ? t('kotSentBatch', { batch: result.batch }) : t('kotSent'));
      }
    } catch (err) {
      console.error('[KOT] print failed:', err);
      const msg = err instanceof Error ? err.message : 'print failed';
      const code = `print.kot.${msg.toLowerCase().includes('spool') ? 'spooler_timeout' : 'failed'}`;
      onSupportError?.({
        code,
        message: t('kotPrintFailed'),
        payload: { event_code: code, message: msg, category: 'printer', diagnostics: { order_id: order.id, stage: 'kot_print' } },
      });
      toast.error(t('kotPrintFailed'));
    }
  }, [kotPrintingEnabled, printKot, t, onSupportError]);
}
