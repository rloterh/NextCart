"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { ToneBadge } from "@/components/ui/status-badge";
import { deriveCheckoutSuccessState } from "@/lib/stripe/checkout-payment";

export function CheckoutSuccessPageClient() {
  const searchParams = useSearchParams();
  const orderNumbers = searchParams.getAll("order").filter(Boolean);
  const orderCount = Number(searchParams.get("count") ?? orderNumbers.length ?? 1) || 1;
  const hasMultipleOrders = orderNumbers.length > 1 || orderCount > 1;
  const requestedState = searchParams.get("state");
  const successState =
    requestedState === "confirmed" || requestedState === "processing" || requestedState === "pending"
      ? requestedState
      : deriveCheckoutSuccessState([]);
  const badgeTone = successState === "confirmed" ? "success" : successState === "processing" ? "info" : "warning";
  const accentClasses =
    successState === "confirmed"
      ? "border-emerald-200 bg-emerald-50/80 text-left dark:border-emerald-900/40 dark:bg-emerald-950/20"
      : successState === "processing"
        ? "border-blue-200 bg-blue-50/80 text-left dark:border-blue-900/40 dark:bg-blue-950/20"
        : "border-amber-200 bg-amber-50/80 text-left dark:border-amber-900/40 dark:bg-amber-950/20";
  const eyebrow =
    successState === "confirmed" ? "Payment confirmed" : successState === "processing" ? "Payment submitted" : "Checkout submitted";
  const title =
    successState === "confirmed"
      ? hasMultipleOrders ? "Payments confirmed" : "Payment confirmed"
      : hasMultipleOrders
        ? "Orders created"
        : "Order created";
  const description =
    successState === "confirmed"
      ? hasMultipleOrders
        ? "Stripe confirmed payment for each vendor order. Order history will keep updating as every store moves through fulfillment."
        : "Stripe confirmed payment for your order. Fulfillment updates will continue to appear in your order history."
      : successState === "processing"
        ? hasMultipleOrders
          ? "Stripe accepted your marketplace payment details and is finalizing the vendor order outcomes. Keep an eye on order history for the confirmed state."
          : "Stripe accepted your payment details and is finalizing the order outcome. Order history will reflect the confirmed state as soon as it is available."
        : hasMultipleOrders
          ? "Your marketplace cart was split into multiple vendor orders. Each order remains pending until Stripe confirms the payment outcome, and the latest status will appear in your order history."
          : "Your marketplace order has been created in pending status. Stripe payment confirmation and the latest fulfillment updates will appear in your order history.";

  return (
    <PageTransition className="mx-auto max-w-4xl px-6 py-20">
      <div
        className={`mx-auto flex h-16 w-16 items-center justify-center ${
          successState === "confirmed"
            ? "bg-emerald-50 dark:bg-emerald-900/20"
            : successState === "processing"
              ? "bg-blue-50 dark:bg-blue-900/20"
              : "bg-amber-50 dark:bg-amber-900/20"
        }`}
      >
        <CheckCircle2
          className={`h-8 w-8 ${
            successState === "confirmed"
              ? "text-emerald-600 dark:text-emerald-400"
              : successState === "processing"
                ? "text-blue-600 dark:text-blue-400"
                : "text-amber-600 dark:text-amber-400"
          }`}
        />
      </div>

      <PageIntro
        className="mx-auto max-w-2xl text-center sm:block"
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={
          orderNumbers.length > 0 ? (
            <div className="flex flex-wrap justify-center gap-2">
              {orderNumbers.map((orderNumber) => (
                <ToneBadge key={orderNumber} tone={badgeTone} className="mx-auto">
                  Order {orderNumber}
                </ToneBadge>
              ))}
            </div>
          ) : null
        }
      />

      <Card className={accentClasses}>
        <p
          className={`text-xs font-medium uppercase tracking-[0.24em] ${
            successState === "confirmed"
              ? "text-emerald-700 dark:text-emerald-300"
              : successState === "processing"
                ? "text-blue-700 dark:text-blue-300"
                : "text-amber-700 dark:text-amber-300"
          }`}
        >
          What to expect
        </p>
        <p
          className={`mt-3 text-sm leading-relaxed ${
            successState === "confirmed"
              ? "text-emerald-900 dark:text-emerald-100"
              : successState === "processing"
                ? "text-blue-900 dark:text-blue-100"
                : "text-amber-900 dark:text-amber-100"
          }`}
        >
          {successState === "confirmed"
            ? "Payment is already confirmed. Order history is now the source of truth for vendor fulfillment, shipment, and any support follow-up."
            : successState === "processing"
              ? "Stripe is still finalizing the payment outcome. Order history remains the source of truth while confirmation settles and vendor workflows catch up."
              : "Your order history is the source of truth for payment confirmation. Pending orders move to confirmed after Stripe succeeds, and unsuccessful payment attempts will be cancelled automatically by webhook processing."}
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Mail,
            title: "Confirmation",
            description:
              successState === "confirmed"
                ? "Payment is settled. Watch order history for vendor notes and fulfillment updates."
                : "Check order history for each vendor order as payment confirmation and marketplace notes arrive.",
          },
          {
            icon: Package,
            title: "Preparation",
            description:
              successState === "confirmed"
                ? "Vendors can now move the order into packing and shipment preparation."
                : "Vendors can start fulfillment only after payment moves from pending into confirmed status.",
          },
          {
            icon: Truck,
            title: "Tracking",
            description: "Once a tracking number is added, it will appear directly on the order detail page.",
          },
        ].map((item) => (
          <Card key={item.title} className="text-left">
            <item.icon className="h-4 w-4 text-amber-700 dark:text-amber-500" />
            <p className="mt-3 text-sm font-medium text-stone-900 dark:text-white">{item.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.description}</p>
          </Card>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <Link href="/account/orders">
          <Button leftIcon={<Package className="h-4 w-4" />}>View order history</Button>
        </Link>
        <Link href="/shop">
          <Button variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
            Continue shopping
          </Button>
        </Link>
      </div>
    </PageTransition>
  );
}
