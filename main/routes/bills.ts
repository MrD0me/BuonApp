import { createHash, randomUUID } from 'crypto';
import { Router, Request, Response } from 'express';
import {
  attachEffectiveAddons,
  utcDayBounds,
  generateBillNumber,
  getDatabase,
  getSettingValue,
  now,
  parseItemJson,
  parseRowJson,
  utcTodayDate,
  verifyPin,
  withTxn,
} from '../db';
import { asyncHandler } from '../middleware/async-handler';
import { notifyKdsUpdate, notifyOrderUpdated } from '../services/kds';
import { printReceipt } from '../services/receipt';
import { requireRole } from '../middleware/security';
import { orderCharges, roundMoney } from '../money';

const router = Router();

// A split check shows only the share of each line it was allocated. Amounts
// scale with the allocated quantity; a line nobody split is returned untouched
// so an unsplit bill reads exactly as it was stored.
export function projectOrderItems(
  order: any,
  rawItemRows: any[],
  allocations: any[] = [],
): any[] {
  const allocated = new Map(allocations.map((row) => [Number(row.order_item_id), Number(row.quantity)]));
  return rawItemRows
    .filter((item) => allocations.length === 0 || allocated.has(Number(item.id)))
    .map((item) => {
      const quantity = allocated.get(Number(item.id));
      if (quantity === undefined) return item;
      const originalQuantity = Number(item.quantity);
      const quantityRatio = originalQuantity <= 0 ? 1 : quantity / originalQuantity;
      return {
        ...item,
        quantity,
        subtotal: roundMoney(Number(item.subtotal) * quantityRatio),
        total: roundMoney(Number(item.total) * quantityRatio),
      };
    });
}

function selectRowsByIds<T>(
  db: ReturnType<typeof getDatabase>,
  ids: any[],
  queryForCount: (count: number) => string,
): T[] {
  const rows: T[] = [];
  for (let offset = 0; offset < ids.length; offset += 400) {
    const chunk = ids.slice(offset, offset + 400);
    rows.push(...db.prepare(queryForCount(chunk.length)).all(...chunk) as T[]);
  }
  return rows;
}

export function getOrderWithItems(db: ReturnType<typeof getDatabase>, orderId: number, billId?: number): any {
  const order = parseRowJson(db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId));
  if (!order) return order;
  const allocations = billId === undefined ? [] : db.prepare('SELECT order_item_id, quantity FROM bill_items WHERE bill_id = ?').all(billId) as any[];
  // price_required rides along so the printed bill can tell an intentional
  // freebie from a row nobody has priced yet: both are zero.
  const itemRows = db.prepare(`
    SELECT oi.*, COALESCE(p.price_required, 0) AS price_required
    FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
    WHERE oi.order_id = ?
  `).all(orderId) as any[];
  return {
    ...order,
    items: attachEffectiveAddons(db, projectOrderItems(order, itemRows, allocations).map(parseItemJson)),
  };
}

export function getOrdersWithItemsForBills(
  db: ReturnType<typeof getDatabase>,
  bills: any[],
): Map<number, any> {
  const result = new Map<number, any>();
  if (bills.length === 0) return result;
  const orderIds = Array.from(new Set(bills.map((bill) => Number(bill.order_id))));
  const orderRows = selectRowsByIds<any>(db, orderIds, (count) => `SELECT * FROM orders WHERE id IN (${new Array(count).fill('?').join(',')})`);
  const orders = new Map(orderRows.map((row) => [Number(row.id), parseRowJson(row)]));
  const itemRows = selectRowsByIds<any>(db, orderIds, (count) => `SELECT * FROM order_items WHERE order_id IN (${new Array(count).fill('?').join(',')}) ORDER BY id`);
  const itemsByOrder = new Map<number, any[]>();
  for (const item of itemRows) {
    const items = itemsByOrder.get(Number(item.order_id)) || [];
    items.push(item);
    itemsByOrder.set(Number(item.order_id), items);
  }

  const billIds = bills.map((bill) => Number(bill.id));
  const reportBillItems = selectRowsByIds<any>(db, billIds, (count) => `SELECT bill_id, order_item_id, quantity FROM bill_items WHERE bill_id IN (${new Array(count).fill('?').join(',')})`);
  const billItemsByBill = new Map<number, any[]>();
  for (const row of reportBillItems) {
    const rows = billItemsByBill.get(Number(row.bill_id)) || [];
    rows.push(row);
    billItemsByBill.set(Number(row.bill_id), rows);
  }

  const projected = new Map<number, any>();
  const addonItems = new Map<number, any>();
  for (const bill of bills) {
    const order = orders.get(Number(bill.order_id));
    if (!order) continue;
    const allocations = billItemsByBill.get(Number(bill.id)) || [];
    const rawItems = itemsByOrder.get(Number(bill.order_id)) || [];
    const items = projectOrderItems(order, rawItems, allocations).map(parseItemJson);
    items.forEach((item) => addonItems.set(Number(item.id), item));
    projected.set(Number(bill.id), { ...order, items });
  }
  const hydratedAddons = attachEffectiveAddons(db, Array.from(addonItems.values()));
  const addonsByItem = new Map(hydratedAddons.map((item) => [Number(item.id), item.addons]));
  for (const [billId, order] of projected) {
    order.items = order.items.map((item: any) => ({ ...item, addons: addonsByItem.get(Number(item.id)) || [] }));
    result.set(billId, order);
  }
  return result;
}

// Fixed conversion rate for redeeming loyalty wallet points as payment (points per 1 currency unit).
const LOYALTY_REDEMPTION_RATE = 100;

// Rate limiting for PIN validation (simple in-memory)
const pinAttempts = new Map<string, { count: number; resetAt: number }>();
const PIN_MAX_ATTEMPTS = 5;
const PIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkPinRateLimit(key: string): boolean {
  const nowMs = Date.now();
  if (pinAttempts.size > 500) {
    for (const [k, v] of pinAttempts.entries()) {
      if (nowMs > v.resetAt) pinAttempts.delete(k);
    }
  }
  const entry = pinAttempts.get(key);
  if (!entry || nowMs > entry.resetAt) {
    pinAttempts.set(key, { count: 1, resetAt: nowMs + PIN_WINDOW_MS });
    return true;
  }
  if (entry.count >= PIN_MAX_ATTEMPTS) return false;
  entry.count++;
  return true;
}

function parsePaginationInteger(value: unknown, defaultValue: number): number | null {
  if (value === undefined || value === null || value === '') return defaultValue;
  if (Array.isArray(value)) return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed)) return null;
  return parsed;
}

router.get('/', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    let query = 'SELECT * FROM bills WHERE 1=1';
    let countQuery = 'SELECT COUNT(*) as count FROM bills WHERE 1=1';
    const params: any[] = [];

    if (req.query.status) {
      query += ' AND payment_status = ?';
      countQuery += ' AND payment_status = ?';
      params.push(req.query.status);
    }
    if (req.query.order_id) {
      query += ' AND order_id = ?';
      countQuery += ' AND order_id = ?';
      params.push(req.query.order_id);
    }
    if (req.query.customer_id) {
      query += ' AND customer_id = ?';
      countQuery += ' AND customer_id = ?';
      params.push(req.query.customer_id);
    }
    if (req.query.today === 'true') {
      // #208: UTC-day range hits `idx_bills_created_at` instead of date() on every row.
      const [s, e] = utcDayBounds(utcTodayDate());
      query += ' AND created_at >= ? AND created_at < ?';
      countQuery += ' AND created_at >= ? AND created_at < ?';
      params.push(s, e);
    }

    // #208: default page size of 50 and a hard cap even when clients omit
    // per_page — the previous "unbounded" default could return every bill
    // ever when a caller left the param off.
    const requestedLimit = parsePaginationInteger(req.query.per_page ?? req.query.limit, 50);
    if (requestedLimit === null || requestedLimit < 1) {
      return res.status(400).json({ error: 'per_page must be a positive integer' });
    }
    const limit = Math.min(requestedLimit, 500);
    const offset = parsePaginationInteger(req.query.offset, 0);
    if (offset === null || offset < 0) {
      return res.status(400).json({ error: 'offset must be a non-negative integer' });
    }

    query += ' ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?';
    const pageParams = [...params, limit, offset];

    const bills = db.prepare(query).all(...pageParams).map(parseRowJson);
    const total = Number((db.prepare(countQuery).get(...params) as any)?.count || 0);
    res.json({
      bills,
      pagination: {
        limit,
        per_page: limit,
        offset,
        total,
        next_offset: offset + bills.length < total ? offset + bills.length : null,
        has_more: offset + bills.length < total,
      },
    });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.get('/:id', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const bill = parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id));
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const order = getOrderWithItems(db, (bill as any).order_id, Number((bill as any).id));
    const customer = (bill as any).customer_id ? db.prepare('SELECT * FROM customers WHERE id = ?').get((bill as any).customer_id) : null;

    res.json({ bill: { ...bill, order, customer } });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Get bill by order ID
router.get('/order/:orderId', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const bill = parseRowJson(db.prepare('SELECT * FROM bills WHERE order_id = ? ORDER BY created_at DESC LIMIT 1').get(req.params.orderId));
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found for this order' });
    }

    const order = getOrderWithItems(db, (bill as any).order_id, Number((bill as any).id));
    const customer = (bill as any).customer_id ? db.prepare('SELECT * FROM customers WHERE id = ?').get((bill as any).customer_id) : null;

    res.json({ bill: { ...bill, order, customer } });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post('/generate', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const { order_id } = req.body;

    if (!order_id) {
      return res.status(400).json({ error: 'Order ID is required' });
    }

    const db = getDatabase();
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(order_id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const result = withTxn(() => {
      const existingBill = db.prepare('SELECT * FROM bills WHERE order_id = ?').get(order_id) as any;
      if (existingBill) {
        if (existingBill.split_group_id) return { bill: parseRowJson(existingBill), isNew: false };
        // Re-sync bill totals from the order in case discount/adjustments were applied
        // after the bill was first generated (e.g. discount applied → then checkout clicked).
        // Only sync if the bill is still unpaid (partial or full payments must not be changed).
        const orderSubtotal      = order.subtotal        || 0;
        const orderDiscountAmt   = order.discount_amount || 0;
        const orderDelivery      = order.delivery_charge || 0;
        const orderPackaging     = order.packaging_charge|| 0;
        const orderCover         = order.cover_charge    || 0;
        const orderTotal         = order.total           || 0;

        const roundedOrderTotal = roundMoney(orderTotal);

        const totalsChanged =
          existingBill.payment_status !== 'paid' && (
            existingBill.discount_amount !== orderDiscountAmt ||
            existingBill.subtotal        !== orderSubtotal    ||
            existingBill.total           !== roundedOrderTotal
          );

        if (totalsChanged) {
          const newBalance = Math.max(0, roundedOrderTotal - (existingBill.paid_amount || 0));
          db.prepare(`
            UPDATE bills
            SET subtotal       = ?,
                discount_amount= ?,
                discount_type  = ?,
                discount_value = ?,
                discount_reason= ?,
                delivery_charge= ?,
                packaging_charge= ?,
                cover_charge   = ?,
                total          = ?,
                balance        = ?,
                updated_at     = ?
            WHERE id = ?
          `).run(
            orderSubtotal,
            orderDiscountAmt, order.discount_type, order.discount_value, order.discount_reason,
            orderDelivery, orderPackaging, orderCover,
            roundedOrderTotal, newBalance, now(),
            existingBill.id
          );

          const updated = parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(existingBill.id));
          return { bill: updated, isNew: false };
        }

        return { bill: parseRowJson(existingBill), isNew: false };
      }

      // Generate bill number inside transaction to prevent race conditions
      const billNumber = generateBillNumber();
      const subtotal = order.subtotal || 0;
      const discountAmount = order.discount_amount || 0;
      const deliveryCharge = order.delivery_charge || 0;
      const packagingCharge = order.packaging_charge || 0;
      const coverCharge = order.cover_charge || 0;
      const total = roundMoney(order.total || 0);

      const runResult = db.prepare(`
        INSERT INTO bills (bill_number, order_id, customer_id, subtotal,
          discount_amount, discount_type, discount_value, discount_reason,
          delivery_charge, packaging_charge, cover_charge, total, paid_amount, balance, payment_status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', ?, ?)
      `).run(
        billNumber, order_id, order.customer_id, subtotal,
        discountAmount, order.discount_type, order.discount_value, order.discount_reason,
        deliveryCharge, packagingCharge, coverCharge, total, 0, total, now(), now()
      );

      const newBill = parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(runResult.lastInsertRowid));
      return { bill: newBill, isNew: true };
    });

    notifyOrderUpdated();
    res.status(result.isNew ? 201 : 200).json({ bill: result.bill });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

function allocateMinorUnits(sourceMinor: number, weights: number[]): number[] {
  const n = weights.length;
  if (n === 0) return [];
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  const effectiveWeights = totalWeight === 0 ? Array(n).fill(1) : weights;
  const effectiveTotalWeight = effectiveWeights.reduce((sum, w) => sum + w, 0);

  const base: number[] = new Array(n);
  const remainders: { index: number; remainder: number }[] = new Array(n);
  let used = 0;

  for (let i = 0; i < n; i++) {
    const exact = (sourceMinor * effectiveWeights[i]) / effectiveTotalWeight;
    const b = Math.floor(exact);
    base[i] = b;
    used += b;
    remainders[i] = { index: i, remainder: exact - b };
  }

  let left = sourceMinor - used;
  remainders.sort((a, b) => {
    if (Math.abs(b.remainder - a.remainder) > 1e-9) {
      return b.remainder - a.remainder;
    }
    return a.index - b.index;
  });

  for (let i = 0; i < left; i++) {
    base[remainders[i].index] += 1;
  }

  return base;
}

interface OrderBillSyncValues {
  subtotal: number;
  discountAmount: number;
  deliveryCharge: number;
  packagingCharge: number;
  total: number;
}

// Each check's share of the order, weighted by the value of the lines it was
// allocated. Everything money-related on a split check is apportioned with
// these weights.
function getSplitBillAllocationWeights(
  db: ReturnType<typeof getDatabase>,
  orderId: number | string,
  bills: any[],
): number[] {
  const items = db.prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id').all(orderId) as any[];
  const billIds = bills.map((bill) => Number(bill.id));
  const billItems = billIds.length === 0
    ? []
    : db.prepare(`SELECT bill_id, order_item_id, quantity FROM bill_items WHERE bill_id IN (${billIds.map(() => '?').join(',')})`).all(...billIds) as any[];
  const quantities = new Map<number, Map<number, number>>();
  for (const row of billItems) {
    const byItem = quantities.get(Number(row.bill_id)) || new Map<number, number>();
    byItem.set(Number(row.order_item_id), Number(row.quantity));
    quantities.set(Number(row.bill_id), byItem);
  }

  return bills.map((bill) => {
    const byItem = quantities.get(Number(bill.id)) || new Map<number, number>();
    return items
      .filter((item) => !['cancelled', 'voided', 'void_adjustment'].includes(item.status))
      .reduce((sum, item) => {
        const quantity = byItem.get(Number(item.id)) || 0;
        if (quantity <= 0 || Number(item.quantity) <= 0) return sum;
        return sum + Number(item.total || item.subtotal || 0) * quantity / Number(item.quantity);
      }, 0);
  });
}

export function syncUnpaidBillsForOrder(
  db: ReturnType<typeof getDatabase>,
  orderId: number | string,
  source: OrderBillSyncValues,
): void {
  const bills = db.prepare('SELECT * FROM bills WHERE order_id = ? ORDER BY id').all(orderId) as any[];
  const splitBills = bills.some((bill) => bill.split_group_id);
  if (splitBills && bills.some((bill) => bill.payment_status !== 'unpaid' || Number(bill.paid_amount || 0) > 0)) {
    throw Object.assign(new Error('Cannot modify an order after a split check is paid'), { statusCode: 409 });
  }
  const unpaidBills = bills.filter((bill) => bill.payment_status !== 'paid');
  if (unpaidBills.length === 0) return;

  const billTotal = roundMoney(source.total);

  if (!splitBills) {
    const update = db.prepare(`
      UPDATE bills SET subtotal = ?, total = ?, balance = ?,
        discount_amount = ?, delivery_charge = ?, packaging_charge = ?, updated_at = ?
      WHERE id = ?
    `);
    for (const bill of unpaidBills) {
      update.run(
        source.subtotal, billTotal, Math.max(0, billTotal - Number(bill.paid_amount || 0)),
        source.discountAmount, source.deliveryCharge, source.packagingCharge, now(), bill.id,
      );
    }
    return;
  }

  const weights = getSplitBillAllocationWeights(db, orderId, bills);
  const fields = {
    subtotal: Math.round(source.subtotal * 100),
    discountAmount: Math.round(source.discountAmount * 100),
    deliveryCharge: Math.round(source.deliveryCharge * 100),
    packagingCharge: Math.round(source.packagingCharge * 100),
    total: Math.round(billTotal * 100),
  };
  const allocations = Object.fromEntries(Object.entries(fields).map(([field, value]) => [
    field,
    allocateMinorUnits(value, weights).map((minor) => minor / 100),
  ])) as Record<keyof typeof fields, number[]>;
  const update = db.prepare(`
    UPDATE bills SET subtotal = ?, discount_amount = ?,
      delivery_charge = ?, packaging_charge = ?, total = ?, balance = ?, updated_at = ?
    WHERE id = ?
  `);

  bills.forEach((bill, index) => {
    if (bill.payment_status === 'paid') return;
    const total = allocations.total[index];
    update.run(
      allocations.subtotal[index], allocations.discountAmount[index],
      allocations.deliveryCharge[index], allocations.packagingCharge[index],
      total, Math.max(0, total - Number(bill.paid_amount || 0)), now(), bill.id,
    );
  });
}

// Divide one unpaid dine-in bill into independently payable guest checks.
// The kitchen order and inventory rows remain singular; bill_items stores only
// the whole-unit quantity allocated to each resulting check.
router.post('/:id/split-check', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    if (getSettingValue('split_checks_enabled') !== 'true') return res.status(403).json({ error: 'Split checks are not enabled' });
    const checks = req.body?.checks;
    if (!Array.isArray(checks) || checks.length < 2 || checks.length > 20) return res.status(400).json({ error: 'Create between 2 and 20 guest checks' });

    const result = withTxn(() => {
      const txnSource = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id) as any;
      if (!txnSource) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
      const txnOrder = db.prepare('SELECT * FROM orders WHERE id = ?').get(txnSource.order_id) as any;
      if (txnOrder?.type !== 'dine_in') throw Object.assign(new Error('Only dine-in checks can be split'), { statusCode: 400 });
      if (txnSource.payment_status !== 'unpaid' || Number(txnSource.paid_amount || 0) !== 0 || txnSource.payment_details) {
        throw Object.assign(new Error('A check can only be split before any payment is recorded'), { statusCode: 409 });
      }
      if (txnSource.split_group_id || Number((db.prepare('SELECT COUNT(*) AS n FROM bills WHERE order_id = ?').get(txnSource.order_id) as any).n) > 1) {
        throw Object.assign(new Error('This check has already been split'), { statusCode: 409 });
      }
      const txnActiveItems = db.prepare("SELECT * FROM order_items WHERE order_id = ? AND status NOT IN ('cancelled', 'voided', 'void_adjustment') ORDER BY id").all(txnSource.order_id) as any[];
      const txnItemById = new Map(txnActiveItems.map((item) => [Number(item.id), item]));
      const txnAssigned = new Map<number, number>();

      const txnNormalized = checks.map((check: any, index: number) => {
        const label = String(check?.label || `Guest ${index + 1}`).trim().slice(0, 40) || `Guest ${index + 1}`;
        if (!Array.isArray(check?.items) || check.items.length === 0) throw Object.assign(new Error(`${label} must contain at least one item`), { statusCode: 400 });
        const seenItems = new Set<number>();
        const items = check.items.map((entry: any) => {
          const itemId = Number(entry?.order_item_id);
          const quantity = Number(entry?.quantity);
          const item = txnItemById.get(itemId);
          if (!item || !Number.isSafeInteger(quantity) || quantity < 1) throw Object.assign(new Error(`Invalid item allocation in ${label}`), { statusCode: 400 });
          if (seenItems.has(itemId)) throw Object.assign(new Error(`${label} contains the same item more than once`), { statusCode: 400 });
          seenItems.add(itemId);
          txnAssigned.set(itemId, (txnAssigned.get(itemId) || 0) + quantity);
          return { item, quantity };
        });
        return { label, items };
      });

      for (const item of txnActiveItems) {
        if ((txnAssigned.get(Number(item.id)) || 0) !== Number(item.quantity)) {
          throw Object.assign(new Error(`Allocate all ${item.quantity} × ${item.product_name}`), { statusCode: 400 });
        }
      }

      const groupId = randomUUID();
      const weights = txnNormalized.map((check: { items: { item: any; quantity: number }[] }) =>
        check.items.reduce((sum: number, entry: { item: any; quantity: number }) => sum + Number(entry.item.total || entry.item.subtotal || 0) * entry.quantity / Number(entry.item.quantity), 0)
      );

      const fields = ['subtotal', 'discount_amount', 'delivery_charge', 'packaging_charge', 'cover_charge', 'total'] as const;
      const allocations: Record<string, number[]> = {};
      for (const field of fields) {
        const totalMinor = Math.round(Number(txnSource[field] || 0) * 100);
        allocations[field] = allocateMinorUnits(totalMinor, weights).map((minor) => minor / 100);
      }

      const billIds: number[] = [];
      txnNormalized.forEach((check, index) => {
        let billId: number;
        if (index === 0) {
          // A share that comes to nothing — the guest who only had the coffee
          // the house offered — is settled the moment it is made. Nothing is
          // owed on it, and the payment route refuses a zero balance, so
          // leaving it open would strand the whole order as unpaid forever.
          const settledNow = allocations.total[index] <= 0 ? 'paid' : 'unpaid';
          db.prepare(`UPDATE bills SET split_group_id = ?, split_label = ?, subtotal = ?, discount_amount = ?, delivery_charge = ?, packaging_charge = ?, cover_charge = ?, total = ?, balance = ?, payment_status = ?, paid_at = ?, updated_at = ? WHERE id = ?`)
            .run(groupId, check.label, allocations.subtotal[index], allocations.discount_amount[index], allocations.delivery_charge[index], allocations.packaging_charge[index], allocations.cover_charge[index], allocations.total[index], allocations.total[index], settledNow, settledNow === 'paid' ? now() : null, now(), txnSource.id);
          billId = Number(txnSource.id);
        } else {
          const inserted = db.prepare(`INSERT INTO bills (bill_number, order_id, customer_id, subtotal, discount_amount, discount_type, discount_value, discount_reason, delivery_charge, packaging_charge, cover_charge, total, paid_amount, balance, payment_status, split_group_id, split_label, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?)`)
            .run(generateBillNumber(), txnSource.order_id, txnSource.customer_id, allocations.subtotal[index], allocations.discount_amount[index], txnSource.discount_type, txnSource.discount_value, txnSource.discount_reason, allocations.delivery_charge[index], allocations.packaging_charge[index], allocations.cover_charge[index], allocations.total[index], allocations.total[index], allocations.total[index] <= 0 ? 'paid' : 'unpaid', groupId, check.label, now(), now());
          billId = Number(inserted.lastInsertRowid);
        }
        billIds.push(billId);
        const insertItem = db.prepare('INSERT INTO bill_items (bill_id, order_item_id, quantity) VALUES (?, ?, ?)');
        for (const entry of check.items) insertItem.run(billId, entry.item.id, entry.quantity);
      });
      return billIds.map((id) => parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(id)));
    });
    notifyOrderUpdated();
    res.status(201).json({ bills: result });
  } catch (error: any) {
    res.status(error.statusCode || 500).json({ error: error.message || 'Unable to split check' });
  }
});

interface PaymentInput {
  method: string;
  payment_method_id?: number;
  amount?: number | string | null;
  transaction_id?: string;
  notes?: string;
}

// A payment request is prepared and fully validated before any ledger or bill
// writes. Both endpoints use this one atomic path.
const PAYMENT_METHODS = new Set(['cash', 'card', 'wallet']);
const MAX_PAYMENT_LINES = 100;
const MAX_PAYMENT_METADATA_BYTES = 8192;
const MAX_IDEMPOTENCY_KEY_LENGTH = 128;

function canonicalizePaymentRequest(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalizePaymentRequest).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value as Record<string, unknown>).sort().map((key) => `${JSON.stringify(key)}:${canonicalizePaymentRequest((value as Record<string, unknown>)[key])}`).join(',')}}`;
  }
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}

function paymentRequestHash(billId: string, payments: unknown, customerId: unknown): string {
  return createHash('sha256')
    .update(canonicalizePaymentRequest({ billId, payments, customer_id: customerId }))
    .digest('hex');
}

function paymentIdempotencyKey(req: Request): string | null {
  const supplied = req.get('Idempotency-Key')?.trim();
  if (!supplied) return null;
  if (supplied.length > MAX_IDEMPOTENCY_KEY_LENGTH || !/^[\x21-\x7e]+$/.test(supplied)) {
    throw Object.assign(new Error('Idempotency-Key is invalid or too long'), { statusCode: 400 });
  }
  return supplied;
}

function paymentAmountCents(value: unknown, label = 'Payment amount'): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw Object.assign(new Error(`${label} must be a finite number greater than zero`), { statusCode: 400 });
  }
  const text = String(value).trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) {
    throw Object.assign(new Error(`${label} must be a finite number greater than zero with at most 2 decimal places`), { statusCode: 400 });
  }
  const parsed = Number(text);
  const cents = Math.round(parsed * 100);
  if (!Number.isFinite(parsed) || parsed <= 0 || !Number.isSafeInteger(cents)) {
    throw Object.assign(new Error(`${label} must be a finite number greater than zero`), { statusCode: 400 });
  }
  return cents;
}

interface PreparedPayment {
  payment: PaymentInput;
  amountCents: number;
  tenderedCents?: number;
  changeCents?: number;
  amountOmitted?: boolean;
}

function validatePaymentFields(payment: PaymentInput, index: number): void {
  if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
    throw Object.assign(new Error(`Unsupported payment method at line ${index + 1}`), { statusCode: 400 });
  }
  if (!payment.method) throw Object.assign(new Error('Payment method is required'), { statusCode: 400 });
  if (typeof payment.method !== 'string' || payment.method.length > 60) throw Object.assign(new Error(`Unsupported payment method at line ${index + 1}`), { statusCode: 400 });
  if (payment.method === 'custom' && !Number.isSafeInteger(Number(payment.payment_method_id))) {
    throw Object.assign(new Error(`Custom payment method is required at line ${index + 1}`), { statusCode: 400 });
  }
  if (JSON.stringify(payment).length > MAX_PAYMENT_METADATA_BYTES) {
    throw Object.assign(new Error(`Payment metadata at line ${index + 1} is too large`), { statusCode: 400 });
  }
  for (const [field, maxLength] of [['transaction_id', 256], ['notes', 1024] ] as const) {
    const value = payment[field];
    if (value !== undefined && (typeof value !== 'string' || value.length > maxLength || (field === 'transaction_id' && value.trim() === ''))) {
      throw Object.assign(new Error(`${field} is invalid or too long`), { statusCode: 400 });
    }
  }
  if (payment.amount !== undefined && payment.amount !== null) paymentAmountCents(payment.amount);
}

function paymentTransactionKey(payment: unknown): string | null {
  if (!payment || typeof payment !== 'object' || Array.isArray(payment)) return null;
  const candidate = payment as PaymentInput;
  const methodKey = candidate.payment_method_id === undefined ? candidate.method : `custom:${candidate.payment_method_id}`;
  return typeof methodKey === 'string' && typeof candidate.transaction_id === 'string'
    ? JSON.stringify([methodKey, candidate.transaction_id])
    : null;
}

function transactionPaymentMatches(existing: any, candidate: PaymentInput): boolean {
  if (!existing) return false;
  if (existing.method !== candidate.method || existing.transaction_id !== candidate.transaction_id) return false;
  if ((existing.notes ?? null) !== (candidate.notes ?? null)) return false;
  const candidateOmitted = candidate.amount === undefined || candidate.amount === null;
  if (existing.amount_omitted !== undefined && Boolean(existing.amount_omitted) !== candidateOmitted) return false;
  if (candidateOmitted) return true;
  const requestedCents = paymentAmountCents(candidate.amount);
  const storedRequested = existing.requested_amount
    ?? (existing.method === 'cash' && existing.tendered_amount !== undefined ? existing.tendered_amount : existing.amount);
  return typeof storedRequested === 'number' && Math.round(storedRequested * 100) === requestedCents;
}

function preparePaymentBatch(
  db: ReturnType<typeof getDatabase>,
  billId: string,
  payments: PaymentInput[],
  bodyCustomerId?: string | number,
  allowOmittedAmount = false,
): { bill: any; prepared: PreparedPayment[]; existingPayments: any[]; effectiveCustomerId: string | null; idempotentReplay?: boolean } {
  const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(billId) as any;
  if (!bill) throw Object.assign(new Error('Bill not found'), { statusCode: 404 });
  if (!Array.isArray(payments) || payments.length === 0) throw Object.assign(new Error('payments must be a non-empty array'), { statusCode: 400 });
  if (payments.length > MAX_PAYMENT_LINES) throw Object.assign(new Error(`A maximum of ${MAX_PAYMENT_LINES} payment lines is allowed`), { statusCode: 400 });
  let existingPayments: any[] = [];
  if (bill.payment_details) {
    try {
      const parsed = JSON.parse(bill.payment_details);
      existingPayments = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Preserve settlement compatibility with legacy malformed JSON. The new
      // line is still appended in a recoverable JSON array below.
      existingPayments = [];
    }
  }
  payments.forEach(validatePaymentFields);
  const resolvedPayments = payments.map((payment, index) => {
    if (PAYMENT_METHODS.has(payment.method)) return payment;
    const configured = payment.method === 'custom'
      ? db.prepare('SELECT id, name FROM payment_methods WHERE id = ? AND is_active = 1').get(payment.payment_method_id) as any
      : db.prepare('SELECT id, name FROM payment_methods WHERE lower(name) = lower(?) AND is_active = 1').get(payment.method) as any;
    if (!configured) throw Object.assign(new Error(`Unsupported or inactive custom payment method at line ${index + 1}`), { statusCode: 400 });
    return { ...payment, method: configured.name, payment_method_id: Number(configured.id) };
  });
  const requestedCustomerId = bodyCustomerId === undefined || bodyCustomerId === null || bodyCustomerId === ''
    ? null
    : String(bodyCustomerId);
  const order = db.prepare('SELECT customer_id FROM orders WHERE id = ?').get(bill.order_id) as { customer_id?: string | number | null } | undefined;
  const associatedCustomerId = bill.customer_id || order?.customer_id || null;
  if (requestedCustomerId && associatedCustomerId && String(associatedCustomerId) !== requestedCustomerId) {
    throw Object.assign(new Error('Payment customer does not match the bill customer'), { statusCode: 400 });
  }
  const usesWallet = resolvedPayments.some((payment) => payment.method === 'wallet');
  if (usesWallet && !associatedCustomerId) {
    throw Object.assign(new Error('Wallet payment requires a customer associated with the bill'), { statusCode: 400 });
  }
  const effectiveCustomerId = associatedCustomerId ? String(associatedCustomerId) : requestedCustomerId;
  if (effectiveCustomerId && !db.prepare('SELECT id FROM customers WHERE id = ?').get(effectiveCustomerId)) {
    throw Object.assign(new Error('Customer not found'), { statusCode: 400 });
  }
  const existingTransactionKeys = new Set(existingPayments.map(paymentTransactionKey).filter(Boolean));
  const existingTransactionPayments = new Map<string, any>();
  for (const existing of existingPayments) {
    const transactionKey = paymentTransactionKey(existing);
    if (transactionKey) existingTransactionPayments.set(transactionKey, existing);
  }
  for (const payment of resolvedPayments) {
    const transactionKey = paymentTransactionKey(payment);
    if (!transactionKey) continue;
    const candidate = payment as PaymentInput;
    const methodKey = candidate.payment_method_id === undefined ? candidate.method : `custom:${candidate.payment_method_id}`;
    const reference = db.prepare('SELECT bill_id FROM payment_transaction_refs WHERE method = ? AND transaction_id = ?').get(methodKey, candidate.transaction_id) as { bill_id: string } | undefined;
    if (reference && String(reference.bill_id) !== String(billId)) {
      throw Object.assign(new Error('Payment transaction_id has already been used for another bill'), { statusCode: 409 });
    }
    if (reference) existingTransactionKeys.add(transactionKey);
  }
  const requestTransactionKeys = resolvedPayments.map(paymentTransactionKey);
  const transactionMethods = new Map<string, string>();
  for (const payment of resolvedPayments) {
    if (typeof payment.transaction_id !== 'string' || payment.transaction_id.trim() === '') continue;
    const methodKey = payment.payment_method_id === undefined ? payment.method : `custom:${payment.payment_method_id}`;
    const previousMethod = transactionMethods.get(payment.transaction_id);
    if (previousMethod && previousMethod !== methodKey) {
      throw Object.assign(new Error('A transaction_id cannot be reused across payment methods in one batch'), { statusCode: 400 });
    }
    transactionMethods.set(payment.transaction_id, methodKey);
  }
  const replay = requestTransactionKeys.every((key, index) => (
    key !== null
    && existingTransactionKeys.has(key)
    && transactionPaymentMatches(existingTransactionPayments.get(key), resolvedPayments[index])
  ));
  if (replay) {
    return { bill, prepared: [], existingPayments, effectiveCustomerId, idempotentReplay: true };
  }
  const seenTransactionKeys = new Set<string>();
  for (const key of requestTransactionKeys) {
    if (key && (seenTransactionKeys.has(key) || existingTransactionKeys.has(key))) {
      throw Object.assign(new Error('Payment transaction_id has already been used for this bill'), { statusCode: 409 });
    }
    if (key) seenTransactionKeys.add(key);
  }
  if (bill.payment_status === 'paid') throw Object.assign(new Error('Bill is already paid'), { statusCode: 400 });
  const remainingCents = Math.max(0, Math.round((Number(bill.total) - Number(bill.paid_amount || 0)) * 100));
  if (remainingCents <= 0) throw Object.assign(new Error('Bill is already fully paid'), { statusCode: 400 });
  const raw = resolvedPayments.map((payment) => {
    // Preserve omitted/null compatibility for the legacy single-line contracts.
    // Multi-line batches must state every amount explicitly so allocation is
    // deterministic before any write.
    const supportsOmittedAmount = allowOmittedAmount || payments.length === 1;
    const amountValue = supportsOmittedAmount && payment.amount === null ? undefined : payment.amount;
    const amount = amountValue === undefined
      ? (supportsOmittedAmount ? remainingCents : undefined)
      : paymentAmountCents(amountValue);
    if (amount === undefined) throw Object.assign(new Error('Payment amount is required for split payments'), { statusCode: 400 });
    const normalizedPayment: PaymentInput = {
      method: String(payment.method),
      ...(payment.payment_method_id !== undefined ? { payment_method_id: payment.payment_method_id } : {}),
    };
    if (payment.transaction_id !== undefined) normalizedPayment.transaction_id = payment.transaction_id;
    if (payment.notes !== undefined) normalizedPayment.notes = payment.notes;
    return {
      payment: normalizedPayment,
      method: normalizedPayment.method,
      requestedCents: amount,
      amountOmitted: amountValue === undefined,
    };
  });
  const nonCashCents = raw.filter((line) => line.method !== 'cash').reduce((sum, line) => sum + line.requestedCents, 0);
  if (nonCashCents > remainingCents) throw Object.assign(new Error('Non-cash payment exceeds the bill balance'), { statusCode: 400 });
  const cashRequiredCents = remainingCents - nonCashCents;
  // Partial payments remain supported. Cash is allocated up to the amount
  // needed after non-cash lines; a short tender simply leaves a partial bill.
  let cashLeft = cashRequiredCents;
  const prepared: PreparedPayment[] = raw.map((line) => {
    if (line.method !== 'cash') return { payment: line.payment, amountCents: line.requestedCents, amountOmitted: line.amountOmitted };
    const applied = Math.min(line.requestedCents, cashLeft);
    cashLeft -= applied;
    if (applied === 0 && line.payment.transaction_id) {
      throw Object.assign(new Error('A zero-applied cash line cannot carry a transaction_id'), { statusCode: 400 });
    }
    return { payment: line.payment, amountCents: applied, tenderedCents: line.requestedCents, changeCents: line.requestedCents - applied, amountOmitted: line.amountOmitted };
  }).filter((line) => line.amountCents > 0);

  if (prepared.some((line) => line.payment.method === 'wallet')) {
    if (!effectiveCustomerId) throw Object.assign(new Error('Customer association is required for wallet payment'), { statusCode: 400 });
    const credits = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM loyalty_ledger WHERE customer_id = ? AND type = 'credit' AND (expires_at IS NULL OR expires_at > datetime('now'))`).get(effectiveCustomerId) as { total: number };
    const debits = db.prepare(`SELECT COALESCE(SUM(amount), 0) as total FROM loyalty_ledger WHERE customer_id = ? AND type = 'debit'`).get(effectiveCustomerId) as { total: number };
    const walletPoints = Math.max(0, Number(credits.total) - Number(debits.total));
    const pointsRequired = prepared.filter((line) => line.payment.method === 'wallet').reduce((sum, line) => sum + line.amountCents, 0);
    if (walletPoints < pointsRequired) throw Object.assign(new Error(`Insufficient wallet balance. Available: ${Math.floor(walletPoints / LOYALTY_REDEMPTION_RATE)} (${walletPoints} points), Required: ${pointsRequired / 100}`), { statusCode: 400 });
  }
  return { bill, prepared, existingPayments, effectiveCustomerId };
}

function calculateCashback(db: ReturnType<typeof getDatabase>, bill: any, customerId: string | null): number {
  if (!customerId) return 0;
  const enabled = (db.prepare(`SELECT value FROM settings WHERE key = 'loyalty_enabled'`).get() as any)?.value;
  if (enabled !== 'true' && enabled !== '1') return 0;
  const globalRate = parseFloat((db.prepare(`SELECT value FROM settings WHERE key = 'global_cashback_percent'`).get() as any)?.value || '0');
  const order = db.prepare('SELECT subtotal, discount_amount FROM orders WHERE id = ?').get(bill.order_id) as any;
  const items = db.prepare(`SELECT oi.subtotal, p.cb_percent FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = ? AND oi.status != 'cancelled'`).all(bill.order_id) as { subtotal: number; cb_percent: number | null }[];
  const fullOrderCashback = items.reduce((sum, item) => {
    const discountShare = order?.discount_amount > 0 && order?.subtotal > 0 ? order.discount_amount * item.subtotal / order.subtotal : 0;
    const rate = item.cb_percent !== null ? item.cb_percent : globalRate;
    return sum + (rate > 0 ? Math.floor(Math.max(0, item.subtotal - discountShare) * rate / 100) * LOYALTY_REDEMPTION_RATE : 0);
  }, 0);
  const splitRatio = Number(order?.subtotal || 0) > 0 && bill.split_group_id
    ? Math.min(1, Number(bill.subtotal || 0) / Number(order.subtotal))
    : 1;
  return Math.floor(fullOrderCashback * splitRatio);
}

function applyPaymentBatch(
  db: ReturnType<typeof getDatabase>,
  billId: string,
  payments: PaymentInput[],
  bodyCustomerId?: string | number,
  allowOmittedAmount = false,
  idempotencyKey?: string | null,
  requestHash?: string,
  idempotencyUserId?: string,
): { bill: any; walletDebited: boolean; loyaltyPointsEarned: number } {
  if (idempotencyKey && idempotencyUserId) {
    // `legacy` is an append-only compatibility owner for pre-user-scoped
    // records whose original user cannot be recovered. It is only reachable
    // with the exact bill and request hash; new records are always user-bound.
    const prior = db.prepare(`
      SELECT bill_id, request_hash, response_json
      FROM payment_idempotency
      WHERE (user_id = ? OR user_id = 'legacy') AND idempotency_key = ?
      ORDER BY CASE WHEN user_id = ? THEN 0 ELSE 1 END
      LIMIT 1
    `).get(idempotencyUserId, idempotencyKey, idempotencyUserId) as { bill_id: string; request_hash: string; response_json: string } | undefined;
    if (prior) {
      if (String(prior.bill_id) !== String(billId) || prior.request_hash !== requestHash) {
        throw Object.assign(new Error('Idempotency-Key was already used for a different payment request'), { statusCode: 409 });
      }
      try {
        return JSON.parse(prior.response_json);
      } catch {
        throw Object.assign(new Error('Stored payment response is invalid'), { statusCode: 500 });
      }
    }
  }
  const { bill, prepared, existingPayments, effectiveCustomerId, idempotentReplay } = preparePaymentBatch(
    db, billId, payments, bodyCustomerId, allowOmittedAmount,
  );
  if (idempotentReplay) {
    return { bill: parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(billId)), walletDebited: false, loyaltyPointsEarned: 0 };
  }
  const totalAppliedCents = prepared.reduce((sum, line) => sum + line.amountCents, 0);
  const oldPaidCents = Math.round(Number(bill.paid_amount || 0) * 100);
  const totalCents = Math.round(Number(bill.total || 0) * 100);
  const newPaidCents = oldPaidCents + totalAppliedCents;
  const newBalanceCents = Math.max(0, totalCents - newPaidCents);
  const paymentStatus = newBalanceCents === 0 ? 'paid' : 'partial';
  const newPayments = prepared.map((line) => ({
    ...line.payment,
    amount: line.amountCents / 100,
    requested_amount: (line.tenderedCents || line.amountCents) / 100,
    amount_omitted: Boolean(line.amountOmitted),
    ...(line.payment.method === 'cash' ? { tendered_amount: (line.tenderedCents || 0) / 100, change_amount: (line.changeCents || 0) / 100 } : {}),
    timestamp: now(),
  }));
  let walletDebited = false;
  for (const line of prepared) {
    if (line.payment.method !== 'wallet' || line.amountCents <= 0) continue;
    db.prepare(`INSERT INTO loyalty_ledger (customer_id, bill_id, type, amount, description, created_at, updated_at) VALUES (?, ?, 'debit', ?, ?, ?, ?)`).run(effectiveCustomerId, bill.id, line.amountCents, `Payment for bill ${bill.bill_number}`, now(), now());
    walletDebited = true;
  }
  const allPayments = existingPayments.concat(newPayments);
  const changedAt = now();
  const insertTransactionRef = db.prepare('INSERT INTO payment_transaction_refs (method, transaction_id, bill_id, created_at) VALUES (?, ?, ?, ?)');
  for (const line of prepared) {
    if (line.payment.transaction_id) {
      const methodKey = line.payment.payment_method_id === undefined ? line.payment.method : `custom:${line.payment.payment_method_id}`;
      insertTransactionRef.run(methodKey, line.payment.transaction_id, billId, changedAt);
    }
  }
  if (!bill.customer_id && effectiveCustomerId) db.prepare('UPDATE bills SET customer_id = ?, updated_at = ? WHERE id = ?').run(effectiveCustomerId, changedAt, billId);
  db.prepare(`UPDATE bills SET paid_amount = ?, balance = ?, payment_status = ?, payment_details = ?, paid_at = CASE WHEN ? = 'paid' THEN ? ELSE paid_at END, updated_at = ? WHERE id = ?`).run(newPaidCents / 100, newBalanceCents / 100, paymentStatus, JSON.stringify(allPayments), paymentStatus, paymentStatus === 'paid' ? changedAt : null, changedAt, billId);
  let loyaltyPointsEarned = 0;
  if (paymentStatus === 'paid') {
    const unpaidSibling = db.prepare(`SELECT 1 FROM bills WHERE order_id = ? AND id != ? AND payment_status != 'paid' LIMIT 1`).get(bill.order_id, bill.id);
    const orderFullyPaid = !unpaidSibling;
    if (orderFullyPaid) {
      db.prepare("UPDATE orders SET status = 'completed', completed_at = ?, updated_at = ? WHERE id = ?").run(changedAt, changedAt, bill.order_id);
      const order = db.prepare('SELECT table_id FROM orders WHERE id = ?').get(bill.order_id) as any;
      if (order?.table_id) db.prepare("UPDATE tables SET status = 'available', updated_at = ? WHERE id = ?").run(changedAt, order.table_id);
    }
    const cashback = calculateCashback(db, bill, effectiveCustomerId);
    const alreadyCredited = db.prepare(`SELECT id FROM loyalty_ledger WHERE bill_id = ? AND type = 'credit'`).get(bill.id);
    if (cashback > 0 && !alreadyCredited) {
      const walletCents = allPayments.filter((p: any) => p.method === 'wallet').reduce((sum: number, p: any) => sum + Math.round(Number(p.amount || 0) * 100), 0);
      const finalCashback = Math.floor(cashback * (1 - Math.min(1, walletCents / Math.max(1, totalCents))));
      if (finalCashback > 0) {
        db.prepare(`INSERT INTO loyalty_ledger (customer_id, bill_id, type, amount, description, created_at, updated_at) VALUES (?, ?, 'credit', ?, ?, ?, ?)`).run(effectiveCustomerId, bill.id, finalCashback, `Cashback on bill ${bill.bill_number}`, changedAt, changedAt);
        loyaltyPointsEarned = finalCashback;
      }
    }
  }
  const result = { bill: parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(billId)), walletDebited, loyaltyPointsEarned };
  if (idempotencyKey && requestHash && idempotencyUserId) {
    db.prepare('INSERT INTO payment_idempotency (user_id, idempotency_key, bill_id, request_hash, response_json, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .run(idempotencyUserId, idempotencyKey, billId, requestHash, JSON.stringify(result), changedAt);
  }
  return result;
}

router.post('/:id/payment', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const payment = req.body;
    if (!payment || typeof payment !== 'object' || Array.isArray(payment)) {
      return res.status(400).json({ error: 'Payment body must be an object' });
    }
    const db = getDatabase();
    const requestHash = paymentRequestHash(req.params.id as string, [payment], payment.customer_id);
    const result = withTxn(() => applyPaymentBatch(
      db, req.params.id as string, [payment], payment.customer_id, true,
      paymentIdempotencyKey(req), requestHash, String((req as any).user.userId),
    ));

    const billStatus = (result.bill as any)?.payment_status;
    if (billStatus === 'paid') notifyKdsUpdate();
    else notifyOrderUpdated();

    res.json(result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    console.error('[API] Bill payment failed:', error);
    res.status(statusCode).json({ error: statusCode >= 500 ? 'Bill payment failed' : error.message });
  }
});

// POST /:id/payments — atomic split-payment batch endpoint (#177). Applies every
// payment line in the array within a single transaction, so a failure partway
// through (insufficient wallet balance, an invalid amount, etc.) rolls back every
// line already applied instead of leaving the bill partially paid.
router.post('/:id/payments', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return res.status(400).json({ error: 'Payment batch body must be an object' });
    }
    const { payments, customer_id: bodyCustomerId } = body;
    if (!Array.isArray(payments) || payments.length === 0) {
      return res.status(400).json({ error: 'payments must be a non-empty array' });
    }

    const db = getDatabase();
    const requestHash = paymentRequestHash(req.params.id as string, payments, bodyCustomerId);
    const result = withTxn(() => applyPaymentBatch(
      db, req.params.id as string, payments, bodyCustomerId, false,
      paymentIdempotencyKey(req), requestHash, String((req as any).user.userId),
    ));

    const billStatus = (result.bill as any)?.payment_status;
    if (billStatus === 'paid') notifyKdsUpdate();
    else notifyOrderUpdated();

    res.json(result);
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    console.error('[API] Batch bill payment failed:', error);
    res.status(statusCode).json({ error: statusCode >= 500 ? 'Bill payment failed' : error.message });
  }
});

router.post('/:id/applyDiscount', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const { type, value, reason } = req.body;

    if (!type || !['percentage', 'amount'].includes(type)) {
      return res.status(400).json({ error: 'Valid discount type is required (percentage, amount)' });
    }

    if (value === undefined || typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return res.status(400).json({ error: 'Valid discount value is required' });
    }

    const db = getDatabase();
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id) as any;
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.payment_status === 'paid') {
      return res.status(400).json({ error: 'Cannot apply discount to a paid bill' });
    }
    if (bill.split_group_id) {
      return res.status(409).json({ error: 'Apply discounts before splitting a bill' });
    }
    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(bill.order_id) as any;
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Check if approval is required
    const requiresApproval = getSettingValue('discount_requires_approval') === 'true';
    if (requiresApproval && value > 0) {
      const { override_pin } = req.body;
      if (!override_pin) {
        return res.status(403).json({ error: 'Manager PIN required for discounts', requiresApproval: true });
      }
      const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
      const rateLimitKey = `pin:${clientIp}:bill-discount`;
      if (!checkPinRateLimit(rateLimitKey)) {
        return res.status(429).json({ error: 'Too many PIN attempts. Try again in 15 minutes.' });
      }
      const managerId = req.body.manager_id || req.body.user_id;
      let user: any = null;
      if (managerId) {
        const candidate = db.prepare("SELECT * FROM users WHERE id = ? AND pin_hash IS NOT NULL AND role IN ('owner', 'manager') AND is_active = 1").get(managerId) as any;
        if (candidate && verifyPin(candidate.pin_hash, override_pin)) {
          user = candidate;
        }
      }
      if (!user) {
        const managers = db.prepare("SELECT * FROM users WHERE pin_hash IS NOT NULL AND role IN ('owner', 'manager') AND is_active = 1").all() as any[];
        for (const u of managers) {
          if (verifyPin(u.pin_hash, override_pin)) {
            user = u;
            break;
          }
        }
      }
      if (!user) {
        return res.status(403).json({ error: 'Invalid manager PIN' });
      }
    }

    // Check discount mode
    const discountMode = getSettingValue('discount_mode') || 'percentage';
    if (discountMode === 'flat' && type === 'percentage') {
      return res.status(400).json({ error: 'Percentage discounts are disabled' });
    }
    if (discountMode === 'percentage' && type === 'amount') {
      return res.status(400).json({ error: 'Flat amount discounts are disabled' });
    }

    // Check against limits from settings (0 = no limit)
    if (type === 'percentage') {
      const maxPercentage = parseFloat(getSettingValue('discount_max_percentage') || '25');
      if (maxPercentage > 0 && value > maxPercentage) {
        return res.status(400).json({ error: `discount value exceeds maximum percentage of ${maxPercentage}` });
      }
    } else {
      const maxAmount = parseFloat(getSettingValue('discount_max_amount') || '0');
      if (maxAmount > 0 && value > maxAmount) {
        return res.status(400).json({ error: `discount value exceeds maximum amount of ${maxAmount}` });
      }
    }

    let discountAmount = 0;
    if (type === 'percentage') {
      discountAmount = (bill.subtotal * Number(value)) / 100;
    } else {
      discountAmount = Number(value);
    }
    discountAmount = Math.round(discountAmount * 100) / 100;

    // The discount always applies to the stored subtotal, never to the already
    // discounted total: editing 10% to 20% must not compound the first cut.
    const discountedSubtotal = Math.max(0, bill.subtotal - discountAmount);
    const newTotal = roundMoney(discountedSubtotal
      + orderCharges(bill));
    const newBalance = Math.max(0, newTotal - (bill.paid_amount || 0));

    const updatedBill = withTxn(() => {
      db.prepare(`
        UPDATE bills SET discount_amount = ?, discount_type = ?, discount_value = ?,
          discount_reason = ?, total = ?, balance = ?, updated_at = ?
        WHERE id = ?
      `).run(
        discountAmount, type, value, reason || null, newTotal, newBalance, now(), req.params.id,
      );

      db.prepare(`
        UPDATE orders SET discount_amount = ?, discount_type = ?, discount_value = ?,
          discount_reason = ?, total = ?, updated_at = ?
        WHERE id = ?
      `).run(
        discountAmount, type, value, reason || null, newTotal, now(), bill.order_id,
      );

      return parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id));
    });

    notifyOrderUpdated();
    res.json({ bill: updatedBill });
  } catch (error: any) {
    const statusCode = error.statusCode || 500;
    console.error('[API] Bill discount failed:', error);
    res.status(statusCode).json({ error: statusCode >= 500 ? 'Internal server error' : error.message });
  }
});

router.post('/:id/markPrinted', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const bill = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id);
    if (!bill) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    db.prepare('UPDATE bills SET printed_at = ?, updated_at = ? WHERE id = ?')
      .run(now(), now(), req.params.id);

    const updatedBill = parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id));
    res.json({ bill: updatedBill });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/bills/:id/print - Print or reprint bill
router.post('/:id/print', requireRole('owner', 'manager', 'cashier'), asyncHandler(async (req: Request, res: Response) => {
  try {
    const { print_type } = req.body;

    if (!print_type || !['receipt', 'reprint'].includes(print_type)) {
      return res.status(400).json({ error: 'print_type must be receipt or reprint' });
    }

    // User ID is set by the requireAuth middleware after JWT verification
    const userId = (req as any).user?.userId || (req as any).user?.id || 'unknown';

    const result = await printReceipt(parseInt(req.params.id as string), userId, print_type);
    res.json(result);
  } catch (error: any) {
    // Return 404 for "Bill not found", 500 for other errors
    const statusCode = error.message?.includes('Bill not found') ? 404 : 500;
    console.error('[API] Receipt printing failed:', error);
    res.status(statusCode).json({ error: statusCode >= 500 ? 'Receipt printing failed' : 'Bill not found' });
  }
}));

// GET /api/bills/:id/print-history - Get print history for bill
router.get('/:id/print-history', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const prints = db.prepare(`
      SELECT pl.*, u.name as user_name
      FROM print_logs pl
      LEFT JOIN users u ON pl.user_id = u.id
      WHERE pl.bill_id = ?
      ORDER BY pl.printed_at DESC
    `).all(req.params.id);

    res.json({ prints });
  } catch (error: any) {
    console.error("[API] Internal error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * Puts a split check back together.
 *
 * Parties change their mind: they ask to divide the bill, then decide one of
 * them is paying after all. Without this the table is stuck with shares that
 * have to be settled one by one, and the whole-order button pays only the
 * first of them while looking like it paid everything.
 *
 * Only while no money has been taken. A share settled at zero — the guest who
 * had the coffee the house offered — does not count as money and does not
 * block the merge.
 */
router.post('/:id/unsplit', requireRole('owner', 'manager', 'cashier'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const source = db.prepare('SELECT * FROM bills WHERE id = ?').get(req.params.id) as any;
    if (!source) return res.status(404).json({ error: 'Bill not found' });
    if (!source.split_group_id) return res.status(400).json({ error: 'This check is not split' });

    const group = db.prepare('SELECT * FROM bills WHERE split_group_id = ? ORDER BY id').all(source.split_group_id) as any[];
    if (group.some((bill) => Number(bill.paid_amount || 0) > 0)) {
      return res.status(409).json({ error: 'A check that has taken money cannot be merged back', code: 'split_already_paid' });
    }

    const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(source.order_id) as any;
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const merged = withTxn(() => {
      // The oldest of the group is the check the others were carved out of.
      const [keep, ...rest] = group;
      for (const bill of rest) {
        db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(bill.id);
        db.prepare('DELETE FROM bills WHERE id = ?').run(bill.id);
      }
      db.prepare('DELETE FROM bill_items WHERE bill_id = ?').run(keep.id);
      db.prepare(`
        UPDATE bills SET split_group_id = NULL, split_label = NULL,
          subtotal = ?, discount_amount = ?, delivery_charge = ?, packaging_charge = ?, cover_charge = ?,
          total = ?, paid_amount = 0, balance = ?, payment_status = 'unpaid',
          payment_details = NULL, paid_at = NULL, updated_at = ?
        WHERE id = ?
      `).run(
        order.subtotal, order.discount_amount, order.delivery_charge || 0, order.packaging_charge || 0, order.cover_charge || 0,
        order.total, order.total, now(), keep.id,
      );
      return parseRowJson(db.prepare('SELECT * FROM bills WHERE id = ?').get(keep.id));
    });

    notifyOrderUpdated();
    res.json({ bill: merged });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(error.statusCode || 500).json({ error: error.statusCode ? error.message : 'Unable to merge the checks' });
  }
});

export const billRoutes = router;
