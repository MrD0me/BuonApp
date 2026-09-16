'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Pencil, CalendarCheck, Link2, Unlink, Plus, ClipboardList } from 'lucide-react';
import type { Room, Table, Order } from '@/lib/types';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';
import { TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n-enums';
import { TABLE_STATUS_TONE } from '@/lib/status-styles';
import { pendingDishCount } from '@/lib/kot';
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
 * the table is where its order is worked — and the table's own actions
 * (edit, split, reserve) go behind the panel's "more" menu. Without one, the
 * panel offers the one thing the floor wants from a free table: an order.
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
  const tOrders = useTranslations('orders');
  const t = useTranslations('serverApp');
  const router = useRouter();
  const cartStore = useCartStore();
  const { confirm, ConfirmDialog } = useConfirm();
  const [saving, setSaving] = useState(false);

  const booking = table.reservation ?? null;
  const groupSeats = table.capacity + groupMembers.reduce((sum, member) => sum + member.capacity, 0);
  const tone = TABLE_STATUS_TONE[table.status] ?? 'free';
  const pending = order ? pendingDishCount(order.items || []) : 0;

  /**
   * Opens a first order on this table. The composing happens on the ordering
   * screen, which is the only one with the catalogue and the add-on choices —
   * this side just says which table it is for.
   */
  const takeOrder = async () => {
    if (cartStore.items.length > 0) {
      const proceed = await confirm(tOrders('cartClearConfirm'));
      if (!proceed) return;
      cartStore.clearCart();
    }
    router.push(`/pos?table=${table.id}`);
  };

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

  const description = [
    room?.name,
    tTables('capacitySeats', { count: groupMembers.length > 0 ? groupSeats : table.capacity }),
    groupMembers.length > 0 ? tTables('joinedWith', { names: groupMembers.map((member) => member.name).join(', ') }) : null,
  ].filter(Boolean).join(' · ');

  /* What happens to the table itself, as opposed to its order. */
  const tableMenu = (
    <>
      {groupMembers.length > 0 && (
        <DropdownMenuItem onClick={splitGroup} disabled={saving}>
          <Unlink className="me-2" /> {tTables('splitTables')}
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onClick={onEdit} disabled={saving}>
        <Pencil className="me-2" /> {tTables('edit')}
      </DropdownMenuItem>
    </>
  );

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
          extraMenu={tableMenu}
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
              </div>
            ) : (
              <EmptyState className="py-12" icon={<ClipboardList />} title={tTables('noActiveOrders')} />
            )}
          </SidePanelBody>
          <SidePanelFooter className="flex-wrap">
            {/* A table with nobody's order on it: the one thing the floor wants
                from it is to start one. A table folded into a group is not
                seated on its own, so its party goes on the leader. */}
            {!table.merged_into && (
              <Button type="button" size="touch-lg" onClick={takeOrder} disabled={saving} className="flex-1">
                <Plus /> {tTables('takeOrder')}
              </Button>
            )}
            {/* Only offered when the status has drifted: a table that is genuinely
                working or being held has its own actions below. */}
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
            {booking && (
              <>
                <Button type="button" variant="outline" size="touch-lg" onClick={onReserve} disabled={saving}>
                  <Pencil /> {tTables('editReservation')}
                </Button>
                <Button type="button" variant="outline" size="touch-lg" onClick={cancelReservation} disabled={saving} className="text-table-occupied">
                  {tTables('cancelReservation')}
                </Button>
              </>
            )}
            {groupMembers.length > 0 ? (
              <Button type="button" variant="outline" size="touch-lg" onClick={splitGroup} disabled={saving}>
                <Unlink /> {tTables('splitTables')}
              </Button>
            ) : !table.merged_into && (
              <Button type="button" variant="outline" size="touch-lg" onClick={onMerge} disabled={saving}>
                <Link2 /> {tTables('mergeTables')}
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
