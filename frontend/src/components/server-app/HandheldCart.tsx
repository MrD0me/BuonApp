'use client';

import { Send, SquarePen, Trash2, Users } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { CartItem, Category, Order, Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cartLineUnitPrice, courseSurcharge } from '@/lib/fixed-menu';
import { serviceRunOfCartLine } from '@/lib/service-runs';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { ActionBar } from '@/components/ui/action-bar';
import { EmptyState } from '@/components/ui/empty-state';
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
 *
 * Every control is a finger's width: the bin, the stepper, the run chips.
 * Tapping the dish's name opens its note and options.
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
  const dishCount = cart.itemCount();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {isNewOrder && (
          <div className="border-b border-border py-3">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-base font-semibold"><Users size={20} />{tPos('pax')}</span>
              <Stepper
                size="md"
                min={1}
                max={99}
                value={cart.guestCount}
                onChange={cart.setGuestCount}
                decreaseLabel={tPos('decreasePax')}
                increaseLabel={tPos('increasePax')}
              />
            </div>
            {coverChargeAmount > 0 && (
              <p className="mt-1.5 text-end text-sm text-muted-foreground">
                {t('coverCharge', { count: cart.guestCount, amount: fmt(coverChargeAmount) })}
              </p>
            )}
          </div>
        )}

        {cart.items.length === 0 ? (
          <EmptyState className="py-14" title={t('emptyDraft')} />
        ) : (
          <div>
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
              const lineTotal = cartLineUnitPrice(item) * (isMenu ? 1 : item.quantity);
              return (
                <div key={item.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-0">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-touch"
                      aria-label={tCommon('delete')}
                      onClick={() => cart.removeItem(item.id)}
                      className="shrink-0 text-muted-foreground"
                    >
                      <Trash2 />
                    </Button>
                    <button
                      type="button"
                      onClick={() => onEditItem(item)}
                      aria-label={`${tCommon('edit')}: ${item.product.name}`}
                      className="min-w-0 flex-1 rounded-lg py-1 text-start active:bg-muted"
                    >
                      <span className="flex items-center gap-1.5">
                        <span className="truncate text-base font-semibold text-foreground">{item.product.name}</span>
                        <SquarePen size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                      </span>
                      {item.addons.map((addon) => (
                        <span key={String(addon.id)} className="block text-sm text-muted-foreground">+ {addon.name}{(addon.quantity || 1) > 1 ? ` ×${addon.quantity}` : ''}{Number(addon.price) > 0 ? ` (${fmt(Number(addon.price) * (addon.quantity || 1))})` : ''}</span>
                      ))}
                      {menuCourses.map((course) => (
                        <span key={course.key} className="block text-sm text-muted-foreground">· {course.name}{course.surcharge > 0 ? ` (+${fmt(course.surcharge)})` : ''}{course.note && <span className="italic"> — {course.note}</span>}</span>
                      ))}
                      {item.special_instructions && <span className="block text-sm italic text-muted-foreground">{item.special_instructions}</span>}
                    </button>
                    {!isMenu && (
                      <Stepper
                        size="sm"
                        min={0}
                        value={item.quantity}
                        onChange={(quantity) => cart.updateQuantity(item.id, quantity)}
                        decreaseLabel={tPos('decreaseQuantity')}
                        increaseLabel={tPos('increaseQuantity')}
                        className="shrink-0"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 ps-12">
                    {kotPrintingEnabled && !isMenu ? (
                      <ServiceRunPicker value={serviceRunOfCartLine(item, categories)} onChange={(run) => cart.setServiceRun(item.id, run)} />
                    ) : <span />}
                    <span className="text-base font-semibold text-foreground"><Ltr>{fmt(lineTotal)}</Ltr></span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isNewOrder && cart.items.length > 0 && (
          <div className="py-4">
            <label htmlFor="handheld-order-notes" className="mb-1.5 block text-sm font-semibold text-muted-foreground">{tPos('orderNotesPlaceholder')}</label>
            <textarea
              id="handheld-order-notes"
              value={cart.orderNotes}
              onChange={(event) => cart.setOrderNotes(event.target.value.slice(0, 200))}
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}
      </div>

      <ActionBar className="flex-col items-stretch gap-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">{t('dishCount', { count: dishCount })}</span>
          <span className="text-xl font-bold text-foreground"><Ltr>{fmt(cart.subtotal())}</Ltr></span>
        </div>
        <Button
          type="button"
          size="touch-xl"
          onClick={onSend}
          disabled={submitting || cart.items.length === 0}
          className="w-full bg-brand text-white hover:bg-brand-hover"
        >
          <Send />
          {submitting ? t('sending') : existingOrder ? t('addToOrder') : t('sendToKitchen')}
        </Button>
      </ActionBar>
    </div>
  );
}
