"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, MapPin, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { OrderStatusBadge } from "@/components/ui/status-badge";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import { getOrderRecoveryMessage } from "@/lib/platform/notifications";
import { renderOrderCommunicationTemplate } from "@/lib/orders/communication-templates";
import { orderStatusCopy } from "@/lib/orders/status-copy";
import { getStoreProfileContent } from "@/lib/storefront/store-profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatDate, formatPrice } from "@/lib/utils/constants";
import type { Store } from "@/types";
import { ORDER_STATUS_CONFIG } from "@/types/orders";
import type { CheckoutShippingAddress, Order, OrderItem } from "@/types/orders";

const statusSteps = ["pending", "confirmed", "processing", "packed", "shipped", "out_for_delivery", "delivered"] as const;

type BuyerOrderDetail = Order & {
  store: Pick<Store, "name" | "slug" | "settings"> | null;
  items: OrderItem[];
};

export default function BuyerOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [order, setOrder] = useState<BuyerOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
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
      .select("*, store:stores(name, slug, settings), items:order_items(*)")
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
  }, [id, user]);

  useEffect(() => {
    if (authLoading) {
      return;
    }

    void fetchOrder();
  }, [authLoading, fetchOrder]);

  if (authLoading || loading) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Card className="space-y-4">
          <SkeletonBlock lines={3} />
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <StatePanel
          title="We could not load this order right now"
          description={error}
          tone="danger"
          actionLabel="Retry"
          onAction={() => void fetchOrder()}
        />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-20">
        <StatePanel
          title="Order not found"
          description="This order may no longer be available for your account, or the link may be out of date."
        />
      </div>
    );
  }

  const progressStatus =
    order.status === "delivery_failed" || order.status === "reshipping"
      ? "out_for_delivery"
      : order.status === "return_initiated" ||
          order.status === "return_approved" ||
          order.status === "return_in_transit" ||
          order.status === "return_received"
        ? "delivered"
        : order.status;
  const currentStep = statusSteps.indexOf(progressStatus as (typeof statusSteps)[number]);
  const address = order.shipping_address as CheckoutShippingAddress | null;
  const storeProfile = order.store ? getStoreProfileContent(order.store) : null;
  const statusContent = orderStatusCopy[order.status];
  const communicationStatus =
    order.status === "reshipping" ||
    order.status === "return_initiated" ||
    order.status === "return_approved" ||
    order.status === "return_in_transit" ||
    order.status === "return_received"
      ? order.status
      : null;
  const resolutionTemplate = communicationStatus
    ? renderOrderCommunicationTemplate(communicationStatus, storeProfile, {
        orderNumber: order.order_number,
        storeName: order.store?.name ?? null,
        supportEmail: storeProfile?.supportEmail,
        trackingNumber: order.tracking_number,
        trackingUrl: order.tracking_url,
        returnsPolicy: storeProfile?.returnsPolicy,
        processingTime: storeProfile?.processingTime,
      })
    : null;
  const recoveryMessage = getOrderRecoveryMessage({
    audience: "buyer",
    status: order.status,
    storeName: order.store?.name ?? null,
    supportEmail: storeProfile?.supportEmail,
  });
  const timeline = [
    { key: "pending", label: "Order placed", reached: true, timestamp: order.created_at, description: "Checkout completed and payment entered the marketplace workflow." },
    { key: "confirmed", label: "Confirmed", reached: order.status !== "pending", timestamp: null, description: "Payment and order details were confirmed for vendor handling." },
    { key: "processing", label: "Processing", reached: ["processing", "packed", "shipped", "out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: null, description: "The vendor started preparing the order." },
    { key: "packed", label: "Packed", reached: ["packed", "shipped", "out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.packed_at ?? null, description: "Packing is complete and the shipment is prepared for carrier handoff." },
    { key: "shipped", label: "Shipped", reached: ["shipped", "out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.shipped_at ?? null, description: "Tracking is active and the parcel is moving through the carrier network." },
    { key: "out_for_delivery", label: "Out for delivery", reached: ["out_for_delivery", "delivery_failed", "reshipping", "delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.out_for_delivery_at ?? null, description: "The carrier is on the final route for delivery." },
    { key: "delivery_failed", label: "Delivery issue", reached: order.status === "delivery_failed", timestamp: order.delivery_failed_at ?? null, description: "The shipment hit a failed delivery event and the vendor is reviewing the next step." },
    { key: "reshipping", label: "Reshipping", reached: order.status === "reshipping", timestamp: order.reshipping_started_at ?? null, description: "The vendor is arranging a retry shipment after the failed delivery." },
    { key: "delivered", label: "Delivered", reached: ["delivered", "return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.delivered_at ?? null, description: "Delivery was completed and the order is ready for follow-up or review." },
    { key: "return_initiated", label: "Return initiated", reached: ["return_initiated", "return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.return_initiated_at ?? null, description: "A return or post-delivery exception was started on this order." },
    { key: "return_approved", label: "Return approved", reached: ["return_approved", "return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.return_approved_at ?? null, description: "The vendor approved the return and shared the next handoff details." },
    { key: "return_in_transit", label: "Return in transit", reached: ["return_in_transit", "return_received", "refunded"].includes(order.status), timestamp: order.return_in_transit_at ?? null, description: "The return shipment is on the way back to the vendor." },
    { key: "return_received", label: "Return received", reached: ["return_received", "refunded"].includes(order.status), timestamp: order.return_received_at ?? null, description: "The vendor received the returned goods and is finishing the resolution." },
  ];

  return (
    <PageTransition className="mx-auto max-w-3xl px-6 py-8">
      <PageIntro
        eyebrow="Order details"
        title={order.order_number}
        description={`Placed ${formatDate(order.created_at)} - ${order.store?.name ?? "Marketplace order"}`}
        actions={
          <Link href="/account/orders">
            <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
              Back to orders
            </Button>
          </Link>
        }
      />

      <Card>
        <p className="text-xs font-medium uppercase tracking-widest text-stone-400">Order status</p>
        <OrderStatusBadge status={order.status} className="mt-3" />
        <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{statusContent.label}</h2>
        <p className="mt-2 text-sm leading-relaxed text-stone-500">{statusContent.buyerMessage}</p>
      </Card>

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
              <span key={step}>{ORDER_STATUS_CONFIG[step].label}</span>
            ))}
          </div>
        </Card>
      ) : null}

      {order.status !== "cancelled" && order.status !== "refunded" ? (
        <Card>
          <CardTitle>Fulfillment timeline</CardTitle>
          <div className="mt-4 space-y-4">
            {timeline.map((entry) => (
              <div key={entry.key} className="flex gap-3">
                <div className={`mt-1 h-2.5 w-2.5 rounded-full ${entry.reached ? "bg-stone-900 dark:bg-white" : "bg-stone-200 dark:bg-stone-700"}`} />
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-white">{entry.label}</p>
                  <p className="mt-1 text-xs text-stone-400">
                    {entry.timestamp ? formatDate(entry.timestamp) : entry.reached ? "Completed in workflow" : "Waiting on this milestone"}
                  </p>
                  <p className="mt-1 text-sm text-stone-500">{entry.description}</p>
                </div>
              </div>
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
                {item.product_image ? <Image src={item.product_image} alt={item.product_name} fill sizes="56px" className="object-cover" /> : null}
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

      <div className="grid gap-6 md:grid-cols-2">
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

        <Card>
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-stone-400" />
            <CardTitle>Communication</CardTitle>
          </div>
          <div className="mt-3 space-y-3 text-sm text-stone-600 dark:text-stone-400">
            <p>{storeProfile?.shippingNote || "Shipping, packaging, and support context will continue to appear here as the vendor updates the order."}</p>
            <p>{storeProfile?.processingTime || "You can revisit this page any time to confirm whether the order has moved from packing into final delivery."}</p>
            {storeProfile?.supportEmail ? <p className="text-stone-900 dark:text-white">Support: {storeProfile.supportEmail}</p> : null}
          </div>
        </Card>
      </div>

      {recoveryMessage ? (
        <Card>
          <CardTitle>{recoveryMessage.title}</CardTitle>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{recoveryMessage.description}</p>
        </Card>
      ) : null}

      {order.tracking_number ? (
        <Card>
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-stone-400" />
            <CardTitle>Tracking</CardTitle>
          </div>
          <p className="mt-2 text-sm font-medium text-stone-900 dark:text-white">{order.tracking_number}</p>
          <p className="mt-2 text-sm text-stone-500">Tracking details are shared here once the vendor books and updates the shipment.</p>
          {order.tracking_url ? (
            <a href={order.tracking_url} target="_blank" rel="noreferrer" className="mt-1 text-xs text-amber-700 hover:underline">
              Track shipment
            </a>
          ) : null}
        </Card>
      ) : null}

      {resolutionTemplate ? (
        <Card>
          <CardTitle>Resolution update</CardTitle>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">{resolutionTemplate}</p>
        </Card>
      ) : null}

      {!resolutionTemplate &&
      (order.status === "delivery_failed" ||
        order.status === "reshipping" ||
        order.status === "return_initiated" ||
        order.status === "return_approved" ||
        order.status === "return_in_transit" ||
        order.status === "return_received") ? (
        <Card>
          <CardTitle>Resolution update</CardTitle>
          <p className="mt-3 text-sm leading-relaxed text-stone-500">
            {order.status === "delivery_failed" || order.status === "reshipping"
              ? "The vendor is actively reviewing the failed delivery and should share the replacement shipment details here once the retry is booked."
              : "The return is moving through the vendor's resolution flow. Keep checking this page for the next confirmed milestone."}
          </p>
        </Card>
      ) : null}
    </PageTransition>
  );
}
