'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Pencil, CalendarCheck, Link2, Unlink } from 'lucide-react';
import type { Room, Table, Order } from '@/lib/types';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n-enums';
import { OrderPanel } from '@/components/orders/OrderPanel';
import type { DiscountMode } from '@/lib/discount-settings';

/**
 * What a table is doing right now, opened by tapping it on the map.
 *
 * It used to show the table's order and nothing else — you could see that a
 * course had not reached the kitchen and had no way to send it, and every
 * other action meant walking over to another screen. It now carries the order
 * panel itself, so the table is where its order is worked; a side panel rather
 * than a small dialog, because the room stays visible beside it.
 */

interface TableDetailModalProps {
  table: Table;
  room: Room | null;
  order: Order | null;
  /** Tables folded into this one, if it leads a group. */
  groupMembers: Table[];
  discountMode: DiscountMode;
  discountRequiresApproval: boolean;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
  onReserve: () => void;
  onMerge: () => void;
}

export function TableDetailModal({
  table, room, order, groupMembers, discountMode, discountRequiresApproval,
  onClose, onChanged, onEdit, onReserve, onMerge,
}: TableDetailModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');
  const [saving, setSaving] = useState(false);

  const booking = table.reservation ?? null;
  const groupSeats = table.capacity + groupMembers.reduce((sum, member) => sum + member.capacity, 0);

  const splitGroup = async () => {
    setSaving(true);
    try {
      await api.post(`/tables/${table.id}/split`);
      toast.success(tTables('tablesSplit'));
      onChanged();
      onClose();
    } catch {
      toast.error(tTables('splitFailed'));
      setSaving(false);
    }
  };

  const cancelReservation = async () => {
    setSaving(true);
    try {
      await api.delete(`/tables/${table.id}/reserve`);
      toast.success(tTables('reservationCancelled'));
      onChanged();
      onClose();
    } catch {
      toast.error(tTables('reservationCancelFailed'));
      setSaving(false);
    }
  };

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await api.patch(`/tables/${table.id}/status`, { status });
      onChanged();
      onClose();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'table_has_open_order' ? tTables('freeBlockedByOrder') : tTables('tableUpdateFailed'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* The room stays visible and clickable-to-close beside the panel. */}
      <button
        type="button"
        aria-label={tCommon('close')}
        onClick={onClose}
        className="flex-1 bg-black/50"
      />
      <div className="w-full max-w-xl bg-gray-50 h-full overflow-y-auto shadow-xl p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{table.name}</h2>
            <p className="text-sm text-gray-500">
              {room ? `${room.name} · ` : ''}
              {tTables('capacitySeats', { count: groupMembers.length > 0 ? groupSeats : table.capacity })}
              {' · '}{tTables(TABLE_STATUS_LABEL_KEYS[table.status])}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {groupMembers.length > 0 && (
          <p className="flex items-center gap-1.5 text-xs text-gray-500 mb-3">
            <Link2 size={13} />
            {tTables('joinedWith', { names: groupMembers.map((member) => member.name).join(', ') })}
          </p>
        )}

        {order ? (
          <div className="mb-4">
            <OrderPanel
              order={order}
              onChanged={onChanged}
              discountMode={discountMode}
              discountRequiresApproval={discountRequiresApproval}
            />
          </div>
        ) : booking ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <div className="flex items-center gap-2 mb-1.5 text-amber-800">
              <CalendarCheck size={15} />
              <span className="font-semibold text-sm">{booking.name}</span>
            </div>
            <p className="text-xs text-amber-700">
              <Ltr>
                {booking.booked_time ? `${booking.booked_time} · ` : ''}
                {tTables('reservationGuestsShort', { count: booking.guests })}
                {booking.phone ? ` · ${booking.phone}` : ''}
              </Ltr>
            </p>
            {booking.notes && <p className="text-xs text-amber-700 mt-1">{booking.notes}</p>}
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-6">{tTables('noActiveOrders')}</p>
        )}

        {/* What happens to the table itself, as opposed to its order. */}
        <div className="flex flex-wrap gap-2">
          {/* Only offered when the status has drifted: a table that is genuinely
              working or being held has its own actions below. */}
          {table.status !== 'available' && !order && !booking && (
            <Button type="button" variant="outline" onClick={() => setStatus('available')} disabled={saving}>
              {tTables('markAvailable')}
            </Button>
          )}
          {table.status === 'available' && (
            <Button type="button" variant="outline" onClick={onReserve} disabled={saving}>
              {tTables('reserve')}
            </Button>
          )}
          {booking && (
            <>
              <Button type="button" variant="outline" onClick={onReserve} disabled={saving}>
                <Pencil size={14} className="me-1" /> {tTables('editReservation')}
              </Button>
              <Button type="button" variant="outline" onClick={cancelReservation} disabled={saving}
                className="text-red-600 hover:text-red-700">
                {tTables('cancelReservation')}
              </Button>
            </>
          )}
          {groupMembers.length > 0 ? (
            <Button type="button" variant="outline" onClick={splitGroup} disabled={saving}>
              <Unlink size={14} className="me-1" /> {tTables('splitTables')}
            </Button>
          ) : !table.merged_into && !order && (
            <Button type="button" variant="outline" onClick={onMerge} disabled={saving}>
              <Link2 size={14} className="me-1" /> {tTables('mergeTables')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onEdit} disabled={saving}>
            <Pencil size={14} className="me-1" /> {tTables('edit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
