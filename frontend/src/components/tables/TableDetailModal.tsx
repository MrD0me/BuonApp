'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Pencil, CalendarCheck, Plus, ClipboardList, ArrowLeftRight, Undo2 } from 'lucide-react';
import type { Room, Table, Order } from '@/lib/types';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n-enums';
import { TABLE_STATUS_TONE } from '@/lib/status-styles';
import { pendingDishCount } from '@/lib/kot';
import { coversForNewOrder } from '@/lib/table-covers';
import { OrderPanel } from '@/components/orders/OrderPanel';
import { useRouter } from 'next/navigation';
import { useCartStore } from '@/store/cart';
import { useConfirm } from '@/hooks/use-confirm';
import type { DiscountMode } from '@/lib/discount-settings';
import { SidePanel, SidePanelBody, SidePanelDescription, SidePanelFooter, SidePanelHeader, SidePanelTitle } from '@/components/ui/side-panel';
import { StatusBadge } from '@/components/ui/status-badge';
import { EmptyState } from '@/components/ui/empty-state';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';

/**
 * What a table is doing right now, opened by tapping it on the map.
 *
 * A panel beside the room rather than a dialog over it, so the floor stays
 * in view. With an order on the table it carries the order panel itself —
 * the table is where its order is worked — and editing the table goes behind
 * the panel's "more" menu. Without one, the panel offers the one thing the
 * floor wants from a free table: an order.
 */

interface TableDetailModalProps {
  table: Table;
  room: Room | null;
  order: Order | null;
  discountMode: DiscountMode;
  discountRequiresApproval: boolean;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
  onReserve: () => void;
  /** Pick the booking up so the next table tapped on the map becomes its table. */
  onMoveBooking: () => void;
}

export function TableDetailModal({
  table, room, order, discountMode, discountRequiresApproval,
  onClose, onChanged, onEdit, onReserve, onMoveBooking,
}: TableDetailModalProps) {
  const tTables = useTranslations('tables');
  const tReservations = useTranslations('reservations');
  const tCommon = useTranslations('common');
  const tOrders = useTranslations('orders');
  const t = useTranslations('serverApp');
  const router = useRouter();
  const cartStore = useCartStore();
  const { confirm, ConfirmDialog } = useConfirm();
  const [saving, setSaving] = useState(false);

  const booking = table.reservation ?? null;
  const tone = TABLE_STATUS_TONE[table.status] ?? 'free';
  const pending = order ? pendingDishCount(order.items || []) : 0;

  /**
   * Opens a first order on this table. The composing happens on the ordering
   * screen, which is the only one with the catalogue and the add-on choices —
   * this side just says which table it is for, and how many are sitting at it.
   *
   * The ticket starts clean even when it had no dishes: covers counted for
   * another table would otherwise stay on the counter and win over this one's.
   */
  const takeOrder = async () => {
    if (cartStore.items.length > 0) {
      const proceed = await confirm(tOrders('cartClearConfirm'));
      if (!proceed) return;
    }
    cartStore.clearCart();
    router.push(`/pos?table=${table.id}&covers=${coversForNewOrder(table)}`);
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

  /**
   * Takes the booking off this table without cancelling it: the party is still
   * coming, just not here. It goes back to the strip above the map, where the
   * next table it gets is picked.
   */
  const unassignBooking = async () => {
    if (!booking) return;
    setSaving(true);
    try {
      await api.post(`/reservations/${booking.id}/assign`, { table_id: null });
      toast.success(tReservations('unassignedDone', { name: booking.name }));
      onChanged();
      onClose();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'reservation_not_pending' ? tReservations('notPending') : tReservations('assignFailed'));
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

  const description = [
    room?.name,
    tTables('capacitySeats', { count: table.capacity }),
  ].filter(Boolean).join(' · ');

  return (
    <SidePanel open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SidePanelHeader closeLabel={tCommon('close')}>
        <div className="flex flex-wrap items-center gap-2">
          <SidePanelTitle>{table.name}</SidePanelTitle>
          <StatusBadge tone={tone}>{tTables(TABLE_STATUS_LABEL_KEYS[table.status])}</StatusBadge>
          {pending > 0 && <StatusBadge tone="pending">{t('pendingToSend', { count: pending })}</StatusBadge>}
        </div>
        <SidePanelDescription>{description}</SidePanelDescription>
      </SidePanelHeader>

      {order ? (
        <OrderPanel
          order={order}
          onChanged={onChanged}
          discountMode={discountMode}
          discountRequiresApproval={discountRequiresApproval}
          extraMenu={(
            <DropdownMenuItem onClick={onEdit} disabled={saving}>
              <Pencil className="me-2" /> {tTables('edit')}
            </DropdownMenuItem>
          )}
        />
      ) : (
        <>
          <SidePanelBody>
            {booking ? (
              <div className="rounded-2xl border border-table-reserved bg-table-reserved-soft p-4">
                <div className="mb-1.5 flex items-center gap-2 text-table-reserved">
                  <CalendarCheck size={18} />
                  <span className="text-base font-semibold">{booking.name}</span>
                </div>
                <p className="text-sm text-table-reserved">
                  <Ltr>
                    {booking.booked_time ? `${booking.booked_time} · ` : ''}
                    {tTables('reservationGuestsShort', { count: booking.guests })}
                    {booking.phone ? ` · ${booking.phone}` : ''}
                  </Ltr>
                </p>
                {booking.notes && <p className="mt-1 text-sm text-table-reserved">{booking.notes}</p>}
                {/* What happens to the booking, kept with the booking. A party
                    that asks for another table is an everyday thing, so moving
                    it comes first, and none of these touch the table itself. */}
                <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button type="button" variant="outline" size="touch" onClick={onMoveBooking} disabled={saving}>
                    <ArrowLeftRight /> {tTables('moveBooking')}
                  </Button>
                  <Button type="button" variant="outline" size="touch" onClick={unassignBooking} disabled={saving}>
                    <Undo2 /> {tTables('unassignBooking')}
                  </Button>
                  <Button type="button" variant="outline" size="touch" onClick={onReserve} disabled={saving}>
                    <Pencil /> {tTables('editReservation')}
                  </Button>
                  <Button type="button" variant="outline" size="touch" onClick={cancelReservation} disabled={saving} className="text-table-occupied">
                    {tTables('cancelReservation')}
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState className="py-12" icon={<ClipboardList />} title={tTables('noActiveOrders')} />
            )}
          </SidePanelBody>
          <SidePanelFooter className="flex-wrap">
            {/* A table with nobody's order on it: the one thing the floor wants
                from it is to start one. */}
            <Button type="button" size="touch-lg" onClick={takeOrder} disabled={saving} className="flex-1">
              <Plus /> {tTables('takeOrder')}
            </Button>
            {/* Only offered when the status has drifted: a table that is genuinely
                working or being held has its own actions above. */}
            {table.status !== 'available' && !booking && (
              <Button type="button" variant="outline" size="touch-lg" onClick={() => setStatus('available')} disabled={saving}>
                {tTables('markAvailable')}
              </Button>
            )}
            {table.status === 'available' && (
              <Button type="button" variant="outline" size="touch-lg" onClick={onReserve} disabled={saving}>
                <CalendarCheck /> {tTables('reserve')}
              </Button>
            )}
            <Button type="button" variant="outline" size="touch-lg" onClick={onEdit} disabled={saving}>
              <Pencil /> {tTables('edit')}
            </Button>
          </SidePanelFooter>
        </>
      )}
      {ConfirmDialog}
    </SidePanel>
  );
}
