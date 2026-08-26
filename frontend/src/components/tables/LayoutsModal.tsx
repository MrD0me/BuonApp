'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Trash2, Save } from 'lucide-react';
import type { TableLayout } from '@/lib/types';
import { useTranslations } from 'use-intl';

/**
 * Saved floor plans (phase 4 of docs/table-management.md).
 *
 * A room emptied at the end of every service has to be built again at the start
 * of the next one. A plan is that work done once: save the floor under a name,
 * put it back in one action.
 */

interface LayoutsModalProps {
  onClose: () => void;
  /** Called after a plan is applied, since every table on the map is new. */
  onApplied: () => void;
}

export function LayoutsModal({ onClose, onApplied }: LayoutsModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');

  const [layouts, setLayouts] = useState<TableLayout[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api.get('/table-layouts')
    .then(({ data }) => setLayouts(data.layouts || []))
    .catch(() => toast.error(tTables('layoutsLoadFailed')))
    .finally(() => setLoading(false)),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post('/table-layouts', { name: name.trim() });
      toast.success(data.replaced ? tTables('layoutReplaced', { name: name.trim() }) : tTables('layoutSaved', { name: name.trim() }));
      setName('');
      load();
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'layout_empty' ? tTables('layoutEmpty') : tTables('layoutSaveFailed'));
    } finally {
      setBusy(false);
    }
  };

  const handleApply = async (layout: TableLayout) => {
    setBusy(true);
    try {
      const { data } = await api.post(`/table-layouts/${layout.id}/apply`);
      toast.success(tTables('layoutApplied', { name: layout.name, count: data.tablesCreated }));
      onApplied();
      onClose();
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { code?: string; blockers?: { number: string }[] } } })?.response?.data;
      // Naming the tables in the way is the difference between "it failed" and
      // knowing which two checks to close first.
      toast.error(response?.code === 'layout_apply_blocked'
        ? tTables('layoutBlocked', { tables: (response.blockers || []).map((b) => b.number).join(', ') })
        : tTables('layoutApplyFailed'));
      setBusy(false);
    }
  };

  const handleDelete = async (layout: TableLayout) => {
    setBusy(true);
    try {
      await api.delete(`/table-layouts/${layout.id}`);
      toast.success(tTables('layoutDeleted', { name: layout.name }));
      load();
    } catch {
      toast.error(tTables('layoutDeleteFailed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-1">
          <h2 className="text-lg font-bold">{tTables('layouts')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-4">{tTables('layoutsHint')}</p>

        <form onSubmit={handleSave} className="flex gap-2 mb-5">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            placeholder={tTables('layoutNamePlaceholder')}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          <Button type="submit" disabled={busy || !name.trim()}>
            <Save size={15} className="me-1" /> {tCommon('save')}
          </Button>
        </form>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 border-4 border-brand border-t-transparent rounded-full animate-spin" />
          </div>
        ) : layouts.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">{tTables('noLayouts')}</p>
        ) : (
          <div className="space-y-2">
            {layouts.map((layout) => (
              <div key={layout.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-200">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate">{layout.name}</p>
                  <p className="text-xs text-gray-500">{tTables('layoutSize', { rooms: layout.rooms, tables: layout.tables })}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => handleApply(layout)} disabled={busy}>
                  {tTables('applyLayout')}
                </Button>
                <button type="button" onClick={() => handleDelete(layout)} disabled={busy}
                  className="p-1.5 text-red-500 hover:text-red-700" title={tCommon('delete')}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
