"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Store, CheckCircle2, XCircle, Eye, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import type { Profile, Store as StoreType, VendorStatus } from "@/types";

type StoreRecord = StoreType & {
  owner?: Pick<Profile, "full_name" | "email"> | null;
};

const statusTabs: { label: string; value: VendorStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Suspended", value: "suspended" },
];

const statusColors: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  rejected: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  suspended: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
};

export default function AdminVendorsPage() {
  const addToast = useUIStore((state) => state.addToast);
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<VendorStatus | "all">("pending");

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase
      .from("stores")
      .select("*, owner:profiles(full_name, email)")
      .order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);

    const { data } = await query;
    setStores((data ?? []) as StoreRecord[]);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  async function updateStatus(storeId: string, status: VendorStatus) {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("stores").update({ status }).eq("id", storeId);
    if (error) {
      addToast({ type: "error", title: "Failed", description: error.message });
      return;
    }

    if (status === "approved") {
      const store = stores.find((entry) => entry.id === storeId);
      if (store) {
        await supabase.from("profiles").update({ role: "vendor" }).eq("id", store.owner_id);
      }
    }

    addToast({ type: "success", title: `Vendor ${status}` });
    await fetchStores();
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Vendor management</h1>
        <p className="mt-1 text-sm text-stone-500">Review applications, inspect storefront readiness, and manage vendor account access.</p>
      </div>

      <div className="flex items-center gap-1">
        {statusTabs.map((tab) => (
          <button key={tab.value} onClick={() => setFilter(tab.value)} className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${filter === tab.value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900 dark:hover:text-white"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Store</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Owner</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Applied</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-stone-50 dark:border-stone-800/50">
                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : stores.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-16 text-center">
                  <Store className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-400">No vendors found</p>
                </td>
              </tr>
            ) : (
              stores.map((store) => (
                <tr key={store.id} className="border-b border-stone-50 hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center bg-stone-900 text-xs font-bold text-white">{store.name[0]}</div>
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">{store.name}</p>
                        <p className="text-[10px] text-stone-400">/{store.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-stone-900 dark:text-white">{store.owner?.full_name ?? "—"}</p>
                    <p className="text-[10px] text-stone-400">{store.owner?.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[store.status]}`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-stone-500">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-stone-300" />
                      {formatDate(store.created_at)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/vendors/${store.slug}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="ghost" leftIcon={<Eye className="h-3.5 w-3.5" />}>View</Button>
                      </Link>
                      {store.status === "pending" && (
                        <>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(store.id, "approved")} leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>Approve</Button>
                          <Button size="sm" variant="ghost" onClick={() => updateStatus(store.id, "rejected")} leftIcon={<XCircle className="h-3.5 w-3.5 text-red-500" />}>Reject</Button>
                        </>
                      )}
                      {store.status === "approved" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(store.id, "suspended")} className="text-red-500">Suspend</Button>
                      )}
                      {store.status === "suspended" && (
                        <Button size="sm" variant="ghost" onClick={() => updateStatus(store.id, "approved")} className="text-emerald-600">Reinstate</Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
