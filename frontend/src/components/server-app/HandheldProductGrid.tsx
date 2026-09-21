'use client';

import { useMemo } from 'react';
import { Pencil, Search } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Category, Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { portionsOf } from '@/lib/fixed-menu';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  products: Product[];
  categories: Category[];
  /** What the menu is filtered down to. Held by the screen, not here — see below. */
  query: string;
  onQueryChange: (query: string) => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  /** A tap on the dish itself. */
  onProductClick: (product: Product) => void;
  /** The small pencil on the tile: note and quantity, whatever the dish. */
  onProductOptions: (product: Product) => void;
}

/**
 * The menu, two dishes to a row.
 *
 * Leaner than the till's grid on purpose: no images (a phone on the LAN has
 * no business fetching them through the desktop client this grid would have
 * needed), no barcode, no sidebar. A dish tapped goes to whichever window
 * the shell decides — or straight into the cart, when there is nothing to
 * decide. The pencil on the tile is for the note that a plain dish would
 * otherwise have no way to carry.
 *
 * Which category is showing, and what is typed in the search, belong to the
 * screen above: opening the ticket takes the grid off the page, and a waiter
 * who had to find "Dolci" again after every glance at the check would swear
 * the category had disappeared.
 */
export function HandheldProductGrid({
  products, categories, query, onQueryChange, categoryId, onCategoryChange, onProductClick, onProductOptions,
}: Props) {
  const t = useTranslations('serverApp');
  const tPos = useTranslations('pos');
  const fmt = useFormatCurrency();
  const cartItems = useCartStore((state) => state.items);

  // How many of each dish are already in the cart, menus counted by the dishes chosen inside them.
  const inCart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of cartItems) {
      counts.set(item.product.id, (counts.get(item.product.id) || 0) + item.quantity);
      for (const choice of item.menu_selection || []) {
        counts.set(choice.product_id, (counts.get(choice.product_id) || 0) + portionsOf(choice));
      }
    }
    return counts;
  }, [cartItems]);

  const categoryItems = useMemo(() => [
    { value: 'all', label: tPos('allCategories') },
    ...[...categories]
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .map((category) => ({ value: String(category.id), label: category.name })),
  ], [categories, tPos]);

  // The menu is re-read while the phone is awake, so the chip the waiter is
  // standing on can be taken away under them. Falling back to the whole menu
  // beats a grid filtered on a category that no longer exists: no chip lit,
  // and not a dish in sight.
  const selected = categoryItems.some((item) => item.value === categoryId) ? categoryId : 'all';

  const needle = query.trim().toLowerCase();
  const visible = products.filter((product) => {
    if (product.is_active === false) return false;
    if (selected !== 'all' && String(product.category_id) !== selected) return false;
    return !needle || product.name.toLowerCase().includes(needle);
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search size={20} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('searchMenu')}
          aria-label={t('searchMenu')}
          className="h-touch w-full rounded-xl border border-input bg-card ps-11 pe-3 text-base outline-none focus:ring-2 focus:ring-brand"
        />
      </div>
      <SegmentedControl
        scrollable
        size="lg"
        aria-label={t('categories')}
        value={selected}
        onValueChange={onCategoryChange}
        items={categoryItems}
      />
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {visible.map((product) => {
          const count = inCart.get(product.id) || 0;
          // The cell stretches to the tallest tile in its row and the tile must
          // stretch with it (h-full): the pencil and the count are pinned to
          // the cell, and on a shorter tile the count hung below its border.
          return (
            <div key={product.id} className="relative">
              <button
                type="button"
                onClick={() => onProductClick(product)}
                className={`flex h-full min-h-[84px] w-full flex-col justify-between gap-1.5 rounded-2xl border bg-card p-3 pe-12 text-start shadow-xs transition active:scale-[0.98] ${count > 0 ? 'border-brand ring-1 ring-brand' : 'border-border'}`}
              >
                <span className="line-clamp-2 text-base leading-snug font-semibold text-foreground">{product.name}</span>
                <span className="flex flex-wrap items-center gap-x-2 pe-8 text-sm">
                  <Ltr className={product.is_fixed_menu ? 'font-semibold text-brand' : 'font-medium text-muted-foreground'}>{fmt(Number(product.price) || 0)}</Ltr>
                  {product.is_fixed_menu && <span className="text-brand">{tPos('menuFixed')}</span>}
                </span>
                {count > 0 && <span className="sr-only">{t('inCart', { count })}</span>}
              </button>
              {/* The pencil never gives up its corner: a dish already on the
                  ticket is exactly the one the floor comes back to for a third
                  plate with a note, which is a line of its own. */}
              <button
                type="button"
                aria-label={t('productOptions', { name: product.name })}
                onClick={() => onProductOptions(product)}
                className="absolute end-1 top-1 flex size-touch items-center justify-center rounded-xl text-muted-foreground/70 transition active:bg-muted"
              >
                <Pencil size={18} />
              </button>
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className="absolute end-2.5 bottom-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-sm font-bold text-white"
                >
                  <Ltr>{count}</Ltr>
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
