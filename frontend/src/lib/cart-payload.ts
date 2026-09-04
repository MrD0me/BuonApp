import type { CartItem } from './types';

/**
 * One cart line, as the API takes it.
 *
 * Four copies of this mapping had grown across the till screen — order,
 * append, prepaid checkout, and append-to-an-open-order — and a fixed menu
 * that reached three of them would have quietly lost its choices on the
 * fourth. The backend expands `menu_selection` into real rows and prices
 * every one of them itself.
 */
export interface OrderItemPayload {
  product_id: string;
  quantity: number;
  addons: { id: string | number; name: string; price?: number; quantity: number }[] | null;
  special_instructions: string | null;
  menu_selection?: { course_id: string; product_id: string }[];
}

export function cartItemToPayload(item: CartItem): OrderItemPayload {
  return {
    product_id: item.product.id,
    quantity: item.quantity,
    addons: item.addons.length > 0
      ? item.addons.map((addon) => ({ id: addon.id, name: addon.name, price: addon.price, quantity: addon.quantity || 1 }))
      : null,
    special_instructions: item.special_instructions || null,
    ...(item.menu_selection ? { menu_selection: item.menu_selection } : {}),
  };
}
