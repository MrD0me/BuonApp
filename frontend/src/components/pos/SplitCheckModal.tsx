'use client';

import { useMemo, useState } from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'use-intl';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import type { Bill, Order, OrderItem } from '@/lib/types';

/**
 * One line of the grid. A fixed menu is a single line however many rows it
 * wrote: its package and its dishes move together or the split is a lie —
 * hand the package to one guest and the dishes to another and the first pays
 * 25 € for nothing while the second eats for free, with both shares adding up
 * so nobody at the table would ever catch it. The backend refuses a split that
 * breaks a menu; this is the same rule, made unreachable rather than refused.
 */
type SplitLine =
  | { kind: 'item'; key: string; rows: OrderItem[]; name: string; unitTotal: number; quantity: number }
  | { kind: 'menu'; key: string; rows: OrderItem[]; name: string; unitTotal: number; courses: OrderItem[] };

function buildLines(items: OrderItem[]): SplitLine[] {
  const lines: SplitLine[] = [];
  const menuIndex = new Map<string, number>();

  for (const item of items) {
    const groupId = item.menu_group_id;
    if (!groupId) {
      lines.push({
        kind: 'item', key: `item:${item.id}`, rows: [item],
        name: item.product_name, unitTotal: Number(item.total) / item.quantity, quantity: item.quantity,
      });
      continue;
    }
    let index = menuIndex.get(groupId);
    if (index === undefined) {
      index = lines.length;
      menuIndex.set(groupId, index);
      lines.push({ kind: 'menu', key: `menu:${groupId}`, rows: [], name: '', unitTotal: 0, courses: [] });
    }
    const line = lines[index] as Extract<SplitLine, { kind: 'menu' }>;
    line.rows.push(item);
    line.unitTotal += Number(item.total);
    if (item.menu_role === 'package') line.name = item.product_name;
    else line.courses.push(item);
  }

  // A menu whose package row is gone still has to say what it is.
  for (const line of lines) {
    if (line.kind === 'menu' && !line.name) line.name = line.courses[0]?.product_name ?? '';
  }
  return lines;
}

export function SplitCheckModal({ bill, order, onClose, onSplit }: { bill: Bill; order: Order; onClose: () => void; onSplit: (bills: Bill[]) => void }) {
  const t = useTranslations('pos');
  const tCommon = useTranslations('common');
  const fmt = useFormatCurrency();
  const items = (order.items || []).filter((item) => !['cancelled', 'voided', 'void_adjustment'].includes(item.status));
  const lines = useMemo(() => buildLines(items), [items]);
  const initialCount = Math.min(8, Math.max(2, order.guest_count || 2));
  const [count, setCount] = useState(initialCount);
  const [labels, setLabels] = useState(() => Array.from({ length: initialCount }, (_, i) => `Guest ${i + 1}`));
  const [allocations, setAllocations] = useState<Record<number, number[]>>(() => Object.fromEntries(items.map((item) => {
    const slots = Array(initialCount).fill(0);
    for (let unit = 0; unit < item.quantity; unit++) slots[unit % initialCount]++;
    return [item.id, slots];
  })));
  const [saving, setSaving] = useState(false);

  /** Which check a menu currently sits on, or -1 while it is unassigned. */
  const menuShare = (line: Extract<SplitLine, { kind: 'menu' }>): number => {
    const slots = allocations[line.rows[0]?.id] || [];
    return slots.findIndex((value) => value > 0);
  };

  const resize = (next: number) => {
    next = Math.min(20, Math.max(2, next));
    setLabels((old) => Array.from({ length: next }, (_, i) => old[i] || `Guest ${i + 1}`));
    setAllocations((old) => {
      const updated: Record<number, number[]> = {};
      for (const line of lines) {
        if (line.kind === 'menu') {
          // Keep the menu where it was if that guest still exists.
          const previous = (old[line.rows[0].id] || []).findIndex((value) => value > 0);
          const target = previous >= 0 && previous < next ? previous : 0;
          for (const row of line.rows) {
            updated[row.id] = Array.from({ length: next }, (_, i) => (i === target ? row.quantity : 0));
          }
          continue;
        }
        const item = line.rows[0];
        const slots = Array.from({ length: next }, (_, i) => old[item.id]?.[i] || 0);
        const assigned = slots.reduce((sum, value) => sum + value, 0);
        if (assigned < item.quantity) slots[0] += item.quantity - assigned;
        if (assigned > item.quantity) slots[0] = Math.max(0, slots[0] - (assigned - item.quantity));
        updated[item.id] = slots;
      }
      return updated;
    });
    setCount(next);
  };

  /** Moves a whole menu onto one guest, taking it off whoever had it. */
  const setMenuShare = (line: Extract<SplitLine, { kind: 'menu' }>, index: number) => {
    setAllocations((old) => {
      const updated = { ...old };
      for (const row of line.rows) {
        updated[row.id] = Array.from({ length: count }, (_, i) => (i === index ? row.quantity : 0));
      }
      return updated;
    });
  };

  /**
   * Moves units of one line between guests, keeping the line adding up to what
   * was actually ordered.
   *
   * Typing a bigger number for one guest takes the difference off the others,
   * heaviest first; typing a smaller one hands the remainder to the next guest
   * along. Without this every change left the grid invalid until the other
   * cell was corrected by hand, and the modal refused to submit in between.
   */
  const setAllocation = (item: OrderItem, index: number, raw: string) => {
    const value = Math.min(item.quantity, Math.max(0, Number(raw) || 0));
    setAllocations((old) => {
      const slots = Array.from({ length: count }, (_, i) => old[item.id]?.[i] || 0);
      slots[index] = value;

      let excess = slots.reduce((sum, qty) => sum + qty, 0) - item.quantity;
      while (excess > 0) {
        let heaviest = -1;
        for (let i = 0; i < slots.length; i++) {
          if (i === index || slots[i] <= 0) continue;
          if (heaviest === -1 || slots[i] > slots[heaviest]) heaviest = i;
        }
        if (heaviest === -1) break;
        const taken = Math.min(slots[heaviest], excess);
        slots[heaviest] -= taken;
        excess -= taken;
      }

      let missing = item.quantity - slots.reduce((sum, qty) => sum + qty, 0);
      for (let step = 1; missing > 0 && step <= slots.length; step++) {
        const target = (index + step) % slots.length;
        if (target === index) continue;
        slots[target] += missing;
        missing = 0;
      }

      return { ...old, [item.id]: slots };
    });
  };

  const totals = useMemo(() => Array.from({ length: count }, (_, checkIndex) => items.reduce((sum, item) => sum + Number(item.total) * (allocations[item.id]?.[checkIndex] || 0) / item.quantity, 0)), [allocations, count, items]);

  const submit = async () => {
    const invalid = items.some((item) => (allocations[item.id] || []).reduce((sum, value) => sum + value, 0) !== item.quantity)
      || Array.from({ length: count }, (_, check) => items.every((item) => !(allocations[item.id]?.[check] > 0))).some(Boolean);
    if (invalid) return toast.error(t('allocateAllItems'));
    setSaving(true);
    try {
      const checks = Array.from({ length: count }, (_, checkIndex) => ({
        label: labels[checkIndex],
        items: items.flatMap((item) => {
          const quantity = allocations[item.id]?.[checkIndex] || 0;
          return quantity > 0 ? [{ order_item_id: item.id, quantity }] : [];
        }),
      }));
      const { data } = await api.post(`/bills/${bill.id}/split-check`, { checks });
      onSplit(data.bills);
    } catch {
      // Backend error strings stay English for logs; the guest-facing text is
      // ours. The grid already makes an un-splittable menu unreachable, so
      // this is the net under a hand-rolled request, not a routine path.
      toast.error(t('splitCheckFailed'));
    } finally { setSaving(false); }
  };

  return <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4"><div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
    <div className="p-5 border-b flex items-center justify-between"><div><h2 className="text-lg font-bold">{t('splitCheck')}</h2><p className="text-sm text-gray-500">{t('splitCheckHint')}</p></div><button onClick={onClose}><X size={20} /></button></div>
    <div className="p-5 border-b flex items-center gap-3"><span className="text-sm text-gray-600">{t('numberOfChecks')}</span><button onClick={() => resize(count - 1)} className="size-7 rounded-full bg-gray-100 flex items-center justify-center"><Minus size={13} /></button><strong>{count}</strong><button onClick={() => resize(count + 1)} className="size-7 rounded-full bg-gray-100 flex items-center justify-center"><Plus size={13} /></button></div>
    <div className="overflow-auto p-5"><table className="w-full text-sm"><thead><tr><th className="text-start p-2 sticky start-0 bg-white">{t('items')}</th>{Array.from({ length: count }, (_, i) => <th key={i} className="p-2 min-w-28"><input value={labels[i]} onChange={(e) => setLabels((old) => old.map((label, n) => n === i ? e.target.value.slice(0, 40) : label))} className="w-full text-center border rounded px-2 py-1" /></th>)}</tr></thead><tbody>{lines.map((line) => {
      if (line.kind === 'menu') {
        const share = menuShare(line);
        return <tr key={line.key} className="border-t bg-amber-50/40">
          <td className="p-2 sticky start-0 bg-amber-50/40">
            <div className="font-medium">{line.name}</div>
            {line.courses.map((course) => <div key={course.id} className="text-xs text-gray-500 ps-3">· {course.product_name}</div>)}
            <div className="text-xs text-gray-400 mt-0.5">{fmt(line.unitTotal)} · {t('splitMenuWhole')}</div>
          </td>
          {Array.from({ length: count }, (_, i) => <td key={i} className="p-2 text-center">
            <button
              type="button"
              onClick={() => setMenuShare(line, i)}
              aria-pressed={share === i}
              className={`w-full h-8 rounded border flex items-center justify-center transition-colors ${
                share === i ? 'border-brand bg-brand-light text-brand' : 'border-gray-200 text-gray-300 hover:border-gray-300'
              }`}
            >
              {share === i ? <Check size={16} /> : null}
            </button>
          </td>)}
        </tr>;
      }
      const item = line.rows[0];
      return <tr key={line.key} className="border-t">
        <td className="p-2 sticky start-0 bg-white"><div className="font-medium">{item.product_name}</div><div className="text-xs text-gray-400">{item.quantity} × {fmt(line.unitTotal)}</div></td>
        {Array.from({ length: count }, (_, i) => <td key={i} className="p-2"><input type="number" min="0" max={item.quantity} value={allocations[item.id]?.[i] || 0} onChange={(e) => setAllocation(item, i, e.target.value)} className="w-full text-center border rounded px-2 py-1" /></td>)}
      </tr>;
    })}</tbody><tfoot><tr className="border-t font-semibold"><td className="p-2">{t('estimatedItemsTotal')}</td>{totals.map((total, i) => <td key={i} className="p-2 text-center">{fmt(total)}</td>)}</tr></tfoot></table></div>
    <div className="p-5 border-t flex justify-end gap-2"><Button variant="outline" onClick={onClose}>{tCommon('cancel')}</Button><Button onClick={submit} disabled={saving}>{saving ? tCommon('saving') : t('createChecks')}</Button></div>
  </div></div>;
}
