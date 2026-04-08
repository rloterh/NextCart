"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Eye, Package } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { Order, OrderItem } from "@/types/orders";
import type { OrderStatus, Profile } from "@/types";

const statuses: Array<OrderStatus | "all"> = ["all", "pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered", "cancelled"];

const statusColors: Record<OrderStatus, string> = {
  pending: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  confirmed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  processing: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  packed: "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300",
  shipped: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  out_for_delivery: "bg-cyan-50 text-cyan-700 dark:bg-cyan-900/20 dark:text-cyan-300",
  delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
  refunded: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
};

type VendorOrderListItem = Pick<Order, "id" | "order_number" | "status" | "created_at" | "total"> & {
  buyer: Pick<Profile, "full_name" | "email"> | null;
  items: Pick<OrderItem, "id">[];
};

export default function VendorOrdersPage() {
  const { store, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<VendorOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [error, setError] = useState<string | null>(null);

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
      .select("id, order_number, status, created_at, total, buyer:profiles(full_name, email), items:order_items(id)")
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
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap gap-1">
        {statuses.map((value) => (
          <button
            key={value}
            onClick={() => setStatus(value)}
            className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wider transition-colors ${
              status === value ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900" : "text-stone-500 hover:text-stone-900"
            }`}
          >
            {value === "all" ? "all" : value.replaceAll("_", " ")}
          </button>
        ))}
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
            ) : orders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-16 text-center">
                  <Package className="mx-auto mb-3 h-8 w-8 text-stone-300" />
                  <p className="text-sm text-stone-400">No orders yet</p>
                </td>
              </tr>
            ) : (
              orders.map((order) => (
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
                  <td className="px-4 py-3 text-right text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total))}</td>
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
