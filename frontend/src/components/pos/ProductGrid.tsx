'use client';

import { useMemo } from 'react';
import { Pencil, Search } from 'lucide-react';
import type { Category, Product } from '@/lib/types';
import { useCartStore } from '@/store/cart';
import { usePosSettingsStore } from '@/store/pos-settings';
import { nameToColor } from '@/lib/image-utils';
import TagBadge from './DietaryBadge';
import api from '@/lib/api';
import { useTranslations } from 'use-intl';
import { parseDbTimestamp } from '@/lib/utils';
import { useFormatCurrency } from '@/hooks/useFormatCurrency';
import { Ltr } from '@/components/layout/Ltr';

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; activeBg: string; activeText: string }> = {
  red: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', activeBg: 'bg-red-500', activeText: 'text-white' },
  orange: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', activeBg: 'bg-orange-500', activeText: 'text-white' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', activeBg: 'bg-amber-500', activeText: 'text-white' },
  yellow: { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', activeBg: 'bg-yellow-500', activeText: 'text-white' },
  lime: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', activeBg: 'bg-lime-500', activeText: 'text-white' },
  green: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', activeBg: 'bg-green-500', activeText: 'text-white' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', activeBg: 'bg-emerald-500', activeText: 'text-white' },
  teal: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', activeBg: 'bg-teal-500', activeText: 'text-white' },
  cyan: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', activeBg: 'bg-cyan-500', activeText: 'text-white' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', activeBg: 'bg-sky-500', activeText: 'text-white' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', activeBg: 'bg-blue-500', activeText: 'text-white' },
  indigo: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', activeBg: 'bg-indigo-500', activeText: 'text-white' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', activeBg: 'bg-violet-500', activeText: 'text-white' },
  purple: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', activeBg: 'bg-purple-500', activeText: 'text-white' },
  fuchsia: { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-200', activeBg: 'bg-fuchsia-500', activeText: 'text-white' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', activeBg: 'bg-pink-500', activeText: 'text-white' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', activeBg: 'bg-rose-500', activeText: 'text-white' },
};

function getCategoryColorClasses(color: string | null | undefined) {
  if (!color) return null;
  return CATEGORY_COLORS[color.toLowerCase()] || null;
}

function normalizeBarcode(value: string | null | undefined) {
  return value?.trim() || '';
}

interface Props {
  categories: Category[];
  products: Product[];
  selectedCategory: string | null;
  setSelectedCategory: (id: string | null) => void;
  search: string;
  setSearch: (s: string) => void;
  currency: string;
  /** A tap on the dish itself. */
  onProductClick: (product: Product) => void;
  /** The pencil on the tile: note and quantity, whatever the dish. */
  onProductOptions: (product: Product) => void;
  sidebarOpen?: boolean;
}

/**
 * The menu on the till: search, one chip per category in its colour, and a
 * grid of tiles a finger can hit. Tiles are compact — a small thumbnail at
 * most, no square photo — so five or six fit across the cash-desk monitor
 * and the eye scans names, not pictures.
 */
export default function ProductGrid({
  categories, products, selectedCategory, setSelectedCategory,
  search, setSearch, onProductClick, onProductOptions, sidebarOpen = true,
}: Props) {
  const cart = useCartStore();
  const { showProductImages } = usePosSettingsStore();
  const t = useTranslations('pos');
  const tServerApp = useTranslations('serverApp');
  const fmt = useFormatCurrency();
  const cartQuantities = useMemo(() => {
    const quantities = new Map<Product['id'], number>();
    for (const item of cart.items) {
      quantities.set(item.product.id, (quantities.get(item.product.id) || 0) + item.quantity);
    }
    return quantities;
  }, [cart.items]);

  const filtered = products.filter((p) => {
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const chip = (selected: boolean, color?: string | null) => {
    const colorClasses = getCategoryColorClasses(color);
    if (selected) return colorClasses ? `${colorClasses.activeBg} ${colorClasses.activeText}` : 'bg-brand text-white';
    return colorClasses ? `${colorClasses.bg} ${colorClasses.text} border ${colorClasses.border}` : 'bg-card text-foreground border border-border';
  };

  return (
    <div data-testid="pos-product-grid" className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
      <div className="mb-3 flex shrink-0 flex-col gap-2.5">
        <div className="relative">
          <Search size={20} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              // Typed or pasted barcode, not just a scanner — a dedicated
              // action into this field works regardless of typing speed.
              const trimmed = search.trim();
              if (!trimmed) return;
              const match = products.find((p) => normalizeBarcode(p.barcode) === trimmed);
              if (match) {
                onProductClick(match);
                setSearch('');
              }
            }}
            placeholder={t('searchProducts')}
            aria-label={t('searchProducts')}
            className="h-touch w-full rounded-xl border border-input bg-card ps-11 pe-4 text-base outline-none transition-colors focus:ring-2 focus:ring-brand"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!selectedCategory}
            onClick={() => setSelectedCategory(null)}
            className={`h-touch rounded-xl px-4 text-base font-semibold whitespace-nowrap transition active:scale-95 ${chip(!selectedCategory)}`}
          >
            {t('allCategories')}
          </button>
          {categories.filter((cat) => cat.id != null).map((cat) => (
            <button
              key={cat.id}
              type="button"
              aria-pressed={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-touch rounded-xl px-4 text-base font-semibold whitespace-nowrap transition active:scale-95 ${chip(selectedCategory === cat.id, cat.color)}`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Counted against the width the grid actually gets, not the window's:
              the ticket takes 320-384 px of it and the bar another 176, and a
              column too many turns every dish name into an abbreviation. */}
          <div className={`grid gap-2.5 ${sidebarOpen ? 'grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' : 'grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'}`}>
          {filtered.map((product) => {
            const inCartQty = cartQuantities.get(product.id) || 0;
            const stockBadge = product.track_inventory
              ? product.stock_quantity <= 0
                ? t('outOfStock')
                : product.stock_quantity <= (product.low_stock_threshold || 0) ? t('lowStock') : null
              : null;

            return (
              <div key={product.id} className="relative">
                <button
                  type="button"
                  data-testid="pos-product-card"
                  onClick={() => onProductClick(product)}
                  className={`flex min-h-[96px] w-full flex-col justify-between gap-2 rounded-2xl border bg-card p-3 pe-11 text-start shadow-xs transition active:scale-[0.98] ${inCartQty > 0 ? 'border-brand ring-1 ring-brand' : 'border-border'}`}
                >
                  <span className="flex min-w-0 items-start gap-2.5">
                    {showProductImages && (
                      <span
                        className="relative size-10 shrink-0 overflow-hidden rounded-lg"
                        style={{ backgroundColor: nameToColor(product.name) }}
                        aria-hidden="true"
                      >
                        <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white/80">
                          {product.name.substring(0, 2).toUpperCase()}
                        </span>
                        {product.has_image && (
                          <img
                            src={`${api.defaults.baseURL}/products/${product.id}/image?t=${product.updated_at ? parseDbTimestamp(product.updated_at).getTime() : 0}`}
                            alt=""
                            className="absolute inset-0 h-full w-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        )}
                      </span>
                    )}
                    <span className="line-clamp-2 text-base leading-snug font-semibold text-foreground">{product.name}</span>
                  </span>
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1 pe-8">
                    <Ltr className={`text-base font-semibold ${product.is_fixed_menu ? 'text-brand' : 'text-foreground'}`}>{fmt(Number(product.price))}</Ltr>
                    {product.is_fixed_menu && <span className="text-sm text-brand">{t('menuFixed')}</span>}
                    {product.tags && product.tags.length > 0 && <TagBadge tag={product.tags[0]} />}
                    {stockBadge && (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${product.stock_quantity <= 0 ? 'bg-table-occupied-soft text-table-occupied' : 'bg-pending-soft text-pending'}`}>
                        {stockBadge}
                      </span>
                    )}
                  </span>
                  {inCartQty > 0 && <span className="sr-only">{tServerApp('inCart', { count: inCartQty })}</span>}
                </button>
                {/* The pencil never gives up its corner: a dish already on the
                    ticket is exactly the one the floor comes back to for a
                    third plate with a note, which is a line of its own. */}
                <button
                  type="button"
                  aria-label={tServerApp('productOptions', { name: product.name })}
                  title={t('customisable')}
                  onClick={() => onProductOptions(product)}
                  className="absolute end-1 top-1 flex size-touch items-center justify-center rounded-xl text-muted-foreground/70 transition active:bg-muted"
                >
                  <Pencil size={18} />
                </button>
                {inCartQty > 0 && (
                  <span
                    aria-hidden="true"
                    className="absolute end-2.5 bottom-2.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand px-1.5 text-sm font-bold text-white"
                  >
                    <Ltr>{inCartQty}</Ltr>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
