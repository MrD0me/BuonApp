'use client';

import { Ltr } from '@/components/layout/Ltr';

/** One figure from a service day: takings, covers, orders. */
export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-bold text-gray-900"><Ltr>{String(value)}</Ltr></p>
    </div>
  );
}
