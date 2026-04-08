"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Store, CheckCircle2, XCircle, Eye, Clock, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/ui-store";
import { isExceptionStatus, isReturnStatus } from "@/lib/orders/operations-metrics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate } from "@/lib/utils/constants";
import type { Order } from "@/types/orders";
import type { Profile, Store as StoreType, VendorStatus } from "@/types";

type StoreRecord = StoreType & {
  owner?: Pick<Profile, "full_name" | "email"> | null;
};

type StoreRiskSummary = {
  exceptionCount: number;
  unresolvedReturns: number;
  payoutAlerts: number;
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
  const [riskFilter, setRiskFilter] = useState<"all" | "needs_review">("all");
  const [search, setSearch] = useState("");
  const [activeStoreId, setActiveStoreId] = useState<string | null>(null);
  const [riskMap, setRiskMap] = useState<Record<string, StoreRiskSummary>>({});

  const fetchStores = useCallback(async () => {
    setLoading(true);
    const supabase = getSupabaseBrowserClient();
    let query = supabase.from("stores").select("*, owner:profiles(full_name, email)").order("created_at", { ascending: false });

    if (filter !== "all") query = query.eq("status", filter);

    const [{ data }, { data: orders }] = await Promise.all([
      query,
      supabase.from("orders").select("store_id, status, stripe_transfer_status"),
    ]);

    const nextRiskMap: Record<string, StoreRiskSummary> = {};
    for (const order of ((orders ?? []) as Array<Pick<Order, "store_id" | "status" | "stripe_transfer_status">>)) {
      nextRiskMap[order.store_id] ??= { exceptionCount: 0, unresolvedReturns: 0, payoutAlerts: 0 };

      if (isExceptionStatus(order.status)) {
        nextRiskMap[order.store_id].exceptionCount += 1;
      }

      if (isReturnStatus(order.status) && order.status !== "refunded") {
        nextRiskMap[order.store_id].unresolvedReturns += 1;
      }

      if (order.status === "delivered" && order.stripe_transfer_status !== "paid") {
        nextRiskMap[order.store_id].payoutAlerts += 1;
      }
    }

    setStores((data ?? []) as StoreRecord[]);
    setRiskMap(nextRiskMap);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    void fetchStores();
  }, [fetchStores]);

  const visibleStores = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return stores.filter((store) => {
      const risk = riskMap[store.id];
      if (riskFilter === "needs_review" && !(risk?.exceptionCount || risk?.unresolvedReturns || risk?.payoutAlerts)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const haystack = [store.name, store.slug, store.owner?.full_name ?? "", store.owner?.email ?? ""].join(" ").toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [riskFilter, riskMap, search, stores]);

  async function updateStatus(storeId: string, status: VendorStatus) {
    setActiveStoreId(storeId);
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.from("stores").update({ status }).eq("id", storeId);

    if (error) {
      addToast({ type: "error", title: "Failed", description: error.message });
      setActiveStoreId(null);
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
    setActiveStoreId(null);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Vendor management</h1>
        <p className="mt-1 text-sm text-stone-500">
          Review applications, inspect storefront readiness, and manage vendor account access.
        </p>
      </div>

      <div className="flex items-center gap-1">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              filter === tab.value
                ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {[
            { label: "All risk states", value: "all" as const },
            { label: "Needs review", value: "needs_review" as const },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setRiskFilter(tab.value)}
              className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
                riskFilter === tab.value
                  ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                  : "text-stone-500 hover:text-stone-900 dark:hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search stores or owners"
          className="h-9 w-64 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
        />
      </div>

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Store</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Owner</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Risk</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Applied</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <tr key={index} className="border-b border-stone-50 dark:border-stone-800/50">
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : visibleStores.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Store className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-400">No vendors found</p>
                </td>
              </tr>
            ) : (
              visibleStores.map((store) => {
                const risk = riskMap[store.id];

                return (
                <tr key={store.id} className="border-b border-stone-50 hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20">
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center bg-stone-900 text-xs font-bold text-white">
                        {store.name[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">{store.name}</p>
                        <p className="text-[10px] text-stone-400">/{store.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="text-sm text-stone-900 dark:text-white">{store.owner?.full_name ?? "-"}</p>
                    <p className="text-[10px] text-stone-400">{store.owner?.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[store.status]}`}>
                      {store.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-stone-500">
                    {risk ? (
                      <div className="space-y-1">
                        <div className="inline-flex items-center gap-1 text-rose-600">
                          <ShieldAlert className="h-3.5 w-3.5" />
                          {risk.exceptionCount} exceptions
                        </div>
                        <p>{risk.unresolvedReturns} returns open</p>
                        <p>{risk.payoutAlerts} payout alerts</p>
                      </div>
                    ) : (
                      <span className="text-stone-400">Clear</span>
                    )}
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
                          <Button size="sm" variant="ghost" isLoading={activeStoreId === store.id} disabled={activeStoreId === store.id} onClick={() => updateStatus(store.id, "approved")} leftIcon={<CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}>Approve</Button>
                          <Button size="sm" variant="ghost" isLoading={activeStoreId === store.id} disabled={activeStoreId === store.id} onClick={() => updateStatus(store.id, "rejected")} leftIcon={<XCircle className="h-3.5 w-3.5 text-red-500" />}>Reject</Button>
                        </>
                      )}
                      {store.status === "approved" && (
                        <Button size="sm" variant="ghost" isLoading={activeStoreId === store.id} disabled={activeStoreId === store.id} onClick={() => updateStatus(store.id, "suspended")} className="text-red-500">Suspend</Button>
                      )}
                      {store.status === "suspended" && (
                        <Button size="sm" variant="ghost" isLoading={activeStoreId === store.id} disabled={activeStoreId === store.id} onClick={() => updateStatus(store.id, "approved")} className="text-emerald-600">Reinstate</Button>
                      )}
                    </div>
                  </td>
                </tr>
              )})
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
