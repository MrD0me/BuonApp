'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { Plus, X, UserX, RotateCcw, CalendarClock } from 'lucide-react';
import type { Reservation, Table, ServiceDay } from '@/lib/types';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';

/**
 * The day's booking sheet (see docs/table-management.md).
 *
 * The floor takes the bookings down first and decides who sits where second, so
 * a booking with no table is the normal starting state rather than something
 * half-finished. Entry is a single row rather than a dialog: fifteen bookings
 * off a paper list should be fifteen lines of typing, not fifteen modals.
 */

const STATUS_STYLES: Record<string, string> = {
  booked: 'bg-amber-100 text-amber-800',
  seated: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-500',
  no_show: 'bg-red-100 text-red-700',
  expired: 'bg-gray-100 text-gray-500',
};

const STATUS_LABEL_KEYS = {
  booked: 'statusBooked',
  seated: 'statusSeated',
  cancelled: 'statusCancelled',
  no_show: 'statusNoShow',
  expired: 'statusExpired',
} as const;

interface BookingRowProps {
  booking: Reservation;
  tables: Table[];
  /** Which booking currently holds each table, so the picker can warn about a swap. */
  holderByTable: Map<string, Reservation>;
  busy: boolean;
  onAssign: (booking: Reservation, tableId: string | null) => void;
  onAction: (booking: Reservation, action: 'cancel' | 'no-show' | 'reopen') => void;
  onEdit: (booking: Reservation) => void;
}

function BookingRow({ booking, tables, holderByTable, busy, onAssign, onAction, onEdit }: BookingRowProps) {
  const t = useTranslations('reservations');
  const tCommon = useTranslations('common');
  const pending = booking.status === 'booked';

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 border-t border-gray-50 ${
      pending && !booking.table_id ? 'bg-amber-50/40' : ''
    }`}>
      <span className="w-14 text-sm font-medium text-gray-700 tabular-nums">
        <Ltr>{booking.booked_time || '—'}</Ltr>
      </span>

      <div className="flex-1 min-w-[8rem]">
        <p className="font-medium text-gray-900 truncate">{booking.name}</p>
        {booking.phone && <p className="text-xs text-gray-400"><Ltr>{booking.phone}</Ltr></p>}
        {booking.notes && <p className="text-xs text-gray-500 truncate">{booking.notes}</p>}
      </div>

      <span className="text-sm text-gray-600 whitespace-nowrap">
        <Ltr>{t('guestsShort', { count: booking.guests })}</Ltr>
      </span>

      {pending ? (
        <select
          value={booking.table_id ?? ''}
          disabled={busy}
          onChange={(event) => onAssign(booking, event.target.value || null)}
          className={`px-2 py-1.5 text-sm rounded-lg border-2 outline-none focus:ring-2 focus:ring-brand bg-white ${
            booking.table_id ? 'border-gray-200 text-gray-800' : 'border-amber-300 text-amber-800'
          }`}
        >
          <option value="">{t('unassigned')}</option>
          {tables.map((table) => {
            const holder = holderByTable.get(table.id);
            const takenByOther = holder && holder.id !== booking.id;
            return (
              <option key={table.id} value={table.id}>
                {table.name}
                {` · ${t('seatsShort', { count: table.capacity })}`}
                {takenByOther ? ` · ${holder!.name}` : ''}
              </option>
            );
          })}
        </select>
      ) : (
        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLES[booking.status] || STATUS_STYLES.cancelled}`}>
          {t(STATUS_LABEL_KEYS[booking.status])}
        </span>
      )}

      <div className="flex items-center gap-1">
        {pending && (
          <>
            <button onClick={() => onEdit(booking)} disabled={busy}
              className="px-2 py-1 text-xs text-gray-600 hover:text-gray-900">{tCommon('edit')}</button>
            <button onClick={() => onAction(booking, 'no-show')} disabled={busy}
              className="p-1.5 text-gray-400 hover:text-red-600" title={t('noShow')}>
              <UserX size={15} />
            </button>
            <button onClick={() => onAction(booking, 'cancel')} disabled={busy}
              className="p-1.5 text-gray-400 hover:text-red-600" title={tCommon('cancel')}>
              <X size={15} />
            </button>
          </>
        )}
        {booking.status === 'seated' && (
          <button onClick={() => onAction(booking, 'reopen')} disabled={busy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 hover:text-gray-900" title={t('reopenHint')}>
            <RotateCcw size={13} /> {t('reopen')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ReservationsPage() {
  const t = useTranslations('reservations');

  const [day, setDay] = useState<ServiceDay | null>(null);
  const [bookings, setBookings] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({ time: '', name: '', guests: '2' });
  const [editing, setEditing] = useState<Reservation | null>(null);

  const load = useCallback(() => Promise.all([
    api.get('/reservations'),
    api.get('/tables'),
  ])
    .then(([sheet, tableList]) => {
      setDay(sheet.data.day ?? null);
      setBookings(sheet.data.reservations || []);
      // A table folded into a group is not seated on its own, so it is not
      // something a booking can be put on.
      setTables((tableList.data.tables || []).filter((table: Table) => !table.merged_into));
    })
    .catch(() => toast.error(t('loadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const holderByTable = new Map<string, Reservation>();
  for (const booking of bookings) {
    if (booking.status === 'booked' && booking.table_id) holderByTable.set(booking.table_id, booking);
  }

  const pending = bookings.filter((booking) => booking.status === 'booked');
  const unassigned = pending.filter((booking) => !booking.table_id).length;
  const covers = pending.reduce((sum, booking) => sum + booking.guests, 0);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    const guests = Number(draft.guests);
    if (!draft.name.trim() || !Number.isInteger(guests) || guests < 1) {
      toast.error(t('addInvalid'));
      return;
    }
    setBusy(true);
    try {
      await api.post('/reservations', {
        name: draft.name.trim(),
        guests,
        booked_time: draft.time || null,
      });
      setDraft({ time: draft.time, name: '', guests: '2' });
      load();
    } catch {
      toast.error(t('addFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleAssign = async (booking: Reservation, tableId: string | null) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/reservations/${booking.id}/assign`, { table_id: tableId });
      // Saying who moved is the difference between a swap that looks like a bug
      // and one the floor can follow.
      if (data.displaced) toast.success(t('swapped', { a: booking.name, b: data.displaced.name }));
      else if (tableId) toast.success(t('assigned', { name: booking.name }));
      else toast.success(t('unassignedDone', { name: booking.name }));
      load();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { code?: string } } })?.response?.data;
      toast.error(
        data?.code === 'table_has_open_order' ? t('tableWorking')
          : data?.code === 'table_is_merged' ? t('tableMerged')
            : data?.code === 'reservation_not_pending' ? t('notPending')
              : t('assignFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  const handleAction = async (booking: Reservation, action: 'cancel' | 'no-show' | 'reopen') => {
    setBusy(true);
    try {
      await api.post(`/reservations/${booking.id}/${action}`);
      toast.success(t(action === 'cancel' ? 'cancelled' : action === 'no-show' ? 'markedNoShow' : 'reopened'));
      load();
    } catch {
      toast.error(t('actionFailed'));
    } finally {
      setBusy(false);
    }
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
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        {day && (
          <p className="text-sm text-gray-500">
            <Ltr>
              {t('summary', { bookings: pending.length, covers })}
              {unassigned > 0 ? ` · ${t('unassignedCount', { count: unassigned })}` : ''}
            </Ltr>
          </p>
        )}
      </div>

      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-2 mb-5 bg-white rounded-xl border border-gray-100 p-3">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('time')}</label>
          <input type="time" value={draft.time} onChange={(e) => setDraft({ ...draft, time: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div className="flex-1 min-w-[10rem]">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('name')}</label>
          <input type="text" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t('namePlaceholder')} required
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <div className="w-24">
          <label className="block text-xs font-medium text-gray-500 mb-1">{t('guests')}</label>
          <input type="number" min="1" max="99" value={draft.guests} onChange={(e) => setDraft({ ...draft, guests: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
        </div>
        <Button type="submit" disabled={busy}>
          <Plus size={16} className="me-1" /> {t('add')}
        </Button>
      </form>

      {bookings.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-10 text-center">
          <CalendarClock size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="font-medium text-gray-700">{t('noBookings')}</p>
          <p className="text-sm text-gray-500 mt-1">{t('noBookingsHint')}</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          {bookings.map((booking) => (
            <BookingRow
              key={booking.id}
              booking={booking}
              tables={tables}
              holderByTable={holderByTable}
              busy={busy}
              onAssign={handleAssign}
              onAction={handleAction}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {editing && (
        <EditBookingModal
          booking={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

interface EditBookingModalProps {
  booking: Reservation;
  onClose: () => void;
  onSaved: () => void;
}

function EditBookingModal({ booking, onClose, onSaved }: EditBookingModalProps) {
  const t = useTranslations('reservations');
  const tCommon = useTranslations('common');
  const [form, setForm] = useState({
    name: booking.name,
    guests: String(booking.guests),
    time: booking.booked_time ?? '',
    phone: booking.phone ?? '',
    notes: booking.notes ?? '',
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await api.patch(`/reservations/${booking.id}`, {
        name: form.name.trim(),
        guests: Number(form.guests),
        booked_time: form.time || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      });
      toast.success(t('updated'));
      onSaved();
    } catch {
      toast.error(t('updateFailed'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{t('editBooking')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('name')}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('guests')}</label>
              <input type="number" min="1" max="99" value={form.guests} required
                onChange={(e) => setForm({ ...form, guests: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('time')}</label>
              <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('phone')} <span className="text-gray-400 font-normal">({tCommon('optional')})</span>
            </label>
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('notes')} <span className="text-gray-400 font-normal">({tCommon('optional')})</span>
            </label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? tCommon('saving') : tCommon('save')}
          </Button>
        </form>
      </div>
    </div>
  );
}
