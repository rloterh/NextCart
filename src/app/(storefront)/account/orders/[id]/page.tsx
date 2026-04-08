"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, MapPin, Truck } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { Order, OrderItem, CheckoutShippingAddress } from "@/types/orders";
import type { Store } from "@/types";

const statusSteps = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

type BuyerOrderDetail = Order & {
  store: Pick<Store, "name" | "slug"> | null;
  items: OrderItem[];
};

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!user || !id) {
        setOrder(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const sb = getSupabaseBrowserClient();
      const { data, error: queryError } = await sb
        .from("orders")
        .select("*, store:stores(name, slug), items:order_items(*)")
        .eq("id", id)
        .eq("buyer_id", user.id)
        .single();

      if (queryError) {
        setError(queryError.message);
        setOrder(null);
      } else {
        setOrder(data as BuyerOrderDetail);
      }

      setLoading(false);
    }

    if (authLoading) {
      return;
    }

    void fetchOrder();
  }, [authLoading, id, user]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="h-96 animate-pulse bg-stone-100 dark:bg-stone-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="border border-red-200 bg-red-50 px-4 py-5 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          We could not load this order right now. {error}
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="py-20 text-center">
        <p className="font-serif text-xl text-stone-400">Order not found</p>
      </div>
    );
  }

  const currentStep = statusSteps.indexOf(order.status as (typeof statusSteps)[number]);
  const address = order.shipping_address as CheckoutShippingAddress | null;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="flex items-center gap-3">
        <Link href="/account/orders">
          <button className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
        </Link>
        <div>
          <h1 className="font-serif text-2xl text-stone-900 dark:text-white">{order.order_number}</h1>
          <p className="text-sm text-stone-500">
            Placed {formatDate(order.created_at)} &middot; {order.store?.name ?? "Marketplace order"}
          </p>
        </div>
      </div>

      {order.status !== "cancelled" && order.status !== "refunded" ? (
        <Card>
          <div className="flex items-center justify-between">
            {statusSteps.map((step, index) => (
              <div key={step} className="flex flex-1 items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center text-xs font-medium ${
                    index <= currentStep
                      ? "bg-stone-900 text-white dark:bg-white dark:text-stone-900"
                      : "bg-stone-100 text-stone-400 dark:bg-stone-800"
                  }`}
                >
                  {index + 1}
                </div>
                {index < statusSteps.length - 1 ? (
                  <div className={`h-0.5 flex-1 ${index < currentStep ? "bg-stone-900 dark:bg-white" : "bg-stone-200 dark:bg-stone-700"}`} />
                ) : null}
              </div>
            ))}
          </div>
          <div className="mt-2 flex justify-between text-[10px] uppercase tracking-widest text-stone-400">
            {statusSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </Card>
      ) : null}

      <Card>
        <CardTitle>Items</CardTitle>
        <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              <div className="relative h-16 w-14 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                {item.product_image ? (
                  <Image
                    src={item.product_image}
                    alt={item.product_name}
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                ) : null}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900 dark:text-white">{item.product_name}</p>
                <p className="text-xs text-stone-500">
                  Qty: {item.quantity} &times; {formatPrice(Number(item.unit_price))}
                </p>
              </div>
              <p className="text-sm font-medium">{formatPrice(Number(item.total))}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-stone-200 pt-4 text-sm dark:border-stone-700">
          <div className="flex justify-between">
            <span className="text-stone-500">Subtotal</span>
            <span>{formatPrice(Number(order.subtotal))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Shipping</span>
            <span>{Number(order.shipping_cost) === 0 ? "Free" : formatPrice(Number(order.shipping_cost))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Tax</span>
            <span>{formatPrice(Number(order.tax_amount))}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 font-medium dark:border-stone-700">
            <span>Total</span>
            <span>{formatPrice(Number(order.total))}</span>
          </div>
        </div>
      </Card>

      {address ? (
        <Card>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-stone-400" />
            <CardTitle>Shipping address</CardTitle>
          </div>
          <div className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            <p className="font-medium text-stone-900 dark:text-white">{address.fullName}</p>
            <p>
              {address.line1}
              {address.line2 ? `, ${address.line2}` : ""}
            </p>
            <p>
              {address.city}, {address.state} {address.postalCode}
            </p>
            {address.phone ? <p className="mt-1">{address.phone}</p> : null}
          </div>
        </Card>
      ) : null}

      {order.tracking_number ? (
        <Card>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-stone-400" />
            <CardTitle>Tracking</CardTitle>
          </div>
          <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{order.tracking_number}</p>
          {order.tracking_url ? (
            <a href={order.tracking_url} target="_blank" rel="noreferrer" className="mt-1 text-xs text-amber-700 hover:underline">
              Track shipment
            </a>
          ) : null}
        </Card>
      ) : null}
    </motion.div>
  );
}
