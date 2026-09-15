'use client';

import { useMemo, useState } from 'react';
import { ArrowLeft, ShoppingCart } from 'lucide-react';
import { useTranslations } from 'use-intl';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import type { Addon, CartItem, Category, FixedMenuSelection, Order, Product, Table } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { isFixedMenu, menuGroupsOfOrder, menuLinesOfCart, menuLinesOfOrder, openSlotsForProduct, type OpenSlot } from '@/lib/fixed-menu';
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
 * The three windows are the till's own, mounted as they are: extras, the
 * fixed menu, and "inside the menu?". A tap on a dish goes the same three
 * ways it does on the central PC — a menu is composed, a dish that fits an
 * open course is asked about, anything else opens the extras — so the check
 * that comes out is the same check whoever took it.
 */
export function OrdinaView({
  table, pendingOrder, products, categories, kotPrintingEnabled, coverChargeAmount, currency, submitting,
  onBack, onSend, onAttachToOrderMenu,
}: Props) {
  const t = useTranslations('serverApp');
  const cart = useCartStore();
  const [cartOpen, setCartOpen] = useState(false);
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
    setAddonProduct(product);
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

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-20 -mx-3 mb-3 flex items-center gap-2 border-b border-gray-200 bg-white/95 px-3 py-2 backdrop-blur">
        <button type="button" onClick={onBack} aria-label={t('backToFloor')} className="rounded-lg border border-gray-200 p-2 text-gray-600"><ArrowLeft size={18} className="rtl-flip" /></button>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold">{t('tableLabel', { name: table.name })}</h1>
          <p className="truncate text-xs text-gray-500">{pendingOrder ? t('openOrder') : t('ordina')}</p>
        </div>
      </header>

      <HandheldProductGrid products={products} categories={categories} onProductClick={handleProductClick} />

      {/* The cart lives in a sheet, behind one button that says how much is in it. */}
      <button
        type="button"
        onClick={() => setCartOpen(true)}
        className="fixed bottom-5 end-5 z-30 flex h-14 items-center gap-2 rounded-full bg-brand px-5 font-semibold text-white shadow-lg"
      >
        <ShoppingCart size={20} />
        <span>{t('cart')}</span>
        {itemCount > 0 && <span className="flex min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-sm text-brand"><Ltr>{itemCount}</Ltr></span>}
      </button>

      <Drawer open={cartOpen} onOpenChange={setCartOpen}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader className="text-start">
            <DrawerTitle>{t('cart')}</DrawerTitle>
            <DrawerDescription className="sr-only">{t('tableLabel', { name: table.name })}</DrawerDescription>
          </DrawerHeader>
          <HandheldCart
            products={products}
            categories={categories}
            kotPrintingEnabled={kotPrintingEnabled}
            coverChargeAmount={coverChargeAmount}
            existingOrder={pendingOrder}
            submitting={submitting}
            onEditItem={(item) => {
              setCartOpen(false);
              if (item.menu_selection) setEditingMenuItem(item);
              else setEditingCartItem(item);
            }}
            onSend={() => { setCartOpen(false); void onSend(); }}
          />
        </DrawerContent>
      </Drawer>

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
            setAddonProduct(chosen);
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
    </div>
  );
}
