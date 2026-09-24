'use client';

import { useEffect, useMemo } from 'react';
import {
  ShoppingCart, Trash2, Pause, MapPin, SquarePen, Users, Send,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Stepper } from '@/components/ui/stepper';
import { ActionBar } from '@/components/ui/action-bar';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useCartStore } from '@/store/cart';
import { useHeldOrdersStore } from '@/store/held-orders';
import { useAuthStore } from '@/store/auth';
import { usePosSettingsStore } from '@/store/pos-settings';
import { useTranslations } from 'use-intl';
import toast from 'react-hot-toast';
import type { Table, Order, OrderItem, CartItem, Category, Product } from '@/lib/types';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { cartLineTotal, compactOrderRows, menuAwareRowOrder, menuLineDishes } from '@/lib/fixed-menu';
import { serviceRunOfCartLine } from '@/lib/service-runs';
import { Ltr } from '@/components/layout/Ltr';
import ServiceRunPicker from './ServiceRunPicker';

interface Props {
  tables: Table[];
  /** The catalogue, so a menu line can name the dishes chosen inside it. */
  products: Product[];
  /** For the run each line will go out on, which lives on its category. */
  categories: Category[];
  currency: string;
  submitting: boolean;
  onPlaceOrder: () => void;
  onShowTablePicker: () => void;
  onEditItem?: (item: CartItem) => void;
  existingOrder?: Order | null;
}

/**
 * The ticket being written, on the till.
 *
 * The table heads it — with "change" beside it — because the ticket is what
 * the table is about; the covers sit under it. Every line is a finger's
 * width: the bin, the stepper, the course chip. Tapping the dish's name
 * opens its note and options. The button at the bottom says what it does:
 * it sends the order.
 */
export default function CartPanel({ tables, products, categories, submitting, onPlaceOrder, onShowTablePicker, onEditItem, existingOrder }: Props) {
  const cart = useCartStore();
  const heldOrders = useHeldOrdersStore();
  const { currentTenant } = useAuthStore();
  const billingType = usePosSettingsStore((s) => s.billingType);
  const enabledOrderTypes = usePosSettingsStore((s) => s.orderTypes);
  const kotPrintingEnabled = usePosSettingsStore((s) => s.kotPrintingEnabled);
  const tablesRequired = usePosSettingsStore((s) => s.tablesRequired);
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const tServerApp = useTranslations('serverApp');
  const isRestaurant = (currentTenant?.business_type ?? 'restaurant') === 'restaurant';
  const fmt = useFormatCurrency();
  // What this tenant actually takes: the types the owner left on, minus
  // dine-in for a business without tables.
  const availableTypes = useMemo(
    () => enabledOrderTypes.filter((type) => isRestaurant || type !== 'dine_in'),
    [enabledOrderTypes, isRestaurant],
  );
  // A cart left on a type that has since been switched off would sit on
  // something the backend now refuses, with no button left to change it.
  const cartOrderType = cart.orderType;
  const setCartOrderType = cart.setOrderType;
  useEffect(() => {
    if (availableTypes.length > 0 && !availableTypes.includes(cartOrderType)) {
      setCartOrderType(availableTypes[0]);
    }
  }, [availableTypes, cartOrderType, setCartOrderType]);
  const canHold = isRestaurant && cart.orderType === 'dine_in' && cart.tableId && cart.items.length > 0 && billingType === 'postpaid';
  const showTable = isRestaurant && cart.orderType === 'dine_in' && tablesRequired;
  const tableName = cart.tableId ? tables.find((table) => table.id === cart.tableId)?.name || cart.tableId : null;
  // What the order already holds, read the way the table's own screens read
  // it: a menu's dishes under their menu, and rows that read the same as one
  // line — two Coca-Cola and a third added later are "3× Coca-Cola".
  const alreadyOrdered = useMemo(
    () => compactOrderRows(menuAwareRowOrder((existingOrder?.items || []).filter((item: OrderItem) => item.status !== 'cancelled'))),
    [existingOrder],
  );

  const handleHold = async () => {
    if (!cart.tableId) {
      toast.error(t('selectTableFirst'));
      return;
    }
    if (cart.items.length === 0) {
      toast.error(t('cartEmpty'));
      return;
    }
    try {
      await heldOrders.holdOrder(cart.tableId, cart.items, cart.customerId, cart.guestCount, cart.orderNotes);
      cart.clearCart();
      toast.success(t('orderHeldFor', { table: tableName ?? '' }));
    } catch {
      toast.error(t('holdOrderFailed'));
    }
  };

  const typeLabel = (type: (typeof availableTypes)[number]) =>
    type === 'dine_in' ? t('orderTypeDineIn') : type === 'takeaway' ? t('orderTypeTakeaway') : t('orderTypeDelivery');

  return (
    <div className="flex h-full w-full flex-col border-s border-border bg-card">
      {/* Head: which table (or which kind of order), and how many covers. */}
      <div className="flex shrink-0 flex-col gap-3 border-b border-border px-4 py-3">
        {/* One choice is not a choice: with everything but one type switched
            off the row is a button that can only say what it already says. */}
        {availableTypes.length > 1 && (
          <SegmentedControl
            stretch
            aria-label={t('orderTypeDineIn')}
            value={cart.orderType}
            onValueChange={(type) => cart.setOrderType(type as typeof cart.orderType)}
            items={availableTypes.map((type) => ({ value: type, label: typeLabel(type) }))}
            className="w-full"
          />
        )}

        {showTable && (tableName ? (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-lg font-bold text-foreground">
                {t('tableLabel', { name: tableName })}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {existingOrder
                  ? `${tServerApp('coversCount', { count: existingOrder.guest_count || 1 })} · ${tServerApp('openOrder')}`
                  : tServerApp('newOrder')}
              </p>
            </div>
            <Button type="button" variant="outline" size="touch" onClick={onShowTablePicker}>
              {t('changeTable')}
            </Button>
          </div>
        ) : (
          // One line, not two: the heading said "Seleziona Tavolo" in a space
          // that truncated it, next to a button saying the same words.
          <Button type="button" size="touch" onClick={onShowTablePicker} className="w-full">
            {t('selectTable')}
          </Button>
        ))}

        {/* The counter is for a new order only, as on the handheld. Adding to
            an open order sends the dishes and nothing else, so a counter here
            changed the screen and not the check. That order's covers show
            under the table's name, and are corrected from the order panel. */}
        {cart.orderType === 'dine_in' && !existingOrder && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-2 text-base font-semibold text-foreground"><Users size={18} />{t('pax')}</span>
            <Stepper
              size="md"
              min={1}
              max={99}
              value={cart.guestCount}
              onChange={cart.chooseGuestCount}
              decreaseLabel={t('decreasePax')}
              increaseLabel={t('increasePax')}
            />
          </div>
        )}

        {/* Delivery address — shown inline when delivery is selected */}
        {cart.orderType === 'delivery' && (
          <div className="flex items-center gap-2">
            <MapPin size={18} className="shrink-0 text-muted-foreground" />
            <input
              type="text"
              value={cart.deliveryAddress}
              onChange={(e) => cart.setDeliveryAddress(e.target.value)}
              placeholder={t('deliveryAddress')}
              aria-label={t('deliveryAddress')}
              className="h-touch flex-1 rounded-xl border border-input bg-card px-4 text-base outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {/* Previously ordered items (add-items mode) */}
        {alreadyOrdered.length > 0 && (
          <div className="border-b border-dashed border-border py-3">
            <p className="mb-1.5 text-xs font-semibold tracking-wider text-muted-foreground uppercase">{t('alreadyOrdered')}</p>
            <div className="flex flex-col gap-1">
              {alreadyOrdered.map(({ item, rows, quantity, total }) => (
                <div key={rows[0].id} className={`flex items-center justify-between text-sm text-muted-foreground ${item.menu_role === 'course' ? 'ps-4' : ''}`}>
                  <span><Ltr>{quantity}×</Ltr> {item.product_name}</span>
                  {/* A dish inside a menu is paid for by the package: it shows
                      a surcharge or nothing, as on every other screen. */}
                  <Ltr>{item.menu_role === 'course' ? (total > 0 ? `+${fmt(total)}` : '') : fmt(total)}</Ltr>
                </div>
              ))}
            </div>
          </div>
        )}

        {cart.items.length === 0 ? (
          <div className={`flex flex-col items-center justify-center gap-2 text-muted-foreground ${existingOrder ? 'py-6' : 'h-full min-h-40'}`}>
            <ShoppingCart size={existingOrder ? 24 : 36} />
            <p className="text-sm">{existingOrder ? t('addNewItemsAbove') : t('cartEmpty')}</p>
          </div>
        ) : (
          <div>
            {cart.items.map((item) => {
              // A fixed menu shows the dishes it was built from, counted, so
              // the floor can read back what was chosen without reopening the
              // window.
              const menuDishes = menuLineDishes(item, products);
              const isMenu = Boolean(item.menu_selection);
              const lineTotal = cartLineTotal(item);

              return (
                <div key={item.id} className="flex flex-col gap-2 border-b border-border py-3 last:border-0">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-touch"
                      aria-label={tCommon('removeItem')}
                      onClick={() => cart.removeItem(item.id)}
                      className="shrink-0 text-muted-foreground"
                    >
                      <Trash2 />
                    </Button>
                    {onEditItem ? (
                      <button
                        type="button"
                        onClick={() => onEditItem(item)}
                        aria-label={`${tCommon('edit')}: ${item.product.name}`}
                        className="min-w-0 flex-1 rounded-lg py-1 text-start active:bg-muted"
                      >
                        <span className="flex items-center gap-1.5">
                          {/* A menu line says how many menus up front: the count
                              is the thing the table was asked first. */}
                          {isMenu && <Ltr className="shrink-0 text-base font-bold text-brand">{item.quantity}×</Ltr>}
                          <span className="truncate text-base font-semibold text-foreground">{item.product.name}</span>
                          <SquarePen size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                        </span>
                        {item.addons.map((a) => (
                          <span key={a.id} className="block text-sm text-muted-foreground">
                            + {a.name}{(a.quantity || 1) > 1 ? ` ×${a.quantity}` : ''}{Number(a.price) > 0 ? ` (${fmt(Number(a.price) * (a.quantity || 1))})` : ''}
                          </span>
                        ))}
                        {menuDishes.map((dish) => (
                          <span key={dish.key} className="block text-sm text-muted-foreground">
                            · {dish.name}<Ltr> ×{dish.quantity}</Ltr>{dish.surcharge > 0 ? ` (+${fmt(dish.surcharge)})` : ''}
                            {dish.note && <span className="italic"> — {dish.note}</span>}
                          </span>
                        ))}
                        {item.special_instructions && (
                          <span className="block text-sm italic text-muted-foreground">{item.special_instructions}</span>
                        )}
                      </button>
                    ) : (
                      <div className="min-w-0 flex-1 py-1">
                        <span className="block truncate text-base font-semibold text-foreground">{item.product.name}</span>
                      </div>
                    )}
                  </div>
                  {/* Quantity sits on the second row with the run and the
                      price. On the first row it left the dish name 96 px —
                      eleven characters — so the cashier read "Spaghetti a…"
                      for the line they were about to send to the kitchen. */}
                  <div className="flex items-center justify-between gap-2 ps-2">
                    {/* Which wave it goes out in. Shown from the start rather
                        than once a run is in play: hiding it until something
                        is on run 2 leaves no way to put anything there.

                        Not on a menu line: a menu is not a dish and never
                        reaches a station. Its courses each carry their own
                        wave, set beside them in the menu window. */}
                    {isRestaurant && kotPrintingEnabled && !isMenu ? (
                      <ServiceRunPicker
                        value={serviceRunOfCartLine(item, categories)}
                        onChange={(run) => cart.setServiceRun(item.id, run)}
                      />
                    ) : <span />}
                    <span className="flex shrink-0 items-center gap-3">
                      {/* A menu line's count is changed in its window, with
                          its dishes in view: a stepper here could take a menu
                          off while the courses still held its dishes. */}
                      {!isMenu && (
                        <Stepper
                          size="sm"
                          min={0}
                          value={item.quantity}
                          onChange={(quantity) => cart.updateQuantity(item.id, quantity)}
                          decreaseLabel={t('decreaseQuantity')}
                          increaseLabel={t('increaseQuantity')}
                        />
                      )}
                      <span className="text-base font-semibold text-foreground"><Ltr>{fmt(lineTotal)}</Ltr></span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {cart.items.length > 0 && (
          <div className="py-4">
            <label htmlFor="pos-order-notes" className="mb-1.5 block text-sm font-semibold text-muted-foreground">{t('orderNotesPlaceholder')}</label>
            <textarea
              id="pos-order-notes"
              value={cart.orderNotes}
              onChange={(e) => cart.setOrderNotes(e.target.value.slice(0, 200))}
              rows={2}
              maxLength={200}
              className="w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-base outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
        )}
      </div>

      <ActionBar className="flex-col items-stretch gap-2.5">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm text-muted-foreground">{tServerApp('dishCount', { count: cart.itemCount() })}</span>
          <span className="text-2xl font-bold text-foreground"><Ltr>{fmt(cart.subtotal())}</Ltr></span>
        </div>
        <div className="flex gap-2.5">
          {canHold && (
            <Button
              type="button"
              variant="outline"
              size="icon-touch"
              aria-label={t('holdButton')}
              title={t('holdButton')}
              onClick={handleHold}
              className="size-touch-xl shrink-0"
            >
              <Pause />
            </Button>
          )}
          <Button
            type="button"
            onClick={onPlaceOrder}
            disabled={submitting || cart.items.length === 0}
            size="touch-xl"
            className="flex-1 bg-brand text-white hover:bg-brand-hover"
          >
            <Send />
            {submitting ? t('placing') : t('placeOrderButton')}
          </Button>
        </div>
      </ActionBar>
    </div>
  );
}
