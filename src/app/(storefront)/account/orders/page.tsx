"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronRight, Mail, Package, Truck } from "lucide-react";
import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import { orderStatusCopy } from "@/lib/orders/status-copy";
import type { Order, OrderItem } from "@/types/orders";
import type { Store } from "@/types";

type BuyerOrderListItem = Pick<Order, "id" | "order_number" | "created_at" | "status" | "total"> & {
  store: Pick<Store, "name" | "slug"> | null;
  items: Pick<OrderItem, "id" | "product_name" | "product_image" | "quantity" | "unit_price">[];
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
      <Card className="border-stone-200/70 bg-stone-50/80 p-6 dark:border-stone-800 dark:bg-stone-900/60">
        <CardTitle className="text-3xl">My orders</CardTitle>
        <CardDescription>
          Track delivery progress, payment milestones, and post-purchase updates in one place.
        </CardDescription>
        <p className="mt-4 text-xs font-medium uppercase tracking-[0.18em] text-stone-400">
          {orders.length} order{orders.length !== 1 ? "s" : ""}
        </p>
      </Card>

      <div className="mt-8 space-y-4">
        {isInitialLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="space-y-5 p-5">
              <SkeletonBlock lines={2} />
              <div className="flex gap-2">
                {Array.from({ length: 4 }).map((__, imageIndex) => (
                  <div key={imageIndex} className="h-12 w-12 animate-pulse rounded-sm bg-stone-100 dark:bg-stone-800" />
                ))}
              </div>
              <SkeletonBlock lines={1} />
            </Card>
          ))
        ) : error ? (
          <StatePanel
            tone="danger"
            title="We could not load your orders"
            description={error}
            actionLabel="Try again"
            onAction={() => window.location.reload()}
          />
        ) : orders.length === 0 ? (
          <StatePanel
            title="No orders yet"
            description="Once you place your first order, delivery progress and vendor updates will appear here."
            icon={Package}
          />
        ) : (
          orders.map((order) => (
            <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
              <Link
                href={`/account/orders/${order.id}`}
                className="block"
              >
                <Card className="border-stone-200/80 bg-white p-5 transition-shadow hover:shadow-sm dark:border-stone-800 dark:bg-stone-900">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{order.order_number}</p>
                      <p className="text-xs text-stone-500">
                        {formatDate(order.created_at)} &middot; {order.store?.name ?? "Marketplace order"}
                      </p>
                      <p className="mt-2 max-w-xl text-sm text-stone-500">{orderStatusCopy[order.status].buyerMessage}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <OrderStatusBadge status={order.status} />
                      <span className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total))}</span>
                      <ChevronRight className="h-4 w-4 text-stone-400" />
                    </div>
                  </div>
                  {order.items.length > 0 && (
                    <div className="mt-4 flex gap-2">
                      {order.items.slice(0, 4).map((item) => (
                        <div key={item.id} className="relative h-12 w-12 overflow-hidden rounded-sm bg-stone-100 dark:bg-stone-800">
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
                        <div className="flex h-12 w-12 items-center justify-center rounded-sm bg-stone-100 text-xs text-stone-400 dark:bg-stone-800">
                          +{order.items.length - 4}
                        </div>
                      ) : null}
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 border-t border-stone-100 pt-4 text-[11px] text-stone-500 dark:border-stone-800 sm:grid-cols-2">
                    <span className="inline-flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5" />
                      Shipment updates appear here as soon as the vendor adds them
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      Order communication stays visible in your account history
                    </span>
                  </div>
                </Card>
              </Link>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
