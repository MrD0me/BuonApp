'use client';

import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Category, Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  products: Product[];
  categories: Category[];
  onProductClick: (product: Product) => void;
}

/**
 * The menu, two dishes to a row.
 *
 * Leaner than the till's grid on purpose: no images (a phone on the LAN has
 * no business fetching them through the desktop client this grid would have
 * needed), no barcode, no sidebar. A dish tapped goes to whichever window
 * the shell decides — extras, menu, or "inside the menu?".
 */
export function HandheldProductGrid({ products, categories, onProductClick }: Props) {
  const t = useTranslations('serverApp');
  const tPos = useTranslations('pos');
  const fmt = useFormatCurrency();
  const [query, setQuery] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const cartItems = useCartStore((state) => state.items);

  // How many of each dish are already in the cart, menus counted by the dishes chosen inside them.
  const inCart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of cartItems) {
      counts.set(item.product.id, (counts.get(item.product.id) || 0) + item.quantity);
      for (const choice of item.menu_selection || []) {
        counts.set(choice.product_id, (counts.get(choice.product_id) || 0) + 1);
      }
    }
    return counts;
  }, [cartItems]);

  const sortedCategories = useMemo(
    () => [...categories].sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0)),
    [categories],
  );
  const needle = query.trim().toLowerCase();
  const visible = products.filter((product) => {
    if (product.is_active === false) return false;
    if (categoryId !== 'all' && String(product.category_id) !== categoryId) return false;
    return !needle || product.name.toLowerCase().includes(needle);
  });

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute start-3 top-3 text-gray-400" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('searchMenu')}
          className="h-10 w-full rounded-lg border border-gray-200 bg-white ps-9 pe-3 text-sm focus:border-brand focus:outline-none"
        />
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button type="button" onClick={() => setCategoryId('all')} className={`h-9 shrink-0 rounded-lg px-3 text-sm ${categoryId === 'all' ? 'bg-brand text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>{tPos('allCategories')}</button>
        {sortedCategories.map((category) => (
          <button key={category.id} type="button" onClick={() => setCategoryId(String(category.id))}
            className={`h-9 shrink-0 rounded-lg px-3 text-sm ${categoryId === String(category.id) ? 'bg-brand text-white' : 'bg-white text-gray-700 border border-gray-200'}`}>
            {category.name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => {
          const count = inCart.get(product.id) || 0;
          return (
            <button
              key={product.id}
              type="button"
              onClick={() => onProductClick(product)}
              className={`relative min-h-20 rounded-lg border bg-white p-3 text-start transition active:scale-[0.98] ${count > 0 ? 'border-brand' : 'border-gray-200'}`}
            >
              {count > 0 && (
                <span className="absolute end-2 top-2 flex size-5 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"><Ltr>{count}</Ltr></span>
              )}
              <span className="line-clamp-2 pe-5 text-sm font-semibold text-gray-900">{product.name}</span>
              <span className="mt-1 block text-sm text-gray-500"><Ltr>{fmt(Number(product.price) || 0)}</Ltr></span>
              {product.is_fixed_menu && <span className="mt-1 block text-xs text-brand">{tPos('menuFixed')}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
