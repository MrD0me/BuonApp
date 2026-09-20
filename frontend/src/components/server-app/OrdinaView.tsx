'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Addon, CartItem, Category, FixedMenuSelection, Order, Product, Table } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { isFixedMenu, menuGroupsOfOrder, menuLinesOfCart, menuLinesOfOrder, openSlotsForProduct, type OpenSlot } from '@/lib/fixed-menu';
import { needsOptionsDialog } from '@/lib/product-options';
import { Button } from '@/components/ui/button';
import { ActionBar } from '@/components/ui/action-bar';
import { Ltr } from '@/components/layout/Ltr';
import AddonModal from '@/components/pos/AddonModal';
import FixedMenuPicker from '@/components/pos/FixedMenuPicker';
import AttachToMenuModal from '@/components/pos/AttachToMenuModal';
import { HandheldProductGrid } from './HandheldProductGrid';
import { HandheldCart } from './HandheldCart';

interface Props {
  table: Table;
  /** The order already open on the table, which the cart will be added to. */
  pendingOrder: Order | null;
  products: Product[];
  categories: Category[];
  kotPrintingEnabled: boolean;
  coverChargeAmount: number;
  currency: string;
  submitting: boolean;
  onBack: () => void;
  onSend: () => Promise<void>;
  /** A dish put inside a menu already on the check; resolves false when the check refused it. */
  onAttachToOrderMenu: (groupId: string, courseId: string, productIds: string[]) => Promise<boolean>;
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
 */
export function OrdinaView({
  table, pendingOrder, products, categories, kotPrintingEnabled, coverChargeAmount, currency, submitting,
  onBack, onSend, onAttachToOrderMenu,
}: Props) {
  const t = useTranslations('serverApp');
  const fmt = useFormatCurrency();
  const cart = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
  // The menu's own filter, kept up here because the grid comes off the page
  // whenever the ticket is opened: held inside it, the category the waiter
  // had found would be gone on the way back from every glance at the check.
  const [menuQuery, setMenuQuery] = useState('');
  const [menuCategoryId, setMenuCategoryId] = useState('all');
  const [addonProduct, setAddonProduct] = useState<Product | null>(null);
  const [menuProduct, setMenuProduct] = useState<Product | null>(null);
  const [attachProduct, setAttachProduct] = useState<{ product: Product; slots: OpenSlot[] } | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [editingMenuItem, setEditingMenuItem] = useState<CartItem | null>(null);

  // Menus with room left, wherever they are: still in the cart, or already
  // on the check of the table being added to.
  const openMenuLines = useMemo(() => [
    ...menuLinesOfCart(cart.items),
    ...menuLinesOfOrder(menuGroupsOfOrder(pendingOrder?.items || [], products)),
  ], [cart.items, pendingOrder, products]);

  const handleProductClick = (product: Product) => {
    if (isFixedMenu(product)) {
      setMenuProduct(product);
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
    cart.addItem(product, 1, [], '');
  };

  const handleAttachToMenu = async (slot: OpenSlot) => {
    const chosen = attachProduct;
    if (!chosen) return;
    setAttachProduct(null);
    if (slot.target.kind === 'cart') {
      cart.attachToMenu(slot.target.cartItemId, slot.course.id, chosen.product.id);
      return;
    }
    await onAttachToOrderMenu(slot.target.groupId, slot.course.id, [...slot.taken, chosen.product.id]);
  };

  const handleAddonAdd = (product: Product, quantity: number, addons: Addon[], instructions: string) => {
    cart.addItem(product, quantity, addons, instructions);
  };

  const handleEditItemSave = (_product: Product, quantity: number, addons: Addon[], instructions: string) => {
    if (!editingCartItem) return;
    cart.updateItemDetails(editingCartItem.id, quantity, addons, instructions);
  };

  const handleMenuAdd = (menu: Product, selection: FixedMenuSelection) => {
    cart.addFixedMenu(menu, selection);
    setMenuProduct(null);
  };

  const handleMenuEditSave = (_menu: Product, selection: FixedMenuSelection) => {
    if (!editingMenuItem) return;
    cart.updateMenuSelection(editingMenuItem.id, selection);
    setEditingMenuItem(null);
  };

  const itemCount = cart.itemCount();
  const guests = pendingOrder?.guest_count ?? cart.guestCount;
  const subtitle = `${t('coversCount', { count: guests })} · ${pendingOrder ? t('openOrder') : t('newOrder')}`;

  const header = (title: string, backLabel: string, onBackClick: () => void) => (
    <header className="sticky top-0 z-20 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-2 px-2">
        <Button type="button" variant="ghost" size="icon-touch" onClick={onBackClick} aria-label={backLabel}>
          <ArrowLeft className="rtl-flip size-6" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl leading-tight font-bold">{title}</h1>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
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

      {menuProduct && (
        <FixedMenuPicker
          menu={menuProduct}
          products={products}
          categories={categories}
          onAdd={handleMenuAdd}
          onAddAnother={(selection) => cart.addFixedMenu(menuProduct, selection)}
          onClose={() => setMenuProduct(null)}
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
            else cart.addItem(chosen, 1, [], '');
          }}
          onClose={() => setAttachProduct(null)}
        />
      )}

      {editingMenuItem && (
        <FixedMenuPicker
          menu={editingMenuItem.product}
          products={products}
          categories={categories}
          mode="edit"
          initialSelection={editingMenuItem.menu_selection || []}
          onAdd={handleMenuEditSave}
          onClose={() => setEditingMenuItem(null)}
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

  if (cartOpen) {
    return (
      <div className="flex min-h-dvh flex-col bg-background text-foreground">
        {header(t('cart'), t('backToMenu'), () => setCartOpen(false))}
        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
          <HandheldCart
            products={products}
            categories={categories}
            kotPrintingEnabled={kotPrintingEnabled}
            coverChargeAmount={coverChargeAmount}
            existingOrder={pendingOrder}
            submitting={submitting}
            onEditItem={(item) => {
              if (item.menu_selection) setEditingMenuItem(item);
              else setEditingCartItem(item);
            }}
            onSend={() => { void onSend(); }}
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
        <HandheldProductGrid
          products={products}
          categories={categories}
          query={menuQuery}
          onQueryChange={setMenuQuery}
          categoryId={menuCategoryId}
          onCategoryChange={setMenuCategoryId}
          onProductClick={handleProductClick}
          onProductOptions={setAddonProduct}
        />
      </main>

      {/* The ticket, in one bar: how many plates and how much, and a tap opens it. */}
      <ActionBar>
        <Button
          type="button"
          size="touch-xl"
          onClick={() => setCartOpen(true)}
          className="w-full justify-between bg-brand text-white hover:bg-brand-hover"
        >
          <span className="flex items-center gap-2.5">
            <ShoppingCart />
            <span>{t('cart')}</span>
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-white/25 px-2 text-sm font-bold"><Ltr>{itemCount}</Ltr></span>
          </span>
          <Ltr>{fmt(cart.subtotal())}</Ltr>
        </Button>
      </ActionBar>
      {windows}
    </div>
  );
}
