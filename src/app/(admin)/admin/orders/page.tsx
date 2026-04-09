"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, DollarSign, Package, ShieldAlert } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge, ToneBadge } from "@/components/ui/status-badge";
import { StatePanel } from "@/components/ui/state-panel";
import { getPayoutAnomaly, getPayoutState } from "@/lib/orders/payout-state";
import { isExceptionStatus, isReturnStatus } from "@/lib/orders/operations-metrics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { OrderItem } from "@/types/orders";
import type { Order } from "@/types/orders";
import type { Profile, Store } from "@/types";

type ReviewFilter = "all" | "exceptions" | "returns" | "payout_alerts";

type AdminRiskOrder = Pick<
  Order,
  | "id"
  | "order_number"
  | "status"
  | "total"
  | "created_at"
  | "tracking_number"
  | "notes"
  | "delivered_at"
  | "delivery_failed_at"
  | "reshipping_started_at"
  | "return_initiated_at"
  | "return_approved_at"
  | "return_in_transit_at"
  | "return_received_at"
  | "stripe_transfer_id"
  | "stripe_transfer_status"
  | "payout_reconciled_at"
> & {
  buyer: Pick<Profile, "full_name" | "email"> | null;
  store: Pick<Store, "id" | "name" | "slug" | "status"> | null;
  items: Pick<OrderItem, "id">[] | null;
};

function getOrderRiskReasons(order: AdminRiskOrder) {
  const reasons: string[] = [];

  if (order.status === "delivery_failed") {
    reasons.push("Delivery exception");
  } else if (order.status === "reshipping") {
    reasons.push("Retry shipment active");
  }

  if (isReturnStatus(order.status) && order.status !== "refunded") {
    reasons.push("Return flow open");
  }

  const payoutAnomaly = getPayoutAnomaly(
    order.status,
    order.stripe_transfer_id,
    order.stripe_transfer_status,
    order.payout_reconciled_at
  );
  if (payoutAnomaly) {
    reasons.push(payoutAnomaly.label);
  }

  return reasons;
}

function getLatestOperationalEvent(order: AdminRiskOrder) {
  const events = [
    { label: "Return received", value: order.return_received_at },
    { label: "Return in transit", value: order.return_in_transit_at },
    { label: "Return approved", value: order.return_approved_at },
    { label: "Return initiated", value: order.return_initiated_at },
    { label: "Reshipping started", value: order.reshipping_started_at },
    { label: "Delivery failed", value: order.delivery_failed_at },
    { label: "Delivered", value: order.delivered_at },
    { label: "Order placed", value: order.created_at },
  ].find((entry) => Boolean(entry.value));

  return events ?? { label: "Order placed", value: order.created_at };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminRiskOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      setLoading(true);
      setError(null);

      const supabase = getSupabaseBrowserClient();
      const { data, error: queryError } = await supabase
        .from("orders")
        .select(
          "id, order_number, status, total, created_at, tracking_number, notes, delivered_at, delivery_failed_at, reshipping_started_at, return_initiated_at, return_approved_at, return_in_transit_at, return_received_at, stripe_transfer_id, stripe_transfer_status, payout_reconciled_at, buyer:profiles(full_name, email), store:stores(id, name, slug, status), items:order_items(id)"
        )
        .order("created_at", { ascending: false });

      if (queryError) {
        setOrders([]);
        setError(queryError.message);
      } else {
        setOrders((data ?? []) as AdminRiskOrder[]);
      }

      setLoading(false);
    }

    void fetchOrders();
  }, []);

  const flaggedOrders = useMemo(
    () => orders.filter((order) => getOrderRiskReasons(order).length > 0),
    [orders]
  );

  const visibleOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return flaggedOrders.filter((order) => {
      if (normalizedSearch) {
        const haystack = [
          order.order_number,
          order.store?.name ?? "",
          order.store?.slug ?? "",
          order.buyer?.full_name ?? "",
          order.buyer?.email ?? "",
        ]
          .join(" ")
          .toLowerCase();

        if (!haystack.includes(normalizedSearch)) {
          return false;
        }
      }

      switch (filter) {
        case "exceptions":
          return isExceptionStatus(order.status);
        case "returns":
          return isReturnStatus(order.status) && order.status !== "refunded";
        case "payout_alerts":
          return Boolean(
            getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at)
          );
        default:
          return true;
      }
    });
  }, [filter, flaggedOrders, search]);

  useEffect(() => {
    if (!visibleOrders.length) {
      setSelectedOrderId(null);
      return;
    }

    if (!selectedOrderId || !visibleOrders.some((order) => order.id === selectedOrderId)) {
      setSelectedOrderId(visibleOrders[0].id);
    }
  }, [selectedOrderId, visibleOrders]);

  const selectedOrder = visibleOrders.find((order) => order.id === selectedOrderId) ?? null;
  const summary = {
    flagged: flaggedOrders.length,
    exceptions: flaggedOrders.filter((order) => isExceptionStatus(order.status)).length,
    returns: flaggedOrders.filter((order) => isReturnStatus(order.status) && order.status !== "refunded").length,
    payoutAlerts: flaggedOrders.filter((order) =>
      Boolean(getPayoutAnomaly(order.status, order.stripe_transfer_id, order.stripe_transfer_status, order.payout_reconciled_at))
    ).length,
  };

  const summaryCards = [
    { label: "Flagged orders", value: summary.flagged, detail: "orders requiring operational review", icon: ShieldAlert },
    { label: "Delivery exceptions", value: summary.exceptions, detail: "delivery failures and retry shipments", icon: AlertTriangle },
    { label: "Open returns", value: summary.returns, detail: "return flows still in progress", icon: Package },
    { label: "Payout alerts", value: summary.payoutAlerts, detail: "settlement or reconciliation anomalies", icon: DollarSign },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="max-w-3xl">
        <Card className="border-stone-200/70 bg-stone-50/80 p-6 dark:border-stone-800 dark:bg-stone-900/60">
          <CardTitle className="text-2xl">Order risk review</CardTitle>
          <CardDescription>
            Review unresolved delivery, return, and payout issues at the order level so admins can intervene with context.
          </CardDescription>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{card.label}</p>
              <div className="rounded-full bg-stone-100 p-2 text-stone-700 dark:bg-stone-800 dark:text-stone-300">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{card.value}</p>
            <p className="mt-1 text-xs text-stone-500">{card.detail}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-1">
          {[
            { label: "All flagged", value: "all" as const },
            { label: "Exceptions", value: "exceptions" as const },
            { label: "Returns", value: "returns" as const },
            { label: "Payout alerts", value: "payout_alerts" as const },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
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
        <input
          type="text"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search orders, stores, or buyers"
          className="h-9 w-72 border-b border-stone-200 bg-transparent text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_380px]">
        <Card className="p-0">
          <div className="border-b border-stone-100 px-5 py-4 dark:border-stone-800">
            <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Flagged queue</p>
            <p className="mt-1 text-sm text-stone-500">{visibleOrders.length} order(s) match the current review view.</p>
          </div>

          {loading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-sm bg-stone-100 dark:bg-stone-800" />
              ))}
            </div>
          ) : error ? (
            <div className="p-5">
              <StatePanel
                tone="danger"
                title="We could not load flagged orders"
                description={error}
                actionLabel="Try again"
                onAction={() => window.location.reload()}
              />
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="p-5">
              <StatePanel
                title="No orders match this review view"
                description="Try another risk filter or search for a different order, store, or buyer."
                icon={Package}
              />
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800">
              {visibleOrders.map((order) => {
                const payoutState = getPayoutState(order.status, order.stripe_transfer_id, order.stripe_transfer_status);
                const reasons = getOrderRiskReasons(order);
                const isSelected = order.id === selectedOrderId;

                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`w-full px-5 py-4 text-left transition-colors ${
                      isSelected ? "bg-stone-50 dark:bg-stone-800/40" : "hover:bg-stone-50/70 dark:hover:bg-stone-800/20"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-stone-900 dark:text-white">{order.order_number}</p>
                        <p className="mt-1 text-xs text-stone-500">
                          {order.store?.name ?? "Unknown store"} | {order.buyer?.full_name ?? order.buyer?.email ?? "Unknown buyer"}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {reasons.map((reason) => (
                            <span
                              key={reason}
                              className="inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                            >
                              {reason}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right text-xs text-stone-500">
                        <OrderStatusBadge status={order.status} />
                        <div className="mt-2">
                          <ToneBadge tone={payoutState.tone === "success" ? "success" : payoutState.tone === "warning" ? "warning" : payoutState.tone === "muted" ? "muted" : "info"}>
                            {payoutState.label}
                          </ToneBadge>
                        </div>
                        <p className="mt-1">{formatPrice(Number(order.total))}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card>
          <CardTitle>Review detail</CardTitle>
          {!selectedOrder ? (
            <p className="mt-4 text-sm text-stone-500">Select a flagged order to review the latest operational context.</p>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Order</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{selectedOrder.order_number}</h2>
                <p className="mt-1 text-sm text-stone-500">{formatDate(selectedOrder.created_at)}</p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="border border-stone-200 p-4 dark:border-stone-800">
                  <p className="text-xs uppercase tracking-widest text-stone-400">Store</p>
                  <p className="mt-2 font-medium text-stone-900 dark:text-white">{selectedOrder.store?.name ?? "Unknown store"}</p>
                  <p className="mt-1 text-xs text-stone-500">/{selectedOrder.store?.slug ?? "missing-store"}</p>
                </div>
                <div className="border border-stone-200 p-4 dark:border-stone-800">
                  <p className="text-xs uppercase tracking-widest text-stone-400">Buyer</p>
                  <p className="mt-2 font-medium text-stone-900 dark:text-white">{selectedOrder.buyer?.full_name ?? "Unknown buyer"}</p>
                  <p className="mt-1 text-xs text-stone-500">{selectedOrder.buyer?.email ?? "No email on record"}</p>
                </div>
              </div>

              <div className="space-y-3 border-t border-stone-100 pt-5 text-sm dark:border-stone-800">
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Order status</span>
                  <OrderStatusBadge status={selectedOrder.status} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Payout state</span>
                  <span className="font-medium text-stone-900 dark:text-white">
                    {getPayoutState(selectedOrder.status, selectedOrder.stripe_transfer_id, selectedOrder.stripe_transfer_status).label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Latest milestone</span>
                  <span className="font-medium text-stone-900 dark:text-white">
                    {getLatestOperationalEvent(selectedOrder).label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Items</span>
                  <span className="font-medium text-stone-900 dark:text-white">{selectedOrder.items?.length ?? 0}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-500">Order total</span>
                  <span className="font-medium text-stone-900 dark:text-white">{formatPrice(Number(selectedOrder.total))}</span>
                </div>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Risk reasons</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {getOrderRiskReasons(selectedOrder).map((reason) => (
                    <span
                      key={reason}
                      className="inline-flex px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300"
                    >
                      {reason}
                    </span>
                  ))}
                </div>
              </div>

              {getPayoutAnomaly(
                selectedOrder.status,
                selectedOrder.stripe_transfer_id,
                selectedOrder.stripe_transfer_status,
                selectedOrder.payout_reconciled_at
              ) ? (
                <div className="border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                  {
                    getPayoutAnomaly(
                      selectedOrder.status,
                      selectedOrder.stripe_transfer_id,
                      selectedOrder.stripe_transfer_status,
                      selectedOrder.payout_reconciled_at
                    )?.description
                  }
                </div>
              ) : null}

              <div className="border-t border-stone-100 pt-5 dark:border-stone-800">
                <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Reconciliation trail</p>
                <div className="mt-3 space-y-2 text-sm text-stone-500">
                  <div className="flex items-center justify-between">
                    <span>Transfer state</span>
                    <span className="font-medium text-stone-900 dark:text-white">
                      {selectedOrder.stripe_transfer_status ? selectedOrder.stripe_transfer_status.replaceAll("_", " ") : "Awaiting Stripe update"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Transfer recorded</span>
                    <span className="font-medium text-stone-900 dark:text-white">{selectedOrder.stripe_transfer_id ? "Yes" : "No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Reconciled timestamp</span>
                    <span className="font-medium text-stone-900 dark:text-white">
                      {selectedOrder.payout_reconciled_at ? formatDate(selectedOrder.payout_reconciled_at) : "Not yet recorded"}
                    </span>
                  </div>
                </div>
              </div>

              {selectedOrder.notes ? (
                <div className="border-t border-stone-100 pt-5 dark:border-stone-800">
                  <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Vendor internal note</p>
                  <p className="mt-3 text-sm leading-relaxed text-stone-500">{selectedOrder.notes}</p>
                </div>
              ) : null}
            </div>
          )}
        </Card>
      </div>
    </motion.div>
  );
}
