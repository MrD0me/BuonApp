'use client';

import { Ban, Euro, RefreshCw, Trash2 } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { OrderItem } from '@/lib/types';
import { SERVICE_RUNS, serviceRunOf } from '@/lib/service-runs';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { Modal, ModalBody, ModalDescription, ModalHeader, ModalTitle } from '@/components/ui/modal';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  item: OrderItem;
  /**
   * How many the tapped line holds. More than this row holds, and every
   * action here is for this row alone — the title says so, "una di 3" or
   * "2 di 3" — so taking the last one added off a line of three leaves the
   * others where they are.
   */
  portionOf?: number;
  /** Set on a menu's own row while it can still change: how many menus it feeds. */
  menuCount?: { value: number; busy: boolean; onChange: (quantity: number) => void };
  kotEnabled: boolean;
  /** Which of the actions this user may take on this row right now. */
  canChangeRun: boolean;
  canEditPrice: boolean;
  canDelete: boolean;
  canVoid: boolean;
  canSwap: boolean;
  onChangeRun: (run: number) => void;
  onEditPrice: () => void;
  onDelete: () => void;
  onVoid: () => void;
  onSwap: () => void;
  onClose: () => void;
}

/**
 * Everything that can be done to one row, opened by tapping it: which wave
 * it goes out in, its price, taking it off the check. A sheet from the bottom
 * on a phone, a card on the till; every choice a button a finger can hit.
 */
export function LineActionSheet({
  item, portionOf = 1, menuCount, kotEnabled, canChangeRun, canEditPrice, canDelete, canVoid, canSwap,
  onChangeRun, onEditPrice, onDelete, onVoid, onSwap, onClose,
}: Props) {
  const tOrders = useTranslations('orders');
  const tPos = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  const run = serviceRunOf(item);
  const sent = item.kot_batch != null;
  const part = Number(item.quantity) || 1;

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="sm">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>
          <Ltr>{item.quantity}×</Ltr> {item.product_name}
          {portionOf > part && <span className="text-base font-normal text-muted-foreground"> · {tOrders('portionOf', { part, count: portionOf })}</span>}
        </ModalTitle>
        <ModalDescription>
          {item.special_instructions ? `${item.special_instructions} · ` : ''}
          <Ltr>{fmt(Number(item.unit_price))}</Ltr>
        </ModalDescription>
      </ModalHeader>
      <ModalBody className="flex flex-col gap-5">
        {/* The friend who arrives late, or the guest who orders from the card
            after all. Each tap is sent at once, like moving a wave. */}
        {menuCount && (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-foreground">{tOrders('menuCount')}</p>
            <Stepper
              value={menuCount.value}
              min={1}
              max={99}
              disabled={menuCount.busy}
              onChange={menuCount.onChange}
              decreaseLabel={tPos('menuOneLess')}
              increaseLabel={tPos('menuOneMore')}
            />
          </div>
        )}

        {/* Not for a menu's rows: a menu is a running order, its courses go
            out in their own turn, and its own row never reaches a station. */}
        {kotEnabled && canChangeRun && !item.menu_role && (
          <div className="flex flex-col gap-2">
            <p className="text-sm font-semibold text-foreground">{tPos('serviceRun')}</p>
            {sent && <p className="text-sm text-muted-foreground">{tPos('serviceRunAlreadySent')}</p>}
            <div className="grid grid-cols-3 gap-2">
              {SERVICE_RUNS.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  aria-pressed={candidate === run}
                  onClick={() => { onChangeRun(candidate); onClose(); }}
                  className={`h-touch rounded-xl text-base font-semibold transition active:scale-95 ${
                    candidate === run ? 'bg-brand text-white' : 'bg-muted text-foreground'
                  }`}
                >
                  <Ltr>{tPos('serviceRunShort', { n: candidate })}</Ltr>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          {canSwap && (
            <Button type="button" variant="outline" size="touch-lg" className="w-full justify-start" onClick={() => { onClose(); onSwap(); }}>
              <RefreshCw /> {tOrders('menuCourseSwap')}
            </Button>
          )}
          {canEditPrice && (
            <Button type="button" variant="outline" size="touch-lg" className="w-full justify-start" onClick={() => { onClose(); onEditPrice(); }}>
              <Euro /> {tOrders('editRow')}
            </Button>
          )}
          {canDelete && (
            <Button type="button" variant="outline" size="touch-lg" className="w-full justify-start text-table-occupied" onClick={() => { onClose(); onDelete(); }}>
              <Trash2 /> {tCommon('removeItem')}
            </Button>
          )}
          {canVoid && (
            <Button type="button" variant="outline" size="touch-lg" className="w-full justify-start text-table-occupied" onClick={() => { onClose(); onVoid(); }}>
              <Ban /> {tOrders('voidItem')}
              <span className="ms-auto text-xs font-normal text-muted-foreground">{tOrders('managerPin')}</span>
            </Button>
          )}
        </div>
      </ModalBody>
    </Modal>
  );
}
