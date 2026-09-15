'use client';

import { useTranslations } from 'use-intl';
import type { Order, Room, Table } from '@/lib/types';
import { TableTile } from './TableTile';

interface Props {
  rooms: Room[];
  orphanTables: Table[];
  orderByTableId: Map<string, Order>;
  selectedRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onSelectTable: (table: Table) => void;
}

/** The key the "no room" tab goes under, so it can never collide with a real room id. */
export const ORPHAN_ROOM = '__orphan__';

/**
 * The dining room as a list: one tab per room, one tile per table.
 *
 * Not the map. On a six-inch screen a room drawn to scale shrinks to half and
 * scrolls sideways, and what a waiter needs from the floor is not where a
 * table stands — they are standing next to it — but which ones have a round
 * waiting and how long each party has been sitting.
 */
export function SalaView({ rooms, orphanTables, orderByTableId, selectedRoomId, onSelectRoom, onSelectTable }: Props) {
  const t = useTranslations('serverApp');
  const tTables = useTranslations('tables');
  const sortedRooms = [...rooms].sort((left, right) => left.sort_order - right.sort_order);
  const tabs: { id: string; name: string; tables: Table[] }[] = sortedRooms.map((room) => ({
    id: room.id,
    name: room.name,
    tables: (room.tables || []).filter((table) => table.is_active !== false),
  }));
  const liveOrphans = orphanTables.filter((table) => table.is_active !== false);
  if (liveOrphans.length > 0) tabs.push({ id: ORPHAN_ROOM, name: t('orphanTables'), tables: liveOrphans });

  if (tabs.length === 0) {
    return <p className="py-16 text-center text-sm text-gray-400">{tTables('noRooms')}</p>;
  }

  const active = tabs.find((tab) => tab.id === selectedRoomId) || tabs[0];

  return (
    <div className="space-y-3">
      {tabs.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onSelectRoom(tab.id)}
              className={`h-10 shrink-0 rounded-lg px-4 text-sm font-medium ${tab.id === active.id ? 'bg-brand text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {active.tables.map((table) => (
          <TableTile
            key={table.id}
            table={table}
            order={orderByTableId.get(table.id) || null}
            onClick={() => onSelectTable(table)}
          />
        ))}
      </div>
    </div>
  );
}
