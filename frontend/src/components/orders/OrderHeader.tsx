'use client';

import type { ReactNode } from 'react';
import { Clock } from 'lucide-react';
import type { Order } from '@/lib/types';
import type { Tone } from '@/lib/status-styles';
import { StatusBadge } from '@/components/ui/status-badge';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  order: Order;
  statusTone: Tone;
  statusLabel: string;
  paymentTone?: Tone | null;
  paymentLabel?: string | null;
  typeLabel: string;
  timeSince: string;
  /** Small icon buttons on the end: share, print. */
  actions?: ReactNode;
}

/**
 * The first line of an order: what it is and where it stands. The order
 * number is secondary — the table or the type is what the floor calls it —
 * and the state is one pill, not three.
 */
export function OrderHeader({ order, statusTone, statusLabel, paymentTone, paymentLabel, typeLabel, timeSince, actions }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="font-medium">{typeLabel}</span>
        <span className="flex items-center gap-1"><Clock size={14} />{timeSince}</span>
        <span>#<Ltr>{order.order_number}</Ltr></span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <StatusBadge tone={statusTone}>{statusLabel}</StatusBadge>
        {paymentTone && paymentLabel && <StatusBadge tone={paymentTone}>{paymentLabel}</StatusBadge>}
        {actions}
      </div>
    </div>
  );
}
