/**
 * Order lifecycle rules that outlive any one HTTP route.
 *
 * Cancelling lives here rather than in `main/routes/orders.ts` because the day
 * close has to cancel whatever the floor left open, and having the service
 * import the route was the import cycle phase 3 went out of its way to avoid.
 */

import { getDatabase, now } from '../db';

type Db = ReturnType<typeof getDatabase>;

export interface CancelOrderOptions {
  /** Recorded on the order as `cancellation_reason`. */
  reason?: string | null;
  /** Release the table the order was sitting at. Defaults to true. */
  freeTable?: boolean;
}

/**
 * Cancel one order: put its stock back, void its lines, stamp the reason, and
 * free its table. Caller must already be inside a transaction.
 *
 * Lines already cancelled, voided, or written off as an accounting adjustment
 * are left alone — restocking them a second time would invent inventory.
 */
export function cancelOrder(
  db: Db,
  order: { id: number; table_id?: string | null },
  options: CancelOrderOptions = {},
): void {
  const stamp = now();

  const eligibleItems = db.prepare(`
    SELECT product_id, inventory_deducted_quantity FROM order_items
    WHERE order_id = ? AND status NOT IN ('cancelled', 'voided', 'void_adjustment')
  `).all(order.id) as { product_id: number | null; inventory_deducted_quantity: number }[];

  const restock = db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?');
  for (const item of eligibleItems) {
    if (!(Number(item.inventory_deducted_quantity) > 0)) continue;
    if (!db.prepare('SELECT id FROM products WHERE id = ?').get(item.product_id)) continue;
    restock.run(item.inventory_deducted_quantity, stamp, item.product_id);
  }

  db.prepare(`
    UPDATE order_items SET status = 'cancelled', updated_at = ?
    WHERE order_id = ? AND status NOT IN ('cancelled', 'voided', 'void_adjustment')
  `).run(stamp, order.id);

  db.prepare('UPDATE orders SET status = ?, cancelled_at = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?')
    .run('cancelled', stamp, options.reason ?? null, stamp, order.id);

  if (order.table_id && options.freeTable !== false) {
    db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ?").run(stamp, order.table_id);
  }
}
