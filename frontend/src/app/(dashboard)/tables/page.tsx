'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Map as MapIcon, PenLine, LayoutGrid, CalendarCheck } from 'lucide-react';
import { PageToolbar } from '@/components/layout/PageToolbar';
import { SegmentedControl, useScrollEdges, edgeFadeMask } from '@/components/ui/segmented-control';
import { StatusDot } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { ServiceDayChip } from '@/components/service-days/ServiceDayChip';
import { TABLE_STATUS_TONE } from '@/lib/status-styles';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n/enums';
import type { Room, Table, Order, Reservation } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { usePosSettingsStore } from '@/store/pos-settings';
import { getLanguageDirection } from '@/lib/i18n';
import { useTranslations } from 'use-intl';
import { RoomMap } from '@/components/tables/RoomMap';
import { ReserveModal } from '@/components/tables/ReserveModal';
import { TableFormModal, DeleteTableModal } from '@/components/tables/TableFormModal';
import { RoomFormModal, DeleteRoomModal } from '@/components/tables/RoomFormModal';
import { TableDetailModal } from '@/components/tables/TableDetailModal';
import { LayoutsModal } from '@/components/tables/LayoutsModal';
import { DEFAULT_DISCOUNT_METHODS, normalizeDiscountMethods, type DiscountMethods } from '@/lib/discount-settings';

/**
 * The dining room as a map (phase 2 of docs/table-management.md).
 *
 * Two modes on one page. In service the map is read-only and a tap opens what
 * the table is doing; in edit the tables are dragged, added and removed. Edit
 * is owner/manager only, and it is never reachable from the waiter handheld —
 * that app forwards a fixed allowlist which carries no table writes at all.
 */
export default function TablesPage() {
  const tTables = useTranslations('tables');
  const tNav = useTranslations('nav');
  const tServerApp = useTranslations('serverApp');
  const role = useAuthStore((state) => state.currentTenant?.role) || 'cashier';
  const canEdit = role === 'owner' || role === 'manager';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [orphanTables, setOrphanTables] = useState<Table[]>([]);
  const [ordersByTable, setOrdersByTable] = useState<Map<string, Order>>(new Map());
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  const [detailTable, setDetailTable] = useState<Table | null>(null);
  const [tableForm, setTableForm] = useState<{ table: Table | null } | null>(null);
  const [deletingTable, setDeletingTable] = useState<Table | null>(null);
  const [reservingTable, setReservingTable] = useState<Table | null>(null);
  const [roomForm, setRoomForm] = useState<{ room: Room | null } | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [showLayouts, setShowLayouts] = useState(false);
  const [unassigned, setUnassigned] = useState<Reservation[]>([]);
  // The order panel in the table card offers discounts, and those follow the
  // tenant's rules: read them once here rather than per opened table.
  const [discountMethods, setDiscountMethods] = useState<DiscountMethods>(DEFAULT_DISCOUNT_METHODS);
  const [discountRequiresApproval, setDiscountRequiresApproval] = useState(false);
  // A booking waiting for a table to be tapped: picked up from the strip, or
  // lifted off the table it had with "Change table".
  const [armedBooking, setArmedBooking] = useState<Reservation | null>(null);

  // Promise chains rather than await: state updates land in a microtask instead
  // of synchronously inside the effect below, which is what React wants.
  const loadMap = useCallback(() => api.get('/rooms')
    .then(({ data }) => {
      setRooms(data.rooms || []);
      setOrphanTables(data.orphanTables || []);
    })
    .catch(() => toast.error(tTables('loadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  const loadOrders = useCallback(() => api
    .get('/orders', { params: { status: 'pending,preparing,ready,served', per_page: 500 } })
    .then(({ data }) => {
      const byTable = new Map<string, Order>();
      for (const order of (data.orders || []) as Order[]) {
        if (!order.table_id) continue;
        const key = String(order.table_id);
        const current = byTable.get(key);
        // Newest wins, matching what the map is meant to show: the order the
        // table is running right now.
        if (!current || order.id > current.id) byTable.set(key, order);
      }
      setOrdersByTable(byTable);
    })
    .catch(() => {
      // The map still draws without order detail; the load error above covers it.
    }),
  []);

  const loadUnassigned = useCallback(() => api.get('/reservations')
    .then(({ data }) => setUnassigned(
      (data.reservations || []).filter((booking: Reservation) => booking.status === 'booked' && !booking.table_id),
    ))
    .catch(() => {
      // The map still draws; the strip just stays empty.
    }),
  []);

  const reload = useCallback(
    () => Promise.all([loadMap(), loadOrders(), loadUnassigned()]),
    [loadMap, loadOrders, loadUnassigned],
  );

  useEffect(() => {
    loadMap();
    loadOrders();
    loadUnassigned();
    const interval = setInterval(() => { loadMap(); loadOrders(); loadUnassigned(); }, 10000);
    return () => clearInterval(interval);
  }, [loadMap, loadOrders, loadUnassigned]);

  useEffect(() => {
    api.get('/settings/discount')
      .then((res) => {
        setDiscountMethods(normalizeDiscountMethods(res.data.discount_methods));
        setDiscountRequiresApproval(!!res.data.discount_requires_approval);
      })
      .catch(() => { /* the panel falls back to percentage-only */ });
  }, []);

  // Derived rather than synced: no effect has to chase the room list.
  const activeRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const activeTables = activeRoom?.tables ?? [];

  const language = usePosSettingsStore((state) => state.language);
  const bookingsWaiting = !editing && (unassigned.length > 0 || armedBooking !== null);
  const { ref: waitingRef, edges: waitingEdges } = useScrollEdges(
    bookingsWaiting, getLanguageDirection(language) === 'rtl', unassigned,
  );

  const handleMove = async (table: Table, x: number, y: number) => {
    // Optimistic, so the tile stays under the finger; a failure reloads the truth.
    setRooms((previous) => previous.map((room) => ({
      ...room,
      tables: (room.tables || []).map((row) => (
        row.id === table.id ? { ...row, position_x: x, position_y: y } : row
      )),
    })));
    try {
      await api.put(`/tables/${table.id}`, { position_x: x, position_y: y });
    } catch {
      toast.error(tTables('tableUpdateFailed'));
      loadMap();
    }
  };

  const assignArmed = async (table: Table) => {
    const booking = armedBooking;
    if (!booking) return;
    setArmedBooking(null);
    // Tapping the table it is already on is changing your mind, not a move.
    if (booking.table_id === table.id) return;
    try {
      const { data } = await api.post(`/reservations/${booking.id}/assign`, { table_id: table.id });
      toast.success(data.displaced
        ? tTables('bookingSwapped', { a: booking.name, b: data.displaced.name })
        : tTables('bookingAssigned', { name: booking.name, table: table.name }));
      reload();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'table_has_open_order' ? tTables('reservationBlockedByOrder') : tTables('bookingAssignFailed'));
    }
  };

  const handleSelect = (table: Table) => {
    // A booking picked up from the strip turns the next tap into a placement.
    if (armedBooking && !editing) {
      assignArmed(table);
      return;
    }
    if (editing) {
      setTableForm({ table });
      return;
    }
    setDetailTable(table);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    // Full height, so the map scrolls inside its own frame instead of pushing
    // the bottom of the room under the fold on a 768 px screen.
    <div className="flex h-full flex-col gap-4">
      {/* Titled like the sidebar entry: the page and the bar say the same word.
          Editing swaps the service actions for its own in the same bar rather
          than opening a band of them under it: on the till that band ran to
          two rows, and every pixel of it came off the map, which shrank a
          quarter and set the table names a size smaller than in service. */}
      <PageToolbar
        title={tNav('tables')}
        actions={(
          <>
            {editing ? (
              <>
                <Button variant="outline" size="touch" onClick={() => setShowLayouts(true)}>
                  <LayoutGrid /> {tTables('layouts')}
                </Button>
                <Button variant="outline" size="touch" onClick={() => setRoomForm({ room: null })}>
                  <Plus /> {tTables('addRoom')}
                </Button>
                <Button variant="outline" size="touch" onClick={() => setTableForm({ table: null })} disabled={rooms.length === 0}>
                  <Plus /> {tTables('addTable')}
                </Button>
              </>
            ) : (
              <>
                <ServiceDayChip readOnly />
                {/* Bookings belong to the room, so they are reached from it rather
                    than from a bar entry of their own. */}
                <Button variant="outline" size="touch" asChild>
                  <Link href="/reservations">
                    <CalendarCheck /> {tNav('reservations')}
                  </Link>
                </Button>
              </>
            )}
            {canEdit && (
              <Button variant={editing ? 'default' : 'outline'} size="touch" onClick={() => { setArmedBooking(null); setEditing((value) => !value); }}>
                {editing ? <><MapIcon /> {tTables('serviceMode')}</> : <><PenLine /> {tTables('editMode')}</>}
              </Button>
            )}
          </>
        )}
      />

      {rooms.length === 0 ? (
        <EmptyState
          className="rounded-2xl border border-border bg-card py-16"
          icon={<MapIcon />}
          title={tTables('noRooms')}
          hint={tTables('noRoomsHint')}
          action={canEdit ? (
            <Button size="touch-lg" onClick={() => { setEditing(true); setRoomForm({ room: null }); }}>
              {tTables('createRoom')}
            </Button>
          ) : undefined}
        />
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SegmentedControl
                size="lg"
                scrollable
                aria-label={tServerApp('rooms')}
                value={activeRoom?.id ?? ''}
                onValueChange={setSelectedRoomId}
                items={rooms.map((room) => ({ value: room.id, label: room.name, count: (room.tables || []).length }))}
              />
              {editing && activeRoom && (
                <>
                  <Button variant="ghost" size="icon-touch" onClick={() => setRoomForm({ room: activeRoom })} aria-label={tTables('editRoom')} title={tTables('editRoom')}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-touch" onClick={() => setDeletingRoom(activeRoom)} aria-label={tTables('deleteRoom')} title={tTables('deleteRoom')} className="text-table-occupied">
                    <Trash2 />
                  </Button>
                </>
              )}
            </div>
            {/* While editing, the colours are not what the room is being read
                for: how to move a table is. The hint wraps inside the row
                beside the rooms rather than dropping to a line of its own. */}
            {editing ? (
              <p className="min-w-48 flex-1 basis-0 text-end text-sm text-muted-foreground">{tTables('editModeHint')}</p>
            ) : bookingsWaiting ? (
              /* Bookings still to seat take the legend's place rather than a
                 band of their own over the map. The band cost the map 113 px
                 on the till's screen exactly while bookings were being placed,
                 and at that size no booked table had room for its name. One
                 row that scrolls sideways, however many are waiting; also up
                 while a booking is being moved off its table, which has no
                 chip here, with Cancel as the way out. */
              <div className="flex min-w-0 flex-1 basis-80 items-center gap-2 rounded-2xl border border-table-reserved bg-table-reserved-soft py-[3px] ps-3 pe-[3px]">
                <p className="min-w-0 truncate text-sm font-semibold text-table-reserved">
                  {armedBooking
                    ? tTables(armedBooking.table_id ? 'pickNewTableFor' : 'pickTableFor', { name: armedBooking.name })
                    : tTables('unassignedBookings', { count: unassigned.length })}
                </p>
                <div ref={waitingRef} style={edgeFadeMask(waitingEdges)} className="flex min-w-0 flex-1 basis-0 gap-2 overflow-x-auto [scrollbar-width:none]">
                  {unassigned.map((booking) => (
                    <button key={booking.id}
                      type="button"
                      aria-pressed={armedBooking?.id === booking.id}
                      onClick={() => setArmedBooking(armedBooking?.id === booking.id ? null : booking)}
                      className={`h-touch shrink-0 whitespace-nowrap rounded-xl border-2 bg-card px-3 text-sm font-medium transition ${
                        armedBooking?.id === booking.id
                          ? 'border-brand text-brand'
                          : 'border-table-reserved/40 text-foreground'
                      }`}>
                      {booking.name} · {booking.guests}
                    </button>
                  ))}
                </div>
                {armedBooking && (
                  <Button type="button" variant="outline" size="touch" className="shrink-0" onClick={() => setArmedBooking(null)}>
                    {tTables('cancel')}
                  </Button>
                )}
              </div>
            ) : (
              // What the colours mean, once, instead of a dot the eye has to decode.
              <div className="hidden flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground md:flex">
                {(['available', 'occupied', 'reserved', 'held'] as const).map((status) => (
                  <span key={status} className="flex items-center gap-1.5">
                    <StatusDot tone={TABLE_STATUS_TONE[status]} />
                    {tTables(TABLE_STATUS_LABEL_KEYS[status])}
                  </span>
                ))}
                {/* A dot like the others: the same badge with a number inside
                    read as a live count of plates waiting, and said 2 with
                    nothing to send. */}
                <span className="flex items-center gap-1.5">
                  <StatusDot tone="pending" />
                  {tTables('legendPending')}
                </span>
              </div>
            )}
          </div>

          {activeRoom && (
            <RoomMap
              room={activeRoom}
              tables={activeTables}
              ordersByTable={ordersByTable}
              editing={editing}
              onSelect={handleSelect}
              onMove={handleMove}
            />
          )}

        </div>
      )}

      {orphanTables.length > 0 && (
        <div className="rounded-2xl border border-table-reserved bg-table-reserved-soft p-3">
          <p className="mb-2 text-sm font-semibold text-table-reserved">
            {tTables('unassignedTables', { count: orphanTables.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            {orphanTables.map((table) => (
              <Button key={table.id} type="button" variant="outline" size="touch" onClick={() => setTableForm({ table })}>
                {table.name}
              </Button>
            ))}
          </div>
        </div>
      )}

      {detailTable && (
        <TableDetailModal
          table={detailTable}
          room={rooms.find((room) => room.id === detailTable.room_id) ?? null}
          order={ordersByTable.get(detailTable.id) ?? null}
          onClose={() => setDetailTable(null)}
          onChanged={reload}
          discountMethods={discountMethods}
          discountRequiresApproval={discountRequiresApproval}
          onEdit={() => { setTableForm({ table: detailTable }); setDetailTable(null); }}
          onReserve={() => { setReservingTable(detailTable); setDetailTable(null); }}
          onMoveBooking={() => { setArmedBooking(detailTable.reservation ?? null); setDetailTable(null); }}
        />
      )}

      {tableForm && (
        <TableFormModal
          key={tableForm.table?.id ?? 'new'}
          table={tableForm.table}
          rooms={rooms}
          defaultRoomId={activeRoom?.id ?? null}
          onClose={() => setTableForm(null)}
          onSaved={() => { setTableForm(null); reload(); }}
          onDelete={tableForm.table
            ? () => { setDeletingTable(tableForm.table); setTableForm(null); }
            : undefined}
        />
      )}

      {deletingTable && (
        <DeleteTableModal
          table={deletingTable}
          onClose={() => setDeletingTable(null)}
          onDeleted={() => { setDeletingTable(null); reload(); }}
        />
      )}

      {reservingTable && (
        <ReserveModal
          table={reservingTable}
          onClose={() => setReservingTable(null)}
          onDone={() => { setReservingTable(null); reload(); }}
        />
      )}

      {roomForm && (
        <RoomFormModal
          key={roomForm.room?.id ?? 'new-room'}
          room={roomForm.room}
          onClose={() => setRoomForm(null)}
          onSaved={(roomId) => {
            setRoomForm(null);
            if (roomId) setSelectedRoomId(roomId);
            loadMap();
          }}
        />
      )}

      {showLayouts && (
        <LayoutsModal
          onClose={() => setShowLayouts(false)}
          onApplied={() => { setShowLayouts(false); reload(); }}
        />
      )}

      {deletingRoom && (
        <DeleteRoomModal
          room={deletingRoom}
          onClose={() => setDeletingRoom(null)}
          onDeleted={() => { setDeletingRoom(null); setSelectedRoomId(null); loadMap(); }}
        />
      )}
    </div>
  );
}
