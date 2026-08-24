/**
 * Geometry for the dining-room map (phase 2 of docs/table-management.md).
 *
 * Rooms are laid out in abstract units rather than pixels: the renderer scales
 * a room to whatever space it has, so the same map reads correctly on the
 * central PC and on a tablet. Kept dependency-free so both the migration in
 * `main/db.ts` and the table routes can use it without an import cycle.
 */

export const DEFAULT_ROOM_WIDTH = 1200;
export const DEFAULT_ROOM_HEIGHT = 800;

/** Space left around the edge of a room, and between auto-placed tables. */
export const ROOM_MARGIN = 40;
export const TABLE_GAP = 40;

export const TABLE_SHAPES = ['rect', 'round'] as const;
export type TableShape = (typeof TABLE_SHAPES)[number];

export function isTableShape(value: unknown): value is TableShape {
  return typeof value === 'string' && (TABLE_SHAPES as readonly string[]).includes(value);
}

/**
 * How big a table should be drawn when nobody has said otherwise. Seats drive
 * it, because a map where a two-top and a table of ten are the same rectangle
 * tells the floor nothing.
 */
export function defaultTableSize(capacity: unknown, shape: unknown): { width: number; height: number } {
  const seats = Number(capacity) || 4;
  if (shape === 'round') {
    const side = seats <= 2 ? 110 : seats <= 4 ? 140 : seats <= 6 ? 170 : 200;
    return { width: side, height: side };
  }
  const width = seats <= 2 ? 110 : seats <= 4 ? 150 : seats <= 6 ? 190 : seats <= 8 ? 230 : 280;
  const height = seats <= 4 ? 110 : seats <= 8 ? 130 : 150;
  return { width, height };
}

/**
 * Walk a grid of slots inside a room, left to right and wrapping down. Used to
 * give tables a sane first position: the alternative is every table stacked at
 * the origin the first time the map is opened.
 */
export function createGridPlacer(roomWidth: number = DEFAULT_ROOM_WIDTH) {
  const usableWidth = Math.max(roomWidth, ROOM_MARGIN * 2 + 120);
  let x = ROOM_MARGIN;
  let y = ROOM_MARGIN;
  let rowHeight = 0;

  return (width: number, height: number): { x: number; y: number } => {
    if (x > ROOM_MARGIN && x + width + ROOM_MARGIN > usableWidth) {
      x = ROOM_MARGIN;
      y += rowHeight + TABLE_GAP;
      rowHeight = 0;
    }
    const slot = { x, y };
    x += width + TABLE_GAP;
    rowHeight = Math.max(rowHeight, height);
    return slot;
  };
}
