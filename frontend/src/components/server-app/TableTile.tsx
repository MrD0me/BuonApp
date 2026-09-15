'use client';

import { Link2, Users } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Order, Table } from '@/lib/types';
import { parseDbTimestamp } from '@/lib/utils';
import { isPendingKot } from '@/lib/kot';
import { Ltr } from '@/components/layout/Ltr';

/** The same colours the floor map on the central PC uses, so a table reads the same on both. */
const STATUS_STYLES: Record<string, { tile: string; dot: string }> = {
  available: { tile: 'border-gray-200 bg-white', dot: 'bg-green-500' },
  occupied: { tile: 'border-red-200 bg-red-50', dot: 'bg-red-500' },
  reserved: { tile: 'border-amber-200 bg-amber-50', dot: 'bg-amber-500' },
  cleaning: { tile: 'border-gray-300 bg-gray-100', dot: 'bg-gray-500' },
  held: { tile: 'border-blue-200 bg-blue-50', dot: 'bg-blue-500' },
};

/** Minutes since a timestamp, or null when there isn't one to measure from. */
function minutesSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const parsed = parseDbTimestamp(timestamp);
  if (isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
}

interface Props {
  table: Table;
  /** The open order on it, rows included, or null when the table is free. */
  order: Order | null;
  onClick: () => void;
}

/**
 * One table in the list: its name, its colour, how many are sitting at it and
 * for how long, and the orange dot that says a round is still waiting to go
 * to the kitchen — the one signal a waiter passing by must not miss.
 */
export function TableTile({ table, order, onClick }: Props) {
  const tTables = useTranslations('tables');
  const t = useTranslations('serverApp');
  const style = STATUS_STYLES[table.status] || STATUS_STYLES.available;
  const elapsed = order ? minutesSince(order.created_at) : null;
  const pendingRound = (order?.items || []).some(isPendingKot);
  const joined = Boolean(table.merged_into);
  const reservation = !order && table.reservation && table.reservation.status === 'booked' ? table.reservation : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex min-h-24 flex-col rounded-xl border p-3 text-start transition active:scale-[0.98] ${style.tile} ${joined ? 'border-dashed' : ''}`}
    >
      <span className="flex items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-full ${style.dot}`} />
        <span className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900">{table.name}</span>
        {joined && <Link2 size={14} className="shrink-0 text-gray-400" aria-label={tTables('mergedInto')} />}
        {pendingRound && (
          <span className="size-2.5 shrink-0 rounded-full bg-orange-500 ring-2 ring-white" aria-label={t('pendingKitchen')} title={t('pendingKitchen')} />
        )}
      </span>
      {order ? (
        <span className="mt-auto flex items-center gap-3 pt-2 text-xs text-gray-600">
          <span className="flex items-center gap-1"><Users size={12} /><Ltr>{order.guest_count ?? 1}</Ltr></span>
          {elapsed !== null && <span>{t('openSince', { minutes: elapsed })}</span>}
        </span>
      ) : reservation ? (
        <span className="mt-auto truncate pt-2 text-xs text-amber-700">{reservation.name}</span>
      ) : (
        <span className="mt-auto pt-2 text-xs text-gray-400">{tTables('statusAvailable')}</span>
      )}
    </button>
  );
}
