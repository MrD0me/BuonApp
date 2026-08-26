'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X } from 'lucide-react';
import type { Room } from '@/lib/types';
import { useTranslations } from 'use-intl';

/**
 * Creating, resizing and deleting a dining room (phase 2 of
 * docs/table-management.md). Size is offered as presets because the numbers are
 * abstract map units — "how big is the room" is a judgement, not a measurement.
 */

type RoomSizeKey = 'small' | 'medium' | 'large';

const ROOM_SIZES: Record<RoomSizeKey, { width: number; height: number }> = {
  small: { width: 800, height: 600 },
  medium: { width: 1200, height: 800 },
  large: { width: 1800, height: 1100 },
};
const ROOM_SIZE_KEYS: RoomSizeKey[] = ['small', 'medium', 'large'];
const ROOM_SIZE_LABEL_KEYS = { small: 'roomSmall', medium: 'roomMedium', large: 'roomLarge' } as const;

function roomSizeOf(room: Room | null): RoomSizeKey {
  if (!room?.width) return 'medium';
  let best: RoomSizeKey = 'medium';
  let bestGap = Infinity;
  for (const key of ROOM_SIZE_KEYS) {
    const gap = Math.abs(ROOM_SIZES[key].width - room.width);
    if (gap < bestGap) {
      bestGap = gap;
      best = key;
    }
  }
  return best;
}

interface RoomFormModalProps {
  /** null = create a new room, otherwise edit this one. */
  room: Room | null;
  onClose: () => void;
  onSaved: (roomId?: string) => void;
}

export function RoomFormModal({ room, onClose, onSaved }: RoomFormModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');
  const isEdit = room !== null;

  const [name, setName] = useState(room?.name ?? '');
  const [size, setSize] = useState<RoomSizeKey>(roomSizeOf(room));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    const payload = { name: name.trim(), ...ROOM_SIZES[size] };
    try {
      if (isEdit) {
        await api.put(`/rooms/${room.id}`, payload);
        toast.success(tTables('roomUpdated'));
        onSaved(room.id);
      } else {
        const { data } = await api.post('/rooms', payload);
        toast.success(tTables('roomCreated'));
        onSaved(data.room?.id);
      }
    } catch (error: unknown) {
      const code = (error as { response?: { data?: { code?: string } } })?.response?.data?.code;
      toast.error(code === 'room_name_taken' ? tTables('roomNameTaken') : tTables('roomSaveFailed'));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{isEdit ? tTables('editRoom') : tTables('addRoom')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{tTables('roomName')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
              placeholder={tTables('roomNamePlaceholder')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-brand" />
          </div>

          <div>
            <span className="block text-sm font-medium text-gray-700 mb-1">{tTables('roomSize')}</span>
            <div className="grid grid-cols-3 gap-2">
              {ROOM_SIZE_KEYS.map((key) => (
                <button key={key} type="button" onClick={() => setSize(key)}
                  className={`px-2 py-2 text-xs rounded-lg border-2 transition-colors ${
                    size === key ? 'border-brand bg-brand-light text-brand font-medium' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}>
                  {tTables(ROOM_SIZE_LABEL_KEYS[key])}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">{tTables('roomSizeHint')}</p>
          </div>

          <Button type="submit" className="w-full" disabled={saving}>
            {saving ? tCommon('saving') : (isEdit ? tCommon('save') : tTables('createRoom'))}
          </Button>
        </form>
      </div>
    </div>
  );
}

interface DeleteRoomModalProps {
  room: Room;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteRoomModal({ room, onClose, onDeleted }: DeleteRoomModalProps) {
  const tTables = useTranslations('tables');
  const tCommon = useTranslations('common');
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await api.delete(`/rooms/${room.id}`);
      toast.success(tTables('roomDeleted', { name: room.name }));
      onDeleted();
    } catch (error: unknown) {
      const response = (error as { response?: { data?: { code?: string; tables?: number } } })?.response?.data;
      toast.error(response?.code === 'room_not_empty'
        ? tTables('roomNotEmpty', { count: response.tables ?? 0 })
        : tTables('roomDeleteFailed'));
      setDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{tTables('deleteRoom')}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <p className="text-sm text-gray-700 mb-5">{tTables('deleteRoomConfirm', { name: room.name })}</p>
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
