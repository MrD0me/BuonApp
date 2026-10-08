'use client';

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Addon, CartItem, Category, FixedMenuSelection, Order, Product, Table } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { generateCartItemId } from '@/lib/cart-identity';
import { isFixedMenu, menuGroupsOfOrder, menuLinesOfCart, menuLinesOfOrder, openSlotsForProduct, type OpenSlot } from '@/lib/fixed-menu';
import { needsOptionsDialog } from '@/lib/product-options';
import { Button } from '@/components/ui/button';
import { ActionBar } from '@/components/ui/action-bar';
import { Ltr } from '@/components/layout/Ltr';
import AddonModal from '@/components/pos/AddonModal';
import FixedMenuPicker from '@/components/pos/FixedMenuPicker';
import AttachToMenuModal from '@/components/pos/AttachToMenuModal';
import { HandheldProductList } from './HandheldProductList';
import { HandheldCart } from './HandheldCart';
import { HeaderSubtitle, useHeaderTone } from './handheld-status';
import type { QueueEntry } from './send-queue';
import type { DraftMenuWindow } from './handheld-draft';

interface Props {
  table: Table;
  /**
   * The table is no longer on the floor the PC serves — the map was edited
   * while this ticket was being written. The ticket stays; the header says so.
   */
  tableMissing?: boolean;
  /** The order already open on the table, which the cart will be added to. */
  pendingOrder: Order | null;
  /**
   * This phone's ticket still waiting to open the table. What is written now
   * goes on after it, onto the order it opens, so the covers and notes are
   * that ticket's and are not asked again.
   */
  queuedOpening?: QueueEntry | null;
  products: Product[];
  categories: Category[];
  kotPrintingEnabled: boolean;
  coverChargeAmount: number;
  currency: string;
  /** The ticket screen over the menu: the shell keeps it, so «back» can close it. */
  ticketOpen: boolean;
  onTicketOpenChange: (open: boolean) => void;
  /** What the open menu window has counted, for the draft; null when it closes the usual way. */
  onMenuWindowChange?: (menuWindow: DraftMenuWindow | null) => void;
  /** A menu window the page lost while it was open, to open again as it was. */
  restoreMenuWindow?: DraftMenuWindow | null;
  onMenuWindowRestored?: () => void;
  onBack: () => void;
  onSend: () => void;
  /** A dish put inside a menu already on the check; resolves false when the check refused it. */
  onAttachToOrderMenu: (groupId: string, courseId: string, productIds: string[]) => Promise<boolean>;
}

/** A fixed menu's window, with the menu as it read when the window opened. */
interface MenuWindow {
  menu: Product;
  /**
   * The catalogue is re-read every minute. A dish switched off on the PC while
   * the waiter is counting would leave its course mid-count, and every row
   * under it would move up under the finger; the window keeps the dishes it
   * opened with, and the check refuses the switched-off one at sending.
   */
  products: Product[];
  /** The cart line being edited, when the menu is already on the ticket. */
  line?: CartItem;
  /** What it had counted when the page lost it: the window reopens with it. */
  restored?: { menus: number | null; selection: FixedMenuSelection };
}

/**
 * Taking the order: the till's Ordina screen, on a phone.
 *
 * Two screens under one header: the menu, and the ticket being written. A
 * tap on a dish goes the same ways it does on the central PC — a menu is
 * composed, a dish that fits an open course is asked about, a dish with
 * options opens them — and a dish with nothing to decide goes straight in.
 * The bar at the bottom says how much is on the ticket and opens it.
 *
 * The three windows are the till's own, mounted as they are. They sit one
 * layer above the page, so the ticket stays where it is while a line is
 * being edited.
 *
 * The headers and the bar at the bottom are solid, not frosted: a blur
 * behind them is redrawn at every frame of a scroll, and on a cheap phone
 * that was the scroll.
 */
export function OrdinaView({
  table, tableMissing = false, pendingOrder, queuedOpening = null, products, categories, kotPrintingEnabled, coverChargeAmount, currency,
  ticketOpen, onTicketOpenChange, onMenuWindowChange, restoreMenuWindow = null, onMenuWindowRestored,
  onBack, onSend, onAttachToOrderMenu,
}: Props) {
  const t = useTranslations('serverApp');
  const fmt = useFormatCurrency();
  const cartItems = useCartStore((state) => state.items);
  const guestCount = useCartStore((state) => state.guestCount);
  // The menu's own filter, kept up here because the list comes off the page
  // whenever the ticket is opened: held inside it, the category the waiter
  // had found would be gone on the way back from every glance at the check.
  const [menuQuery, setMenuQuery] = useState('');
  const [menuCategoryId, setMenuCategoryId] = useState('all');
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [menuWindow, setMenuWindow] = useState<MenuWindow | null>(null);
  const [attachProduct, setAttachProduct] = useState<{ product: Product; slots: OpenSlot[] } | null>(null);
  const [attaching, setAttaching] = useState(false);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  /** Where the menu was scrolled to when the ticket was opened over it. */
  const menuScroll = useRef(0);

  // Menus with room left, wherever they are: still in the cart, or already
  // on the check of the table being added to.
  const openMenuLines = useMemo(() => [
    ...menuLinesOfCart(cartItems),
    ...menuLinesOfOrder(menuGroupsOfOrder(pendingOrder?.items || [], products)),
  ], [cartItems, pendingOrder, products]);

  const handleProductClick = useCallback((product: Product) => {
    // A menu already in the cart reopens that line: the table's count and
    // dishes go on one line, not two.
    if (isFixedMenu(product)) {
      const existing = useCartStore.getState().items.find((item) => item.menu_selection && item.product.id === product.id);
      setMenuWindow({ menu: existing ? existing.product : product, products, line: existing });
      return;
    }
    const slots = openSlotsForProduct(product, openMenuLines);
    if (slots.length > 0) {
      setAttachProduct({ product, slots });
      return;
    }
    if (needsOptionsDialog(product)) {
      setAddonProduct(product);
      return;
    }
    useCartStore.getState().addItem(product, 1, [], '');
  }, [openMenuLines, products]);

  // The − on a dish takes a plate off the line its + fills: the plain one, no
  // note and no add-on, which is where a tap made by mistake went. A dish with
  // no plain line — every plate carries add-ons, or a note from the pencil —
  // gives up its latest line instead. A plate inside a menu is not reached:
  // it is the menu's, and comes off in the menu's window.
  const handleProductRemove = useCallback((product: Product) => {
    const cart = useCartStore.getState();
    const plainId = generateCartItemId(product.id, [], '');
    const line = cart.items.find((item) => item.id === plainId)
      ?? [...cart.items].reverse().find((item) => item.product.id === product.id && !item.menu_selection);
    if (line) cart.updateQuantity(line.id, line.quantity - 1);
  }, []);

  /**
   * A dish put inside a menu. In the cart that cannot fail. On the check it
   * needs the PC, and the window stays open until the check has taken it: it
   * used to close first, and a refusal — the phone out of reach of the PC —
   * dropped the dish without a trace.
   */
  const handleAttachToMenu = async (slot: OpenSlot) => {
    const chosen = attachProduct;
    if (!chosen || attaching) return;
    if (slot.target.kind === 'cart') {
      setAttachProduct(null);
      useCartStore.getState().attachToMenu(slot.target.cartItemId, slot.course.id, chosen.product.id);
      return;
    }
    setAttaching(true);
    try {
      const taken = await onAttachToOrderMenu(slot.target.groupId, slot.course.id, [...slot.taken, chosen.product.id]);
      if (taken) setAttachProduct(null);
    } finally {
      setAttaching(false);
    }
  };

  const handleAddonAdd = (product: Product, quantity: number, addons: Addon[], instructions: string) => {
    useCartStore.getState().addItem(product, quantity, addons, instructions);
  };

  const handleEditItemSave = (_product: Product, quantity: number, addons: Addon[], instructions: string) => {
    if (!editingCartItem) return;
    useCartStore.getState().updateItemDetails(editingCartItem.id, quantity, addons, instructions);
  };

  const closeMenuWindow = () => {
    setMenuWindow(null);
    onMenuWindowChange?.(null);
  };

  const handleMenuSave = (menu: Product, menus: number, selection: FixedMenuSelection) => {
    const line = menuWindow?.line;
    if (line) useCartStore.getState().updateMenuSelection(line.id, menus, selection);
    else useCartStore.getState().addFixedMenu(menu, menus, selection);
    closeMenuWindow();
  };

  // A menu window the page lost while it was open — a reload, the phone
  // throwing the tab away, a back gesture — opens again with what it had
  // counted, over the line it was editing if that line is still there.
  useEffect(() => {
    if (!restoreMenuWindow || products.length === 0) return;
    const line = restoreMenuWindow.lineId
      ? useCartStore.getState().items.find((item) => item.id === restoreMenuWindow.lineId && item.menu_selection)
      : undefined;
    const menu = line?.product ?? products.find((product) => product.id === restoreMenuWindow.menuProductId);
    onMenuWindowRestored?.();
    if (!menu) return;
    setMenuWindow({
      menu,
      products,
      ...(line ? { line } : {}),
      restored: { menus: restoreMenuWindow.menus, selection: restoreMenuWindow.selection },
    });
  }, [restoreMenuWindow, products, onMenuWindowRestored]);

  const openTicket = () => {
    menuScroll.current = window.scrollY;
    onTicketOpenChange(true);
  };

  // Back from the ticket, the menu is drawn again from the top; it is put
  // back where the waiter left it before the screen is painted.
  useLayoutEffect(() => {
    if (ticketOpen || menuScroll.current === 0) return;
    window.scrollTo(0, menuScroll.current);
  }, [ticketOpen]);

  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = useCartStore((state) => state.subtotal());
  const guests = pendingOrder?.guest_count ?? queuedOpening?.guestCount ?? guestCount;
  const addsToOrder = Boolean(pendingOrder || queuedOpening);
  const subtitle = tableMissing
    ? t('tableMissing')
    : `${t('coversCount', { count: guests })} · ${addsToOrder ? t('openOrder') : t('newOrder')}`;
  const headerTone = useHeaderTone();

  const header = (title: string, backLabel: string, onBackClick: () => void) => (
    <header className={`sticky top-0 z-20 border-b border-border pt-[env(safe-area-inset-top)] ${headerTone}`}>
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-2">
        <Button type="button" variant="ghost" size="icon-touch" onClick={onBackClick} aria-label={backLabel}>
          <ArrowLeft className="rtl-flip size-6" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-bold">{title}</h1>
          <HeaderSubtitle className={tableMissing ? 'font-semibold text-pending' : 'text-muted-foreground'}>{subtitle}</HeaderSubtitle>
        </div>
      </div>
    </header>
  );

  const windows = (
    <>
      {addonProduct && (
        <AddonModal
          product={addonProduct}
          currency={currency}
          onAdd={handleAddonAdd}
          onClose={() => setAddonProduct(null)}
        />
      )}

      {menuWindow && (
        <FixedMenuPicker
          menu={menuWindow.menu}
          products={menuWindow.products}
          covers={guests}
          {...(menuWindow.line ? {
            mode: 'edit' as const,
            initialSelection: menuWindow.restored?.selection ?? (menuWindow.line.menu_selection || []),
            initialMenus: menuWindow.restored?.menus ?? menuWindow.line.quantity,
          } : menuWindow.restored ? {
            initialSelection: menuWindow.restored.selection,
            ...(menuWindow.restored.menus !== null ? { initialMenus: menuWindow.restored.menus } : {}),
          } : {})}
          onSelectionChange={(menus, selection) => onMenuWindowChange?.({
            menuProductId: menuWindow.menu.id,
            ...(menuWindow.line ? { lineId: menuWindow.line.id } : {}),
            menus,
            selection,
          })}
          onAdd={handleMenuSave}
          onClose={closeMenuWindow}
        />
      )}

      {attachProduct && (
        <AttachToMenuModal
          product={attachProduct.product}
          slots={attachProduct.slots}
          onAttach={(slot) => { void handleAttachToMenu(slot); }}
          onSeparate={() => {
            const chosen = attachProduct.product;
            setAttachProduct(null);
            if (needsOptionsDialog(chosen)) setAddonProduct(chosen);
            else useCartStore.getState().addItem(chosen, 1, [], '');
          }}
          onClose={() => { if (!attaching) setAttachProduct(null); }}
        />
      )}

      {editingCartItem && (
        <AddonModal
          product={editingCartItem.product}
          currency={currency}
          mode="edit"
          initialQuantity={editingCartItem.quantity}
          initialAddons={editingCartItem.addons}
          initialInstructions={editingCartItem.special_instructions}
          onAdd={handleEditItemSave}
          onClose={() => setEditingCartItem(null)}
        />
      )}
    </>
  );

  if (ticketOpen) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        {header(t('cart'), t('backToMenu'), () => onTicketOpenChange(false))}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <HandheldCart
            products={products}
            categories={categories}
            kotPrintingEnabled={kotPrintingEnabled}
            coverChargeAmount={coverChargeAmount}
            existingOrder={pendingOrder}
            addsToQueued={!pendingOrder && Boolean(queuedOpening)}
            onEditItem={(item) => {
              if (item.menu_selection) setMenuWindow({ menu: item.product, products, line: item });
              else setEditingCartItem(item);
            }}
            onSend={onSend}
          />
        </div>
        {windows}
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {header(table.name, t('backToFloor'), onBack)}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-3">
        <HandheldProductList
          products={products}
          categories={categories}
          query={menuQuery}
          onQueryChange={setMenuQuery}
          categoryId={menuCategoryId}
          onCategoryChange={setMenuCategoryId}
          onProductClick={handleProductClick}
          onProductRemove={handleProductRemove}
          onProductOptions={setAddonProduct}
        />
      </main>

      {/* The ticket, in one bar: how many plates and how much, and a tap opens it. */}
      <ActionBar className="bg-background backdrop-blur-none">
        <Button
          type="button"
          size="touch-xl"
          onClick={openTicket}
          className="w-full justify-between bg-brand text-white hover:bg-brand-hover"
        >
          <span className="flex items-center gap-2.5">
            <ShoppingCart />
            <span>{t('cart')}</span>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/25 px-2 text-sm font-bold"><Ltr>{itemCount}</Ltr></span>
          </span>
          <Ltr>{fmt(subtotal)}</Ltr>
        </Button>
      </ActionBar>
      {windows}
    </div>
  );
}
