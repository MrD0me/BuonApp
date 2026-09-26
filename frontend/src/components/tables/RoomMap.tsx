'use client';

import { useCallback, useRef, useState } from 'react';
import type { Room, Table, Order } from '@/lib/types';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { parseDbTimestamp } from '@/lib/utils';
import { pendingDishCount } from '@/lib/kot';
import { Ltr } from '@/components/layout/Ltr';
import { TABLE_STATUS_TONE, TONE_STYLES } from '@/lib/status-styles';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n/enums';
import { StatusBadge } from '@/components/ui/status-badge';
import { CircleDollarSign, Link2, Users } from 'lucide-react';

/**
 * The dining room, drawn to scale (phase 2 of docs/table-management.md).
 *
 * Rooms are laid out in abstract units and scaled to fit the frame the page
 * gives them, width and height both, so the whole room is on screen at once.
 * Scaled to the width alone, a room on the till's 1024x768 ran off the bottom
 * and the floor had to scroll the map to find a table. Only a frame too small
 * to hold anything legible falls back to scrolling.
 */

/** Dragged positions land on this grid, so a hand-arranged room still lines up. */
const SNAP = 10;
const MIN_SCALE = 0.3;

/**
 * A bold character's advance, in ems. Generous, so that a name sized by it
 * fits rather than nearly fits: "Tav 12" measures 0.5 em a character.
 */
const NAME_EM = 0.55;
const MIN_NAME_PX = 10;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function snapTo(value: number): number {
  return Math.round(value / SNAP) * SNAP;
}

/** Minutes since a timestamp, or null when there isn't one to measure from. */
function minutesSince(timestamp: string | null | undefined): number | null {
  if (!timestamp) return null;
  const parsed = parseDbTimestamp(timestamp);
  if (isNaN(parsed.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / 60000));
}

interface TableTileProps {
  table: Table;
  order: Order | null;
  scale: number;
  editing: boolean;
  dragging: boolean;
  position: { x: number; y: number };
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
}

function TableTile({
  table, order, scale, editing, dragging, position,
  onPointerDown, onPointerMove, onPointerUp,
}: TableTileProps) {
  const tTables = useTranslations('tables');
  const t = useTranslations('serverApp');
  const formatCurrency = useFormatCurrency();

  const width = table.width ?? 150;
  const height = table.height ?? 110;
  const tone = TABLE_STATUS_TONE[table.status] ?? 'free';
  const style = TONE_STYLES[tone];
  const elapsed = order ? minutesSince(order.created_at) : null;
  // Rows never sent to the kitchen are what the floor most needs to see at a
  // glance; the same `kot_batch IS NULL` the ticket printer uses.
  const pending = order ? pendingDishCount(order.items || []) : 0;
  // A row of an off-menu dish that nobody has priced yet. Worth the same glance
  // as an unsent course: the bill cannot be closed honestly until it is filled.
  const unpriced = (order?.items || []).some(
    (item) => Boolean(item.price_required) && !item.price_confirmed && item.status !== 'cancelled',
  );
  // Measured on screen, not in room units: a big room on a small monitor
  // shrinks its tiles, and what a tile can hold is a matter of pixels. A name
  // and one line of detail need about 60 px of height; a second line, 76 in a
  // rectangle. A round table needs more: the corners of its box are outside
  // the circle, so a two-seater drawn at the same 77 px cut the total in half.
  const drawnHeight = height * scale;
  const drawnWidth = width * scale;
  const showDetail = drawnHeight >= 60 && drawnWidth >= 72;
  // Anything smaller tightens up, with a smaller name and less padding, and
  // gives its seats as an icon and a number, as the handheld does. A big room
  // fitted to the till's screen draws most tables under that size: at full size
  // a small table's name was down to its first letter, and only the long
  // tables said how many they seat, which is what a party is walked to a
  // table by.
  const compact = !showDetail;
  const showSeats = compact && drawnHeight >= (table.shape === 'round' ? 42 : 36);
  const showSecondLine = drawnHeight >= (table.shape === 'round' ? 96 : 76);
  // A table being held shows who it is being held for; that is the whole point
  // of marking it reserved rather than just colouring it.
  const booking = !order ? table.reservation ?? null : null;
  const isGroupMember = Boolean(table.merged_into);
  const round = table.shape === 'round';

  // The name is what the floor finds a table by, so it is never the part that
  // gives way. It is set as large as the tile allows, from 16 px (14 on a
  // compact tile) down to 10, and the badge of dishes to send sits beside it
  // only where both fit at full size: squeezed in beside it on a small table,
  // the badge left "Ta…". Where it does not fit the tile is outlined instead,
  // in the colour the legend gives to dishes still to send.
  const nameMaxPx = compact ? 14 : 16;
  const nameRoom = round
    ? drawnWidth - 4 - (compact ? 8 : 24)
    : drawnWidth - (compact ? 12 : 24);
  const nameEms = Math.max(table.name.length, 1) * NAME_EM;
  const badgeWidth = (label: string) => 20 + label.length * NAME_EM * 12;
  const longBadge = t('pendingToSend', { count: pending });
  // A round tile stacks the badge under the name; a rectangle puts it beside.
  const badgeFits = (label: string) => round
    ? !compact && badgeWidth(label) <= nameRoom
    : nameEms * nameMaxPx + badgeWidth(label) <= nameRoom;
  const badgeLabel = pending === 0 ? null
    : drawnWidth >= 150 && badgeFits(longBadge) ? longBadge
      : badgeFits(String(pending)) ? String(pending) : null;
  const pendingOutline = pending > 0 && badgeLabel === null;
  const besideName = badgeLabel !== null && !round ? badgeWidth(badgeLabel) : 0;
  const namePx = clamp(Math.floor((nameRoom - besideName) / nameEms), MIN_NAME_PX, nameMaxPx);

  // The state is the colour, and the legend above the map says what the
  // colours mean. A pill saying "Disponibile" as well was the same fact twice,
  // and on a tile as wide as the table the floor actually drew it got cut in
  // half. What is left is what the pill could not say: how many are sitting,
  // for how long, whose booking, how many plates are still to go.
  const statusWord = tTables(TABLE_STATUS_LABEL_KEYS[table.status]);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={[table.name, statusWord, pending > 0 ? t('pendingToSend', { count: pending }) : null]
        .filter(Boolean).join(' · ')}
      title={statusWord}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        // Placed on the room's own canvas, in room units scaled to the screen.
        position: 'absolute',
        left: position.x * scale,
        top: position.y * scale,
        width: width * scale,
        height: height * scale,
      }}
      className={`
        flex flex-col overflow-hidden select-none text-start
        ${tone === 'free' ? 'bg-card' : style.soft}
        ${round ? `items-center justify-center rounded-full border-2 ${compact ? 'px-1' : 'px-3'} text-center ${style.border}` : 'rounded-xl border border-border'}
        ${editing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${dragging ? 'shadow-lg ring-2 ring-brand z-10' : 'shadow-xs'}
        ${!table.is_active ? 'opacity-50' : ''}
        ${isGroupMember ? 'border-dashed opacity-70' : ''}
        ${pendingOutline ? 'outline-2 -outline-offset-2 outline-pending' : ''}
        transition-shadow
      `}
    >
      {/* A straight band down the inline-start edge, clipped by the tile's own
          corners. A thick border would meet the thin ones on a diagonal and
          read as a crescent stuck to the side of the table. */}
      {!round && <span aria-hidden="true" className={`absolute inset-y-0 start-0 w-1.5 ${style.dot}`} />}
      <div className={`flex items-start justify-between gap-1 ${round ? 'flex-col items-center' : compact ? 'ps-2 pe-0.5 pt-1' : 'ps-3.5 pe-2 pt-2'}`}>
        <span className="truncate font-bold leading-tight text-foreground" style={{ fontSize: namePx }}>{table.name}</span>
        {badgeLabel !== null && (
          <StatusBadge tone="pending" size="sm" title={tTables('kotPending')}>
            {badgeLabel === longBadge ? longBadge : <Ltr>{badgeLabel}</Ltr>}
          </StatusBadge>
        )}
      </div>
      {/* A round table centres its text: pushed to the bottom with mt-auto it
          ran off the curve. */}
      <div className={`flex flex-col gap-0.5 ${round ? 'items-center' : compact ? 'mt-auto ps-2 pe-0.5 pb-1' : 'mt-auto ps-3.5 pe-2 pb-2 pt-1'}`}>
        {(isGroupMember || unpriced) && (
          <span className="flex items-center gap-1.5">
            {isGroupMember && <Link2 size={14} className="shrink-0 text-muted-foreground" aria-label={tTables('mergedInto')} />}
            {unpriced && <CircleDollarSign size={14} className="shrink-0 text-pending" aria-label={tTables('unpricedRow')} />}
          </span>
        )}
        {/* Two short lines rather than one long one: a tile is as wide as the
            table somebody drew, and a single line carrying covers, money and
            minutes ended in an ellipsis on every one of them. */}
        {showDetail && (
          booking ? (
            <>
              <span className="truncate text-xs font-medium text-table-reserved">
                <Ltr>{booking.booked_time ? `${booking.booked_time} · ` : ''}</Ltr>{booking.name}
              </span>
              {showSecondLine && (
                <span className="truncate text-xs text-table-reserved">
                  <Ltr>{tTables('reservationGuestsShort', { count: booking.guests })}</Ltr>
                </span>
              )}
            </>
          ) : order ? (
            <>
              <span className={`truncate text-xs ${elapsed !== null && elapsed >= 90 ? 'font-semibold text-table-occupied' : 'text-muted-foreground'}`}>
                <Ltr>{`${order.guest_count ?? 1}/${table.capacity}${elapsed !== null ? ` · ${tTables('elapsedMinutes', { count: elapsed })}` : ''}`}</Ltr>
              </span>
              {showSecondLine && (
                <span className="truncate text-xs font-medium text-foreground">
                  <Ltr>{formatCurrency(order.total || 0)}</Ltr>
                </span>
              )}
            </>
          ) : (
            <span className="truncate text-xs text-muted-foreground">{tTables('capacitySeats', { count: table.capacity })}</span>
          )
        )}
        {/* Who is there out of how many it seats, as on the full tile: a
            booking or an open order puts its party in front of the seats. */}
        {showSeats && (
          <span className={`flex items-center gap-0.5 text-xs leading-none ${booking ? 'text-table-reserved' : 'text-muted-foreground'}`}>
            <Users size={12} className="shrink-0" aria-hidden="true" />
            <Ltr>{order
              ? `${order.guest_count ?? 1}/${table.capacity}`
              : booking ? `${booking.guests}/${table.capacity}` : String(table.capacity)}</Ltr>
          </span>
        )}
      </div>
    </div>
  );
}

interface RoomMapProps {
  room: Room;
  tables: Table[];
  ordersByTable: Map<string, Order>;
  editing: boolean;
  onSelect: (table: Table) => void;
  onMove: (table: Table, x: number, y: number) => void;
}

export function RoomMap({ room, tables, ordersByTable, editing, onSelect, onMove }: RoomMapProps) {
  const tTables = useTranslations('tables');
  const canvasRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<ResizeObserver | null>(null);
  const [available, setAvailable] = useState({ width: 0, height: 0 });

  /**
   * Measure on attach and keep measuring. A callback ref rather than an effect:
   * it runs with a real node in hand, so the first paint is already scaled
   * instead of drawing the room at 1:1 and waiting for the observer — which in
   * a background tab may not report for a long time, or at all.
   */
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    observerRef.current?.disconnect();
    observerRef.current = null;
    if (!node) return;
    setAvailable({ width: node.clientWidth, height: node.clientHeight });
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setAvailable({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const roomWidth = room.width || 1200;
  const roomHeight = room.height || 800;
  // What has to fit is the room plus any table left outside it: making a room
  // smaller does not move the tables already placed in it.
  let extentWidth = roomWidth;
  let extentHeight = roomHeight;
  for (const table of tables) {
    extentWidth = Math.max(extentWidth, (table.position_x ?? 0) + (table.width ?? 150));
    extentHeight = Math.max(extentHeight, (table.position_y ?? 0) + (table.height ?? 110));
  }
  const fit = Math.min(
    1,
    available.width > 0 ? available.width / extentWidth : 1,
    available.height > 0 ? available.height / extentHeight : 1,
  );
  // Rounded down to a thousandth: a canvas a fraction of a pixel too big for
  // its frame brings back the scrollbars this is here to remove.
  const scale = Math.max(MIN_SCALE, Math.floor(fit * 1000) / 1000);

  // The live drag lives in a ref, not in state: a flick where the move and the
  // release land in the same frame would otherwise read a stale position at
  // pointerup and silently drop the move. State is only what gets painted.
  const dragRef = useRef<{ table: Table; offsetX: number; offsetY: number; moved: boolean; x: number; y: number } | null>(null);
  const [dragged, setDragged] = useState<{ id: string; x: number; y: number } | null>(null);

  const pointerToRoom = useCallback((clientX: number, clientY: number) => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!bounds) return { x: 0, y: 0 };
    return { x: (clientX - bounds.left) / scale, y: (clientY - bounds.top) / scale };
  }, [scale]);

  const handlePointerDown = (table: Table) => (event: React.PointerEvent<HTMLDivElement>) => {
    if (!editing) return;
    event.preventDefault();
    const pointer = pointerToRoom(event.clientX, event.clientY);
    // Arm the drag before asking for capture: capture is an optimisation that
    // keeps the pointer bound to the tile once it leaves it, and a browser that
    // refuses it must not take the whole drag down with it.
    dragRef.current = {
      table,
      offsetX: pointer.x - (table.position_x ?? 0),
      offsetY: pointer.y - (table.position_y ?? 0),
      moved: false,
      x: table.position_x ?? 0,
      y: table.position_y ?? 0,
    };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Drag still works while the pointer stays over the tile.
    }
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const pointer = pointerToRoom(event.clientX, event.clientY);
    const width = drag.table.width ?? 150;
    const height = drag.table.height ?? 110;
    const x = snapTo(clamp(pointer.x - drag.offsetX, 0, Math.max(0, roomWidth - width)));
    const y = snapTo(clamp(pointer.y - drag.offsetY, 0, Math.max(0, roomHeight - height)));
    if (!drag.moved && x === (drag.table.position_x ?? 0) && y === (drag.table.position_y ?? 0)) return;
    drag.moved = true;
    drag.x = x;
    drag.y = y;
    setDragged({ id: drag.table.id, x, y });
  };

  const handlePointerUp = (table: Table) => (event: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    try {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Never held it; nothing to release.
    }
    setDragged(null);
    // A press that never moved is a tap, whichever mode we are in.
    if (!drag || !drag.moved) {
      onSelect(table);
      return;
    }
    onMove(drag.table, drag.x, drag.y);
  };

  return (
    <div ref={measureRef} className="min-h-0 w-full flex-1 overflow-auto">
      <div
        ref={canvasRef}
        style={{ width: roomWidth * scale, height: roomHeight * scale }}
        className={`relative rounded-xl border-2 border-dashed ${
          editing ? 'border-brand/40 bg-brand-light/20' : 'border-border bg-muted/40'
        }`}
      >
        {tables.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            {tTables('roomEmpty')}
          </p>
        )}
        {tables.map((table) => {
          const live = dragged?.id === table.id ? dragged : null;
          return (
            <TableTile
              key={table.id}
              table={table}
              order={ordersByTable.get(table.id) ?? null}
              scale={scale}
              editing={editing}
              dragging={live !== null}
              position={live ?? { x: table.position_x ?? 0, y: table.position_y ?? 0 }}
              onPointerDown={handlePointerDown(table)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp(table)}
            />
          );
        })}
      </div>
    </div>
  );
}
