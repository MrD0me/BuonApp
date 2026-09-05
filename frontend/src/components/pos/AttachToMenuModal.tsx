'use client';

import { X } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Product } from '@/lib/types';
import type { OpenSlot } from '@/lib/fixed-menu';

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
  const fmt = useFormatCurrency();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm max-h-[85vh] flex flex-col">
        <div className="flex justify-between items-start p-5 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
            <p className="text-sm text-gray-500">{t('attachToMenuQuestion')}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {slots.map((slot) => (
            <button
              key={`${slot.target.kind === 'cart' ? slot.target.cartItemId : slot.target.groupId}:${slot.course.id}`}
              type="button"
              onClick={() => onAttach(slot)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-brand bg-brand-light text-brand hover:brightness-95 transition"
            >
              <span className="text-start">
                <span className="block text-sm font-semibold">{slot.menuLabel}</span>
                <span className="block text-xs opacity-80">{slot.course.label}</span>
              </span>
              {/* What it adds, if anything. The rest of the dish is on the menu
                  price, and the check will say so. */}
              <span className="text-sm font-semibold shrink-0">
                {slot.surcharge > 0 ? `+${fmt(slot.surcharge)}` : t('attachToMenuIncluded')}
              </span>
            </button>
          ))}

          <button
            type="button"
            onClick={onSeparate}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:border-gray-300 transition"
          >
            <span className="text-sm font-semibold">{t('attachToMenuSeparate')}</span>
            <span className="text-sm text-gray-500 shrink-0">{fmt(Number(product.price) || 0)}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
