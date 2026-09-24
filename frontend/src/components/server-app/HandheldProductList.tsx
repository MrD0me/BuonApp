'use client';

import { useMemo, useRef } from 'react';
import { Pencil, Search, X } from 'lucide-react';
import { useTranslations } from 'use-intl';
import type { Category, Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { portionsOf } from '@/lib/fixed-menu';
import { nameToColor } from '@/lib/image-utils';
import { parseDbTimestamp } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Stepper } from '@/components/ui/stepper';
import { Ltr } from '@/components/layout/Ltr';

interface Props {
  products: Product[];
  categories: Category[];
  /** What the menu is filtered down to. Held by the screen, not here — see below. */
  query: string;
  onQueryChange: (query: string) => void;
  categoryId: string;
  onCategoryChange: (categoryId: string) => void;
  /** A tap on the dish itself, or on its +. */
  onProductClick: (product: Product) => void;
  /** Its −: one plate of it off the ticket. */
  onProductRemove: (product: Product) => void;
  /** The small pencil on the row: note and quantity, whatever the dish. */
  onProductOptions: (product: Product) => void;
}

/**
 * The menu, one dish to a row.
 *
 * A row reads the way the waiter looks for a dish — its photo, its name, its
 * price — and ends with what can be done to it: the pencil for a note, and
 * − n + for how many. The grid of tiles before it set two names side by side
 * and the eye had to zigzag between them; a row is taller, and is read at a
 * glance.
 *
 * The + is the tap on the dish, and so is the row: it goes to whichever window
 * the shell decides, or straight into the cart when there is nothing to
 * decide. The − is there so that a plate tapped by mistake comes off where it
 * went on, without a trip to the ticket and back. The number between them
 * counts the dish wherever it is on the ticket, menus included; the − only
 * reaches the dish's own lines (a plate inside a menu comes off in the menu's
 * window), so it goes dark when those are empty.
 *
 * The photo comes through the Server App, whose image route is open like the
 * main API's own: an <img> cannot carry the token. A dish without one shows
 * its initials on its own colour, the square the till draws.
 *
 * Which category is showing, and what is typed in the search, belong to the
 * screen above: opening the ticket takes the list off the page, and a waiter
 * who had to find "Dolci" again after every glance at the check would swear
 * the category had disappeared.
 */
export function HandheldProductList({
  products, categories, query, onQueryChange, categoryId, onCategoryChange,
  onProductClick, onProductRemove, onProductOptions,
}: Props) {
  const t = useTranslations('serverApp');
  const tPos = useTranslations('pos');
  const fmt = useFormatCurrency();
  const cartItems = useCartStore((state) => state.items);
  const searchRef = useRef<HTMLInputElement>(null);

  // How many of each dish are on the ticket, menus counted by the dishes
  // chosen inside them; and how many of those the − can take off, which are
  // the dish's own lines.
  const { inCart, removable } = useMemo(() => {
    const counts = new Map<string, number>();
    const own = new Map<string, number>();
    for (const item of cartItems) {
      counts.set(item.product.id, (counts.get(item.product.id) || 0) + item.quantity);
      if (!item.menu_selection) own.set(item.product.id, (own.get(item.product.id) || 0) + item.quantity);
      for (const choice of item.menu_selection || []) {
        counts.set(choice.product_id, (counts.get(choice.product_id) || 0) + portionsOf(choice));
      }
    }
    return { inCart: counts, removable: own };
  }, [cartItems]);

  const categoryItems = useMemo(() => [
    { value: 'all', label: tPos('allCategories') },
    ...[...categories]
      .sort((left, right) => (left.sort_order ?? 0) - (right.sort_order ?? 0))
      .map((category) => ({ value: String(category.id), label: category.name })),
  ], [categories, tPos]);

  // The menu is re-read while the phone is awake, so the chip the waiter is
  // standing on can be taken away under them. Falling back to the whole menu
  // beats a list filtered on a category that no longer exists: no chip lit,
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
          ref={searchRef}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder={t('searchMenu')}
          aria-label={t('searchMenu')}
          className="h-touch w-full rounded-xl border border-input bg-card ps-11 pe-12 text-base outline-none focus:ring-2 focus:ring-brand"
        />
        {/* One tap empties the search, and the keyboard stays up: the next
            dish is usually looked for straight after the last one. Holding
            the mouse-down keeps the focus in the field instead of letting it
            drop and come back. */}
        {query && (
          <button
            type="button"
            aria-label={t('clearSearch')}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onQueryChange('');
              searchRef.current?.focus();
            }}
            className="absolute end-0 top-0 flex size-touch items-center justify-center rounded-xl text-muted-foreground transition active:bg-muted"
          >
            <X size={20} />
          </button>
        )}
      </div>
      <SegmentedControl
        scrollable
        size="lg"
        aria-label={t('categories')}
        value={selected}
        onValueChange={onCategoryChange}
        items={categoryItems}
      />
      <div className="grid gap-2.5 md:grid-cols-2">
        {visible.map((product) => {
          const count = inCart.get(product.id) || 0;
          const own = removable.get(product.id) || 0;
          // The pencil and the stepper sit on the row, not in it: a button
          // cannot hold buttons. The name keeps clear of the pencil and the
          // price of the stepper, and the price line is as tall as the
          // stepper, so the two share a baseline whatever the name wraps to.
          // A one-line name still takes the pencil's height: on a shorter row
          // the pencil sat on top of the +, and a thumb meant for one hit the
          // other.
          return (
            <div key={product.id} className="relative">
              <button
                type="button"
                onClick={() => onProductClick(product)}
                className={`flex h-full w-full items-start gap-3 rounded-2xl border bg-card p-2.5 text-start shadow-xs transition active:bg-muted/60 ${count > 0 ? 'border-brand ring-1 ring-brand' : 'border-border'}`}
              >
                <DishThumbnail product={product} />
                <span className="flex min-w-0 flex-1 flex-col justify-between gap-1 self-stretch">
                  <span className="line-clamp-2 min-h-10 pe-10 text-base leading-snug font-semibold text-foreground">{product.name}</span>
                  <span className="flex min-h-touch flex-col justify-center pe-36 text-sm">
                    <Ltr className={product.is_fixed_menu ? 'font-semibold text-brand' : 'font-medium text-muted-foreground'}>{fmt(Number(product.price) || 0)}</Ltr>
                    {product.is_fixed_menu && <span className="text-brand">{tPos('menuFixed')}</span>}
                  </span>
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
              {/* + is the tap on the dish, which may open a window rather than
                  add a plate; − takes one off, and goes dark (its floor is the
                  count) when none of the plates counted is the dish's own. A
                  nought is quiet, so the dishes on the ticket stand out down
                  the list. */}
              <Stepper
                size="md"
                value={count}
                min={count - own}
                onChange={(next) => (next > count ? onProductClick(product) : onProductRemove(product))}
                decreaseLabel={t('removeOne', { name: product.name })}
                increaseLabel={t('addOne', { name: product.name })}
                className="absolute end-2.5 bottom-2.5"
                valueClassName={count === 0 ? 'font-medium text-muted-foreground/60' : undefined}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * The dish's photo, or its initials on its own colour when it has none: the
 * same square the till draws, so a dish looks the same on both. A photo that
 * fails to load steps aside for the initials; keyed on its address, so a new
 * photo gets a fresh chance instead of inheriting the old one's failure.
 */
function DishThumbnail({ product }: { product: Product }) {
  const version = product.updated_at ? parseDbTimestamp(product.updated_at).getTime() : 0;
  const src = `/api/products/${encodeURIComponent(product.id)}/image?t=${version}`;
  return (
    <span
      aria-hidden="true"
      className="relative size-16 shrink-0 overflow-hidden rounded-xl"
      style={{ backgroundColor: nameToColor(product.name) }}
    >
      <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white/85">
        {product.name.substring(0, 2).toUpperCase()}
      </span>
      {product.has_image && (
        <img
          key={src}
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          className="absolute inset-0 size-full object-cover"
          onError={(event) => { event.currentTarget.style.display = 'none'; }}
        />
      )}
    </span>
  );
}
