"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, MapPin, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import { orderStatusCopy } from "@/lib/orders/status-copy";
import { getStoreProfileContent } from "@/lib/storefront/store-profile";
import { useUIStore } from "@/stores/ui-store";
import type { Profile, Store } from "@/types";
import type { CheckoutShippingAddress, Order, OrderItem } from "@/types/orders";

type VendorOrderDetail = Order & {
  buyer: Pick<Profile, "full_name" | "email"> | null;
  store: Pick<Store, "name" | "settings"> | null;
  items: OrderItem[];
};

type OrderUpdatePayload = {
  status: Order["status"];
  tracking_number?: string | null;
  shipped_at?: string;
  delivered_at?: string;
  cancelled_at?: string;
};

export default function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { store, isLoading: authLoading } = useAuth();
  const addToast = useUIStore((state) => state.addToast);
  const [order, setOrder] = useState<VendorOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState("");
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrder() {
      if (!id || !store) {
        setOrder(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const sb = getSupabaseBrowserClient();
      const { data, error: queryError } = await sb
        .from("orders")
        .select("*, buyer:profiles(full_name, email), store:stores(name, settings), items:order_items(*)")
        .eq("id", id)
        .eq("store_id", store.id)
        .single();

      if (queryError) {
        setError(queryError.message);
        setOrder(null);
      } else {
        setOrder(data as VendorOrderDetail);
        setTracking(data?.tracking_number ?? "");
      }

      setLoading(false);
    }

    if (authLoading) {
      return;
    }

    void fetchOrder();
  }, [authLoading, id, store]);

  async function updateStatus(status: Order["status"]) {
    if (!id) {
      return;
    }

    const normalizedTracking = tracking.trim();
    if (status === "shipped" && !normalizedTracking) {
      addToast({ type: "error", title: "Tracking number required", description: "Add a tracking number before marking this order as shipped." });
      return;
    }

    setUpdating(true);
    const sb = getSupabaseBrowserClient();
    const updates: OrderUpdatePayload = { status };

    if (status === "shipped") {
      updates.shipped_at = new Date().toISOString();
      updates.tracking_number = normalizedTracking;
    }

    if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }

    if (status === "cancelled") {
      updates.cancelled_at = new Date().toISOString();
    }

    const { error: updateError } = await sb.from("orders").update(updates).eq("id", id);

    if (updateError) {
      addToast({ type: "error", title: "Update failed", description: updateError.message });
    } else {
      addToast({ type: "success", title: `Order ${status}` });
      setOrder((prev) => (prev ? { ...prev, ...updates } : prev));
    }

    setUpdating(false);
  }

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-96 animate-pulse bg-stone-100 dark:bg-stone-800" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="rounded-none border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
        Store access is unavailable for this account. Finish your store setup to manage order operations.
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-20">
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

  const address = order.shipping_address as CheckoutShippingAddress | null;
  const canProcess = order.status === "confirmed";
  const canShip = order.status === "processing";
  const canDeliver = order.status === "shipped";
  const storeProfile = order.store ? getStoreProfileContent(order.store) : null;
  const statusContent = orderStatusCopy[order.status];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/vendor/orders">
            <button className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div>
            <h1 className="font-serif text-2xl text-stone-900 dark:text-white">{order.order_number}</h1>
            <p className="text-sm text-stone-500">
              {formatDate(order.created_at)} &middot; {order.buyer?.full_name ?? "Marketplace buyer"}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canProcess ? (
            <Button onClick={() => updateStatus("processing")} isLoading={updating} leftIcon={<Package className="h-4 w-4" />}>
              Start processing
            </Button>
          ) : null}
          {canShip ? (
            <Button onClick={() => updateStatus("shipped")} isLoading={updating} leftIcon={<Truck className="h-4 w-4" />}>
              Mark shipped
            </Button>
          ) : null}
          {canDeliver ? (
            <Button onClick={() => updateStatus("delivered")} isLoading={updating} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Mark delivered
            </Button>
          ) : null}
        </div>
      </div>

      <Card>
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Buyer-facing status</p>
        <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{statusContent.label}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{statusContent.vendorMessage}</p>
      </Card>

      <Card>
        <CardTitle>Order items</CardTitle>
        <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              <div className="relative h-14 w-12 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                {item.product_image ? <Image src={item.product_image} alt={item.product_name} fill sizes="48px" className="object-cover" /> : null}
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
            <span>{formatPrice(Number(order.shipping_cost))}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-500">Platform fee</span>
            <span className="text-red-500">-{formatPrice(Number(order.platform_fee))}</span>
          </div>
          <div className="flex justify-between border-t border-stone-200 pt-2 font-medium dark:border-stone-700">
            <span>Your payout</span>
            <span className="text-emerald-600">{formatPrice(Number(order.total) - Number(order.platform_fee))}</span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {canShip || order.status === "shipped" ? (
          <Card>
            <CardTitle>Tracking information</CardTitle>
            <div className="mt-4">
              <Input label="Tracking number" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Enter tracking number" />
            </div>
            <p className="mt-3 text-sm text-stone-500">The buyer sees shipment progress here as soon as you add and save tracking.</p>
          </Card>
        ) : null}

        <Card>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-stone-400" />
            <CardTitle>Communication cues</CardTitle>
          </div>
          <div className="mt-3 space-y-3 text-sm text-stone-600 dark:text-stone-400">
            <p>{storeProfile?.shippingNote || "Use status and tracking updates to keep the buyer informed from confirmation through shipment."}</p>
            <p>{storeProfile?.processingTime || "If fulfillment timing changes, align your shipment updates with the actual processing timeline."}</p>
            {storeProfile?.supportEmail ? <p className="text-stone-900 dark:text-white">Store support: {storeProfile.supportEmail}</p> : null}
          </div>
        </Card>
      </div>

      {address ? (
        <Card>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-stone-400" />
            <CardTitle>Ship to</CardTitle>
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
    </motion.div>
  );
}
