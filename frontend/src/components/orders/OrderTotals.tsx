'use client';

import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  subtotal: number;
  discount: number;
  coverCharge: number;
  guestCount?: number | null;
  total: number;
  /** Set when a bill exists and is partly paid. */
  partial?: { paid: number; balance: number } | null;
}

/** The bottom of the bill: subtotal, discount, cover, total. */
export function OrderTotals({ subtotal, discount, coverCharge, guestCount, total, partial }: Props) {
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  return (
    <div className="flex flex-col gap-1 border-t border-dashed border-border px-2 pt-3">
      <div className="flex justify-between text-sm text-muted-foreground">
        <span>{tCommon('subtotal')}</span>
        <Ltr>{fmt(subtotal)}</Ltr>
      </div>
      {discount > 0 && (
        <div className="flex justify-between text-sm text-table-held">
          <span>{tCommon('discount')}</span>
          <Ltr>-{fmt(discount)}</Ltr>
        </div>
      )}
      {coverCharge > 0 && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{tOrders('coverCharge')}{guestCount ? ` (${guestCount})` : ''}</span>
          <Ltr>{fmt(coverCharge)}</Ltr>
        </div>
      )}
      <div className="mt-1 flex justify-between border-t border-border pt-2 text-xl font-bold text-foreground">
        <span>{tCommon('total')}</span>
        <Ltr>{fmt(total)}</Ltr>
      </div>
      {partial && (
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{tOrders('paid')} <Ltr>{fmt(partial.paid)}</Ltr></span>
          <span>{tOrders('balance')} <Ltr>{fmt(partial.balance)}</Ltr></span>
        </div>
      )}
    </div>
  );
}
