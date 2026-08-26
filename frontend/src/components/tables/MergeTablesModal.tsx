'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import type { Table } from '@/lib/types';
import { useTranslations } from 'use-intl';

/**
 * Pushing tables together for one party (phase 4 of docs/table-management.md).
 *
 * The table this was opened from leads the group and keeps the order; the ones
 * picked here are folded into it until they are split off again. Only idle
 * tables are offered, because anything with an order, a cart or a booking on it
 * has to be settled first — the backend refuses them anyway, and offering them
 * would only produce an error the user has to read.
 */

interface MergeTablesModalProps {
  leader: Table;
  /** Every table in the same room, leader included. */
  tables: Table[];
  onClose: () => void;
  onMerged: () => void;
}

export function MergeTablesModal({ leader, tables, onClose, onMerged }: MergeTablesModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');
  const [selected, setSelected] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const candidates = tables.filter((table) => (
    table.id !== leader.id
    && !table.merged_into
    && table.status === 'available'
    && !table.reservation
    && !table.activeOrder
  ));

  const toggle = (id: string) => {
    setSelected((current) => (current.includes(id) ? current.filter((row) => row !== id) : [...current, id]));
  };

  const seats = leader.capacity
    + candidates.filter((table) => selected.includes(table.id)).reduce((sum, table) => sum + table.capacity, 0);

  const handleMerge = async () => {
    setSaving(true);
    try {
      await api.post(`/tables/${leader.id}/merge`, { table_ids: selected });
      toast.success(tTables('tablesMerged', { name: leader.name, count: selected.length }));
      onMerged();
    } catch (error: unknown) {
      const data = (error as { response?: { data?: { error?: string; code?: string } } })?.response?.data;
      // The backend names the table that was in the way; that beats anything
      // generic this dialog could say.
      toast.error(data?.error || tTables('mergeFailed'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold">{tTables('mergeTables')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{tTables('mergeHint', { name: leader.name })}</p>

        {candidates.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{tTables('nothingToMerge')}</p>
        ) : (
          <div className="space-y-1.5 mb-4">
            {candidates.map((table) => (
              <label key={table.id}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border-2 cursor-pointer transition-colors ${
                  selected.includes(table.id) ? 'border-brand bg-brand-light' : 'border-gray-200 hover:border-gray-300'
                }`}>
                <input type="checkbox" checked={selected.includes(table.id)} onChange={() => toggle(table.id)}
                  className="w-4 h-4 rounded border-gray-300 text-brand focus:ring-brand" />
                <span className="flex-1 text-sm font-medium text-gray-800">{table.name}</span>
                <span className="text-xs text-gray-500">{tTables('capacitySeats', { count: table.capacity })}</span>
              </label>
            ))}
          </div>
        )}

        {selected.length > 0 && (
          <p className="text-sm text-gray-700 mb-4">{tTables('mergedSeats', { count: seats })}</p>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={saving}>
            {tCommon('cancel')}
          </Button>
          <Button type="button" className="flex-1" onClick={handleMerge} disabled={saving || selected.length === 0}>
            {tTables('mergeTables')}
          </Button>
        </div>
      </div>
    </div>
  );
}
