'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Order } from '@/lib/types';
import { ORDER_STATUS_TONE, PAYMENT_STATUS_TONE } from '@/lib/status-styles';
import { ORDER_TYPE_LABEL_KEYS } from '@/lib/order-types';
import { pendingDishCount } from '@/lib/kot';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { useFormatDate } from '@/hooks/useFormatDate';
import { StatusBadge } from '@/components/ui/status-badge';
import { Ltr } from '@/components/layout/Ltr';
import { paymentStatusOf } from '@/components/orders/OrderPanel';

interface Props {
  order: Order;
  selected: boolean;
  onOpen: (order: Order) => void;
}

/**
 * One order of the day, in one line: who, when, how much, where it stands.
 * The whole panel used to be drawn here, every action included, for every
 * order on the page — a wall. The line opens the panel beside the list.
 */
export function OrderListRow({ order, selected, onOpen }: Props) {
  const tOrders = useTranslations('orders');
  const t = useTranslations('serverApp');
  const fmt = useFormatCurrency();
  const { formatTime } = useFormatDate();
  const pending = pendingDishCount(order.items || []);
  const payStatus = paymentStatusOf(order);
  const statusLabel = tOrders(order.status === 'pending' ? 'pending'
    : order.status === 'preparing' ? 'preparing'
    : order.status === 'ready' ? 'ready'
    : order.status === 'served' ? 'served'
    : order.status === 'completed' ? 'completed'
    : 'cancelled');
  const title = order.table?.name ?? tOrders(ORDER_TYPE_LABEL_KEYS[order.type]);

  return (
    <button
      type="button"
      onClick={() => onOpen(order)}
      aria-current={selected ? 'true' : undefined}
      className={`flex min-h-touch-xl w-full items-center gap-4 rounded-2xl border bg-card px-4 py-2 text-start shadow-xs transition active:bg-muted ${
        selected ? 'border-brand ring-1 ring-brand' : 'border-border'
      } ${order.status === 'cancelled' ? 'opacity-60' : ''}`}
    >
      <span className="w-28 shrink-0 truncate text-lg font-bold text-foreground">{title}</span>
      <Ltr className="w-14 shrink-0 text-sm text-muted-foreground">{formatTime(order.created_at)}</Ltr>
      <span className="hidden w-28 shrink-0 truncate text-sm text-muted-foreground md:inline">
        {order.table ? tOrders(ORDER_TYPE_LABEL_KEYS[order.type]) : <Ltr>#{order.order_number}</Ltr>}
      </span>
      <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
        <StatusBadge tone={ORDER_STATUS_TONE[order.status] ?? 'neutral'} size="sm">{statusLabel}</StatusBadge>
        {pending > 0 && <StatusBadge tone="pending" size="sm">{t('pendingToSend', { count: pending })}</StatusBadge>}
      </span>
      {payStatus && (
        <StatusBadge tone={PAYMENT_STATUS_TONE[payStatus]} size="sm" className="shrink-0">
          {tOrders(payStatus === 'paid' ? 'paid' : payStatus === 'partial' ? 'partiallyPaid' : 'unpaidBadge')}
        </StatusBadge>
      )}
      <Ltr className="w-24 shrink-0 text-end text-lg font-bold text-foreground">{fmt(Number(order.total) || 0)}</Ltr>
      <ChevronRight size={20} className="rtl-flip shrink-0 text-muted-foreground/60" />
    </button>
  );
}
