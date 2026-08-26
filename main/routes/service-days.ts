import { Router, Request, Response } from 'express';
import { getDatabase, withTxn } from '../db';
import { requireRole } from '../middleware/security';
import { asyncHandler } from '../middleware/async-handler';
import { getHttpRequestSignal } from '../shutdown';
import { notifyKdsUpdate } from '../services/kds';
import { printServiceDayReport, escPosToText, formatServiceDayReport } from '../printers/thermal';
import { getCountryByCode, getCurrencySymbol } from '../countries';
import {
  getOpenServiceDay,
  getOrOpenServiceDay,
  getServiceDay,
  getServiceDayBlockers,
  getServiceDayOrders,
  getServiceDayTotals,
  readServiceDaySummary,
  closeServiceDay,
  reopenServiceDay,
} from '../services/service-day';

const router = Router();

/** Errors thrown by the service layer carry status/code; anything else is a bug. */
function sendError(res: Response, error: any, logLabel: string) {
  const status = error?.status || 500;
  if (status >= 500) console.error(`[API] ${logLabel}:`, error);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message,
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.blockers ? { blockers: error.blockers } : {}),
  });
}

/**
 * The day currently being served, with what would stop it closing right now.
 * Returns `day: null` when nothing is open — the floor has simply not started
 * yet, which is not an error.
 */
router.get('/current', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const day = getOpenServiceDay(db);
    if (!day) return res.json({ day: null });
    res.json({
      day,
      summary: readServiceDaySummary(db, day),
      blockers: getServiceDayBlockers(db, day.id),
    });
  } catch (error: any) {
    sendError(res, error, 'Current service day failed');
  }
});

router.get('/', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const limitRaw = Number(req.query.limit);
    const limit = Number.isSafeInteger(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 200) : 60;
    const offsetRaw = Number(req.query.offset);
    const offset = Number.isSafeInteger(offsetRaw) && offsetRaw > 0 ? offsetRaw : 0;

    const days = db.prepare(`
      SELECT * FROM service_days
      ORDER BY business_date DESC, opened_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[];
    const total = (db.prepare('SELECT COUNT(*) AS count FROM service_days').get() as { count: number }).count;

    // The list is a picker: headline numbers only, batched across the whole page.
    // The full breakdown is one click away.
    const totals = getServiceDayTotals(db, days);
    res.json({
      days: days.map((day) => ({
        ...day,
        ...(totals.get(day.id) || { orders_count: 0, covers: 0, takings: 0 }),
      })),
      total,
    });
  } catch (error: any) {
    sendError(res, error, 'Service day list failed');
  }
});

router.get('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const day = getServiceDay(db, req.params.id as string);
    if (!day) return res.status(404).json({ error: 'Service day not found' });
    res.json({
      day,
      summary: readServiceDaySummary(db, day),
      blockers: day.status === 'open' ? getServiceDayBlockers(db, day.id) : null,
      orders: getServiceDayOrders(db, day.id),
    });
  } catch (error: any) {
    sendError(res, error, 'Service day detail failed');
  }
});

/**
 * Start the day explicitly, attaching whoever opened it. Placing an order with
 * no day running opens one anyway — this exists so the opening is attributable,
 * not to gate service.
 */
router.post('/open', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const existing = getOpenServiceDay(db);
    if (existing) {
      return res.status(409).json({
        error: `${existing.business_date} is already open.`,
        code: 'service_day_already_open',
        day: existing,
      });
    }
    const day = withTxn(() => getOrOpenServiceDay(db, (req as any).user?.userId));
    res.status(201).json({ day });
  } catch (error: any) {
    sendError(res, error, 'Service day open failed');
  }
});

router.post('/:id/close', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const user = (req as any).user;
    const body = req.body || {};

    const day = getServiceDay(db, req.params.id as string);
    if (!day) return res.status(404).json({ error: 'Service day not found' });

    const force = body.force === true;
    if (force && user?.role !== 'owner') {
      return res.status(403).json({
        error: 'Only the owner can close a day that still has open orders or unpaid bills.',
        code: 'force_close_requires_owner',
      });
    }
    const reason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 300) : null;
    if (force && !reason) {
      return res.status(400).json({ error: 'A reason is required to force a close.', code: 'force_close_requires_reason' });
    }

    const result = withTxn(() => closeServiceDay(db, day, {
      clearTables: body.clear_tables === true,
      force,
      reason,
      closedBy: user?.userId || null,
    }));

    // Held carts were dropped and table statuses reset, so every kitchen and
    // floor surface is now looking at stale rows.
    notifyKdsUpdate();

    res.json(result);
  } catch (error: any) {
    sendError(res, error, 'Service day close failed');
  }
});

/**
 * The paper closing report — the "chiusura di cassa" an Italian floor expects at
 * the end of service. Prints from the frozen summary when the day is closed, so
 * a reprint days later shows the same numbers, and from live totals otherwise.
 * `preview: true` returns the rendered text without touching the printer.
 */
router.post('/:id/print', requireRole('owner', 'manager'), asyncHandler(async (req: Request, res: Response) => {
  const db = getDatabase();
  const day = getServiceDay(db, req.params.id as string);
  if (!day) return res.status(404).json({ error: 'Service day not found' });

  const summary = readServiceDaySummary(db, day);
  const settingsRows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = Object.fromEntries(settingsRows.map((row) => [row.key, row.value]));
  const business = {
    name: settings.bill_show_name === 'false' ? '' : (settings.business_name || ''),
    currency_symbol: getCurrencySymbol(settings.currency || 'INR', getCountryByCode(settings.country || 'IN')?.locale)
      || settings.currency_symbol || '₹',
    country: settings.country || 'IN',
    trim_decimals: settings.printer_trim_decimals === 'true',
  };
  const useUnicode = req.body?.useUnicode === true;

  if (req.body?.preview === true) {
    return res.json({
      success: true,
      preview: true,
      text: escPosToText(formatServiceDayReport(day, summary, business, 48, useUnicode)),
    });
  }

  const result = await printServiceDayReport(day, summary, business, useUnicode, getHttpRequestSignal(req));
  if (result.ok) return res.json({ success: true });
  res.status(502).json({ error: result.detail || 'Print failed. Check printer connection and settings.', code: 'day_report_print_failed' });
}));

router.post('/:id/reopen', requireRole('owner'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const day = getServiceDay(db, req.params.id as string);
    if (!day) return res.status(404).json({ error: 'Service day not found' });

    const reopened = withTxn(() => reopenServiceDay(db, day, (req as any).user?.userId));
    res.json({ day: reopened });
  } catch (error: any) {
    sendError(res, error, 'Service day reopen failed');
  }
});

export const serviceDayRoutes = router;
