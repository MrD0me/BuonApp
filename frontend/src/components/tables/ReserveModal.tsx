'use client';

import { useState, useRef } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Search, UserPlus } from 'lucide-react';
import type { Table, Customer } from '@/lib/types';
import { useAuthStore } from '@/store/auth';
import { countryName } from '@/lib/countries';
import { parsePhone, dialCodeFor } from '@/lib/phone';
import { useTranslations } from 'use-intl';
import { Ltr } from '@/components/layout/Ltr';

interface ReserveModalProps {
  table: Table;
  onClose: () => void;
  onDone: () => void;
}

export function ReserveModal({ table, onClose, onDone }: ReserveModalProps) {
  const { currentTenant } = useAuthStore();
  const tTables = useTranslations('tables');
  const tPos = useTranslations('pos');
  const tNav = useTranslations('nav');
  const tSettings = useTranslations('settings');
  const tProducts = useTranslations('products');
  const dialCode = dialCodeFor(currentTenant?.country ?? 'IN') || '+91';
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);


  const searchCustomers = (q: string) => {
    if (q.length < 2) { setResults([]); return; }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get(`/customers-search?q=${encodeURIComponent(q)}`);
        setResults(data.customers || []);
      } catch { setResults([]); }
    }, 300);
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
      setSelected(data.customer);
      setShowCreate(false);
      setQuery('');
      setResults([]);
      toast.success(tPos('customerCreated'));
    } catch {
      toast.error(tPos('createCustomerFailed'));
    } finally {
      setCreating(false);
    }
  };

  const handleReserve = async () => {
    setSaving(true);
    try {
      await api.patch(`/tables/${table.id}/status`, {
        status: 'reserved',
        reservation_customer_id: selected?.id ?? null,
        reservation_customer_name: selected?.name ?? null,
        reservation_customer_phone: selected?.phone ?? null,
      });
      const msg = selected
        ? tTables('reservedFor', { name: table.name, customer: selected.name })
        : tTables('reservedNoCustomer', { name: table.name });
      toast.success(msg);
      onDone();
    } catch {
      toast.error(tTables('tableReserveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{tNav('tables')} · {table.name}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {selected ? (
          <div className="flex items-center justify-between px-3 py-2.5 bg-brand-light rounded-xl mb-4">
            <div>
              <p className="font-semibold text-brand text-sm">{selected.name}</p>
              <p className="text-xs text-brand/70"><Ltr>{selected.phone}</Ltr></p>
            </div>
            <button onClick={() => setSelected(null)} className="text-brand hover:text-brand-hover">
              <X size={14} />
            </button>
          </div>
        ) : (
          <div className="mb-4">
            <p className="text-sm text-gray-500 mb-2">{tTables('linkCustomer')}</p>
            <div className="relative mb-2">
              <Search size={14} className="absolute start-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); searchCustomers(e.target.value); }}
                placeholder={tTables('searchCustomerPlaceholder')}
                className="w-full ps-8 pe-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand outline-none"
              />
            </div>
            {results.length > 0 && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-2 max-h-36 overflow-y-auto">
                {results.map((c) => (
                  <button key={c.id} onClick={() => { setSelected(c); setQuery(''); setResults([]); }}
                    className="w-full text-start px-3 py-2 hover:bg-gray-50 text-sm border-b border-gray-50 last:border-0">
                    <span className="font-medium">{c.name}</span>
                    <span className="text-gray-400 ms-2 text-xs"><Ltr>{c.phone}</Ltr></span>
                  </button>
                ))}
              </div>
            )}
            {!showCreate ? (
              <button onClick={() => { setShowCreate(true); if (/^\d+$/.test(query.trim())) setNewPhone(query.trim()); }}
                className="flex items-center gap-1.5 text-sm text-brand font-medium hover:text-brand-hover">
                <UserPlus size={14} /> {tTables('newCustomer')}
              </button>
            ) : (
              <div className="space-y-2 border border-gray-200 rounded-xl p-3">
                <input type="text" placeholder={tProducts('nameLabel')} value={newName} onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-brand" />
                <div className="flex items-stretch gap-2">

                  <input type="tel" inputMode="numeric" placeholder={`${dialCode} ${tSettings('phone')}`} value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-1 focus:ring-brand" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setShowCreate(false)} className="flex-1 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50">{tTables('cancel')}</button>
                  <button onClick={handleCreateCustomer} disabled={creating || !newName.trim() || !newPhone.trim()}
                    className="flex-1 py-1.5 text-sm bg-brand text-white rounded-lg hover:opacity-90 disabled:opacity-50">
                    {creating ? tTables('creating') : tTables('create')}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">{tTables('cancel')}</Button>
          <Button onClick={handleReserve} disabled={saving} className="flex-1">
            {saving ? tTables('reserving') : tTables('reserveTable')}
          </Button>
        </div>
      </div>
    </div>
  );
}
