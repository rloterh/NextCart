import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SavedSearch {
  id: string;
  label: string;
  q: string;
  category: string;
  sort: string;
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
        const label = input.label.trim() || normalizedQuery || normalizedCategory || "Saved search";

        set((state) => {
          const existing = state.savedSearches.find(
            (item) => item.q === normalizedQuery && item.category === normalizedCategory && item.sort === normalizedSort
          );

          if (existing) {
            return {
              savedSearches: state.savedSearches.map((item) =>
                item.id === existing.id ? { ...item, label, createdAt: new Date().toISOString() } : item
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
