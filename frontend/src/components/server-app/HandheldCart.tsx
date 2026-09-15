'use client';

import { Minus, Plus, Send, SquarePen, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { CartItem, Category, Order, Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cartLineUnitPrice, courseSurcharge } from '@/lib/fixed-menu';
import { serviceRunOfCartLine } from '@/lib/service-runs';
import { Ltr } from '@/components/layout/Ltr';
import ServiceRunPicker from '@/components/pos/ServiceRunPicker';

interface Props {
  products: Product[];
  categories: Category[];
  kotPrintingEnabled: boolean;
  /** So much a head, or zero: shown as a line so the covers stepper has a visible consequence. */
  coverChargeAmount: number;
  /** The order these lines will be added to, or null when they open one. */
  existingOrder: Order | null;
  submitting: boolean;
  onEditItem: (item: CartItem) => void;
  onSend: () => void;
}

/**
 * What is about to be sent.
 *
 * The same lines the till's cart draws, without the parts a handheld does
 * not have: no order type (a phone in the dining room takes orders at
 * tables), no hold, no customer. A menu line shows the dishes chosen inside
 * it and has no quantity — one menu is one line — and every dish carries the
 * wave it will go out on, which is the one thing the kitchen cannot guess.
 */
export function HandheldCart({
  products, categories, kotPrintingEnabled, coverChargeAmount, existingOrder, submitting, onEditItem, onSend,
}: Props) {
  const t = useTranslations('serverApp');
  const tPos = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  const cart = useCartStore();
  const isNewOrder = !existingOrder;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {isNewOrder && (
          <div className="mb-3 space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-white px-3 py-2">
              <span className="flex items-center gap-2 text-sm text-gray-600"><Users size={15} />{tPos('pax')}</span>
              <span className="flex items-center gap-2">
                <button type="button" aria-label={tPos('decreasePax')} onClick={() => cart.setGuestCount(Math.max(1, cart.guestCount - 1))} className="flex size-9 items-center justify-center rounded-full bg-gray-100"><Minus size={14} /></button>
                <span className="w-8 text-center text-base font-semibold"><Ltr>{cart.guestCount}</Ltr></span>
                <button type="button" aria-label={tPos('increasePax')} onClick={() => cart.setGuestCount(Math.min(99, cart.guestCount + 1))} className="flex size-9 items-center justify-center rounded-full bg-gray-100"><Plus size={14} /></button>
              </span>
            </div>
            {coverChargeAmount > 0 && (
              <p className="text-end text-xs text-gray-500">
                {t('coverCharge', { count: cart.guestCount, amount: fmt(coverChargeAmount) })}
              </p>
            )}
          </div>
        )}

        {cart.items.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">{t('emptyDraft')}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {cart.items.map((item) => {
              const isMenu = Boolean(item.menu_selection);
              const menuCourses = (item.menu_selection || []).map((choice) => {
                const course = (item.product.courses || []).find((entry) => entry.id === choice.course_id);
                const dish = products.find((candidate) => candidate.id === choice.product_id);
                return {
                  key: `${choice.course_id}:${choice.product_id}`,
                  name: dish?.name ?? '—',
                  surcharge: course ? courseSurcharge(course, choice.product_id) : 0,
                  note: choice.note || '',
                };
              });
              return (
                <div key={item.id} className="flex items-start gap-2 py-2">
                  <button type="button" aria-label={tCommon('delete')} onClick={() => cart.removeItem(item.id)} className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full text-gray-300 active:text-red-500"><Trash2 size={14} /></button>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium text-gray-900">{item.product.name}</p>
                      <button type="button" onClick={() => onEditItem(item)} className="flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"><SquarePen size={12} />{tCommon('edit')}</button>
                    </div>
                    {item.addons.map((addon) => (
                      <p key={String(addon.id)} className="text-xs text-gray-500">+ {addon.name}{(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}{Number(addon.price) > 0 ? ` (${fmt(Number(addon.price) * (addon.quantity || 1))})` : ''}</p>
                    ))}
                    {menuCourses.map((course) => (
                      <p key={course.key} className="text-xs text-gray-500">· {course.name}{course.surcharge > 0 ? ` (+${fmt(course.surcharge)})` : ''}{course.note && <span className="italic"> — {course.note}</span>}</p>
                    ))}
                    {item.special_instructions && <p className="text-xs italic text-gray-500">{item.special_instructions}</p>}
                    <div className="mt-1 flex items-center gap-2">
                      <span className="text-sm text-gray-500"><Ltr>{fmt(cartLineUnitPrice(item))}</Ltr></span>
                      {kotPrintingEnabled && !isMenu && (
                        <ServiceRunPicker value={serviceRunOfCartLine(item, categories)} onChange={(run) => cart.setServiceRun(item.id, run)} />
                      )}
                    </div>
                  </div>
                  {isMenu ? (
                    <span className="w-8 shrink-0 text-center text-sm text-gray-400">1</span>
                  ) : (
                    <span className="flex shrink-0 items-center gap-1">
                      <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity - 1)} className="flex size-8 items-center justify-center rounded-full bg-gray-100"><Minus size={14} /></button>
                      <span className="w-6 text-center text-sm font-semibold"><Ltr>{item.quantity}</Ltr></span>
                      <button type="button" onClick={() => cart.updateQuantity(item.id, item.quantity + 1)} className="flex size-8 items-center justify-center rounded-full bg-gray-100"><Plus size={14} /></button>
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 p-4">
        {isNewOrder && cart.items.length > 0 && (
          <div className="mb-3">
            <textarea
              value={cart.orderNotes}
              onChange={(event) => cart.setOrderNotes(event.target.value.slice(0, 200))}
              placeholder={tPos('orderNotesPlaceholder')}
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand focus:outline-none"
            />
          </div>
        )}
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">{t('draftTotal')}</span>
          <span className="text-lg font-bold"><Ltr>{fmt(cart.subtotal())}</Ltr></span>
        </div>
        <button
          type="button"
          onClick={onSend}
          disabled={submitting || cart.items.length === 0}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand font-semibold text-white disabled:opacity-50"
        >
          <Send size={17} />
          {submitting ? t('sending') : existingOrder ? t('addToOrder') : t('sendToKitchen')}
        </button>
      </div>
    </div>
  );
}
