"use client";

import { BookmarkPlus, Search, Trash2 } from "lucide-react";
import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useDiscoveryStore } from "@/stores/discovery-store";
import { useUIStore } from "@/stores/ui-store";

interface SavedSearchesPanelProps {
  currentSearch: string;
  currentCategory: string;
  currentSort: string;
}

export function SavedSearchesPanel({ currentSearch, currentCategory, currentSort }: SavedSearchesPanelProps) {
  const router = useRouter();
  const addToast = useUIStore((state) => state.addToast);
  const savedSearches = useDiscoveryStore((state) => state.savedSearches);
  const saveSearch = useDiscoveryStore((state) => state.saveSearch);
  const removeSavedSearch = useDiscoveryStore((state) => state.removeSavedSearch);

  const canSave = useMemo(() => Boolean(currentSearch || currentCategory), [currentCategory, currentSearch]);

  function buildHref(search: { q: string; category: string; sort: string }) {
    const params = new URLSearchParams();
    if (search.q) params.set("q", search.q);
    if (search.category) params.set("category", search.category);
    if (search.sort && search.sort !== "newest") params.set("sort", search.sort);
    return `/shop?${params.toString()}`;
  }

  function handleSaveCurrent() {
    if (!canSave) {
      addToast({
        type: "info",
        title: "Nothing to save yet",
        description: "Apply a search term or category filter to save it for later.",
      });
      return;
    }

    const label = currentSearch || currentCategory || "Saved search";
    saveSearch({ label, q: currentSearch, category: currentCategory, sort: currentSort });
    addToast({
      type: "success",
      title: "Search saved",
      description: "You can revisit this discovery setup anytime from the shop.",
    });
  }

  return (
    <div className="space-y-4 border-t border-stone-200 pt-6 dark:border-stone-800">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-widest text-stone-400">Saved searches</h3>
          <p className="mt-1 text-xs text-stone-500">Keep your best discovery paths close for quick return visits.</p>
        </div>
        <button
          type="button"
          onClick={handleSaveCurrent}
          className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-stone-700 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
        >
          <BookmarkPlus className="h-3.5 w-3.5" />
          Save current
        </button>
      </div>

      {savedSearches.length === 0 ? (
        <div className="border border-dashed border-stone-200 px-4 py-5 text-sm text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Saved searches will appear here once you save a filtered category or search phrase.
        </div>
      ) : (
        <div className="space-y-2">
          {savedSearches.map((item) => (
            <div key={item.id} className="flex items-center justify-between gap-3 border border-stone-200 bg-white px-3 py-3 dark:border-stone-800 dark:bg-stone-900">
              <button
                type="button"
                onClick={() => router.push(buildHref(item))}
                className="min-w-0 text-left"
              >
                <div className="flex items-center gap-2 text-sm text-stone-900 dark:text-white">
                  <Search className="h-4 w-4 text-stone-400" />
                  <span className="truncate">{item.label}</span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {[item.q && `Query: ${item.q}`, item.category && `Category: ${item.category}`, item.sort !== "newest" && `Sort: ${item.sort}`]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
              </button>
              <button type="button" onClick={() => removeSavedSearch(item.id)} className="text-stone-400 hover:text-stone-700 dark:hover:text-white">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
