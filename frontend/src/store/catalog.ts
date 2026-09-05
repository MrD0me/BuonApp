import { create } from 'zustand';
import api from '@/lib/api';
import type { Category, Product } from '@/lib/types';

/**
 * The catalogue, for screens that need to name a product rather than sell one.
 *
 * The order panel has to draw a menu already on the check — which dishes were
 * chosen, which courses are still empty, what each one costs extra — and none
 * of that is on the order rows. The till screen loads the catalogue as part of
 * its own state; the panel is rendered many times over on the floor map, so
 * without a shared copy it would either fetch `/products` once per table or
 * take the whole catalogue as a prop through half the application.
 *
 * One request in flight at a time, and it stays loaded: the catalogue changes
 * when the owner edits it, not during service.
 */
interface CatalogState {
  products: Product[];
  categories: Category[];
  loaded: boolean;
  loading: boolean;
  /** Loads once. Safe to call from every render that needs the catalogue. */
  ensureLoaded: () => Promise<void>;
  /** Forces a re-read — after the owner edits the menu, say. */
  reload: () => Promise<void>;
}

let inFlight: Promise<void> | null = null;

export const useCatalogStore = create<CatalogState>((set) => {
  const fetchCatalog = async () => {
    set({ loading: true });
    try {
      const [products, categories] = await Promise.all([
        api.get('/products?active=true'),
        api.get('/categories?active=1'),
      ]);
      set({
        products: products.data.products || [],
        categories: categories.data.categories || [],
        loaded: true,
      });
    } catch {
      // A panel that cannot name the dishes of a menu still has to show the
      // check. It draws what the rows say and offers no slots to fill.
      set({ loaded: true });
    } finally {
      set({ loading: false });
      inFlight = null;
    }
  };

  return {
    products: [],
    categories: [],
    loaded: false,
    loading: false,

    ensureLoaded: () => {
      const { loaded } = useCatalogStore.getState();
      if (loaded) return Promise.resolve();
      if (!inFlight) inFlight = fetchCatalog();
      return inFlight;
    },

    reload: () => {
      if (!inFlight) inFlight = fetchCatalog();
      return inFlight;
    },
  };
});
