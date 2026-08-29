'use client';

import { useCallback, useRef, useState } from 'react';
import type { Room, Table, Order } from '@/lib/types';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { parseDbTimestamp } from '@/lib/utils';
import { Ltr } from '@/components/layout/Ltr';
import { CircleDollarSign, Flame, Link2 } from 'lucide-react';

/**
 * The dining room, drawn to scale (phase 2 of docs/table-management.md).
 *
 * Rooms are laid out in abstract units and scaled to whatever width the page
 * gives them, so the same map reads on the central PC and on a tablet. The
 * scale is floored so a large room becomes scrollable rather than unreadable.
 */

/** Dragged positions land on this grid, so a hand-arranged room still lines up. */
const SNAP = 10;
const MIN_SCALE = 0.45;

const STATUS_STYLES: Record<string, { tile: string; dot: string }> = {
  available: { tile: 'bg-white border-gray-200', dot: 'bg-green-500' },
  occupied: { tile: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  reserved: { tile: 'bg-amber-50 border-amber-200', dot: 'bg-amber-500' },
  cleaning: { tile: 'bg-gray-100 border-gray-300', dot: 'bg-gray-500' },
  held: { tile: 'bg-blue-50 border-blue-200', dot: 'bg-blue-500' },
};

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
  const formatCurrency = useFormatCurrency();

  const width = table.width ?? 150;
  const height = table.height ?? 110;
  const style = STATUS_STYLES[table.status] || STATUS_STYLES.available;
  const elapsed = order ? minutesSince(order.created_at) : null;
  // Rows never sent to the kitchen are what the floor most needs to see at a
  // glance; the same `kot_batch IS NULL` the ticket printer uses.
  const pendingKot = (order?.items || []).some(
    (item) => item.kot_batch == null && item.status !== 'cancelled' && item.status !== 'voided',
  );
  // A row of an off-menu dish that nobody has priced yet. Worth the same glance
  // as an unsent course: the bill cannot be closed honestly until it is filled.
  const unpriced = (order?.items || []).some(
    (item) => Boolean(item.price_required) && !item.price_confirmed && item.status !== 'cancelled',
  );
  const compact = height < 100 || width < 120;
  // A table being held shows who it is being held for; that is the whole point
  // of marking it reserved rather than just colouring it.
  const booking = !order ? table.reservation ?? null : null;
  const isGroupMember = Boolean(table.merged_into);

  return (
    <div
      role="button"
      tabIndex={0}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{
        position: 'absolute',
        left: position.x * scale,
        top: position.y * scale,
        width: width * scale,
        height: height * scale,
      }}
      className={`
        flex flex-col items-center justify-center text-center overflow-hidden border-2 select-none
        ${style.tile}
        ${table.shape === 'round' ? 'rounded-full' : 'rounded-xl'}
        ${editing ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}
        ${dragging ? 'shadow-lg ring-2 ring-brand z-10' : 'shadow-sm hover:shadow-md'}
        ${!table.is_active ? 'opacity-50' : ''}
        ${isGroupMember ? 'border-dashed opacity-70' : ''}
        transition-shadow
      `}
    >
      <span className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full ${style.dot}`} />
      {isGroupMember && (
        <span className="absolute bottom-1 end-1 text-gray-400" title={tTables('mergedInto')}>
          <Link2 size={12} />
        </span>
      )}
      {pendingKot && (
        <span className="absolute top-1 end-1 text-orange-600" title={tTables('kotPending')}>
          <Flame size={13} />
        </span>
      )}
      {unpriced && (
        <span className={`absolute top-1 ${pendingKot ? 'end-6' : 'end-1'} text-orange-600`} title={tTables('unpricedRow')}>
          <CircleDollarSign size={13} />
        </span>
      )}

      <span className="font-bold text-gray-900 leading-tight px-1 truncate max-w-full text-sm">
        {table.name}
      </span>
      {!compact && (
        booking ? (
          <span className="text-[11px] font-medium text-amber-800 truncate max-w-full px-1">{booking.name}</span>
        ) : (
          <span className="text-[11px] text-gray-500">
            {order?.guest_count
              ? `${order.guest_count}/${table.capacity}`
              : tTables('capacitySeats', { count: table.capacity })}
          </span>
        )
      )}
      {booking && !compact && (
        <span className="text-[10px] text-amber-700">
          <Ltr>
            {booking.booked_time ? `${booking.booked_time} · ` : ''}
            {tTables('reservationGuestsShort', { count: booking.guests })}
          </Ltr>
        </span>
      )}
      {order && !compact && (
        <span className="mt-0.5 text-[11px] font-medium text-gray-700">
          <Ltr>{formatCurrency(order.total || 0)}</Ltr>
        </span>
      )}
      {order && elapsed !== null && !compact && (
        <span className={`text-[10px] ${elapsed >= 90 ? 'text-red-600 font-semibold' : 'text-gray-400'}`}>
          <Ltr>{tTables('elapsedMinutes', { count: elapsed })}</Ltr>
        </span>
      )}
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
  const [availableWidth, setAvailableWidth] = useState(0);

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
    setAvailableWidth(node.clientWidth);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setAvailableWidth(entry.contentRect.width);
    });
    observer.observe(node);
    observerRef.current = observer;
  }, []);

  const roomWidth = room.width || 1200;
  const roomHeight = room.height || 800;
  const scale = availableWidth > 0
    ? Math.max(MIN_SCALE, Math.min(1, availableWidth / roomWidth))
    : 1;

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
    <div ref={measureRef} className="w-full overflow-x-auto">
      <div
        ref={canvasRef}
        style={{ width: roomWidth * scale, height: roomHeight * scale }}
        className={`relative rounded-xl border-2 border-dashed ${
          editing ? 'border-brand/40 bg-brand-light/20' : 'border-gray-200 bg-gray-50'
        }`}
      >
        {tables.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-gray-400">
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
