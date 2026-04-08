"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getPayoutState } from "@/lib/orders/payout-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { Order, OrderItem } from "@/types/orders";
import type { OrderStatus, Profile } from "@/types";

const statuses: Array<OrderStatus | "all"> = [
  "all",
  "pending",
  "confirmed",
  "processing",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivery_failed",
  "reshipping",
  "delivered",
  "return_initiated",
  "return_approved",
  "return_in_transit",
  "return_received",
  "cancelled",
];

const savedViews = [
  { label: "All orders", value: "all" },
  { label: "Ready to ship", value: "ready_to_ship" },
  { label: "In transit", value: "in_transit" },
  { label: "Exceptions", value: "exceptions" },
  { label: "Payout ready", value: "payout_ready" },
  { label: "Settled", value: "settled" },
] as const;

type OrderSavedView = (typeof savedViews)[number]["value"];

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  confirmed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  processing: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  packed: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300",
  shipped: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  out_for_delivery: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300",
  delivery_failed: "bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300",
  reshipping: "bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-900/20 dark:text-fuchsia-300",
  delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  return_initiated: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300",
  return_approved: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
  return_in_transit: "bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-300",
  return_received: "bg-lime-50 text-lime-700 dark:bg-lime-900/20 dark:text-lime-300",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  refunded: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

type VendorOrderListItem = Pick<Order, "id" | "order_number" | "status" | "created_at" | "total" | "stripe_transfer_id" | "stripe_transfer_status"> & {
  buyer: Pick<Profile, "full_name" | "email"> | null;
  items: Pick<OrderItem, "id">[];
};

export default function VendorOrdersPage() {
  const { store, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<VendorOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [savedView, setSavedView] = useState<OrderSavedView>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedView = window.localStorage.getItem("nexcart.vendor.orders.view") as OrderSavedView | null;
    if (storedView && savedViews.some((view) => view.value === storedView)) {
      setSavedView(storedView);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("nexcart.vendor.orders.view", savedView);
  }, [savedView]);

  const fetchOrders = useCallback(async () => {
    if (!store) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const sb = getSupabaseBrowserClient();
    let query = sb
      .from("orders")
      .select("id, order_number, status, created_at, total, stripe_transfer_id, stripe_transfer_status, buyer:profiles(full_name, email), items:order_items(id)")
      .eq("store_id", store.id)
      .order("created_at", { ascending: false });

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error: queryError } = await query;

    if (queryError) {
      setError(queryError.message);
      setOrders([]);
    } else {
      setOrders((data ?? []) as VendorOrderListItem[]);
    }

    setLoading(false);
  }, [status, store]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void fetchOrders();
  }, [authLoading, fetchOrders]);

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (normalizedSearch) {
        const haystack = [order.order_number, order.buyer?.full_name ?? "", order.buyer?.email ?? ""].join(" ").toLowerCase();
        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      switch (savedView) {
        case "ready_to_ship":
          return order.status === "processing" || order.status === "packed" || order.status === "reshipping";
        case "in_transit":
          return order.status === "shipped" || order.status === "out_for_delivery";
        case "exceptions":
          return ["delivery_failed", "return_initiated", "return_approved", "return_in_transit", "return_received", "cancelled", "refunded"].includes(order.status);
        case "payout_ready":
          return order.status === "delivered" && !order.stripe_transfer_id;
        case "settled":
          return order.stripe_transfer_status === "paid";
        default:
          return true;
      }
    });
  }, [orders, savedView, search]);

  if (authLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse bg-stone-100 dark:bg-stone-800" />
        <div className="h-80 animate-pulse bg-stone-100 dark:bg-stone-800" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-none border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
        Store access is unavailable for this account. Finish your store setup to manage orders.
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Orders</h1>
        <p className="mt-1 text-sm text-stone-500">
          {visibleOrders.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {savedViews.map((view) => (
          <button
            key={view.value}
            type="button"
            onClick={() => setSavedView(view.value)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              savedView === view.value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1">
        {statuses.map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setStatus(value)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              status === value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {value === "all" ? "all" : value.replaceAll("_", " ")}
          </button>
        ))}
        </div>
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by order or buyer"
          className="h-9 w-64 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
        />
      </div>

      <div className="border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100 dark:border-stone-800">
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Order</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Customer</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-widest text-stone-400">Date</th>
              <th className="px-4 py-3 text-right text-[10px] font-medium uppercase tracking-widest text-stone-400">Total</th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, rowIndex) => (
                <tr key={rowIndex} className="border-b border-stone-50 dark:border-stone-800/50">
                  {Array.from({ length: 6 }).map((_, cellIndex) => (
                    <td key={cellIndex} className="px-4 py-3.5">
                      <div className="h-4 animate-pulse bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center text-sm text-red-600 dark:text-red-300">
                  We could not load your orders right now. {error}
                </td>
              </tr>
            ) : visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-400">No orders match this operational view</p>
                </td>
              </tr>
            ) : (
              visibleOrders.map((order) => (
                <tr
                  key={order.id}
                  className="border-b border-stone-50 transition-colors hover:bg-stone-50/50 dark:border-stone-800/50 dark:hover:bg-stone-800/20"
                >
                  <td className="px-4 py-3 text-sm font-medium text-stone-900 dark:text-white">{order.order_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-stone-900 dark:text-white">{order.buyer?.full_name ?? "-"}</p>
                    <p className="text-xs text-stone-500">{order.buyer?.email ?? "No buyer email"}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[order.status]}`}>
                      <span className="h-1 w-1 rounded-full bg-current" />
                      {order.status.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total))}</p>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400">
                        {getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status).label}
                      </p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/vendor/orders/${order.id}`}>
                      <button className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-white">
                        <Eye className="h-4 w-4" />
                      </button>
                    </Link>
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
