'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Trash2 } from 'lucide-react';
import type { Room, Table, TableShape } from '@/lib/types';
import { useTranslations } from 'use-intl';

/**
 * Creating and editing a table (phases 1 and 2 of docs/table-management.md).
 *
 * Size is offered as presets rather than two number fields: a room that gets
 * rearranged every day is no place to type pixel dimensions, and the presets
 * mirror the sizes the backend derives from seat count in
 * `main/lib/table-geometry.ts`.
 */

type SizeKey = 'small' | 'medium' | 'large' | 'banquet';

const SIZE_PRESETS: Record<SizeKey, { rect: [number, number]; round: number }> = {
  small: { rect: [110, 110], round: 110 },
  medium: { rect: [150, 110], round: 140 },
  large: { rect: [190, 120], round: 170 },
  banquet: { rect: [280, 150], round: 200 },
};
const SIZE_KEYS: SizeKey[] = ['small', 'medium', 'large', 'banquet'];

const SIZE_LABEL_KEYS = {
  small: 'sizeSmall',
  medium: 'sizeMedium',
  large: 'sizeLarge',
  banquet: 'sizeBanquet',
} as const;

function dimensionsFor(size: SizeKey, shape: TableShape): { width: number; height: number } {
  const preset = SIZE_PRESETS[size];
  if (shape === 'round') return { width: preset.round, height: preset.round };
  return { width: preset.rect[0], height: preset.rect[1] };
}

/** Which preset a table is currently closest to, so editing starts where it is. */
function sizeOf(table: Table | null): SizeKey {
  if (!table?.width) return 'medium';
  const width = table.width;
  let best: SizeKey = 'medium';
  let bestGap = Infinity;
  for (const key of SIZE_KEYS) {
    const gap = Math.abs(dimensionsFor(key, table.shape || 'rect').width - width);
    if (gap < bestGap) {
      bestGap = gap;
      best = key;
    }
  }
  return best;
}

/** The preset that suits a seat count, so a table of ten is not drawn as a two-top. */
function sizeForCapacity(seats: number): SizeKey {
  if (seats <= 2) return 'small';
  if (seats <= 4) return 'medium';
  if (seats <= 8) return 'large';
  return 'banquet';
}

interface TableFormModalProps {
  /** null = create a new table, otherwise edit this one. */
  table: Table | null;
  rooms: Room[];
  /** Room a newly created table joins. */
  defaultRoomId: string | null;
  onClose: () => void;
  onSaved: () => void;
  /** Offered only when editing; the page owns the confirmation. */
  onDelete?: () => void;
}

export function TableFormModal({ table, rooms, defaultRoomId, onClose, onSaved, onDelete }: TableFormModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');
  const isEdit = table !== null;

  const [form, setForm] = useState({
    name: table?.name ?? '',
    capacity: String(table?.capacity ?? 4),
    roomId: table?.room_id ?? defaultRoomId ?? rooms[0]?.id ?? '',
    shape: (table?.shape ?? 'rect') as TableShape,
    size: sizeOf(table),
    section: table?.section ?? '',
  });
  const [saving, setSaving] = useState(false);

  /** Seats drive the size until someone picks one deliberately. */
  const handleCapacity = (value: string) => {
    const seats = Number(value);
    setForm((prev) => ({
      ...prev,
      capacity: value,
      size: Number.isFinite(seats) && seats > 0 ? sizeForCapacity(seats) : prev.size,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const capacity = Number(form.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 99) {
      toast.error(tTables('capacityRange'));
      return;
    }
    setSaving(true);
    const dimensions = dimensionsFor(form.size, form.shape);
    const payload = {
      name: form.name.trim(),
      capacity,
      room_id: form.roomId || null,
      shape: form.shape,
      section: form.section.trim(),
      ...dimensions,
    };
    try {
      if (isEdit) {
        await api.put(`/tables/${table.id}`, payload);
        toast.success(tTables('tableUpdated'));
      } else {
        await api.post('/tables', payload);
        toast.success(tTables('tableCreated'));
      }
      onSaved();
    } catch {
      toast.error(isEdit ? tTables('tableUpdateFailed') : tTables('tableCreateFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{isEdit ? tTables('edit') : tTables('add')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tTables('tableName')}</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={tTables('tableNamePlaceholder')} required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tTables('capacity')}</label>
              <input type="number" min="1" max="99" value={form.capacity} onChange={(e) => handleCapacity(e.target.value)} required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{tTables('room')}</label>
              <select value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand bg-white">
                {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{tTables('shape')}</span>
            <div className="grid grid-cols-2 gap-2">
              {(['rect', 'round'] as TableShape[]).map((shape) => (
                <button key={shape} type="button" onClick={() => setForm({ ...form, shape })}
                  className={`px-3 py-2 text-sm rounded-lg border-2 transition-colors ${
                    form.shape === shape ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {tTables(shape === 'rect' ? 'shapeRect' : 'shapeRound')}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{tTables('size')}</span>
            <div className="grid grid-cols-4 gap-2">
              {SIZE_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => setForm({ ...form, size: key })}
                  className={`px-1 py-2 text-xs rounded-lg border-2 transition-colors ${
                    form.size === key ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {tTables(SIZE_LABEL_KEYS[key])}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {tTables('section')} <span className="text-gray-400 font-normal">({tCommon('optional')})</span>
            </label>
            <input type="text" value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <Button type="submit" className="w-full" disabled={saving || rooms.length === 0}>
            {saving ? tCommon('saving') : (isEdit ? tCommon('save') : tTables('createTable'))}
          </Button>

          {isEdit && onDelete && (
            <button type="button" onClick={onDelete} disabled={saving}
              className="w-full flex items-center justify-center gap-1.5 text-sm text-red-600 hover:text-red-700 pt-1">
              <Trash2 size={14} /> {tTables('deleteTable')}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

interface DeleteTableModalProps {
  table: Table;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteTableModal({ table, onClose, onDeleted }: DeleteTableModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/tables/${table.id}`);
      toast.success(tTables('tableDeleted', { name: table.name }));
      onDeleted();
    } catch (error: unknown) {
      // The backend refuses to delete a table anything live still points at,
      // and says which case it hit so the message can be actionable.
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(
        code === 'table_has_open_order' ? tTables('deleteBlockedOpenOrder')
          : code === 'table_has_held_cart' ? tTables('deleteBlockedHeldCart')
            : tTables('tableDeleteFailed'),
      );
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{tTables('deleteTable')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-2">{tTables('deleteConfirm', { name: table.name })}</p>
        <p className="text-xs text-gray-500 mb-5">{tTables('deleteExplain')}</p>
        <div className="flex gap-3">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={deleting}>
            {tCommon('cancel')}
          </Button>
          <Button type="button" variant="destructive" className="flex-1" onClick={handleDelete} disabled={deleting}>
            {tCommon('delete')}
          </Button>
        </div>
      </div>
    </div>
  );
}
