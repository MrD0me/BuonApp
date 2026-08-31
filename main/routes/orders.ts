import { createHash } from 'crypto';
import { Router, Request, Response } from 'express';
import { getDatabase, generateOrderNumber, now, parseItemJson, parseRowJson, withTxn, verifyPin, getSettingValue, insertOrderItemAddons, attachEffectiveAddons, utcDayBounds, utcTodayDate } from '../db';
import { COVER_CHARGE_SETTING_KEY, computeCoverCharge, orderCharges, parseCoverChargeAmount, roundMoney } from '../money';
import { notifyKdsUpdate, notifyOrderUpdated } from '../services/kds';
import { validateOrderNotes, validateItemNotes } from './orders-validation';
import { requireRole } from '../middleware/security';
import { resolveOrderTable } from './tables';
import { tableLabelSource, tableGroupLeader } from '../services/tables';
import { getOpenServiceDay, getOrOpenServiceDay } from '../services/service-day';
import { isOrderTypeAllowed, ORDER_TYPES_SETTING_KEY } from '../lib/order-types';
import { seatReservationForTable } from '../services/reservations';
import { syncUnpaidBillsForOrder } from './bills';
import { coveredGuestCount, expandFixedMenuItems, type ExpandedOrderItem } from '../services/fixed-menu';
import expressRateLimit from 'express-rate-limit';

const router = Router();
const orderReadRateLimit = expressRateLimit({ windowMs: 60 * 1000, limit: 120, standardHeaders: true, legacyHeaders: false });
const orderWriteRateLimit = expressRateLimit({ windowMs: 60 * 1000, limit: 60, standardHeaders: true, legacyHeaders: false });
const MAX_ORDER_IDEMPOTENCY_KEY_LENGTH = 128;

function orderIdempotencyKey(req: Request): string | null {
  const raw = req.get('Idempotency-Key');
  if (raw === undefined) return null;
  const supplied = raw.trim();
  if (!supplied) return null;
  if (supplied.length > MAX_ORDER_IDEMPOTENCY_KEY_LENGTH || !/^[\x21-\x7e]+$/.test(supplied)) {
    throw Object.assign(new Error('Idempotency-Key is invalid or too long'), { statusCode: 400 });
  }
  return supplied;
}

function getStoredOrderReplay(
  db: ReturnType<typeof getDatabase>,
  userId: string,
  idempotencyKey: string,
  requestHash: string,
): unknown | null {
  const prior = db.prepare(`
    SELECT request_hash, response_json
    FROM order_idempotency
    WHERE (user_id = ? OR user_id = 'legacy') AND idempotency_key = ?
    ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END
    LIMIT 1
  `).get(userId, idempotencyKey, userId) as { request_hash: string; response_json: string } | undefined;
  if (!prior) return null;
  if (prior.request_hash !== requestHash) {
    throw Object.assign(new Error('Idempotency-Key was already used for a different order request'), { statusCode: 409 });
  }
  try {
    return JSON.parse(prior.response_json);
  } catch {
    throw Object.assign(new Error('Stored order response is invalid'), { statusCode: 500 });
  }
}

// Rate limiting for PIN validation (simple in-memory)
const pinAttempts = new Map<string, { count: number; resetAt: number }>();
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

export function checkPinRateLimit(key: string): boolean {
  const now = Date.now();
  // Bound the in-memory table. Sweep expired entries once it grows past a
  // threshold so abandoned keys cannot accumulate without limit
  // (GHSA-9jjq-2fmw-x3mw). The keys are per-client/per-action, so the map is
  // naturally small, but this keeps a long-running process from drifting.
  if (pinAttempts.size > 500) {
    for (const [k, v] of pinAttempts.entries()) {
      if (now > v.resetAt) pinAttempts.delete(k);
    }
  }
  const entry = pinAttempts.get(key);
  if (!entry || now > entry.resetAt) {
    pinAttempts.set(key, { count: 1, resetAt: now + PIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= PIN_MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function syncCustomerTagCounts(db: any, customerId: string, items: { product_id: string; quantity: number }[]) {
  const row = db.prepare('SELECT tag_counts FROM customers WHERE id = ?').get(customerId) as any;
  if (!row) return;
  let counts: Record<string, number> = {};
  try { counts = row.tag_counts ? JSON.parse(row.tag_counts) : {}; } catch { counts = {}; }
  for (const item of items) {
    const product = db.prepare('SELECT tags FROM products WHERE id = ?').get(item.product_id) as any;
    if (!product?.tags) continue;
    let tags: string[] = [];
    try { tags = JSON.parse(product.tags); } catch { continue; }
    for (const tag of tags) {
      if (tag && typeof tag === 'string') counts[tag] = (counts[tag] || 0) + (item.quantity || 1);
    }
  }
  db.prepare('UPDATE customers SET tag_counts = ?, updated_at = ? WHERE id = ?')
    .run(JSON.stringify(counts), now(), customerId);
}

/**
 * Resolves and validates a submitted order item's add-ons against the catalog
 * (GHSA-jmxx-39wh-4cjx). Client-supplied name/price are never trusted: every
 * add-on must resolve by ID to an active catalog add-on whose group is linked
 * to the product (via addon_group_product). Returns the canonical add-on list
 * (catalog id/name/price + client quantity) used for both subtotal and the
 * order_item_addons snapshot.
 */
function resolveItemAddons(
  db: ReturnType<typeof getDatabase>,
  productId: string,
  addons: any[] | null | undefined,
): { id: string; name: string; price: number; quantity: number }[] {
  if (!addons || !Array.isArray(addons) || addons.length === 0) return [];

  const linkedGroupIds = new Set(
    (db.prepare('SELECT addon_group_id FROM addon_group_product WHERE product_id = ?').all(productId) as { addon_group_id: string }[])
      .map((row) => row.addon_group_id),
  );

  const resolved: { id: string; name: string; price: number; quantity: number }[] = [];
  const groupSelections = new Map<string, { totalQty: number; hasMultiQty: boolean }>();

  for (const addon of addons) {
    if (!addon) continue;
    if (!addon.id || typeof addon.id !== 'string') {
      throw new Error('Each add-on must reference a valid catalog add-on ID');
    }
    const catalog = db.prepare('SELECT * FROM addons WHERE id = ?').get(addon.id) as
      | { id: string; addon_group_id: string; name: string; price: number; is_active: number }
      | undefined;
    if (!catalog) {
      throw new Error(`Add-on "${addon.id}" was not found`);
    }
    if (catalog.is_active !== 1) {
      throw new Error(`Add-on "${catalog.name}" is not available`);
    }
    if (!linkedGroupIds.has(catalog.addon_group_id)) {
      throw new Error(`Add-on "${catalog.name}" is not available for this product`);
    }

    const quantity = addon.quantity ?? 1;
    if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Invalid add-on quantity for "${catalog.name}": must be a positive integer`);
    }

    resolved.push({ id: catalog.id, name: catalog.name, price: Number(catalog.price) || 0, quantity });

    const qty = Math.max(1, Math.floor(quantity));
    const current = groupSelections.get(catalog.addon_group_id) || { totalQty: 0, hasMultiQty: false };
    groupSelections.set(catalog.addon_group_id, {
      totalQty: current.totalQty + qty,
      hasMultiQty: current.hasMultiQty || qty > 1,
    });
  }

  for (const [groupId, selection] of groupSelections.entries()) {
    const group = db.prepare('SELECT * FROM addon_groups WHERE id = ? AND is_active = 1').get(groupId) as any;
    if (!group) continue;

    if (!group.allow_multiple_quantities && selection.hasMultiQty) {
      throw new Error(`Add-on group "${group.name}" does not allow multiple quantities`);
    }

    if (group.max_selection !== null && group.max_selection !== undefined && selection.totalQty > group.max_selection) {
      throw new Error(`Total add-on quantity for group "${group.name}" exceeds maximum allowed (${group.max_selection})`);
    }

    if (group.min_selection && selection.totalQty < group.min_selection) {
      throw new Error(`Selection for group "${group.name}" requires at least ${group.min_selection} item(s)`);
    }
  }

  return resolved;
}

/**
 * Writes the rows of an order and returns what they add up to.
 *
 * One copy, called both by the route that opens an order and by the one that
 * appends to it. They were two identical loops that had to be kept in step by
 * hand, and the fixed menu would have made them two places to expand a package
 * into its dishes.
 */
/**
 * So much a head, less the heads whose cover is already inside a fixed menu
 * they ordered.
 *
 * The one formula. Every path that changes what is on a check calls this
 * instead of keeping a copy: the covers were counted from four places by the
 * time the fixed menu arrived, and four copies is four chances to reprice one
 * of them and not the others — which is exactly the bug v89 had to repair.
 */
export function orderCoverCharge(db: ReturnType<typeof getDatabase>, orderId: string | number): number {
  const order = db.prepare('SELECT type, guest_count FROM orders WHERE id = ?').get(orderId) as any;
  if (!order || order.type !== 'dine_in') return 0;
  return computeCoverCharge(
    order.guest_count,
    parseCoverChargeAmount(getSettingValue(COVER_CHARGE_SETTING_KEY)),
    coveredGuestCount(db, orderId),
  );
}

function insertOrderItemRows(
  db: ReturnType<typeof getDatabase>,
  orderId: string | number | bigint,
  items: ExpandedOrderItem[],
): number {
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_id, product_id, product_name, product_sku, unit_price, quantity, inventory_deducted_quantity,
      subtotal, discount_amount, total, variant_selection,
      modifier_selection, special_instructions, menu_group_id, menu_role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `);

  let subtotal = 0;

  for (const item of items) {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
    if (!product) {
      throw new Error(`Product ${item.product_id} not found`);
    }

    if (product.track_inventory && product.stock_quantity < item.quantity) {
      throw new Error(`Insufficient stock for ${product.name}`);
    }

    // A dish chosen inside a fixed menu is paid for by the package: its own row
    // carries the surcharge alone, or nothing at all.
    const unitPrice = item.unit_price_override !== null ? item.unit_price_override : parseFloat(product.price);
    const quantity = item.quantity;
    // item.discount_amount is intentionally ignored here — discounts are only
    // applied through the dedicated PATCH discount endpoints, which enforce
    // discount_mode/max_percentage/max_amount/approval (vuln-0002).
    const itemDiscount = 0;

    // Validate quantity and price
    if (!quantity || quantity <= 0 || !Number.isFinite(quantity)) {
      throw new Error(`Invalid quantity for ${product.name}: must be a positive number`);
    }
    if (unitPrice < 0 || !Number.isFinite(unitPrice)) {
      throw new Error(`Invalid price for ${product.name}: must be a non-negative number`);
    }

    let itemSubtotal = unitPrice * quantity;
    if (item.addons && Array.isArray(item.addons)) {
      for (const addon of item.addons as any[]) {
        if (!addon) continue;
        if (addon.quantity !== undefined) {
          if (typeof addon.quantity !== 'number' || !Number.isInteger(addon.quantity) || addon.quantity <= 0) {
            throw new Error(`Invalid add-on quantity for ${addon.name || 'addon'}: must be a positive integer`);
          }
        }
        const addonQty = addon.quantity || 1;
        itemSubtotal += (addon.price || 0) * addonQty * quantity;
      }
    }
    itemSubtotal = Math.max(0, itemSubtotal - itemDiscount);

    subtotal += itemSubtotal;

    const itemCreatedAt = now();
    const insertItemResult = insertItem.run(
      orderId, product.id, product.name, product.sku, unitPrice, quantity, product.track_inventory ? quantity : 0,
      itemSubtotal, itemDiscount, itemSubtotal,
      JSON.stringify(item.variant_selection || null),
      JSON.stringify(item.modifier_selection || null),
      item.special_instructions || null, item.menu_group_id, item.menu_role, itemCreatedAt, itemCreatedAt
    );
    insertOrderItemAddons(db, insertItemResult.lastInsertRowid, item.addons as any, itemCreatedAt);

    if (product.track_inventory) {
      db.prepare('UPDATE products SET stock_quantity = stock_quantity - ?, updated_at = ? WHERE id = ?')
        .run(quantity, now(), product.id);
    }
  }

  return subtotal;
}

router.get('/', orderReadRateLimit, requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const db = getDatabase();
    const wheres: string[] = [];
    const params: any[] = [];

    if (req.query.status) {
      const statuses = (req.query.status as string).split(',');
      if (statuses.length === 1) {
        wheres.push('status = ?');
        params.push(statuses[0]);
      } else {
        wheres.push(`status IN (${statuses.map(() => '?').join(',')})`);
        params.push(...statuses);
      }
    }
    if (req.query.type) {
      wheres.push('type = ?');
      params.push(req.query.type);
    }
    // #208: `today` is the UTC day, as a range filter (was UTC date() that
    // wrapped the column and blocked `idx_orders_created_at`). `start_date` /
    // `end_date` add a range filter so the UI can actually load older pages
    // — combined with the cursor, this is what gives us real pagination
    // instead of "latest 50 forever".
    if (req.query.today && req.query.today !== '0' && req.query.today !== 'false') {
      const [s, e] = utcDayBounds(utcTodayDate());
      wheres.push('created_at >= ? AND created_at < ?');
      params.push(s, e);
    } else {
      const startDate = typeof req.query.start_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.start_date) ? req.query.start_date : null;
      const endDate = typeof req.query.end_date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(req.query.end_date) ? req.query.end_date : null;
      if (startDate) {
        wheres.push('created_at >= ?');
        params.push(utcDayBounds(startDate)[0]);
      }
      if (endDate) {
        wheres.push('created_at < ?');
        params.push(utcDayBounds(endDate)[1]);
      }
    }
    // The day's orders, by service day rather than by clock. A restaurant that
    // closes at one in the morning is still working the same evening, and its
    // orders must not slide into yesterday at midnight. `current` resolves to
    // the open day — a GET must never open one — and with no day open the
    // answer is empty, because nothing has been filed under a day that does
    // not exist yet.
    if (typeof req.query.service_day === 'string' && req.query.service_day) {
      const dayId = req.query.service_day === 'current'
        ? getOpenServiceDay(db)?.id ?? null
        : req.query.service_day;
      if (dayId === null) {
        wheres.push('0 = 1');
      } else {
        wheres.push('service_day_id = ?');
        params.push(dayId);
      }
    }
    if (req.query.table_id) {
      wheres.push('table_id = ?');
      params.push(req.query.table_id);
    }
    if (user.role === 'server') {
      wheres.push('user_id = ?');
      params.push(user.userId);
    }
    // Cursor pagination: `before` / `after` are ORDER BY keys (created_at),
    // composed with `id` to break ties when many orders share a second.
    if (typeof req.query.before_id === 'string' && /^\d+$/.test(req.query.before_id)) {
      const oid = parseInt(req.query.before_id, 10);
      const ref = db.prepare('SELECT created_at FROM orders WHERE id = ?').get(oid) as { created_at: string } | undefined;
      if (ref) {
        wheres.push('(created_at, id) < (?, ?)');
        params.push(ref.created_at, oid);
      }
    }

    const whereSql = wheres.length > 0 ? `WHERE ${wheres.join(' AND ')}` : '';
    // #208: cap page size even when clients omit per_page (the original
    // "unbounded" default made GET /orders on the tables page load the entire
    // active-order history with the N+1 below).
    const requestedPerPage = req.query.per_page ? parseInt(req.query.per_page as string, 10) : NaN;
    const perPage = Number.isInteger(requestedPerPage) && requestedPerPage > 0
      ? Math.min(requestedPerPage, 500)
      : 50;
    const perPagePlusOne = perPage + 1;

    const orders = db.prepare(`
      SELECT * FROM orders
      ${whereSql}
      ORDER BY created_at DESC, id DESC
      LIMIT ?
    `).all(...params, perPagePlusOne) as any[];

    const hasMore = orders.length > perPage;
    const pageOrders = hasMore ? orders.slice(0, perPage) : orders;
    const nextCursor = hasMore ? pageOrders[pageOrders.length - 1].id : null;

    // #208: replace the per-order N+1 (5 queries × N) with one IN() per
    // relation, then assemble. Measured ~300+ queries per poll → ~6.
    const ordersWithRelations = batchHydrateOrders(db, pageOrders);

    res.json({
      orders: ordersWithRelations,
      ...(nextCursor !== null && { nextCursor }),
    });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Batch the relations (items+addons, table, customer, bill+loyalty) for a
 * page of orders into 5 IN() queries instead of N per-order prepared calls.
 * Used by GET /orders and kept here so the orders route owns its own data
 * shape. #208
 */
function batchHydrateOrders(db: ReturnType<typeof getDatabase>, orders: any[]) {
  if (orders.length === 0) return [];
  // Normalize JSON text columns so the list endpoint matches GET /orders/:id.
  // parseRowJson is idempotent, so the /:id path passing an already-parsed row
  // is fine.
  const parsedOrders = orders.map(parseRowJson);
  const ids = parsedOrders.map((o) => o.id);
  const tableIds = Array.from(new Set(parsedOrders.map((o: any) => o.table_id).filter(Boolean)));
  const customerIds = Array.from(new Set(parsedOrders.map((o: any) => o.customer_id).filter(Boolean)));

  const orderIdsCsv = `(${ids.map(() => '?').join(',')})`;
  // price_required rides along so a screen can tell a row nobody has priced
  // yet from one that is genuinely free.
  const itemsRows = db.prepare(`
    SELECT oi.*, COALESCE(p.price_required, 0) AS price_required
    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id IN ${orderIdsCsv} ORDER BY oi.order_id, oi.id
  `).all(...ids).map(parseItemJson);
  // #208: a single call to attachEffectiveAddons batches all addons across
  // all items into one IN() query against order_item_addons. Re-group the
  // result back by order_id for the per-order payload below.
  const itemsWithAddons = attachEffectiveAddons(db, itemsRows as any[]);
  const itemsByOrder = new Map<number, any[]>();
  for (const it of itemsWithAddons) {
    const list = itemsByOrder.get(it.order_id) || [];
    list.push(it);
    itemsByOrder.set(it.order_id, list);
  }

  const tablesById = new Map<string, any>();
  if (tableIds.length > 0) {
    const ph = tableIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM tables WHERE id IN (${ph})`).all(...tableIds) as any[];
    for (const t of rows) tablesById.set(t.id, t);
  }
  const customersById = new Map<string, any>();
  if (customerIds.length > 0) {
    const ph = customerIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT * FROM customers WHERE id IN (${ph})`).all(...customerIds);
    for (const c of rows as any[]) customersById.set(c.id, parseRowJson(c));
  }
  const billsByOrderId = new Map<number, any[]>();
  const billsById = new Map<number, any>();
  const billRows = db.prepare(`SELECT * FROM bills WHERE order_id IN ${orderIdsCsv}`).all(...ids) as any[];
  for (const b of billRows) {
    const parsed = parseRowJson(b);
    const siblings = billsByOrderId.get(parsed.order_id) || [];
    siblings.push(parsed);
    billsByOrderId.set(parsed.order_id, siblings);
    billsById.set(parsed.id, parsed);
  }
  const ledgerByBillId = new Map<number, number>();
  if (billsById.size > 0) {
    const billIds = Array.from(billsById.keys());
    const ph = billIds.map(() => '?').join(',');
    const rows = db.prepare(`SELECT bill_id, COALESCE(SUM(amount),0) as total FROM loyalty_ledger WHERE bill_id IN (${ph}) AND type = 'credit' GROUP BY bill_id`).all(...billIds) as { bill_id: number; total: number }[];
    for (const r of rows) ledgerByBillId.set(r.bill_id, r.total);
  }

  return parsedOrders.map((order) => {
    const itemList = itemsByOrder.get(order.id) || [];
    const tableRow = order.table_id ? tablesById.get(order.table_id) : null;
    const table = resolveOrderTable(order, tableRow);
    const customer = order.customer_id ? customersById.get(order.customer_id) : null;
    const bills = billsByOrderId.get(order.id) || [];
    for (const billRow of bills) {
      if (billRow.customer_id) billRow.points_earned = ledgerByBillId.get(billRow.id) || 0;
    }
    const bill = bills.find((row) => row.payment_status !== 'paid') || bills[0] || null;
    return { ...order, items: itemList, table, customer, bill, bills };
  });
}

router.get('/:id', orderReadRateLimit, requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    const db = getDatabase();
    const order = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (user.role === 'server' && (order as any).user_id !== user.userId) {
      return res.status(403).json({ error: 'Servers can only view their own orders' });
    }

    // #208: collapse the per-order N+1 (5 queries: items/addons/table/customer/bill/loyalty)
    // into the same batchHydrateOrders used by the list endpoint. Previously
    // 6 prepared calls per single detail click.
    const [hydrated] = batchHydrateOrders(db, [order]);
    res.json({ order: hydrated });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/', orderWriteRateLimit, requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const { table_id, customer_id, type, guest_count, special_instructions, packaging_charge, delivery_charge, items } = body;
    const idempotencyKey = orderIdempotencyKey(req);
    const idempotencyUserId = String((req as any).user.userId);
    const requestHash = idempotencyKey
      ? createHash('sha256').update(JSON.stringify(body)).digest('hex')
      : null;
    // Always the authenticated caller, never client-supplied — trusting a
    // client-sent user_id would let staff spoof order attribution, and the
    // frontend has in fact never sent one, so every order got user_id=NULL.
    // That silently broke servers' own order visibility (GET /orders scopes
    // servers to `user_id = <their id>`, which NULL can never match) and any
    // per-staff sales attribution.
    const authenticatedUserId = (req as any).user.userId;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    if (!type || !['dine_in', 'takeaway', 'delivery', 'online'].includes(type)) {
      return res.status(400).json({ error: 'Valid type is required (dine_in, takeaway, delivery, online)' });
    }
    // The POS hides the types the owner switched off, but hiding a button is
    // not enforcement: a handheld running an older screen must not be able to
    // file a takeaway order in a place that does not do takeaway.
    if (!isOrderTypeAllowed(getSettingValue(ORDER_TYPES_SETTING_KEY), type)) {
      return res.status(400).json({ error: `Order type ${type} is disabled`, code: 'order_type_disabled' });
    }
    if (table_id) {
      // A table folded into a group is not seated on its own: the party is on
      // the leader, and that is the only place its order can live.
      const leaderId = tableGroupLeader(getDatabase(), String(table_id));
      if (leaderId !== String(table_id)) {
        return res.status(409).json({
          error: 'This table is joined to another one. Place the order on the table leading the group.',
          code: 'table_is_merged',
          leader_table_id: leaderId,
        });
      }
    }
    if (guest_count !== undefined && guest_count !== null && (!Number.isSafeInteger(guest_count) || guest_count < 1 || guest_count > 99)) {
      return res.status(400).json({ error: 'guest_count must be a whole number between 1 and 99' });
    }

    const pkgCharge = Number(packaging_charge || 0);
    const delCharge = Number(delivery_charge || 0);
    if (!Number.isFinite(pkgCharge) || pkgCharge < 0 || !Number.isFinite(delCharge) || delCharge < 0) {
      return res.status(400).json({ error: 'Packaging and delivery charges must be non-negative numbers' });
    }

    const db = getDatabase();

    // A fixed menu arrives as one chosen package and leaves as real rows, one
    // per dish, so the kitchen ticket can section them by category like any
    // other order. See docs/coperto-e-menu-fisso.md.
    let expandedItems: ExpandedOrderItem[] = [];
    try {
      validateOrderNotes(db, special_instructions);
      for (const item of items) {
        validateItemNotes(db, item.special_instructions);
        item.addons = resolveItemAddons(db, item.product_id, item.addons);
      }
      expandedItems = expandFixedMenuItems(db, items);
    } catch (err: any) {
      return res.status(400).json({ error: err.message });
    }
    const result = withTxn(() => {
      if (idempotencyKey) {
        // Preserve exact replay for pre-user-scoped records whose creator is
        // unavailable. New records never use the `legacy` compatibility owner.
        const prior = db.prepare(`
          SELECT request_hash, response_json
          FROM order_idempotency
          WHERE (user_id = ? OR user_id = 'legacy') AND idempotency_key = ?
          ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END
          LIMIT 1
        `).get(idempotencyUserId, idempotencyKey, idempotencyUserId) as { request_hash: string; response_json: string } | undefined;
        if (prior) {
          if (prior.request_hash !== requestHash) {
            throw Object.assign(new Error('Idempotency-Key was already used for a different order request'), { statusCode: 409 });
          }
          try {
            const response = JSON.parse(prior.response_json);
            return { order: response.order, orderItems: response.order?.items || [], idempotentReplay: true };
          } catch {
            throw Object.assign(new Error('Stored order response is invalid'), { statusCode: 500 });
          }
        }
      }
      // Generate order number inside transaction to prevent race conditions
      const orderNumber = generateOrderNumber();

      // Capture where this order is being served. Tables are rebuilt daily and
      // deleted for real, so `table_id` alone cannot carry history — these
      // labels are what the order shows once its table is gone.
      // See docs/table-management.md.
      const orderTableRow = table_id ? tableLabelSource(db, table_id) : null;

      // File the order under the day being served, opening one if the floor
      // never started it. An offline-first till must not refuse an order
      // because nobody pressed a button this morning.
      const serviceDay = getOrOpenServiceDay(db, authenticatedUserId);

      const orderResult = db.prepare(`
        INSERT INTO orders (order_number, table_id, table_label, room_label, service_day_id, customer_id, user_id, type,
          guest_count, special_instructions, packaging_charge, delivery_charge, cover_charge, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
      `).run(orderNumber, table_id || null, orderTableRow?.number ?? null, orderTableRow?.room ?? null,
        serviceDay.id, customer_id || null, authenticatedUserId, type, guest_count || null,
        special_instructions || null, packaging_charge || 0, delivery_charge || 0, 0, now(), now());

      const orderId = orderResult.lastInsertRowid;

      const subtotal = insertOrderItemRows(db, orderId, expandedItems);

      // The cover is settled once the rows are on the check, never before: a
      // menu that includes it takes its guest off the count, so the figure
      // cannot be struck until we know what was ordered. A takeaway pays none
      // however many people are eating out of the bag.
      const finalCover = orderCoverCharge(db, String(orderId));

      const total = roundMoney(subtotal + orderCharges({ delivery_charge, packaging_charge, cover_charge: finalCover }));

      db.prepare('UPDATE orders SET subtotal = ?, total = ?, cover_charge = ?, updated_at = ? WHERE id = ?')
        .run(subtotal, total, finalCover, now(), orderId);

      if (table_id && type === 'dine_in') {
        db.prepare("UPDATE tables SET status = 'occupied', updated_at = ? WHERE id = ?").run(now(), table_id);
        // The party the table was being held for has arrived.
        seatReservationForTable(db, table_id);
      }

      const order = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId)) as any;
      const orderItems = attachEffectiveAddons(db, db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId).map(parseItemJson) as any[]);
      const response = { order: Object.assign({}, order, { items: orderItems }) };
      if (idempotencyKey && requestHash) {
        db.prepare('INSERT INTO order_idempotency (user_id, idempotency_key, request_hash, response_json, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(idempotencyUserId, idempotencyKey, requestHash, JSON.stringify(response), now());
      }
      return { order, orderItems, idempotentReplay: false };
    });

    if (!result.idempotentReplay) {
      notifyKdsUpdate();
      if (customer_id) {
        try {
          syncCustomerTagCounts(db, customer_id, items);
        } catch (err) {
          console.error('[Orders] Tag sync failed:', err);
        }
      }
    }

    res.status(result.idempotentReplay ? 200 : 201).json({ order: Object.assign({}, result.order, { items: result.orderItems }) });
  } catch (error: any) {
    console.error('[Orders] Create error:', error);
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

router.post('/:id/items', orderWriteRateLimit, requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body || {};
    const { items, special_instructions } = body;
    const idempotencyKey = orderIdempotencyKey(req);
    const idempotencyUserId = String((req as any).user.userId);
    const requestHash = idempotencyKey
      ? createHash('sha256').update(JSON.stringify({ order_id: req.params.id, items, special_instructions })).digest('hex')
      : null;

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const authUser = (req as any).user;
    if (authUser?.role === 'server' && order.user_id !== authUser.userId) {
      return res.status(403).json({ error: 'Servers can only modify their own orders' });
    }

    // Replay before any mutable-order guard. A response-loss retry must return
    // the committed result even if the order was split or its validation state
    // changed after the original append.
    if (idempotencyKey && requestHash) {
      const replayResponse = getStoredOrderReplay(db, idempotencyUserId, idempotencyKey, requestHash);
      if (replayResponse) return res.json(replayResponse);
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'At least one item is required' });
    }

    // Get settings
    const settings: Record<string, string> = {};
    db.prepare('SELECT key, value FROM settings').all().forEach((row: any) => {
      settings[row.key] = row.value;
    });

    const result = withTxn(() => {
      // Re-fetch and re-validate under the transaction lock: another request (e.g. a
      // cashier completing/cancelling the order) can race the checks above, which run
      // before this lock is acquired (#175).
      const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
      if (!currentOrder) {
        throw Object.assign(new Error('Order not found'), { statusCode: 404 });
      }
      if (authUser?.role === 'server' && currentOrder.user_id !== authUser.userId) {
        throw Object.assign(new Error('Servers can only modify their own orders'), { statusCode: 403 });
      }

      // Re-check idempotency under the transaction lock in case the early
      // lookup raced the first request. This must remain before mutable-order
      // guards so a committed append always has a replay path.
      if (idempotencyKey && requestHash) {
        const replayResponse = getStoredOrderReplay(db, idempotencyUserId, idempotencyKey, requestHash);
        if (replayResponse) return { replayResponse };
      }

      if (['completed', 'cancelled'].includes(currentOrder.status)) {
        throw Object.assign(new Error('Cannot add items to a completed or cancelled order'), { statusCode: 400 });
      }

      let expandedItems: ExpandedOrderItem[] = [];
      try {
        for (const item of items) {
          validateItemNotes(db, item.special_instructions);
          item.addons = resolveItemAddons(db, item.product_id, item.addons);
        }
        if (special_instructions !== undefined) {
          validateOrderNotes(db, special_instructions);
        }
        expandedItems = expandFixedMenuItems(db, items);
      } catch (err: unknown) {
        throw Object.assign(new Error(err instanceof Error ? err.message : 'Invalid order item'), { statusCode: 400 });
      }

      insertOrderItemRows(db, String(req.params.id), expandedItems);

      // BUG #3 FIX: Filter out cancelled items from total recalculation
      const activeItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? AND status != 'cancelled'").all(req.params.id) as any[];
      let subtotal = 0;
      for (const item of activeItems) {
        subtotal += item.subtotal;
      }

      // BUG #12 FIX: Preserve order-level discount (scale percentage proportionally)
      const existingDiscountAmount = currentOrder.discount_amount || 0;
      let newDiscountAmount = existingDiscountAmount;
      if (existingDiscountAmount > 0 && currentOrder.subtotal > 0) {
        if (currentOrder.discount_type === 'percentage') {
          const pct = currentOrder.discount_value || 0;
          newDiscountAmount = Math.round(subtotal * pct / 100 * 100) / 100;
        }
        // amount type: keep same value
      }

      // A menu that includes the cover has just landed on the check, or has
      // not: either way the cover is settled from the rows, never left at what
      // it was when the order was opened.
      const coverCharge = orderCoverCharge(db, String(req.params.id));

      const discountedSubtotal = Math.max(0, subtotal - newDiscountAmount);
      const total = roundMoney(discountedSubtotal + orderCharges({ ...currentOrder, cover_charge: coverCharge }));

      // Update order totals and optionally update order-level notes
      if (special_instructions !== undefined) {
        db.prepare(`
          UPDATE orders SET subtotal = ?, discount_amount = ?, total = ?, cover_charge = ?, special_instructions = ?, updated_at = ? WHERE id = ?
        `).run(subtotal, newDiscountAmount, total, coverCharge, special_instructions || null, now(), req.params.id);
      } else {
        db.prepare(`
          UPDATE orders SET subtotal = ?, discount_amount = ?, total = ?, cover_charge = ?, updated_at = ? WHERE id = ?
        `).run(subtotal, newDiscountAmount, total, coverCharge, now(), req.params.id);
      }

      // Sync the bill through the shared path rather than by hand. The
      // hand-rolled update wrote total, balance and discount and left
      // `subtotal` at whatever it was when the bill was drawn up: add a dish to
      // an order whose preconto had already been printed and the reprint said
      // "Subtotale 90,00 ... TOTALE 118,00", two numbers that do not add up on
      // the paper in the guest's hand.
      syncUnpaidBillsForOrder(db, String(req.params.id), {
        subtotal,
        discountAmount: newDiscountAmount,
        deliveryCharge: currentOrder.delivery_charge || 0,
        packagingCharge: currentOrder.packaging_charge || 0,
        coverCharge,
        total,
      });

      const updatedOrder = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)) as any;
      const updatedItems = attachEffectiveAddons(db, db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id).map(parseItemJson) as any[]);
      const response = { order: Object.assign({}, updatedOrder, { items: updatedItems }) };
      if (idempotencyKey && requestHash) {
        db.prepare('INSERT INTO order_idempotency (user_id, idempotency_key, request_hash, response_json, created_at) VALUES (?, ?, ?, ?, ?)')
          .run(idempotencyUserId, idempotencyKey, requestHash, JSON.stringify(response), now());
      }
      return { updatedOrder, updatedItems, replayResponse: null };
    });

    if (result.replayResponse) return res.json(result.replayResponse);
    notifyKdsUpdate();

    res.json({ order: Object.assign({}, result.updatedOrder, { items: result.updatedItems }) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

router.patch('/:id/status', orderWriteRateLimit, requireRole('owner', 'manager', 'cashier', 'chef', 'server'), (req: Request, res: Response) => {
  try {
    const { status, reason, override_pin, free_table } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const validStatuses = ['preparing', 'ready', 'served', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Use: ${validStatuses.join(', ')}` });
    }

    // reason is optional for cancellation

    const db = getDatabase();
    // Keep the pre-transaction lookup limited to not-found reporting. All
    // order/item-dependent authorization and policy decisions are repeated
    // from currentOrder inside the authoritative transaction below.
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const nowStr = now();

    const { updatedOrder, orderItems, table, changed } = withTxn(() => {
      const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
      if (!currentOrder) {
        throw Object.assign(new Error('Order not found'), { statusCode: 404 });
      }

      const authUser = (req as any).user;
      const currentUser = authUser?.userId
        ? db.prepare('SELECT role, is_active FROM users WHERE id = ?').get(authUser.userId) as { role: string; is_active: number } | undefined
        : undefined;
      if (!currentUser || currentUser.is_active !== 1 || !['owner', 'manager', 'cashier', 'chef', 'server'].includes(currentUser.role)) {
        throw Object.assign(new Error('Insufficient permissions'), { statusCode: 403 });
      }
      if (currentUser.role === 'server' && String(currentOrder.user_id) !== String(authUser.userId)) {
        throw Object.assign(new Error('Servers can only modify their own orders'), { statusCode: 403 });
      }

      if (currentOrder.status === status) {
        // Idempotent same-state request for order
        const items = attachEffectiveAddons(db, db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id).map(parseItemJson) as any[]);
        const tableRow = currentOrder.table_id ? db.prepare('SELECT * FROM tables WHERE id = ?').get(currentOrder.table_id) as any : null;
        const tableObj = resolveOrderTable(currentOrder, tableRow);
        return { updatedOrder: parseRowJson(currentOrder), orderItems: items, table: tableObj, changed: false };
      }

      const VALID_TRANSITIONS: Record<string, string[]> = {
        pending: ['preparing', 'ready', 'served', 'completed', 'cancelled'],
        preparing: ['ready', 'served', 'completed', 'cancelled'],
        ready: ['served', 'completed', 'cancelled'],
        served: ['completed', 'cancelled'],
        completed: [],
        cancelled: [],
      };

      const allowedTargets = VALID_TRANSITIONS[currentOrder.status] || [];
      if (!allowedTargets.includes(status)) {
        throw Object.assign(new Error(`Cannot transition order status from '${currentOrder.status}' to '${status}'`), { statusCode: 400 });
      }

      // Cancellation authorization is based on the same transaction-local
      // order and item snapshot that will be mutated below.
      const hasItemsInProgress = db.prepare(`
        SELECT 1 FROM order_items
        WHERE order_id = ? AND status IN ('preparing', 'ready', 'served', 'completed')
        LIMIT 1
      `).get(req.params.id) !== undefined;
      const statusOrder = ['pending', 'preparing', 'ready', 'served', 'completed'];
      const currentStatusIndex = statusOrder.indexOf(currentOrder.status);
      const requiresOverride = (currentStatusIndex > 0 || hasItemsInProgress) && status === 'cancelled';

      if (requiresOverride) {
        if (!override_pin) {
          throw Object.assign(new Error('Manager PIN required to cancel order in progress'), { statusCode: 400 });
        }

        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        // Key is per-client/per-action, deliberately NOT per-order: a caller
        // must not get a fresh attempt window by rotating order identifiers
        // (GHSA-9jjq-2fmw-x3mw).
        const rateLimitKey = `pin:${clientIp}:order-cancel`;
        if (!checkPinRateLimit(rateLimitKey)) {
          throw Object.assign(new Error('Too many PIN attempts. Try again in 15 minutes.'), { statusCode: 429 });
        }

        const user = db.prepare("SELECT * FROM users WHERE is_active = 1 AND pin_hash IS NOT NULL AND role IN ('owner', 'manager')")
          .all()
          .find((u: any) => verifyPin(u.pin_hash, override_pin));

        if (!user) {
          throw Object.assign(new Error('Invalid manager PIN'), { statusCode: 403 });
        }
      }

      switch (status) {
        case 'preparing':
          db.prepare('UPDATE orders SET status = ?, cooking_started_at = ?, updated_at = ? WHERE id = ?')
            .run(status, nowStr, nowStr, req.params.id);
          break;

        case 'ready':
          db.prepare('UPDATE orders SET status = ?, ready_at = ?, updated_at = ? WHERE id = ?')
            .run(status, nowStr, nowStr, req.params.id);
          break;

        case 'served':
          db.prepare('UPDATE orders SET status = ?, served_at = ?, updated_at = ? WHERE id = ?')
            .run(status, nowStr, nowStr, req.params.id);
          break;

        case 'completed':
          db.prepare('UPDATE orders SET status = ?, completed_at = ?, updated_at = ? WHERE id = ?')
            .run(status, nowStr, nowStr, req.params.id);
          db.prepare(`
            UPDATE order_items SET status = 'served', updated_at = ?
            WHERE order_id = ? AND status IN ('pending', 'preparing', 'ready')
          `).run(nowStr, req.params.id);
          if (currentOrder.table_id) {
            db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ?")
              .run(nowStr, currentOrder.table_id);
          }
          break;

        case 'cancelled': {
          // Select only items eligible for restocking (exclude already cancelled, voided, or accounting adjustments)
          const eligibleItems = db.prepare(`
            SELECT * FROM order_items
            WHERE order_id = ? AND status NOT IN ('cancelled', 'voided', 'void_adjustment')
          `).all(req.params.id) as any[];

          for (const item of eligibleItems) {
            const product = db.prepare('SELECT * FROM products WHERE id = ?').get(item.product_id) as any;
            if (product && item.inventory_deducted_quantity > 0) {
              db.prepare('UPDATE products SET stock_quantity = stock_quantity + ?, updated_at = ? WHERE id = ?')
                .run(item.inventory_deducted_quantity, nowStr, product.id);
            }
          }

          db.prepare(`
            UPDATE order_items SET status = 'cancelled', updated_at = ?
            WHERE order_id = ? AND status NOT IN ('cancelled', 'voided', 'void_adjustment')
          `).run(nowStr, req.params.id);

          db.prepare('UPDATE orders SET status = ?, cancelled_at = ?, cancellation_reason = ?, updated_at = ? WHERE id = ?')
            .run(status, nowStr, reason, nowStr, req.params.id);
          // Only free table if explicitly requested (default: true for backward compatibility)
          if (currentOrder.table_id && free_table !== false) {
            db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ?")
              .run(nowStr, currentOrder.table_id);
          }
          break;
        }
      }

      const updatedOrder = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)) as any;
      const orderItems = attachEffectiveAddons(db, db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id).map(parseItemJson) as any[]);
      const tableRow2 = updatedOrder.table_id ? db.prepare('SELECT * FROM tables WHERE id = ?').get(updatedOrder.table_id) as any : null;
      const table = resolveOrderTable(updatedOrder, tableRow2);
      return { updatedOrder, orderItems, table, changed: true };
    });

    if (changed) {
      notifyKdsUpdate();
    }

    res.json({ order: Object.assign({}, updatedOrder, { items: orderItems, table }) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

router.patch('/:id/customer', orderWriteRateLimit, requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const { customer_id } = req.body;

    // Validate customer exists if providing one
    if (customer_id) {
      const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id);
      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }
    }

    const nowStr = now();
    const updatedOrder = withTxn(() => {
      db.prepare('UPDATE orders SET customer_id = ?, updated_at = ? WHERE id = ?')
        .run(customer_id || null, nowStr, req.params.id);

      // Keep every unpaid guest check attached to the same customer.
      db.prepare("UPDATE bills SET customer_id = ?, updated_at = ? WHERE order_id = ? AND payment_status != 'paid'")
        .run(customer_id || null, nowStr, req.params.id);

      return parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)) as any;
    });

    const customer = updatedOrder.customer_id
      ? db.prepare('SELECT * FROM customers WHERE id = ?').get(updatedOrder.customer_id)
      : null;

    notifyOrderUpdated();

    res.json({ order: { ...updatedOrder, customer } });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.patch('/:id/convert-to-takeaway', orderWriteRateLimit, requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const nowStr = now();

    withTxn(() => {
      const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
      if (!order) {
        throw Object.assign(new Error('Order not found'), { statusCode: 404 });
      }
      if (order.type !== 'dine_in') {
        throw Object.assign(new Error('Only dine-in orders can be converted to takeaway'), { statusCode: 400 });
      }
      if (!isOrderTypeAllowed(getSettingValue(ORDER_TYPES_SETTING_KEY), 'takeaway')) {
        throw Object.assign(new Error('Takeaway is disabled'), { statusCode: 400 });
      }
      if (['completed', 'cancelled'].includes(order.status)) {
        throw Object.assign(new Error('Cannot convert a completed or cancelled order'), { statusCode: 400 });
      }

      db.prepare("UPDATE orders SET type = 'takeaway', table_id = NULL, updated_at = ? WHERE id = ?")
        .run(nowStr, req.params.id);

      if (order.table_id) {
        db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ?")
          .run(nowStr, order.table_id);
      }
      return order.table_id;
    });

    const updatedOrder = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)) as any;
    const orderItems = attachEffectiveAddons(db, db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(req.params.id).map(parseItemJson) as any[]);

    notifyKdsUpdate();

    res.json({ order: Object.assign({}, updatedOrder, { items: orderItems, table: null }) });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

router.patch('/:id/discount', orderWriteRateLimit, requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Cannot apply discount to completed or cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot apply discount to a completed or cancelled order' });
    }

    const { discount_type, discount_value, discount_reason } = req.body || {};

    // Validate discount_type
    if (discount_value !== 0 && (!discount_type || !['percentage', 'amount'].includes(discount_type))) {
      return res.status(400).json({ error: 'discount_type must be "percentage" or "amount"' });
    }

    // Validate discount_value is a non-negative finite number
    if (discount_value === undefined || discount_value === null || typeof discount_value !== 'number' || discount_value < 0 || !Number.isFinite(discount_value)) {
      return res.status(400).json({ error: 'discount_value must be a non-negative number' });
    }

    // Check if approval is required
    if (discount_value > 0) {
      const requiresApproval = getSettingValue('discount_requires_approval') === 'true';
      if (requiresApproval) {
        const { override_pin } = req.body || {};
        if (!override_pin) {
          return res.status(403).json({ error: 'Manager PIN required for discounts', requiresApproval: true });
        }
        const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
        const rateLimitKey = `pin:${clientIp}:discount`;
        if (!checkPinRateLimit(rateLimitKey)) {
          return res.status(429).json({ error: 'Too many PIN attempts. Try again in 15 minutes.' });
        }
        const user = db.prepare("SELECT * FROM users WHERE is_active = 1 AND pin_hash IS NOT NULL AND role IN ('owner', 'manager')")
          .all()
          .find((u: any) => verifyPin(u.pin_hash, override_pin));
        if (!user) {
          return res.status(403).json({ error: 'Invalid manager PIN' });
        }
      }
    }

    // Check discount mode
    if (discount_value > 0) {
      const discountMode = getSettingValue('discount_mode') || 'percentage';
      if (discountMode === 'flat' && discount_type === 'percentage') {
        return res.status(400).json({ error: 'Percentage discounts are disabled' });
      }
      if (discountMode === 'percentage' && discount_type === 'amount') {
        return res.status(400).json({ error: 'Flat amount discounts are disabled' });
      }
    }

    // Check against limits from settings (0 = no limit)
    if (discount_value > 0) {
      if (discount_type === 'percentage') {
        const maxPercentage = parseFloat(getSettingValue('discount_max_percentage') || '25');
        if (maxPercentage > 0 && discount_value > maxPercentage) {
          return res.status(400).json({ error: `discount_value exceeds maximum percentage of ${maxPercentage}` });
        }
      } else if (discount_type === 'amount') {
        const maxAmount = parseFloat(getSettingValue('discount_max_amount') || '0');
        if (maxAmount > 0 && discount_value > maxAmount) {
          return res.status(400).json({ error: `discount_value exceeds maximum amount of ${maxAmount}` });
        }
      }
    }
    // BUG #6 FIX: Wrap discount + bill sync in a transaction
    const result = withTxn(() => {
      // Re-fetch and re-validate under the transaction lock: another request (e.g. a
      // concurrent item add/void, or the order being completed/cancelled) can race the
      // checks above and change status/subtotal before this lock is acquired (#175).
      const currentOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
      if (!currentOrder) {
        throw Object.assign(new Error('Order not found'), { statusCode: 404 });
      }
      if (['completed', 'cancelled'].includes(currentOrder.status)) {
        throw Object.assign(new Error('Cannot apply discount to a completed or cancelled order'), { statusCode: 400 });
      }

      // Calculate discount amount
      let discountAmount = 0;
      if (discount_value > 0) {
        if (discount_type === 'percentage') {
          discountAmount = (currentOrder.subtotal * discount_value) / 100;
        } else {
          discountAmount = Math.min(discount_value, currentOrder.subtotal);
        }
        discountAmount = Math.round(discountAmount * 100) / 100;
      }

      // The discount always applies to the stored subtotal, so calling this
      // endpoint repeatedly does not compound the reduction each time.
      const discountedSubtotal = Math.max(0, currentOrder.subtotal - discountAmount);
      const newTotal = roundMoney(discountedSubtotal + orderCharges(currentOrder));

      db.prepare(`
        UPDATE orders SET discount_amount = ?, discount_type = ?, discount_value = ?,
          discount_reason = ?, total = ?, updated_at = ? WHERE id = ?
      `).run(
        discountAmount,
        discount_value > 0 ? discount_type : null,
        discount_value > 0 ? discount_value : null,
        discount_value > 0 ? (discount_reason || null) : null,
        newTotal, now(), req.params.id
      );

      // Sync discount to bill if it exists and is unpaid
      const existingBill = db.prepare('SELECT * FROM bills WHERE order_id = ? AND payment_status != ?')
        .get(req.params.id, 'paid') as any;
      if (existingBill) {
        const newBillBalance = Math.max(0, newTotal - (existingBill.paid_amount || 0));
        db.prepare(`
          UPDATE bills SET discount_amount = ?, discount_type = ?, discount_value = ?,
            discount_reason = ?, total = ?, balance = ?, updated_at = ?
          WHERE id = ?
        `).run(
          discountAmount,
          discount_value > 0 ? discount_type : null,
          discount_value > 0 ? discount_value : null,
          discount_value > 0 ? (discount_reason || null) : null,
          newTotal, newBillBalance, now(), existingBill.id
        );
      }

      const updatedOrder = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id)) as any;
      return updatedOrder;
    });

    notifyOrderUpdated();
    res.json({ order: result });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

/**
 * Re-adds an order up after one of its rows changed, and follows the change
 * through to a bill that has not been paid yet.
 *
 * Shared by the two row-level edits — the discount and the price — so the two
 * cannot drift apart on how a total is reached.
 */
function recomputeOrderAfterItemChange(db: ReturnType<typeof getDatabase>, orderId: string, order: any): void {
  // status != 'cancelled' — a cancelled item must not re-enter the order total
  // here, the same filter every other recompute site in this file uses.
  const allItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? AND status != 'cancelled'").all(orderId) as any[];
  let orderSubtotal = 0;
  for (const i of allItems) {
    orderSubtotal += i.subtotal;
  }

  // An order-level discount was agreed against the old subtotal, so it moves
  // with it rather than staying a fixed number of euros.
  const existingDiscountAmount = order.discount_amount || 0;
  let newOrderDiscount = existingDiscountAmount;
  if (existingDiscountAmount > 0 && order.subtotal > 0) {
    newOrderDiscount = Math.round(existingDiscountAmount * (orderSubtotal / order.subtotal) * 100) / 100;
  }

  // The cover is worked out here and nowhere else, from what is on the check
  // right now: so much a head, less the heads whose cover is already inside a
  // fixed menu they ordered. Cancel that menu and the cover comes back; add one
  // and it goes. Read from the row rather than the caller's copy, because
  // PATCH /guests writes the new head count just before calling in.
  const coverCharge = orderCoverCharge(db, orderId);

  const discountedSubtotal = Math.max(0, orderSubtotal - newOrderDiscount);
  const orderTotal = roundMoney(discountedSubtotal + orderCharges({ ...order, cover_charge: coverCharge }));

  db.prepare(`
    UPDATE orders SET subtotal = ?, discount_amount = ?, total = ?, cover_charge = ?, updated_at = ? WHERE id = ?
  `).run(orderSubtotal, newOrderDiscount, orderTotal, coverCharge, now(), orderId);

  const existingBill = db.prepare("SELECT * FROM bills WHERE order_id = ? AND payment_status != 'paid'").get(orderId) as any;
  if (existingBill) {
    const newBillBalance = Math.max(0, orderTotal - (existingBill.paid_amount || 0));
    // The cover travels with the total, or the printed bill contradicts itself:
    // the right amount at the bottom and yesterday's cover on its own line,
    // with the per-head price back-calculated from the stale figure.
    db.prepare('UPDATE bills SET total = ?, balance = ?, discount_amount = ?, cover_charge = ?, updated_at = ? WHERE id = ?')
      .run(orderTotal, newBillBalance, newOrderDiscount, coverCharge, now(), existingBill.id);
  }
}

router.patch('/:id/items/:itemId/discount', orderWriteRateLimit, requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Cannot apply discount to completed or cancelled orders
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot apply discount to a completed or cancelled order' });
    }

    const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(req.params.itemId, req.params.id) as any;
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { discount_type, discount_value } = req.body;

    // Validate discount_type
    if (!discount_type || !['percentage', 'amount'].includes(discount_type)) {
      return res.status(400).json({ error: 'discount_type must be "percentage" or "amount"' });
    }

    // Validate discount_value is a positive number
    if (discount_value === undefined || discount_value === null || typeof discount_value !== 'number' || discount_value <= 0) {
      return res.status(400).json({ error: 'discount_value must be a positive number' });
    }

    // Check if approval is required
    const requiresApproval = getSettingValue('discount_requires_approval') === 'true';
    if (requiresApproval) {
      const { override_pin } = req.body;
      if (!override_pin) {
        return res.status(403).json({ error: 'Manager PIN required for discounts', requiresApproval: true });
      }
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `pin:${clientIp}:item-discount`;
      if (!checkPinRateLimit(rateLimitKey)) {
        return res.status(429).json({ error: 'Too many PIN attempts. Try again in 15 minutes.' });
      }
      const user = db.prepare("SELECT * FROM users WHERE is_active = 1 AND pin_hash IS NOT NULL AND role IN ('owner', 'manager')")
        .all()
        .find((u: any) => verifyPin(u.pin_hash, override_pin));
      if (!user) {
        return res.status(403).json({ error: 'Invalid manager PIN' });
      }
    }

    // Check discount mode
    const discountMode = getSettingValue('discount_mode') || 'percentage';
    if (discountMode === 'flat' && discount_type === 'percentage') {
      return res.status(400).json({ error: 'Percentage discounts are disabled' });
    }
    if (discountMode === 'percentage' && discount_type === 'amount') {
      return res.status(400).json({ error: 'Flat amount discounts are disabled' });
    }

    // BUG #14 FIX: Check item-level discount against max settings (0 = no limit)
    if (discount_type === 'percentage') {
      const maxPercentage = parseFloat(getSettingValue('discount_max_percentage') || '25');
      if (maxPercentage > 0 && discount_value > maxPercentage) {
        return res.status(400).json({ error: `discount_value exceeds maximum percentage of ${maxPercentage}` });
      }
    } else if (discount_type === 'amount') {
      const maxAmount = parseFloat(getSettingValue('discount_max_amount') || '0');
      if (maxAmount > 0 && discount_value > maxAmount) {
        return res.status(400).json({ error: `discount_value exceeds maximum amount of ${maxAmount}` });
      }
    }

    // Calculate item discount amount (include addon prices)
    const addonRows = db.prepare('SELECT price, quantity FROM order_item_addons WHERE order_item_id = ?').all(item.id) as { price: number; quantity?: number }[];
    const addonTotal = addonRows.reduce((sum, addon) => sum + (addon.price || 0) * (addon.quantity || 1) * item.quantity, 0);
    const itemBaseTotal = item.unit_price * item.quantity + addonTotal;

    let discountAmount: number;
    if (discount_type === 'percentage') {
      discountAmount = (itemBaseTotal * discount_value) / 100;
    } else {
      discountAmount = Math.min(discount_value, itemBaseTotal);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;

    // Recalculate item subtotal after discount
    const newSubtotal = Math.max(0, itemBaseTotal - discountAmount);

    const updatedItem = withTxn(() => {
      db.prepare(`
        UPDATE order_items SET discount_amount = ?,
          subtotal = ?, total = ?, updated_at = ? WHERE id = ?
      `).run(discountAmount, newSubtotal, newSubtotal, now(), req.params.itemId);

      recomputeOrderAfterItemChange(db, String(req.params.id), order);

      return db.prepare('SELECT * FROM order_items WHERE id = ?').get(req.params.itemId) as any;
    });

    res.json({ item: updatedItem });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});


/**
 * Sets what a row actually costs.
 *
 * A dish agreed at the table has no price in the menu, and at the moment the
 * waiter writes it down nobody knows what it is: the price arrives later, from
 * whoever does know, and it can go up as well as down — which is why this is
 * not a discount. Same guards as the row discount, because it moves the same
 * money: owner or manager, the manager PIN when discounts ask for one, and
 * never on an order that is finished or a check that has been split.
 */
router.patch('/:id/items/:itemId/price', orderWriteRateLimit, requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot change a price on a completed or cancelled order' });
    }

    const item = db.prepare('SELECT * FROM order_items WHERE id = ? AND order_id = ?').get(req.params.itemId, req.params.id) as any;
    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    const { unit_price } = req.body || {};
    if (typeof unit_price !== 'number' || !Number.isFinite(unit_price) || unit_price < 0) {
      return res.status(400).json({ error: 'unit_price must be a non-negative number' });
    }
    // A mistyped price is the likeliest way this goes wrong, so an absurd one
    // is refused rather than printed on a guest's bill.
    if (unit_price > 1_000_000) {
      return res.status(400).json({ error: 'unit_price is out of range' });
    }

    const requiresApproval = getSettingValue('discount_requires_approval') === 'true';
    if (requiresApproval) {
      const { override_pin } = req.body;
      if (!override_pin) {
        return res.status(403).json({ error: 'Manager PIN required to change a price', requiresApproval: true });
      }
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `pin:${clientIp}:item-price`;
      if (!checkPinRateLimit(rateLimitKey)) {
        return res.status(429).json({ error: 'Too many PIN attempts. Try again in 15 minutes.' });
      }
      const user = db.prepare("SELECT * FROM users WHERE is_active = 1 AND pin_hash IS NOT NULL AND role IN ('owner', 'manager')")
        .all()
        .find((u: any) => verifyPin(u.pin_hash, override_pin));
      if (!user) {
        return res.status(403).json({ error: 'Invalid manager PIN' });
      }
    }

    const newUnitPrice = roundMoney(unit_price);
    const addonRows = db.prepare('SELECT price, quantity FROM order_item_addons WHERE order_item_id = ?').all(item.id) as { price: number; quantity?: number }[];
    const addonTotal = addonRows.reduce((sum, addon) => sum + (addon.price || 0) * (addon.quantity || 1) * item.quantity, 0);
    const itemBaseTotal = newUnitPrice * item.quantity + addonTotal;
    // A discount agreed on the old price cannot exceed the new one, or the row
    // would go negative and quietly pay the guest.
    const discountAmount = Math.min(item.discount_amount || 0, itemBaseTotal);
    const newSubtotal = Math.max(0, itemBaseTotal - discountAmount);

    const updatedItem = withTxn(() => {
      // Saving a price settles the row, whatever the number: a dish given away
      // at zero has been decided on, and must stop asking to be priced.
      db.prepare(`
        UPDATE order_items SET unit_price = ?, discount_amount = ?,
          subtotal = ?, total = ?, price_confirmed = 1, updated_at = ? WHERE id = ?
      `).run(newUnitPrice, discountAmount, newSubtotal, newSubtotal, now(), req.params.itemId);

      recomputeOrderAfterItemChange(db, String(req.params.id), order);

      return db.prepare('SELECT * FROM order_items WHERE id = ?').get(req.params.itemId) as any;
    });

    notifyOrderUpdated();

    res.json({ item: updatedItem });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

/**
 * Corrects how many people are actually eating.
 *
 * The number is picked when the order is taken and was never touchable again;
 * with a cover charge on it that leaves the bill wrong the moment a friend
 * turns up late. Changing it re-prices the cover and follows the change
 * through to an unpaid bill, exactly like a row edit does.
 */
router.patch('/:id/guests', orderWriteRateLimit, requireRole('owner', 'manager', 'cashier', 'server'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    if (['completed', 'cancelled'].includes(order.status)) {
      return res.status(400).json({ error: 'Cannot change the covers on a completed or cancelled order' });
    }

    const { guest_count } = req.body || {};
    if (!Number.isSafeInteger(guest_count) || guest_count < 1 || guest_count > 99) {
      return res.status(400).json({ error: 'guest_count must be a whole number between 1 and 99' });
    }

    const updated = withTxn(() => {
      // Write the new head count first: the recompute reads it back and prices
      // the cover from it, so there is one formula rather than two that have to
      // agree.
      db.prepare('UPDATE orders SET guest_count = ?, updated_at = ? WHERE id = ?')
        .run(guest_count, now(), req.params.id);
      recomputeOrderAfterItemChange(db, String(req.params.id), order);
      return parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(req.params.id));
    });

    notifyOrderUpdated();

    res.json({ order: updated });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : "Internal server error" });
  }
});

export const orderRoutes = router;
