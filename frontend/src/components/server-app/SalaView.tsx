'use client';

import { useTranslations } from 'use-intl';
import type { Order, Room, Table } from '@/lib/types';
import { EmptyState } from '@/components/ui/empty-state';
import { TableTile } from './TableTile';

/** The key the "no room" tab goes under, so it can never collide with a real room id. */
export const ORPHAN_ROOM = '__orphan__';

export interface RoomTab {
  id: string;
  name: string;
  tables: Table[];
}

/** "Tav 2" before "Tav 10": people number tables, and the list should count the way they do. */
const byName = (left: Table, right: Table) =>
  left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: 'base' });

/**
 * The rooms as tabs, each with its live tables in natural order, plus one for
 * tables that belong to no room. Shared with the shell, which draws the tabs
 * in its header.
 */
export function roomTabs(rooms: Room[], orphanTables: Table[], orphanLabel: string): RoomTab[] {
  const tabs: RoomTab[] = [...rooms]
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((room) => ({
      id: room.id,
      name: room.name,
      tables: (room.tables || []).filter((table) => table.is_active !== false).sort(byName),
    }));
  const liveOrphans = orphanTables.filter((table) => table.is_active !== false).sort(byName);
  if (liveOrphans.length > 0) tabs.push({ id: ORPHAN_ROOM, name: orphanLabel, tables: liveOrphans });
  return tabs;
}

interface Props {
  tab: RoomTab | null;
  orderByTableId: Map<string, Order>;
  onSelectTable: (table: Table) => void;
}

/**
 * The dining room as a list: one tile per table of the room on show.
 *
 * Not the map. On a six-inch screen a room drawn to scale shrinks to half and
 * scrolls sideways, and what a waiter needs from the floor is not where a
 * table stands — they are standing next to it — but which ones have a round
 * waiting and how long each party has been sitting.
 */
export function SalaView({ tab, orderByTableId, onSelectTable }: Props) {
  const tTables = useTranslations('tables');

  if (!tab) {
    return <EmptyState title={tTables('noRooms')} />;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {tab.tables.map((table) => (
        <TableTile
          key={table.id}
          table={table}
          order={orderByTableId.get(table.id) || null}
          onClick={() => onSelectTable(table)}
        />
      ))}
    </div>
  );
}
