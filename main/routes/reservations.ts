import { Router, Request, Response } from 'express';
import { getDatabase, withTxn } from '../db';
import { requireRole } from '../middleware/security';
import { getOpenServiceDay, getOrOpenServiceDay } from '../services/service-day';
import {
  createReservation, updateReservation, assignReservation, closeReservation, reopenReservation,
  listReservationsForDay, normalizeBookedTime, type ReservationInput,
} from '../services/reservations';

const router = Router();

/**
 * The day's booking sheet (see docs/table-management.md).
 *
 * Bookings are taken down first and given a table second, because that is the
 * order the floor works in: the list exists before anyone decides who sits
 * where. Assigning is one operation — `POST /:id/assign` — which covers giving a
 * table, moving to another, swapping with whoever was there, and taking the
 * table away again.
 */

function sendError(res: Response, error: any, label: string) {
  const status = error?.status || 500;
  if (status >= 500) console.error(`[API] ${label}:`, error);
  res.status(status).json({
    error: status >= 500 ? 'Internal server error' : error.message,
    ...(error?.code ? { code: error.code } : {}),
    ...(error?.leader_table_id ? { leader_table_id: error.leader_table_id } : {}),
  });
}

/** Shared shape of the booking fields, so create and edit agree on what is valid. */
function readInput(body: any, res: Response, { requireName }: { requireName: boolean }): Partial<ReservationInput> | null {
  // Only the fields actually sent end up in here. Seeding defaults would make
  // an edit that touches the head count silently blank the name.
  const input: Partial<ReservationInput> = {};
  const sent = (key: string) => Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined;

  if (requireName || sent('name')) {
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'A name is required to take a booking.', code: 'reservation_name_required' });
      return null;
    }
    input.name = name.slice(0, 120);
  }

  if (requireName || sent('guests')) {
    const guests = body.guests === undefined || body.guests === null || body.guests === '' ? 2 : Number(body.guests);
    if (!Number.isSafeInteger(guests) || guests < 1 || guests > 99) {
      res.status(400).json({ error: 'guests must be a whole number between 1 and 99' });
      return null;
    }
    input.guests = guests;
  }

  if (requireName || sent('booked_time')) {
    const bookedTime = normalizeBookedTime(body.booked_time);
    if (bookedTime === undefined) {
      res.status(400).json({ error: 'booked_time must be HH:MM', code: 'reservation_time_invalid' });
      return null;
    }
    input.bookedTime = bookedTime;
  }

  if (requireName || sent('phone')) {
    input.phone = typeof body.phone === 'string' ? body.phone.trim().slice(0, 40) || null : null;
  }
  if (requireName || sent('notes')) {
    input.notes = typeof body.notes === 'string' ? body.notes.trim().slice(0, 300) || null : null;
  }
  if (requireName || sent('customer_id')) {
    input.customerId = body.customer_id ? String(body.customer_id) : null;
  }
  return input;
}

/** The sheet for the day being served. Empty, not an error, when nothing is open. */
router.get('/', requireRole('owner', 'manager'), (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const day = getOpenServiceDay(db);
    if (!day) return res.json({ day: null, reservations: [] });
    res.json({ day, reservations: listReservationsForDay(db, day.id) });
  } catch (error: any) {
    sendError(res, error, 'Reservation list failed');
  }
});

/**
 * Take a booking down. A table is optional and usually comes later — the whole
 * point of the sheet is that the list exists before the seating plan does.
 */
router.post('/', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const partial = readInput(req.body || {}, res, { requireName: true });
    if (!partial) return;
    const input: ReservationInput = {
      name: partial.name as string,
      guests: partial.guests ?? 2,
      bookedTime: partial.bookedTime ?? null,
      phone: partial.phone ?? null,
      notes: partial.notes ?? null,
      customerId: partial.customerId ?? null,
      createdBy: (req as any).user?.userId || null,
    };

    const result = withTxn(() => {
      const day = getOrOpenServiceDay(db, (req as any).user?.userId);
      const reservation = createReservation(db, day.id, input);
      if (!req.body?.table_id) return { reservation, displaced: null };
      return assignReservation(db, reservation.id, String(req.body.table_id));
    });

    res.status(201).json(result);
  } catch (error: any) {
    sendError(res, error, 'Reservation create failed');
  }
});

router.patch('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const input = readInput(req.body || {}, res, { requireName: false });
    if (!input) return;
    const reservation = withTxn(() => updateReservation(db, req.params.id as string, input));
    res.json({ reservation });
  } catch (error: any) {
    sendError(res, error, 'Reservation update failed');
  }
});

/**
 * Give a booking a table, or take its table away with `table_id: null`.
 * Whatever was on the target table inherits what this booking had, so a swap is
 * the same call as a plain assignment.
 */
router.post('/:id/assign', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const raw = (req.body || {}).table_id;
    const tableId = raw === null || raw === undefined || raw === '' ? null : String(raw);
    const result = withTxn(() => assignReservation(db, req.params.id as string, tableId));
    res.json(result);
  } catch (error: any) {
    sendError(res, error, 'Reservation assign failed');
  }
});

router.post('/:id/cancel', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const reservation = withTxn(() => closeReservation(db, req.params.id as string, 'cancelled'));
    res.json({ reservation });
  } catch (error: any) {
    sendError(res, error, 'Reservation cancel failed');
  }
});

/** Nobody came. Frees the table during service, rather than waiting for close. */
router.post('/:id/no-show', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const reservation = withTxn(() => closeReservation(db, req.params.id as string, 'no_show'));
    res.json({ reservation });
  } catch (error: any) {
    sendError(res, error, 'Reservation no-show failed');
  }
});

/**
 * Put a booking closed by mistake back in the pool. Any order on a held table
 * seats its booking, so a walk-in taking that table closes the wrong one.
 */
router.post('/:id/reopen', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const reservation = withTxn(() => reopenReservation(db, req.params.id as string));
    res.json({ reservation });
  } catch (error: any) {
    sendError(res, error, 'Reservation reopen failed');
  }
});

export const reservationRoutes = router;
