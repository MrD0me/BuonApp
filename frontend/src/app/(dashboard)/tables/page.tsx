'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Map as MapIcon, PenLine, LayoutGrid } from 'lucide-react';
import type { Room, Table, Order, Reservation } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { useTranslations } from 'use-intl';
import { RoomMap } from '@/components/tables/RoomMap';
import { ReserveModal } from '@/components/tables/ReserveModal';
import { TableFormModal, DeleteTableModal } from '@/components/tables/TableFormModal';
import { RoomFormModal, DeleteRoomModal } from '@/components/tables/RoomFormModal';
import { TableDetailModal } from '@/components/tables/TableDetailModal';
import { MergeTablesModal } from '@/components/tables/MergeTablesModal';
import { LayoutsModal } from '@/components/tables/LayoutsModal';

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
  const [mergingTable, setMergingTable] = useState<Table | null>(null);
  const [showLayouts, setShowLayouts] = useState(false);
  const [unassigned, setUnassigned] = useState<Reservation[]>([]);
  // A booking picked up from the strip, waiting for a table to be tapped.
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

  // Derived rather than synced: no effect has to chase the room list.
  const activeRoom = rooms.find((room) => room.id === selectedRoomId) ?? rooms[0] ?? null;
  const activeTables = activeRoom?.tables ?? [];

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

  const allTables = rooms.flatMap((room) => room.tables ?? []);

  const assignArmed = async (table: Table) => {
    const booking = armedBooking;
    if (!booking) return;
    setArmedBooking(null);
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
    // A table folded into a group is not its own thing any more: show the party.
    const leader = table.merged_into
      ? allTables.find((row) => row.id === table.merged_into) ?? table
      : table;
    setDetailTable(leader);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-brand border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{tTables('title')}</h1>
        <div className="flex items-center gap-2">
          {canEdit && (
            <Button variant={editing ? 'default' : 'outline'} onClick={() => setEditing((value) => !value)}>
              {editing ? <><MapIcon size={16} className="me-1" /> {tTables('serviceMode')}</>
                : <><PenLine size={16} className="me-1" /> {tTables('editMode')}</>}
            </Button>
          )}
          {editing && (
            <>
              <Button variant="outline" onClick={() => setShowLayouts(true)}>
                <LayoutGrid size={16} className="me-1" /> {tTables('layouts')}
              </Button>
              <Button variant="outline" onClick={() => setRoomForm({ room: null })}>
                <Plus size={16} className="me-1" /> {tTables('addRoom')}
              </Button>
              <Button onClick={() => setTableForm({ table: null })} disabled={rooms.length === 0}>
                <Plus size={16} className="me-1" /> {tTables('addTable')}
              </Button>
            </>
          )}
        </div>
      </div>

      {rooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <MapIcon size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">{tTables('noRooms')}</p>
          <p className="text-sm text-gray-500 mt-1 mb-4">{tTables('noRoomsHint')}</p>
          {canEdit && (
            <Button onClick={() => { setEditing(true); setRoomForm({ room: null }); }}>
              {tTables('createRoom')}
            </Button>
          )}
        </div>
      ) : (
        <>
          {!editing && unassigned.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-800 mb-2">
                {armedBooking ? tTables('pickTableFor', { name: armedBooking.name }) : tTables('unassignedBookings', { count: unassigned.length })}
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((booking) => (
                  <button key={booking.id}
                    onClick={() => setArmedBooking(armedBooking?.id === booking.id ? null : booking)}
                    className={`px-2.5 py-1 text-xs rounded-lg border-2 transition-colors ${
                      armedBooking?.id === booking.id
                        ? 'border-brand bg-white text-brand font-medium'
                        : 'border-amber-300 bg-white text-amber-900 hover:border-amber-400'
                    }`}>
                    {booking.booked_time ? `${booking.booked_time} · ` : ''}{booking.name} · {booking.guests}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2 mb-4">
            {rooms.map((room) => (
              <button key={room.id} onClick={() => setSelectedRoomId(room.id)}
                className={`px-3 py-1.5 text-sm rounded-lg border-2 transition-colors ${
                  activeRoom?.id === room.id
                    ? 'border-brand bg-brand-light text-brand font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}>
                {room.name}
                <span className="ms-1.5 text-xs text-gray-400">{(room.tables || []).length}</span>
              </button>
            ))}

            {editing && activeRoom && (
              <div className="flex items-center gap-1 ms-2">
                <button onClick={() => setRoomForm({ room: activeRoom })}
                  className="p-1.5 text-gray-500 hover:text-gray-800" title={tTables('editRoom')}>
                  <Pencil size={15} />
                </button>
                <button onClick={() => setDeletingRoom(activeRoom)}
                  className="p-1.5 text-red-500 hover:text-red-700" title={tTables('deleteRoom')}>
                  <Trash2 size={15} />
                </button>
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

          {editing && (
            <p className="mt-3 text-xs text-gray-500">{tTables('editModeHint')}</p>
          )}
        </>
      )}

      {orphanTables.length > 0 && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-3">
          <p className="text-sm font-medium text-amber-800 mb-2">
            {tTables('unassignedTables', { count: orphanTables.length })}
          </p>
          <div className="flex flex-wrap gap-2">
            {orphanTables.map((table) => (
              <button key={table.id} onClick={() => setTableForm({ table })}
                className="px-2.5 py-1 text-xs rounded-lg bg-white border border-amber-300 text-amber-900 hover:bg-amber-100">
                {table.name}
              </button>
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
          groupMembers={allTables.filter((row) => row.merged_into === detailTable.id)}
          onEdit={() => { setTableForm({ table: detailTable }); setDetailTable(null); }}
          onReserve={() => { setReservingTable(detailTable); setDetailTable(null); }}
          onMerge={() => { setMergingTable(detailTable); setDetailTable(null); }}
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

      {mergingTable && (
        <MergeTablesModal
          leader={mergingTable}
          tables={rooms.find((room) => room.id === mergingTable.room_id)?.tables ?? []}
          onClose={() => setMergingTable(null)}
          onMerged={() => { setMergingTable(null); reload(); }}
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
