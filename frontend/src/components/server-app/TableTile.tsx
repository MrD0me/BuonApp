'use client';

import { Link2, Users } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Order, Table } from '@/lib/types';
import { parseDbTimestamp } from '@/lib/utils';
import { pendingDishCount } from '@/lib/kot';
import { TABLE_STATUS_TONE, TONE_STYLES } from '@/lib/status-styles';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n/enums';
import { StatusBadge } from '@/components/ui/status-badge';
import { Ltr } from '@/components/layout/Ltr';

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
 * One table in the list.
 *
 * Its state is said twice, in colour and in words — a band down the side and
 * a pill that reads "Occupato" — because a 6 px dot was the one thing a
 * waiter walking past could not see. Under it: how many are sitting, for how
 * long, and the count of plates still waiting to go to the kitchen, which is
 * the one number the floor must not miss.
 */
export function TableTile({ table, order, onClick }: Props) {
  const tTables = useTranslations('tables');
  const t = useTranslations('serverApp');
  const tone = TABLE_STATUS_TONE[table.status] ?? 'free';
  const style = TONE_STYLES[tone];
  const elapsed = order ? minutesSince(order.created_at) : null;
  const pending = order ? pendingDishCount(order.items || []) : 0;
  const joined = Boolean(table.merged_into);
  const reservation = !order && table.reservation && table.reservation.status === 'booked' ? table.reservation : null;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-touch-xl flex-col gap-2.5 rounded-2xl border border-border border-s-4 bg-card p-3 ps-3.5 text-start shadow-xs transition active:scale-[0.98] ${style.band} ${joined ? 'border-dashed' : ''}`}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-xl leading-tight font-bold text-foreground">{table.name}</span>
        {pending > 0 ? (
          <StatusBadge tone="pending" size="sm" title={t('pendingKitchen')}>{t('pendingToSend', { count: pending })}</StatusBadge>
        ) : joined ? (
          <Link2 size={18} className="shrink-0 text-muted-foreground" aria-label={tTables('mergedInto')} />
        ) : null}
      </span>
      <span className="mt-auto flex flex-col items-start gap-1.5">
        <StatusBadge tone={tone} size="sm">{tTables(TABLE_STATUS_LABEL_KEYS[table.status])}</StatusBadge>
        {order ? (
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Users size={14} />
            <Ltr>{order.guest_count ?? 1}</Ltr>
            {elapsed !== null && <span>· {t('openSince', { minutes: elapsed })}</span>}
          </span>
        ) : reservation ? (
          <span className="max-w-full truncate text-sm font-medium text-table-reserved">{reservation.name}</span>
        ) : null}
      </span>
    </button>
  );
}
