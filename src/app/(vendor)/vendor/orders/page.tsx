"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eye, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { OrderStatusBadge, ToneBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import { getPayoutState } from "@/lib/orders/payout-state";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { loadQueuePreference, loadQueueTextPreference, saveQueuePreference } from "@/lib/ui/queue-preferences";
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

type VendorOrderListItem = Pick<Order, "id" | "order_number" | "status" | "created_at" | "total" | "stripe_transfer_id" | "stripe_transfer_status"> & {
  buyer: Pick<Profile, "full_name" | "email"> | null;
  items: Pick<OrderItem, "id">[];
};

const ordersViewKey = "nexcart.vendor.orders.view";
const ordersStatusKey = "nexcart.vendor.orders.status";
const ordersSearchKey = "nexcart.vendor.orders.search";

export default function VendorOrdersPage() {
  const { store, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<VendorOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<OrderStatus | "all">("all");
  const [savedView, setSavedView] = useState<OrderSavedView>("all");
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSavedView(loadQueuePreference(ordersViewKey, savedViews.map((view) => view.value), "all"));
    setStatus(loadQueuePreference(ordersStatusKey, statuses, "all"));
    setSearch(loadQueueTextPreference(ordersSearchKey));
  }, []);

  useEffect(() => {
    saveQueuePreference(ordersViewKey, savedView);
  }, [savedView]);

  useEffect(() => {
    saveQueuePreference(ordersStatusKey, status);
  }, [status]);

  useEffect(() => {
    saveQueuePreference(ordersSearchKey, search);
  }, [search]);

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
        <Card className="space-y-4 p-6">
          <SkeletonBlock lines={2} />
        </Card>
        <Card className="space-y-3 p-6">
          <SkeletonBlock lines={6} />
        </Card>
      </div>
    );
  }

  if (!store) {
    return (
      <StatePanel
        tone="warning"
        title="Store access is unavailable"
        description="Finish your store setup to unlock operational order management and fulfillment controls."
      />
    );
  }

  return (
    <PageTransition>
      <PageIntro
        title="Orders"
        description="Run daily fulfillment, payout review, and exception handling from one operational queue."
        className="border-stone-200/70 bg-stone-50/80 dark:border-stone-800 dark:bg-stone-900/60"
        actions={
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
            {visibleOrders.length} of {orders.length} order{orders.length !== 1 ? "s" : ""}
          </p>
        }
      />

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

      <Card className="overflow-hidden border-stone-200/80 bg-white p-0 dark:border-stone-800 dark:bg-stone-900">
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
                      <div className="h-4 animate-pulse rounded-sm bg-stone-100 dark:bg-stone-800" />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <StatePanel
                    tone="danger"
                    title="We could not load your orders"
                    description={error}
                    actionLabel="Try again"
                    onAction={() => void fetchOrders()}
                  />
                </td>
              </tr>
            ) : visibleOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8">
                  <StatePanel
                    title="No orders match this operational view"
                    description="Try another saved view, clear your status filter, or search for a different buyer or order number."
                    icon={Package}
                  />
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
                    <OrderStatusBadge status={order.status} />
                  </td>
                  <td className="px-4 py-3 text-sm text-stone-500">{formatDate(order.created_at)}</td>
                  <td className="px-4 py-3 text-right">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total))}</p>
                      <ToneBadge tone={order.stripe_transfer_status === "paid" ? "success" : "muted"}>
                        {getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status).label}
                      </ToneBadge>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/vendor/orders/${order.id}`}>
                      <Button size="icon" variant="ghost" aria-label={`View order ${order.order_number}`}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </Card>
    </PageTransition>
  );
}
