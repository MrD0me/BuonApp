'use client';

import type { ReactNode } from 'react';
import { ChefHat, CreditCard, MoreHorizontal, Plus, Printer } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { Button } from '@/components/ui/button';
import { ActionBar } from '@/components/ui/action-bar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Props {
  canAdd: boolean;
  onAdd: () => void;
  /** Plates still to go to the kitchen; zero hides the button. */
  pendingCount: number;
  onSendToKitchen: () => void;
  sendingToKitchen: boolean;
  canPrint: boolean;
  onPrint: () => void;
  printing: boolean;
  canCheckout: boolean;
  onCheckout: () => void;
  generating: boolean;
  /** Items of the "more" menu: manager business, and whatever the host adds. */
  menu?: ReactNode;
}

/**
 * Four things the floor does, then everything else behind "more": voiding,
 * discounting the whole check, converting and cancelling are manager
 * business, and putting them in the same row as "add a dish" is how a footer
 * becomes a wall of buttons.
 */
export function OrderActionBar({
  canAdd, onAdd, pendingCount, onSendToKitchen, sendingToKitchen,
  canPrint, onPrint, printing, canCheckout, onCheckout, generating, menu,
}: Props) {
  const tOrders = useTranslations('orders');
  const tPos = useTranslations('pos');
  const tCommon = useTranslations('common');
  return (
    <ActionBar className="flex-wrap">
      {canAdd && (
        <Button type="button" variant="outline" size="touch-lg" onClick={onAdd} className="flex-1">
          <Plus /> {tOrders('addItem')}
        </Button>
      )}
      {pendingCount > 0 && (
        <Button type="button" variant="outline" size="touch-lg" onClick={onSendToKitchen} disabled={sendingToKitchen} className="flex-1 border-brand text-brand">
          <ChefHat /> {sendingToKitchen ? tPos('kotSending') : tPos('sendToKitchen', { count: pendingCount })}
        </Button>
      )}
      {canPrint && (
        <Button type="button" variant="outline" size="touch-lg" onClick={onPrint} disabled={printing} className="flex-1">
          <Printer /> {tOrders('printBillAction')}
        </Button>
      )}
      {canCheckout && (
        <Button type="button" size="touch-lg" onClick={onCheckout} disabled={generating} className="flex-[1.3]">
          <CreditCard /> {generating ? tOrders('generating') : tOrders('checkout')}
        </Button>
      )}
      {menu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" size="icon-touch" className="size-touch-lg" aria-label={tCommon('more')} title={tCommon('more')}>
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 [&_[data-slot=dropdown-menu-item]]:min-h-touch [&_[data-slot=dropdown-menu-item]]:text-base">
            {menu}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </ActionBar>
  );
}
