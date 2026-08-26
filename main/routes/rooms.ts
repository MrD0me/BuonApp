import { Router, Request, Response } from 'express';
import { getDatabase, now, withTxn } from '../db';
import { randomUUID } from 'crypto';
import { requireRole } from '../middleware/security';
import { hydrateTables } from './tables';
import { DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT } from '../lib/table-geometry';

const router = Router();

/**
 * Dining rooms — the entities the map is drawn on (phase 2 of
 * docs/table-management.md). They replace the free-text `tables.floor`, which
 * could not carry a size or an order.
 *
 * Room dimensions are abstract units, not pixels: the renderer scales a room to
 * whatever space it has, so the same map reads correctly on the central PC and
 * on a tablet in the dining room.
 */

/** Rooms are bigger than a phone screen but not unbounded; keep them sane. */
const MIN_ROOM_SIDE = 400;
const MAX_ROOM_SIDE = 6000;

function roomSide(value: unknown, fallback: number): number | null {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < MIN_ROOM_SIDE || parsed > MAX_ROOM_SIDE) return null;
  return Math.round(parsed);
}

router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const includeTables = req.query.tables !== 'false' && req.query.tables !== '0';

    let query = 'SELECT * FROM rooms WHERE 1=1';
    const params: any[] = [];
    if (req.query.active === 'true' || req.query.active === '1') {
      query += ' AND is_active = 1';
    }
    query += ' ORDER BY sort_order, name';
    const rooms = db.prepare(query).all(...params) as any[];

    if (!includeTables) return res.json({ rooms });

    // One pass over every table, then split by room: the map asks for the whole
    // floor at once, so a query per room would scale with the number of rooms.
    const tables = db.prepare('SELECT * FROM tables ORDER BY number').all() as any[];
    const hydrated = hydrateTables(db, tables);
    const byRoom = new Map<string, any[]>();
    for (const table of hydrated) {
      const key = String(table.room_id ?? '');
      const list = byRoom.get(key);
      if (list) list.push(table);
      else byRoom.set(key, [table]);
    }

    res.json({
      rooms: rooms.map((room) => ({ ...room, tables: byRoom.get(String(room.id)) || [] })),
      // Tables whose room was lost somehow would otherwise be invisible and
      // undeletable from the map. Surfacing them is better than hiding them.
      orphanTables: byRoom.get('') || [],
    });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const name = String(body.name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'Room name is required' });

    const width = roomSide(body.width, DEFAULT_ROOM_WIDTH);
    const height = roomSide(body.height, DEFAULT_ROOM_HEIGHT);
    if (width === null || height === null) {
      return res.status(400).json({ error: `Room size must be between ${MIN_ROOM_SIDE} and ${MAX_ROOM_SIDE}` });
    }

    const db = getDatabase();
    const clash = db.prepare('SELECT id FROM rooms WHERE name = ?').get(name);
    if (clash) return res.status(400).json({ error: 'Room name already exists', code: 'room_name_taken' });

    const id = `room-${randomUUID().slice(0, 8)}`;
    const stamp = now();
    const sortOrder = Number.isSafeInteger(Number(body.sort_order))
      ? Number(body.sort_order)
      : ((db.prepare('SELECT COALESCE(MAX(sort_order), -1) AS max FROM rooms').get() as { max: number }).max + 1);

    db.prepare(`
      INSERT INTO rooms (id, name, sort_order, width, height, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, sortOrder, width, height, stamp, stamp);

    res.status(201).json({ room: db.prepare('SELECT * FROM rooms WHERE id = ?').get(id) });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const db = getDatabase();
    const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
    if (!room) return res.status(404).json({ error: 'Room not found' });

    const assignments: string[] = [];
    const values: any[] = [];

    if (Object.prototype.hasOwnProperty.call(body, 'name')) {
      const name = String(body.name ?? '').trim();
      if (!name) return res.status(400).json({ error: 'Room name is required' });
      const clash = db.prepare('SELECT id FROM rooms WHERE name = ? AND id != ?').get(name, req.params.id);
      if (clash) return res.status(400).json({ error: 'Room name already exists', code: 'room_name_taken' });
      assignments.push('name = ?');
      values.push(name);
    }

    for (const field of ['width', 'height'] as const) {
      if (!Object.prototype.hasOwnProperty.call(body, field)) continue;
      const side = roomSide(body[field], room[field]);
      if (side === null) {
        return res.status(400).json({ error: `Room size must be between ${MIN_ROOM_SIDE} and ${MAX_ROOM_SIDE}` });
      }
      assignments.push(`${field} = ?`);
      values.push(side);
    }

    if (Object.prototype.hasOwnProperty.call(body, 'sort_order')) {
      const sortOrder = Number(body.sort_order);
      if (!Number.isSafeInteger(sortOrder)) return res.status(400).json({ error: 'sort_order must be a whole number' });
      assignments.push('sort_order = ?');
      values.push(sortOrder);
    }

    if (assignments.length === 0) return res.json({ room });

    db.prepare(`UPDATE rooms SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`)
      .run(...values, now(), req.params.id);
    res.json({ room: db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Delete a room. Refused while it still holds tables: silently moving them
 * somewhere else would scatter a floor plan the owner just spent time on, and
 * deleting them along with the room would be a lot of destruction behind one
 * click. Empty the room first, table by table.
 */
router.delete('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const deleted = withTxn(() => {
      const room = db.prepare('SELECT * FROM rooms WHERE id = ?').get(req.params.id) as any;
      if (!room) throw Object.assign(new Error('Room not found'), { status: 404 });

      const tableCount = (db.prepare('SELECT COUNT(*) AS count FROM tables WHERE room_id = ?').get(req.params.id) as { count: number }).count;
      if (tableCount > 0) {
        throw Object.assign(new Error(`This room still holds ${tableCount} table(s). Move or delete them first.`), {
          status: 409,
          code: 'room_not_empty',
          tables: tableCount,
        });
      }

      db.prepare('DELETE FROM rooms WHERE id = ?').run(req.params.id);
      return room;
    });

    res.json({ deleted: { id: deleted.id, name: deleted.name } });
  } catch (error: any) {
    const status = error.status || 500;
    if (status >= 500) console.error('[API] Room delete failed:', error);
    res.status(status).json({
      error: status >= 500 ? 'Internal server error' : error.message,
      ...(error.code ? { code: error.code } : {}),
      ...(error.tables ? { tables: error.tables } : {}),
    });
  }
});

export const roomRoutes = router;
