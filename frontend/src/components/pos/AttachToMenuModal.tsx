'use client';

import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Product } from '@/lib/types';
import type { OpenSlot } from '@/lib/fixed-menu';
import { Modal, ModalBody, ModalDescription, ModalHeader, ModalTitle } from '@/components/ui/modal';

/**
 * "Is this one inside the menu?"
 *
 * The table takes two set menus and one guest orders à la carte. The dishes go
 * in from the grid like any others, and this is where the floor says which of
 * them the menu is paying for — once, with a tap, while it is ordering.
 *
 * The alternative was to work it out at the till from the totals, and it does
 * not work: two guests on the menu took the tagliatelle and the third ordered
 * the same dish on its own, and nothing in the check can say which one was
 * inside. Getting it wrong changes what the guest pays.
 *
 * Never silent and never a dialog nobody asked for: it opens only when the dish
 * genuinely fits a course with room left, and "on its own" is always there. A
 * house with no set menus never sees it.
 *
 * Props in, callback out, no API client — mountable on the handheld unchanged.
 */
interface Props {
  product: Product;
  slots: OpenSlot[];
  onAttach: (slot: OpenSlot) => void;
  /** Ordered as an ordinary dish, priced on its own. */
  onSeparate: () => void;
  onClose: () => void;
}

export default function AttachToMenuModal({ product, slots, onAttach, onSeparate, onClose }: Props) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();

  return (
    <Modal open onOpenChange={(open) => { if (!open) onClose(); }} size="sm">
      <ModalHeader closeLabel={tCommon('close')}>
        <ModalTitle>{product.name}</ModalTitle>
        <ModalDescription>{t('attachToMenuQuestion')}</ModalDescription>
      </ModalHeader>

      <ModalBody className="flex flex-col gap-2.5">
        {slots.map((slot) => (
          <button
            key={`${slot.target.kind === 'cart' ? slot.target.cartItemId : slot.target.groupId}:${slot.course.id}`}
            type="button"
            onClick={() => onAttach(slot)}
            className="flex min-h-touch-xl w-full items-center justify-between gap-3 rounded-xl border border-brand bg-brand-light px-4 py-2 text-brand transition active:scale-[0.99]"
          >
            <span className="min-w-0 text-start">
              <span className="block text-base font-semibold">{slot.menuLabel}</span>
              <span className="block text-sm opacity-80">{slot.course.label}</span>
            </span>
            {/* What it adds, if anything. The rest of the dish is on the menu
                price, and the check will say so. */}
            <span className="shrink-0 text-base font-semibold">
              {slot.surcharge > 0 ? `+${fmt(slot.surcharge)}` : t('attachToMenuIncluded')}
            </span>
          </button>
        ))}

        <button
          type="button"
          onClick={onSeparate}
          className="flex min-h-touch-xl w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-2 text-foreground transition active:scale-[0.99]"
        >
          <span className="text-base font-semibold">{t('attachToMenuSeparate')}</span>
          <span className="shrink-0 text-base text-muted-foreground">{fmt(Number(product.price) || 0)}</span>
        </button>
      </ModalBody>
    </Modal>
  );
}
