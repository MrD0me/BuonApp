'use client';

import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import toast from 'react-hot-toast';
import { X, Pencil } from 'lucide-react';
import type { Room, Table, Order, OrderItem } from '@/lib/types';
import { useTranslations, type AppConfig } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Ltr } from '@/components/layout/Ltr';
import { ORDER_STATUS_LABEL_KEYS, ITEM_STATUS_LABEL_KEYS, TABLE_STATUS_LABEL_KEYS } from '@/lib/i18n-enums';

/**
 * What a table is doing right now, opened by tapping it on the map in service
 * mode: its order, what the kitchen has done with each course, and the two
 * actions the floor actually takes — freeing a table and reserving one.
 */

type OrdersKey = keyof AppConfig['Messages']['orders'];

const itemStatusLabelKey = (status: OrderItem['status']): OrdersKey =>
  ITEM_STATUS_LABEL_KEYS[status] ?? 'itemStatusPending';

const itemStatusColors: Record<string, { bg: string; text: string; dot: string }> = {
  pending: { bg: 'bg-yellow-50', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  preparing: { bg: 'bg-blue-50', text: 'text-blue-700', dot: 'bg-blue-500' },
  ready: { bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
  served: { bg: 'bg-gray-50', text: 'text-gray-600', dot: 'bg-gray-400' },
};

interface TableDetailModalProps {
  table: Table;
  room: Room | null;
  order: Order | null;
  onClose: () => void;
  onChanged: () => void;
  onEdit: () => void;
  onReserve: () => void;
}

export function TableDetailModal({ table, room, order, onClose, onChanged, onEdit, onReserve }: TableDetailModalProps) {
  const tTables = useTranslations('tables');
  const tOrders = useTranslations('orders');
  const tCommon = useTranslations('common');
  const formatCurrency = useFormatCurrency();
  const [saving, setSaving] = useState(false);

  const setStatus = async (status: string) => {
    setSaving(true);
    try {
      await api.patch(`/tables/${table.id}/status`, { status });
      onChanged();
      onClose();
    } catch {
      toast.error(tTables('tableUpdateFailed'));
      setSaving(false);
    }
  };

  const items = (order?.items || []).filter((item) => item.status !== 'cancelled');

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{table.name}</h2>
            <p className="text-sm text-gray-500">
              {room ? `${room.name} · ` : ''}{tTables('capacitySeats', { count: table.capacity })}
              {' · '}{tTables(TABLE_STATUS_LABEL_KEYS[table.status])}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {order ? (
          <div className="bg-gray-50 rounded-xl p-3 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold text-gray-800">#<Ltr>{order.order_number}</Ltr></span>
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                order.status === 'pending' ? 'bg-yellow-100 text-yellow-700'
                  : order.status === 'preparing' ? 'bg-blue-100 text-blue-700'
                    : order.status === 'ready' ? 'bg-green-100 text-green-700'
                      : order.status === 'served' ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
              }`}>
                {tOrders(ORDER_STATUS_LABEL_KEYS[order.status])}
              </span>
            </div>
            {order.customer?.name && <p className="text-xs text-gray-500 mb-2">{order.customer.name}</p>}

            <div className="space-y-1">
              {items.map((item) => {
                const colors = itemStatusColors[item.status] || itemStatusColors.pending;
                return (
                  <div key={item.id} className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${colors.bg}`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${colors.dot} flex-shrink-0`} />
                    <span className="flex-1 truncate text-gray-700">{item.product_name}</span>
                    {item.kot_batch == null && (
                      <span className="text-orange-600 font-medium">{tTables('kotPendingShort')}</span>
                    )}
                    <span className="text-gray-500">×{item.quantity}</span>
                    <span className={`font-medium ${colors.text}`}>{tOrders(itemStatusLabelKey(item.status))}</span>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
              <span className="text-sm text-gray-600">{tCommon('total')}</span>
              <span className="font-bold text-gray-900"><Ltr>{formatCurrency(order.total || 0)}</Ltr></span>
            </div>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-400 py-6">{tTables('noActiveOrders')}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {(table.status === 'occupied' || table.status === 'reserved') && (
            <Button type="button" variant="outline" onClick={() => setStatus('available')} disabled={saving}>
              {tTables('markAvailable')}
            </Button>
          )}
          {table.status === 'available' && (
            <Button type="button" variant="outline" onClick={onReserve} disabled={saving}>
              {tTables('reserve')}
            </Button>
          )}
          <Button type="button" variant="outline" onClick={onEdit} disabled={saving}>
            <Pencil size={14} className="me-1" /> {tTables('edit')}
          </Button>
        </div>
      </div>
    </div>
  );
}
