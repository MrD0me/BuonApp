import { Router, Request, Response } from 'express';
import { getDatabase, now, withTxn } from '../db';
import { randomUUID } from 'crypto';
import { requireRole } from '../middleware/security';
import { notifyKdsUpdate } from '../services/kds';
import {
  captureCurrentLayout, applyLayout, layoutApplyBlockers, type LayoutData,
} from '../services/table-layouts';

const router = Router();

/** Layouts are a floor plan kept under a name. See docs/table-management.md. */

function parseLayout(raw: string): LayoutData {
  try {
    const parsed = JSON.parse(raw);
    return { rooms: parsed.rooms || [], tables: parsed.tables || [] };
  } catch {
    return { rooms: [], tables: [] };
  }
}

router.get('/', requireRole('owner', 'manager'), (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = db.prepare('SELECT * FROM table_layouts ORDER BY name').all() as any[];
    // The list is a picker: how big the plan is, not the plan itself.
    res.json({
      layouts: rows.map((row) => {
        const data = parseLayout(row.data);
        return {
          id: row.id,
          name: row.name,
          rooms: data.rooms.length,
          tables: data.tables.length,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
      }),
    });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/** Save the floor as it stands right now. Re-using a name overwrites it. */
router.post('/', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const name = String((req.body || {}).name ?? '').trim();
    if (!name) return res.status(400).json({ error: 'A name is required', code: 'layout_name_required' });

    const db = getDatabase();
    const data = captureCurrentLayout(db);
    if (data.tables.length === 0) {
      return res.status(400).json({ error: 'There are no tables to save.', code: 'layout_empty' });
    }

    const stamp = now();
    const existing = db.prepare('SELECT id FROM table_layouts WHERE name = ?').get(name) as { id?: string } | undefined;
    const id = existing?.id || `lay-${randomUUID().slice(0, 8)}`;
    if (existing?.id) {
      db.prepare('UPDATE table_layouts SET data = ?, updated_at = ? WHERE id = ?')
        .run(JSON.stringify(data), stamp, id);
    } else {
      db.prepare('INSERT INTO table_layouts (id, name, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
        .run(id, name, JSON.stringify(data), stamp, stamp);
    }

    res.status(201).json({
      layout: { id, name, rooms: data.rooms.length, tables: data.tables.length },
      replaced: Boolean(existing?.id),
    });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Rebuild the floor from a saved plan. Refused while any table is still working,
 * because applying replaces every table on the map.
 */
router.post('/:id/apply', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM table_layouts WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Layout not found' });

    const blockers = layoutApplyBlockers(db);
    if (blockers.length > 0) {
      return res.status(409).json({
        error: 'Some tables are still working. Settle them before rebuilding the floor.',
        code: 'layout_apply_blocked',
        blockers,
      });
    }

    const result = withTxn(() => applyLayout(db, parseLayout(row.data)));
    // Every table on the map is a new row now.
    notifyKdsUpdate();

    res.json({ layout: { id: row.id, name: row.name }, ...result });
  } catch (error: any) {
    console.error('[API] Layout apply failed:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', requireRole('owner', 'manager'), (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM table_layouts WHERE id = ?').get(req.params.id) as any;
    if (!row) return res.status(404).json({ error: 'Layout not found' });

    db.prepare('DELETE FROM table_layouts WHERE id = ?').run(req.params.id);
    res.json({ deleted: { id: row.id, name: row.name } });
  } catch (error: any) {
    console.error('[API] Internal error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export const tableLayoutRoutes = router;
