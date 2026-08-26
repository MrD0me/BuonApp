'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Search, UserPlus } from 'lucide-react';
import type { Table, Customer } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { usePosSettingsStore } from '@/store/pos-settings';
import { countryName } from '@/lib/countries';
import { parsePhone, dialCodeFor } from '@/lib/phone';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';

/**
 * Booking a table for tonight (phase 4 of docs/table-management.md).
 *
 * A name and a head count are all the floor needs, so those are the only
 * required fields. The time and the phone are there for the places that want
 * them. Linking a real customer is optional and only worth it when the guest is
 * already in the book — it lets the POS carry them onto the order.
 */

interface ReserveModalProps {
  table: Table;
  onClose: () => void;
  onDone: () => void;
}

export function ReserveModal({ table, onClose, onDone }: ReserveModalProps) {
  const { currentTenant } = useAuthStore();
  const customersEnabled = usePosSettingsStore((state) => state.customersEnabled);
  const tTables = useTranslations('tables');
  const tPos = useTranslations('pos');
  const tCommon = useTranslations('common');
  const tSettings = useTranslations('settings');
  const tProducts = useTranslations('products');
  const dialCode = dialCodeFor(currentTenant?.country ?? 'IN') || '+91';

  const booking = table.reservation ?? null;
  const isEdit = booking !== null;

  const [form, setForm] = useState({
    name: booking?.name ?? '',
    guests: String(booking?.guests ?? table.capacity ?? 2),
    bookedTime: booking?.booked_time ?? '',
    phone: booking?.phone ?? '',
    notes: booking?.notes ?? '',
  });
  const [customerId, setCustomerId] = useState<string | null>(booking?.customer_id ?? null);

  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const searchCustomers = (value: string) => {
    if (value.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/customers-search?q=${encodeURIComponent(value)}`);
        // The endpoint answers with a bare array; older callers also accepted
        // a `{ customers }` envelope, so keep taking both.
        setResults(Array.isArray(data) ? data : (data.customers || []));
      } catch { setResults([]); }
    }, 300);
  };

  /** Picking a guest fills the booking in; the fields stay editable after. */
  const linkCustomer = (customer: Customer) => {
    setCustomerId(String(customer.id));
    setForm((previous) => ({
      ...previous,
      name: previous.name.trim() || customer.name,
      phone: previous.phone.trim() || customer.phone || '',
    }));
    setQuery('');
    setResults([]);
    setShowCustomerSearch(false);
  };

  const handleCreateCustomer = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const country = currentTenant?.country ?? 'IN';
    const parsed = parsePhone(newPhone, country);
    if (!parsed) {
      toast.error(tPos('invalidPhone', { country: countryName(country) }));
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/customers', { name: newName, phone: parsed.e164, country_code: parsed.countryCode });
      linkCustomer(data.customer);
      setShowCreate(false);
      toast.success(tPos('customerCreated'));
    } catch {
      toast.error(tPos('createCustomerFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const guests = Number(form.guests);
    if (!Number.isInteger(guests) || guests < 1 || guests > 99) {
      toast.error(tTables('capacityRange'));
      return;
    }
    setSaving(true);
    try {
      await api.post(`/tables/${table.id}/reserve`, {
        name: form.name.trim(),
        guests,
        booked_time: form.bookedTime || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
        customer_id: customerId,
      });
      toast.success(tTables('reservedFor', { name: table.name, customer: form.name.trim() }));
      onDone();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(
        code === 'reservation_name_required' ? tTables('reservationNameRequired')
          : code === 'reservation_time_invalid' ? tTables('reservationTimeInvalid')
            : code === 'table_has_open_order' ? tTables('reservationBlockedByOrder')
              : tTables('tableReserveFailed'),
      );
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{tTables('reserveTable')} · {table.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tTables('reservationName')}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tTables('reservationGuests')}</label>
              <input type="number" min="1" max="99" value={form.guests} required
                onChange={(e) => setForm({ ...form, guests: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tTables('reservationTime')} <span className="text-gray-400 font-normal">({tCommon('optional')})</span>
              </label>
              <input type="time" value={form.bookedTime} onChange={(e) => setForm({ ...form, bookedTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTables('reservationPhone')} <span className="text-gray-400 font-normal">({tCommon('optional')})</span>
            </label>
            <input type="tel" inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder={`${dialCode} …`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTables('reservationNotes')} <span className="text-gray-400 font-normal">({tCommon('optional')})</span>
            </label>
            <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>

          {/* Linking a guest already in the book is a convenience, never a step,
              and there is no book to link to when it is switched off. */}
          {!customersEnabled ? null : customerId ? (
            <div className="flex items-center justify-between px-3 py-2 bg-brand-light rounded-xl">
              <p className="text-sm text-brand font-medium">{tTables('linkCustomer')}</p>
              <button type="button" onClick={() => setCustomerId(null)} className="text-brand hover:text-brand-hover">
                <X size={14} />
              </button>
            </div>
          ) : !showCustomerSearch ? (
            <button type="button" onClick={() => setShowCustomerSearch(true)}
              className="flex items-center gap-1.5 text-sm text-brand font-medium hover:text-brand-hover">
              <Search size={14} /> {tTables('linkCustomer')}
            </button>
          ) : (
            <div className="border border-gray-200 rounded-xl p-3 space-y-2">
              <div className="relative">
                <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={query} placeholder={tTables('searchCustomerPlaceholder')}
                  onChange={(e) => { setQuery(e.target.value); searchCustomers(e.target.value); }}
                  className="w-full ps-8 pe-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand outline-none" />
              </div>
              {results.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden max-h-36 overflow-y-auto">
                  {results.map((customer) => (
                    <button key={customer.id} type="button" onClick={() => linkCustomer(customer)}
                      className="w-full text-start px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                      <span className="font-medium">{customer.name}</span>
                      <span className="text-gray-400 ms-2 text-xs"><Ltr>{customer.phone}</Ltr></span>
                    </button>
                  ))}
                </div>
              )}
              {!showCreate ? (
                <button type="button" onClick={() => { setShowCreate(true); if (/^\d+$/.test(query.trim())) setNewPhone(query.trim()); }}
                  className="flex items-center gap-1.5 text-sm text-brand font-medium hover:text-brand-hover">
                  <UserPlus size={14} /> {tTables('newCustomer')}
                </button>
              ) : (
                <div className="space-y-2">
                  <input type="text" placeholder={tProducts('nameLabel')} value={newName} onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-brand" />
                  <input type="tel" inputMode="numeric" placeholder={`${dialCode} ${tSettings('phone')}`} value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-brand" />
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setShowCreate(false)}
                      className="flex-1 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">{tTables('cancel')}</button>
                    <button type="button" onClick={handleCreateCustomer} disabled={creating || !newName.trim() || !newPhone.trim()}
                      className="flex-1 py-1.5 text-sm bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                      {creating ? tTables('creating') : tTables('create')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
              {tTables('cancel')}
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? tTables('reserving') : (isEdit ? tCommon('save') : tTables('reserveTable'))}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
