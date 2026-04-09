import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SavedSearch {
  id: string;
  label: string;
  q: string;
  category: string;
  sort: string;
  store?: string;
  minPrice?: string;
  maxPrice?: string;
  rating?: string;
  featured?: boolean;
  inStock?: boolean;
  createdAt: string;
}

interface RecentlyViewedItem {
  id: string;
  storeId: string;
  slug: string;
  name: string;
  image: string | null;
  price: number;
  storeName?: string;
  viewedAt: string;
}

interface CompareProduct {
  id: string;
  storeId: string;
  slug: string;
  name: string;
  price: number;
  compareAtPrice: number | null;
  image: string | null;
  ratingAvg: number;
  ratingCount: number;
  shortDescription: string | null;
  storeName?: string;
  tags: string[];
}

interface DiscoveryState {
  savedSearches: SavedSearch[];
  recentlyViewed: RecentlyViewedItem[];
  compareProducts: CompareProduct[];
  saveSearch: (input: Omit<SavedSearch, "id" | "createdAt">) => void;
  removeSavedSearch: (id: string) => void;
  addRecentlyViewed: (item: Omit<RecentlyViewedItem, "viewedAt">) => void;
  clearRecentlyViewed: () => void;
  toggleCompareProduct: (product: CompareProduct) => { added: boolean; reason?: string };
  removeCompareProduct: (id: string) => void;
  clearCompareProducts: () => void;
}

export const useDiscoveryStore = create<DiscoveryState>()(
  persist(
    (set, get) => ({
      savedSearches: [],
      recentlyViewed: [],
      compareProducts: [],

      saveSearch: (input) => {
        const normalizedQuery = input.q.trim();
        const normalizedCategory = input.category.trim();
        const normalizedSort = input.sort.trim();
        const normalizedStore = input.store?.trim() ?? "";
        const normalizedMinPrice = input.minPrice?.trim() ?? "";
        const normalizedMaxPrice = input.maxPrice?.trim() ?? "";
        const normalizedRating = input.rating?.trim() ?? "";
        const featured = Boolean(input.featured);
        const inStock = Boolean(input.inStock);
        const label = input.label.trim() || normalizedQuery || normalizedCategory || "Saved search";

        set((state) => {
          const existing = state.savedSearches.find(
            (item) =>
              item.q === normalizedQuery &&
              item.category === normalizedCategory &&
              item.sort === normalizedSort &&
              (item.store ?? "") === normalizedStore &&
              (item.minPrice ?? "") === normalizedMinPrice &&
              (item.maxPrice ?? "") === normalizedMaxPrice &&
              (item.rating ?? "") === normalizedRating &&
              Boolean(item.featured) === featured &&
              Boolean(item.inStock) === inStock
          );

          if (existing) {
            return {
              savedSearches: state.savedSearches.map((item) =>
                item.id === existing.id
                  ? {
                      ...item,
                      label,
                      store: normalizedStore || undefined,
                      minPrice: normalizedMinPrice || undefined,
                      maxPrice: normalizedMaxPrice || undefined,
                      rating: normalizedRating || undefined,
                      featured,
                      inStock,
                      createdAt: new Date().toISOString(),
                    }
                  : item
              ),
            };
          }

          return {
            savedSearches: [
              {
                id: crypto.randomUUID(),
                label,
                q: normalizedQuery,
                category: normalizedCategory,
                sort: normalizedSort,
                store: normalizedStore || undefined,
                minPrice: normalizedMinPrice || undefined,
                maxPrice: normalizedMaxPrice || undefined,
                rating: normalizedRating || undefined,
                featured,
                inStock,
                createdAt: new Date().toISOString(),
              },
              ...state.savedSearches,
            ].slice(0, 8),
          };
        });
      },

      removeSavedSearch: (id) => {
        set((state) => ({ savedSearches: state.savedSearches.filter((item) => item.id !== id) }));
      },

      addRecentlyViewed: (item) => {
        set((state) => ({
          recentlyViewed: [
            { ...item, viewedAt: new Date().toISOString() },
            ...state.recentlyViewed.filter((entry) => entry.id !== item.id),
          ].slice(0, 12),
        }));
      },

      clearRecentlyViewed: () => set({ recentlyViewed: [] }),

      toggleCompareProduct: (product) => {
        const current = get().compareProducts;
        const exists = current.some((item) => item.id === product.id);

        if (exists) {
          set({ compareProducts: current.filter((item) => item.id !== product.id) });
          return { added: false };
        }

        if (current.length >= 4) {
          return { added: false, reason: "You can compare up to four products at a time." };
        }

        set({ compareProducts: [...current, product] });
        return { added: true };
      },

      removeCompareProduct: (id) => {
        set((state) => ({ compareProducts: state.compareProducts.filter((item) => item.id !== id) }));
      },

      clearCompareProducts: () => set({ compareProducts: [] }),
    }),
    { name: "nexcart-discovery" }
  )
);
