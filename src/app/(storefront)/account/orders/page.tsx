"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Mail, Package, Truck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import { orderStatusCopy } from "@/lib/orders/status-copy";
import type { Order, OrderItem } from "@/types/orders";
import type { OrderStatus, Store } from "@/types";

type BuyerOrderListItem = Pick<Order, "id" | "order_number" | "created_at" | "status" | "total"> & {
  store: Pick<Store, "name" | "slug"> | null;
  items: Pick<OrderItem, "id" | "product_name" | "product_image" | "quantity" | "unit_price">[];
};

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

export default function BuyerOrdersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [orders, setOrders] = useState<BuyerOrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrders() {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const sb = getSupabaseBrowserClient();
      const { data, error: queryError } = await sb
        .from("orders")
        .select("id, order_number, created_at, status, total, store:stores(name, slug), items:order_items(id, product_name, product_image, quantity, unit_price)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });

      if (queryError) {
        setError(queryError.message);
        setOrders([]);
      } else {
        setOrders((data ?? []) as BuyerOrderListItem[]);
      }

      setLoading(false);
    }

    if (authLoading) {
      return;
    }

    void fetchOrders();
  }, [authLoading, user]);

  const isInitialLoading = authLoading || loading;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-white">My orders</h1>
      <p className="mt-1 text-sm text-stone-500">
        {orders.length} order{orders.length !== 1 ? "s" : ""}
      </p>

      <div className="mt-8 space-y-4">
        {isInitialLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-32 animate-pulse bg-stone-100 dark:bg-stone-800" />
          ))
        ) : error ? (
          <div className="border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
            We could not load your orders right now. {error}
          </div>
        ) : orders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-stone-300" />
            <p className="font-serif text-lg text-stone-400">No orders yet</p>
          </div>
        ) : (
          orders.map((order) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                href={`/account/orders/${order.id}`}
                className="block border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-stone-800 dark:bg-stone-900"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-stone-900 dark:text-white">{order.order_number}</p>
                    <p className="text-xs text-stone-500">
                      {formatDate(order.created_at)} &middot; {order.store?.name ?? "Marketplace order"}
                    </p>
                    <p className="mt-1 text-xs text-stone-500">{orderStatusCopy[order.status].buyerMessage}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[order.status]}`}>
                      {order.status.replaceAll("_", " ")}
                    </span>
                    <span className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total))}</span>
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </div>
                </div>
                {order.items.length > 0 && (
                  <div className="mt-3 flex gap-2">
                    {order.items.slice(0, 4).map((item) => (
                      <div key={item.id} className="relative h-12 w-12 overflow-hidden bg-stone-100 dark:bg-stone-800">
                        {item.product_image ? (
                          <Image
                            src={item.product_image}
                            alt={item.product_name}
                            fill
                            sizes="48px"
                            className="object-cover"
                          />
                        ) : null}
                      </div>
                    ))}
                    {order.items.length > 4 ? (
                      <div className="flex h-12 w-12 items-center justify-center bg-stone-100 text-xs text-stone-400 dark:bg-stone-800">
                        +{order.items.length - 4}
                      </div>
                    ) : null}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap gap-3 border-t border-stone-100 pt-3 text-[11px] text-stone-500 dark:border-stone-800">
                  <span className="inline-flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5" />
                    Shipment updates appear here as soon as the vendor adds them
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5" />
                    Order communication stays visible in your account history
                  </span>
                </div>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
