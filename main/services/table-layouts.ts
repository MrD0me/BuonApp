/**
 * Saved floor plans (phase 4 of docs/table-management.md).
 *
 * A room that gets emptied at the end of every service has to be built again at
 * the start of the next one, and doing that table by table is a tax the owner
 * pays every morning. A layout is that work done once and kept under a name.
 *
 * Layouts store names, not ids: applying one rebuilds rooms and tables from
 * scratch, so the rows it recreates are new. That also means a layout survives
 * the map being wiped, which is the entire point of having one.
 */

import { getDatabase, now } from '../db';
import { randomUUID } from 'crypto';
import { DEFAULT_ROOM_WIDTH, DEFAULT_ROOM_HEIGHT } from '../lib/table-geometry';
import { tableDeletionBlocker, deleteTableRow } from './tables';

type Db = ReturnType<typeof getDatabase>;

export interface LayoutRoom {
  name: string;
  sort_order: number;
  width: number;
  height: number;
}

export interface LayoutTable {
  number: string;
  capacity: number;
  room: string;
  section: string | null;
  position_x: number | null;
  position_y: number | null;
  width: number | null;
  height: number | null;
  shape: string;
}

export interface LayoutData {
  rooms: LayoutRoom[];
  tables: LayoutTable[];
}

/** The floor exactly as it stands, ready to be stored under a name. */
export function captureCurrentLayout(db: Db): LayoutData {
  const rooms = db.prepare('SELECT name, sort_order, width, height FROM rooms ORDER BY sort_order, name')
    .all() as LayoutRoom[];
  const tables = db.prepare(`
    SELECT t.number, t.capacity, COALESCE(r.name, '') AS room, t.section,
           t.position_x, t.position_y, t.width, t.height, COALESCE(t.shape, 'rect') AS shape
    FROM tables t LEFT JOIN rooms r ON r.id = t.room_id
    ORDER BY t.number
  `).all() as LayoutTable[];
  return { rooms, tables };
}

/** Tables that would have to be settled before the floor can be rebuilt. */
export function layoutApplyBlockers(db: Db): { id: string; number: string; reason: string }[] {
  const tables = db.prepare('SELECT id, number FROM tables').all() as { id: string; number: string }[];
  const blocked: { id: string; number: string; reason: string }[] = [];
  for (const table of tables) {
    const reason = tableDeletionBlocker(db, table.id);
    if (reason) blocked.push({ id: table.id, number: table.number, reason });
  }
  return blocked;
}

export interface ApplyLayoutResult {
  roomsCreated: number;
  tablesCreated: number;
  tablesRemoved: number;
}

/**
 * Rebuild the floor from a saved plan. Caller must already be inside a
 * transaction and must have checked `layoutApplyBlockers()` — this tears the
 * current tables down through the same safe path a single delete takes, so
 * history keeps its labels, but it will not stop halfway to ask.
 */
export function applyLayout(db: Db, data: LayoutData): ApplyLayoutResult {
  const stamp = now();

  // Rooms are matched by name so a plan applied twice does not pile up copies.
  let roomsCreated = 0;
  const roomIdByName = new Map<string, string>();
  for (const existing of db.prepare('SELECT id, name FROM rooms').all() as { id: string; name: string }[]) {
    roomIdByName.set(existing.name, existing.id);
  }
  for (const room of data.rooms || []) {
    if (roomIdByName.has(room.name)) continue;
    const id = `room-${randomUUID().slice(0, 8)}`;
    db.prepare(`
      INSERT INTO rooms (id, name, sort_order, width, height, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, room.name, room.sort_order ?? 0, room.width || DEFAULT_ROOM_WIDTH, room.height || DEFAULT_ROOM_HEIGHT, stamp, stamp);
    roomIdByName.set(room.name, id);
    roomsCreated++;
  }

  // Break every group first: a member whose leader is deleted before it would
  // be left pointing at a row that is already gone.
  db.prepare('UPDATE tables SET merged_into = NULL, updated_at = ? WHERE merged_into IS NOT NULL').run(stamp);

  let tablesRemoved = 0;
  for (const table of db.prepare('SELECT * FROM tables').all() as any[]) {
    deleteTableRow(db, table);
    tablesRemoved++;
  }

  let tablesCreated = 0;
  const insert = db.prepare(`
    INSERT INTO tables (id, number, capacity, status, room_id, section, position_x, position_y, width, height, shape,
      created_at, updated_at)
    VALUES (?, ?, ?, 'available', ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  for (const table of data.tables || []) {
    const roomId = roomIdByName.get(table.room)
      || roomIdByName.values().next().value
      || null;
    if (!roomId) continue;
    insert.run(
      `tbl-${randomUUID().slice(0, 8)}`, table.number, table.capacity || 4, roomId, table.section || null,
      table.position_x, table.position_y, table.width, table.height, table.shape || 'rect', stamp, stamp,
    );
    tablesCreated++;
  }

  return { roomsCreated, tablesCreated, tablesRemoved };
}
