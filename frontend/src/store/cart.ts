import { create } from 'zustand';
import type { Customer, Product, Addon, CartItem } from '@/lib/types';
import type { FixedMenuSelection } from '@/lib/types';
import { generateCartItemId, newMenuLineId, normalizeCartItems } from '@/lib/cart-identity';
import { cartLineTotal, portionsOf } from '@/lib/fixed-menu';

export { generateCartItemId, normalizeCartItems } from '@/lib/cart-identity';

interface CartState {
  items: CartItem[];
  orderType: 'dine_in' | 'takeaway' | 'delivery';
  tableId: string | null;
  heldOrderId: string | null;
  customerId: number | string | null;
  customer: Customer | null;
  guestCount: number;
  /**
   * Whether the floor set the covers on the counter. Until it does they
   * follow the table the order is for; once it has, no table's own number
   * replaces them — the party is the same party whichever table it ends up at.
   */
  guestCountChosen: boolean;
  deliveryAddress: string;
  orderNotes: string;

  addItem: (product: Product, quantity?: number, addons?: Addon[], specialInstructions?: string) => void;
  /** A line of `menus` menus, with the dishes the table chose for it counted. */
  addFixedMenu: (menu: Product, menus: number, selection: FixedMenuSelection) => void;
  updateMenuSelection: (cartItemId: string, menus: number, selection: FixedMenuSelection) => void;
  setServiceRun: (cartItemId: string, run: number) => void;
  attachToMenu: (cartItemId: string, courseId: string, productId: string) => void;
  updateItemDetails: (cartItemId: string, quantity: number, addons: Addon[], specialInstructions: string) => void;
  removeItem: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  clearCart: () => void;
  loadItems: (items: CartItem[], tableId: string | null, customerId: number | string | null, guestCount: number, orderNotes?: string, heldOrderId?: string) => void;
  setOrderType: (type: CartState['orderType']) => void;
  /** `tableCovers` is where a new order on that table starts; a count the floor chose stays. */
  setTableId: (id: string | null, tableCovers?: number) => void;
  setCustomerId: (id: number | string | null) => void;
  setCustomer: (customer: Customer | null) => void;
  /** Covers read off something else, such as the order being added to: shown, not chosen. */
  setGuestCount: (count: number) => void;
  /** The counter: what the floor sets there is kept whichever table the order goes to. */
  chooseGuestCount: (count: number) => void;
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
  guestCountChosen: false,
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
   * One line for the menus the table took, however many: its quantity is how
   * many menus, and its dishes are counted under it. The dishes are the
   * table's, not a guest's — nobody says which of the eight had the lasagne.
   */
  addFixedMenu: (menu, menus, selection) => {
    const lineId = newMenuLineId();
    set({
      items: [...get().items, {
        id: generateCartItemId(menu.id, [], '', lineId),
        product: menu,
        quantity: menus,
        addons: [],
        special_instructions: '',
        menu_selection: selection,
        menu_line_id: lineId,
      }],
    });
  },

  updateMenuSelection: (cartItemId, menus, selection) => {
    set({
      items: get().items.map((item) => (
        item.id === cartItemId ? { ...item, quantity: menus, menu_selection: selection } : item
      )),
    });
  },

  /**
   * Puts a dish battered from the grid inside a menu already in the cart.
   *
   * The dish becomes one more portion of that menu's choices instead of a line
   * of its own, so it costs what the menu says — nothing, or the surcharge —
   * and the kitchen ticket still lists it as the dish it is. Which is the whole
   * point of the menu writing real rows. It joins the plain count of that dish
   * when there is one: a lasagna more is "Lasagne 4", not a second "Lasagne 1".
   */
  attachToMenu: (cartItemId, courseId, productId) => {
    set({
      items: get().items.map((item) => {
        if (item.id !== cartItemId) return item;
        const selection = item.menu_selection || [];
        const plain = selection.findIndex((choice) => (
          choice.course_id === courseId && choice.product_id === productId
          && !choice.note && choice.service_run === undefined
        ));
        return {
          ...item,
          menu_selection: plain >= 0
            ? selection.map((choice, index) => (index === plain ? { ...choice, quantity: portionsOf(choice) + 1 } : choice))
            : [...selection, { course_id: courseId, product_id: productId, quantity: 1 }],
        };
      }),
    });
  },

  /**
   * Which wave this line goes out in.
   *
   * The run is part of a line's identity, so moving one has to re-key it —
   * otherwise two lines of the same dish on two runs would collide the next
   * time the cart is normalized, and one of the two instructions the kitchen
   * was given would vanish. A line that lands on an id already in the cart
   * merges into it, which is right: it is the same dish, in the same wave,
   * with the same note.
   */
  setServiceRun: (cartItemId, run) => {
    const items = get().items;
    const target = items.find((item) => item.id === cartItemId);
    if (!target || target.service_run === run) return;

    const newId = generateCartItemId(
      target.product.id, target.addons, target.special_instructions, target.menu_line_id, run,
    );
    const collision = items.find((item) => item.id === newId && item.id !== cartItemId);

    set({
      items: items
        .filter((item) => !(collision && item.id === cartItemId))
        .map((item) => {
          if (collision && item.id === newId) {
            return { ...item, quantity: item.quantity + target.quantity };
          }
          return item.id === cartItemId ? { ...item, id: newId, service_run: run } : item;
        }),
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
    set({ items: [], tableId: null, heldOrderId: null, customerId: null, customer: null, guestCount: 1, guestCountChosen: false, orderType: 'dine_in', deliveryAddress: '', orderNotes: '' });
  },

  // A held ticket comes back as it was put down, covers included.
  loadItems: (items, tableId, customerId, guestCount, orderNotes, heldOrderId) => {
    set({ items: normalizeCartItems(items), tableId, heldOrderId: heldOrderId || null, customerId, guestCount, guestCountChosen: true, orderNotes: orderNotes || '' });
  },

  setOrderType: (type) => set((state) => ({ orderType: type, deliveryAddress: type !== 'delivery' ? '' : state.deliveryAddress })),
  setTableId: (id, tableCovers) => set((state) => ({
    tableId: id,
    heldOrderId: null,
    ...(tableCovers !== undefined && !state.guestCountChosen ? { guestCount: tableCovers } : {}),
  })),
  setCustomerId: (id) => set({ customerId: id }),
  setCustomer: (customer) => set({ customer, customerId: customer?.id ?? null }),
  setGuestCount: (count) => set({ guestCount: count, guestCountChosen: false }),
  chooseGuestCount: (count) => set({ guestCount: count, guestCountChosen: true }),
  setDeliveryAddress: (address) => set({ deliveryAddress: address }),
  setOrderNotes: (notes) => set({ orderNotes: notes }),

  subtotal: () => {
    // cartLineTotal prices a menu line as its menus plus its dishes' surcharges.
    return get().items.reduce((sum, item) => sum + cartLineTotal(item), 0);
  },

  itemCount: () => {
    return get().items.reduce((sum, item) => sum + item.quantity, 0);
  },
}));
