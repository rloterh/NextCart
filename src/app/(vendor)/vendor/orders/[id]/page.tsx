"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Mail, MapPin, Package, PencilLine, Truck } from "lucide-react";
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
  tracking_url?: string | null;
  packed_at?: string | null;
  out_for_delivery_at?: string | null;
  delivery_failed_at?: string | null;
  reshipping_started_at?: string | null;
  return_initiated_at?: string | null;
  return_approved_at?: string | null;
  return_in_transit_at?: string | null;
  return_received_at?: string | null;
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
  const [trackingUrl, setTrackingUrl] = useState("");
  const [internalNotes, setInternalNotes] = useState("");
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
        setTrackingUrl(data?.tracking_url ?? "");
        setInternalNotes(data?.notes ?? "");
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
    const normalizedTrackingUrl = trackingUrl.trim();
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
      updates.tracking_url = normalizedTrackingUrl || null;
    }

    if (status === "packed") {
      updates.packed_at = new Date().toISOString();
    }

    if (status === "out_for_delivery") {
      updates.out_for_delivery_at = new Date().toISOString();
    }

    if (status === "delivery_failed") {
      updates.delivery_failed_at = new Date().toISOString();
    }

    if (status === "reshipping") {
      updates.reshipping_started_at = new Date().toISOString();
      updates.tracking_number = null;
      updates.tracking_url = null;
    }

    if (status === "delivered") {
      updates.delivered_at = new Date().toISOString();
    }

    if (status === "return_initiated") {
      updates.return_initiated_at = new Date().toISOString();
    }

    if (status === "return_approved") {
      updates.return_approved_at = new Date().toISOString();
    }

    if (status === "return_in_transit") {
      updates.return_in_transit_at = new Date().toISOString();
    }

    if (status === "return_received") {
      updates.return_received_at = new Date().toISOString();
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

  async function saveInternalNotes() {
    if (!id) return;

    setUpdating(true);
    const sb = getSupabaseBrowserClient();
    const { error: updateError } = await sb.from("orders").update({ notes: internalNotes.trim() || null }).eq("id", id);

    if (updateError) {
      addToast({ type: "error", title: "Unable to save notes", description: updateError.message });
    } else {
      addToast({
        type: "success",
        title: "Internal notes updated",
        description: "These notes stay vendor-side so your team keeps fulfillment context in one place.",
      });
      setOrder((prev) => (prev ? { ...prev, notes: internalNotes.trim() || null } : prev));
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
  const canPack = order.status === "processing";
  const canShip = order.status === "packed" || order.status === "reshipping";
  const canMarkOutForDelivery = order.status === "shipped";
  const canDeliver = order.status === "out_for_delivery";
  const canMarkDeliveryFailed = order.status === "shipped" || order.status === "out_for_delivery";
  const canInitiateReturn = order.status === "delivered";
  const canRetryDelivery = order.status === "delivery_failed";
  const canApproveReturn = order.status === "return_initiated";
  const canMarkReturnTransit = order.status === "return_approved";
  const canMarkReturnReceived = order.status === "return_in_transit";
  const storeProfile = order.store ? getStoreProfileContent(order.store) : null;
  const statusContent = orderStatusCopy[order.status];
  const timeline = [
    { label: "Order placed", timestamp: order.created_at, reached: true, description: "The buyer completed checkout and the order entered your queue." },
    { label: "Confirmed", timestamp: null, reached: order.status !== "pending", description: "Payment and order details were confirmed for vendor handling." },
    { label: "Processing", timestamp: null, reached: ["processing", "packed", "shipped", "out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "The order is actively being prepared by the vendor team." },
    { label: "Packed", timestamp: order.packed_at ?? null, reached: ["packed", "shipped", "out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "Packing is complete and the shipment is ready for carrier handoff." },
    { label: "Shipped", timestamp: order.shipped_at, reached: ["shipped", "out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "Tracking and shipment details have been recorded." },
    { label: "Out for delivery", timestamp: order.out_for_delivery_at ?? null, reached: ["out_for_delivery", "delivery_failed", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "The carrier is on the final route to the buyer." },
    { label: "Delivery failed", timestamp: order.delivery_failed_at ?? null, reached: ["delivery_failed", "reshipping"].includes(order.status), description: "The shipment hit a failed delivery event and needs follow-up." },
    { label: "Reshipping", timestamp: order.reshipping_started_at ?? null, reached: order.status === "reshipping", description: "A retry shipment or replacement handoff is being arranged." },
    { label: "Delivered", timestamp: order.delivered_at, reached: ["delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "The order was marked as delivered." },
    { label: "Return initiated", timestamp: order.return_initiated_at ?? null, reached: ["return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "A return or exception flow started after delivery." },
    { label: "Return approved", timestamp: order.return_approved_at ?? null, reached: ["return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), description: "The vendor approved the return and shared next-step handling." },
    { label: "Return in transit", timestamp: order.return_in_transit_at ?? null, reached: ["return_in_transit", "return_received", "refunded"].includes(order.status), description: "The return shipment is on the way back to the vendor." },
    { label: "Return received", timestamp: order.return_received_at ?? null, reached: ["return_received", "refunded"].includes(order.status), description: "The vendor received the returned goods and can finalize resolution." },
    { label: "Cancelled", timestamp: order.cancelled_at, reached: Boolean(order.cancelled_at), description: "The order was cancelled before completion." },
  ].filter(
    (entry) =>
      (entry.label !== "Cancelled" || order.cancelled_at) &&
      (entry.label !== "Delivery failed" || order.delivery_failed_at) &&
      (entry.label !== "Reshipping" || order.reshipping_started_at) &&
      (entry.label !== "Return initiated" || order.return_initiated_at) &&
      (entry.label !== "Return approved" || order.return_approved_at) &&
      (entry.label !== "Return in transit" || order.return_in_transit_at) &&
      (entry.label !== "Return received" || order.return_received_at)
  );

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
          {canPack ? (
            <Button onClick={() => updateStatus("packed")} isLoading={updating} variant="outline" leftIcon={<Package className="h-4 w-4" />}>
              Mark packed
            </Button>
          ) : null}
          {canShip ? (
            <Button onClick={() => updateStatus("shipped")} isLoading={updating} leftIcon={<Truck className="h-4 w-4" />}>
              Mark shipped
            </Button>
          ) : null}
          {canMarkOutForDelivery ? (
            <Button onClick={() => updateStatus("out_for_delivery")} isLoading={updating} variant="outline" leftIcon={<Truck className="h-4 w-4" />}>
              Out for delivery
            </Button>
          ) : null}
          {canMarkDeliveryFailed ? (
            <Button onClick={() => updateStatus("delivery_failed")} isLoading={updating} variant="outline">
              Delivery failed
            </Button>
          ) : null}
          {canRetryDelivery ? (
            <Button onClick={() => updateStatus("reshipping")} isLoading={updating} variant="outline">
              Retry shipment
            </Button>
          ) : null}
          {canDeliver ? (
            <Button onClick={() => updateStatus("delivered")} isLoading={updating} leftIcon={<CheckCircle2 className="h-4 w-4" />}>
              Mark delivered
            </Button>
          ) : null}
          {canInitiateReturn ? (
            <Button onClick={() => updateStatus("return_initiated")} isLoading={updating} variant="outline">
              Initiate return
            </Button>
          ) : null}
          {canApproveReturn ? (
            <Button onClick={() => updateStatus("return_approved")} isLoading={updating} variant="outline">
              Approve return
            </Button>
          ) : null}
          {canMarkReturnTransit ? (
            <Button onClick={() => updateStatus("return_in_transit")} isLoading={updating} variant="outline">
              Return in transit
            </Button>
          ) : null}
          {canMarkReturnReceived ? (
            <Button onClick={() => updateStatus("return_received")} isLoading={updating} variant="outline">
              Return received
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
        <CardTitle>Fulfillment timeline</CardTitle>
        <div className="mt-4 space-y-4">
          {timeline.map((entry) => (
            <div key={entry.label} className="flex gap-3">
              <div className={`mt-1 h-2.5 w-2.5 rounded-full ${entry.reached ? "bg-stone-900 dark:bg-white" : "bg-stone-200 dark:bg-stone-700"}`} />
              <div>
                <p className="text-sm font-medium text-stone-900 dark:text-white">{entry.label}</p>
                <p className="mt-1 text-xs text-stone-400">{entry.timestamp ? formatDate(entry.timestamp) : entry.reached ? "Completed in workflow" : "Waiting on this milestone"}</p>
                <p className="mt-1 text-sm text-stone-500">{entry.description}</p>
              </div>
            </div>
          ))}
        </div>
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
        {canShip || canMarkOutForDelivery || order.status === "shipped" || order.status === "out_for_delivery" || order.status === "delivery_failed" || order.status === "delivered" ? (
          <Card>
            <CardTitle>Tracking information</CardTitle>
            <div className="mt-4">
              <Input label="Tracking number" value={tracking} onChange={(event) => setTracking(event.target.value)} placeholder="Enter tracking number" />
              <div className="mt-4">
                <Input label="Tracking URL" value={trackingUrl} onChange={(event) => setTrackingUrl(event.target.value)} placeholder="Optional carrier tracking link" />
              </div>
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
            <p>{storeProfile?.processingTime || "If fulfillment timing changes, align your packed, shipped, delivery, and exception updates with the actual timeline."}</p>
            {storeProfile?.supportEmail ? <p className="text-stone-900 dark:text-white">Store support: {storeProfile.supportEmail}</p> : null}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <PencilLine className="h-4 w-4 text-stone-400" />
          <CardTitle>Internal fulfillment notes</CardTitle>
        </div>
        <div className="mt-4">
          <textarea
            rows={4}
            value={internalNotes}
            onChange={(event) => setInternalNotes(event.target.value)}
            placeholder="Record packing context, supplier delays, team handoff notes, or exception handling details."
            className="w-full border-b border-stone-200 bg-transparent py-2 text-sm placeholder:text-stone-400 focus:border-stone-900 focus:outline-none dark:border-stone-700"
          />
        </div>
        <div className="mt-4 flex justify-end">
          <Button type="button" variant="outline" isLoading={updating} onClick={() => void saveInternalNotes()}>
            Save internal notes
          </Button>
        </div>
      </Card>

      {order.status === "delivery_failed" || order.status === "reshipping" || order.status === "return_initiated" || order.status === "return_approved" || order.status === "return_in_transit" || order.status === "return_received" ? (
        <Card>
          <CardTitle>Exception handling guidance</CardTitle>
          <div className="mt-3 space-y-3 text-sm text-stone-500">
            <p>
              {order.status === "delivery_failed" || order.status === "reshipping"
                ? "Capture the new shipment plan in notes, refresh tracking when the retry is booked, and keep buyer-facing timing aligned with the latest carrier update."
                : "Keep return instructions, inbound tracking, and final resolution notes aligned so the buyer always sees the current next step."}
            </p>
            <p>
              {storeProfile?.supportEmail
                ? `Escalations should route through ${storeProfile.supportEmail}.`
                : "Use your store support channel for any escalations tied to this exception."}
            </p>
          </div>
        </Card>
      ) : null}

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
