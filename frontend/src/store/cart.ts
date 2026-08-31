import { create } from 'zustand';
import type { Customer, Product, Addon, CartItem } from '@/lib/types';
import type { FixedMenuSelection } from '@/lib/types';
import { generateCartItemId, newMenuLineId, normalizeCartItems } from '@/lib/cart-identity';
import { cartLineUnitPrice } from '@/lib/fixed-menu';

export { generateCartItemId, normalizeCartItems } from '@/lib/cart-identity';

interface CartState {
  items: CartItem[];
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId: string | null;
  heldOrderId: string | null;
  customerId: number | string | null;
  customer: Customer | null;
  guestCount: number;
  deliveryAddress: string;
  orderNotes: string;

  addItem: (product: Product, quantity?: number, addons?: Addon[], specialInstructions?: string) => void;
  addFixedMenu: (menu: Product, selection: FixedMenuSelection, specialInstructions?: string) => void;
  updateMenuSelection: (cartItemId: string, selection: FixedMenuSelection, specialInstructions?: string) => void;
  updateItemDetails: (cartItemId: string, quantity: number, addons: Addon[], specialInstructions: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[], tableId: string | null, customerId: number | string | null, guestCount: number, orderNotes?: string, heldOrderId?: string) => void;
  setOrderType: (type: CartState['orderType']) => void;
  setTableId: (id: string | null) => void;
  setCustomerId: (id: number | string | null) => void;
  setCustomer: (customer: Customer | null) => void;
  setGuestCount: (count: number) => void;
  setDeliveryAddress: (address: string) => void;
  setOrderNotes: (notes: string) => void;

  subtotal: () => number;
  itemCount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  orderType: 'dine_in',
  tableId: null,
  heldOrderId: null,
  customerId: null,
  customer: null,
  guestCount: 1,
  deliveryAddress: '',
  orderNotes: '',

  addItem: (product, quantity = 1, addons = [], specialInstructions = '') => {
    const items = get().items;
    const itemId = generateCartItemId(product.id, addons, specialInstructions);
    const existing = items.find((i) => i.id === itemId);

    if (existing) {
      set({
        items: items.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity + quantity } : i
        ),
      });
    } else {
      set({
        items: [...items, { id: itemId, product, quantity, addons, special_instructions: specialInstructions }],
      });
    }
  },

  /**
   * One menu, one line, quantity one. Six identical menus are six lines and
   * that is deliberate: a split check hands a menu to a guest whole, and a
   * block of six cannot be shared between six of them.
   */
  addFixedMenu: (menu, selection, specialInstructions = '') => {
    const lineId = newMenuLineId();
    set({
      items: [...get().items, {
        id: generateCartItemId(menu.id, [], specialInstructions, lineId),
        product: menu,
        quantity: 1,
        addons: [],
        special_instructions: specialInstructions,
        menu_selection: selection,
        menu_line_id: lineId,
      }],
    });
  },

  updateMenuSelection: (cartItemId, selection, specialInstructions) => {
    set({
      items: get().items.map((item) => (
        item.id === cartItemId
          ? {
            ...item,
            menu_selection: selection,
            special_instructions: specialInstructions ?? item.special_instructions,
          }
          : item
      )),
    });
  },

  updateItemDetails: (cartItemId, quantity, addons, specialInstructions) => {
    const items = get().items;
    const target = items.find((i) => i.id === cartItemId);
    if (!target) return;

    const newId = generateCartItemId(target.product.id, addons, specialInstructions);
    if (newId === cartItemId) {
      set({
        items: items.map((i) =>
          i.id === cartItemId ? { ...i, quantity, addons, special_instructions: specialInstructions } : i
        ),
      });
      return;
    }

    // The edit produced a config that matches another existing line — merge into it.
    const collision = items.find((i) => i.id === newId && i.id !== cartItemId);
    if (collision) {
      set({
        items: items
          .filter((i) => i.id !== cartItemId)
          .map((i) => (i.id === newId ? { ...i, quantity: i.quantity + quantity } : i)),
      });
    } else {
      set({
        items: items.map((i) =>
          i.id === cartItemId ? { ...i, id: newId, quantity, addons, special_instructions: specialInstructions } : i
        ),
      });
    }
  },

  removeItem: (cartItemId) => {
    set({ items: get().items.filter((i) => i.id !== cartItemId) });
  },

  updateQuantity: (cartItemId, quantity) => {
    if (quantity <= 0) {
      get().removeItem(cartItemId);
      return;
    }
    set({
      items: get().items.map((i) =>
        i.id === cartItemId ? { ...i, quantity } : i
      ),
    });
  },

  clearCart: () => {
    set({ items: [], tableId: null, heldOrderId: null, customerId: null, customer: null, guestCount: 1, orderType: 'dine_in', deliveryAddress: '', orderNotes: '' });
  },

  loadItems: (items, tableId, customerId, guestCount, orderNotes, heldOrderId) => {
    set({ items: normalizeCartItems(items), tableId, heldOrderId: heldOrderId || null, customerId, guestCount, orderNotes: orderNotes || '' });
  },

  setOrderType: (type) => set((state) => ({ orderType: type, deliveryAddress: type !== 'delivery' ? '' : state.deliveryAddress })),
  setTableId: (id) => set({ tableId: id, heldOrderId: null }),
  setCustomerId: (id) => set({ customerId: id }),
  setCustomer: (customer) => set({ customer, customerId: customer?.id ?? null }),
  setGuestCount: (count) => set({ guestCount: count }),
  setDeliveryAddress: (address) => set({ deliveryAddress: address }),
  setOrderNotes: (notes) => set({ orderNotes: notes }),

  subtotal: () => {
    // cartLineUnitPrice folds in a fixed menu's surcharges, which are what the
    // chosen dishes add to its one price.
    return get().items.reduce((sum, item) => sum + cartLineUnitPrice(item) * (Number(item.quantity) || 1), 0);
  },

  itemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
