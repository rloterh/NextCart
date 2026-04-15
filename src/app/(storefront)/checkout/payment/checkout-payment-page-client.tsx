"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import type { Stripe, StripeElements, StripePaymentElement } from "@stripe/stripe-js";
import { AlertTriangle, ArrowLeft, CreditCard, ExternalLink, Lock, RefreshCcw, ShieldCheck, Store, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { OrderStatusBadge, ToneBadge } from "@/components/ui/status-badge";
import { StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import {
  deriveCheckoutSuccessState,
  type CheckoutPaymentOrderSummary,
  type CheckoutPaymentState,
} from "@/lib/stripe/checkout-payment";
import { getStripe } from "@/lib/stripe/browser";
import { formatPrice } from "@/lib/utils/constants";
import { useUIStore } from "@/stores/ui-store";

function getPaymentTone(state: CheckoutPaymentState) {
  switch (state) {
    case "succeeded":
      return "success";
    case "processing":
      return "info";
    case "canceled":
      return "danger";
    default:
      return "warning";
  }
}

function getPaymentLabel(state: CheckoutPaymentState) {
  switch (state) {
    case "succeeded":
      return "Payment confirmed";
    case "processing":
      return "Payment processing";
    case "canceled":
      return "Payment unavailable";
    default:
      return "Payment required";
  }
}

function buildSuccessHref({
  orderNumbers,
  successState,
}: {
  orderNumbers: string[];
  successState: "pending" | "processing" | "confirmed";
}) {
  const params = new URLSearchParams();
  params.set("state", successState);
  params.set("count", String(orderNumbers.length || 1));
  orderNumbers.forEach((orderNumber) => params.append("order", orderNumber));
  return `/checkout/success?${params.toString()}`;
}

function buildPaymentReturnUrl(orderIds: string[]) {
  const params = new URLSearchParams();
  orderIds.forEach((orderId) => params.append("orderId", orderId));
  return `${window.location.origin}/checkout/payment?${params.toString()}`;
}

function OrderPaymentCard({
  order,
  orderIds,
  onRefresh,
}: {
  order: CheckoutPaymentOrderSummary;
  orderIds: string[];
  onRefresh: () => Promise<void>;
}) {
  const addToast = useUIStore((state) => state.addToast);
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [elements, setElements] = useState<StripeElements | null>(null);
  const [loadingElement, setLoadingElement] = useState(order.paymentState === "requires_payment");
  const [submitting, setSubmitting] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    const clientSecret = order.clientSecret;
    if (order.paymentState !== "requires_payment" || !clientSecret || !mountRef.current) {
      setStripe(null);
      setElements(null);
      setLoadingElement(false);
      setMountError(null);
      return;
    }

    let isActive = true;
    let paymentElement: StripePaymentElement | null = null;

    setLoadingElement(true);
    setMountError(null);

    void getStripe()
      .then((stripeClient) => {
        if (!isActive) {
          return;
        }

        if (!stripeClient) {
          throw new Error("Stripe.js is not configured for the public storefront environment.");
        }

        const nextElements = stripeClient.elements({
          clientSecret,
          appearance: {
            theme: "stripe",
            variables: {
              colorPrimary: "#92400e",
              colorText: "#1c1917",
              colorDanger: "#be123c",
              borderRadius: "0px",
              spacingUnit: "4px",
            },
          },
        });

        paymentElement = nextElements.create("payment", {
          layout: { type: "accordion", defaultCollapsed: false },
        });
        paymentElement.mount(mountRef.current!);

        setStripe(stripeClient);
        setElements(nextElements);
        setLoadingElement(false);
      })
      .catch((error) => {
        if (!isActive) {
          return;
        }

        setMountError(error instanceof Error ? error.message : "Unable to load Stripe payment form.");
        setLoadingElement(false);
      });

    return () => {
      isActive = false;
      paymentElement?.destroy();
    };
  }, [order.clientSecret, order.paymentState]);

  const handleSubmit = async () => {
    if (!stripe || !elements) {
      setMountError("Stripe is still loading. Please wait a moment and try again.");
      return;
    }

    setSubmitting(true);
    setMountError(null);

    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: buildPaymentReturnUrl(orderIds),
      },
      redirect: "if_required",
    });

    if (result.error) {
      const message = result.error.message ?? "Stripe could not confirm payment for this order.";
      setMountError(message);
      addToast({
        type: "error",
        title: `Payment failed for ${order.orderNumber}`,
        description: message,
      });
      setSubmitting(false);
      return;
    }

    addToast({
      type: "success",
      title: `Payment submitted for ${order.orderNumber}`,
      description: "Stripe accepted the payment details. We are refreshing the order status now.",
    });

    await onRefresh();
    setSubmitting(false);
  };

  return (
    <div className="mt-5 space-y-4 border border-stone-200 bg-stone-50/70 p-4 dark:border-stone-800 dark:bg-stone-950/40">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-stone-400">
        <Lock className="h-3.5 w-3.5" />
        Secured by Stripe
      </div>
      <div className="rounded-none border border-stone-200 bg-white p-4 dark:border-stone-800 dark:bg-stone-900">
        {loadingElement ? (
          <p className="text-sm text-stone-500">Loading the Stripe payment form for this order.</p>
        ) : (
          <div ref={mountRef} />
        )}
      </div>
      {mountError ? (
        <div className="flex items-start gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{mountError}</span>
        </div>
      ) : null}
      <Button onClick={handleSubmit} isLoading={submitting} className="w-full" size="lg">
        Confirm payment for {order.orderNumber}
      </Button>
    </div>
  );
}

export function CheckoutPaymentPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const addToast = useUIStore((state) => state.addToast);
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [orders, setOrders] = useState<CheckoutPaymentOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const orderIds = useMemo(
    () => Array.from(new Set(searchParams.getAll("orderId").filter(Boolean))),
    [searchParams]
  );

  const refreshPayments = useCallback(async () => {
    if (!isAuthenticated || orderIds.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/stripe/checkout/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderIds }),
      });

      const payload = (await response.json()) as {
        error?: string;
        orders?: CheckoutPaymentOrderSummary[];
      };

      if (!response.ok) {
        throw new Error(payload.error ?? "Unable to load checkout payment details.");
      }

      setOrders(payload.orders ?? []);
    } catch (fetchError) {
      setOrders([]);
      setError(fetchError instanceof Error ? fetchError.message : "Unable to load checkout payment details.");
    }

    setLoading(false);
  }, [isAuthenticated, orderIds]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    void refreshPayments();
  }, [isAuthLoading, refreshPayments]);

  const paymentStates = orders.map((order) => order.paymentState);
  const successState = deriveCheckoutSuccessState(paymentStates);
  const requiresPaymentCount = orders.filter((order) => order.paymentState === "requires_payment").length;
  const hasCanceledPayment = orders.some((order) => order.paymentState === "canceled");
  const readyForConfirmation = orders.length > 0 && requiresPaymentCount === 0 && !hasCanceledPayment;
  const successHref = buildSuccessHref({
    orderNumbers: orders.map((order) => order.orderNumber),
    successState,
  });

  if (isAuthLoading) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <StatePanel
          title="Restoring your buyer session"
          description="We are checking your buyer account before loading checkout payment details."
        />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <StatePanel
          title="Sign in to complete payment"
          description="Pending marketplace orders stay attached to the buyer session that created them."
          actionLabel="Go to login"
          actionIcon={User}
          onAction={() => router.push(`/login?redirect=/checkout/payment${orderIds.length ? `?${new URLSearchParams(orderIds.map((orderId) => ["orderId", orderId])).toString()}` : ""}`)}
        />
      </div>
    );
  }

  if (orderIds.length === 0) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20">
        <StatePanel
          title="No pending payment was selected"
          description="Open payment from checkout or from a pending order inside your buyer account."
          actionLabel="Go to order history"
          onAction={() => router.push("/account/orders")}
        />
      </div>
    );
  }

  return (
    <PageTransition className="mx-auto max-w-4xl px-6 py-8">
      <PageIntro
        eyebrow="Checkout payment"
        title={orders.length > 1 ? "Complete vendor payments" : "Complete payment"}
        description={
          orders.length > 1
            ? "Your cart was split into vendor-specific orders. Confirm each Stripe payment below so every store can move into fulfillment."
            : "Confirm your Stripe payment below to move this order from pending into the vendor fulfillment flow."
        }
        actions={
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button variant="ghost" leftIcon={<RefreshCcw className="h-4 w-4" />} onClick={() => void refreshPayments()}>
              Refresh status
            </Button>
            <Link href="/account/orders">
              <Button variant="ghost" leftIcon={<ArrowLeft className="h-4 w-4" />}>
                Back to orders
              </Button>
            </Link>
          </div>
        }
      />

      <Card className="border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-amber-700 dark:text-amber-300">Payment workflow</p>
            <p className="mt-3 text-sm leading-relaxed text-amber-900 dark:text-amber-100">
              Orders stay pending until Stripe confirms payment. If your cart spans multiple vendors, each order has its own payment confirmation step and order history remains the source of truth.
            </p>
          </div>
          <ToneBadge tone={requiresPaymentCount > 0 ? "warning" : hasCanceledPayment ? "danger" : "success"}>
            {requiresPaymentCount > 0
              ? `${requiresPaymentCount} payment${requiresPaymentCount !== 1 ? "s" : ""} remaining`
              : hasCanceledPayment
                ? "Payment attention required"
                : "Payment details submitted"}
          </ToneBadge>
        </div>
      </Card>

      <div className="mt-8 space-y-5">
        {loading ? (
          <Card>
            <p className="text-sm text-stone-500">Loading Stripe payment details for your order selection.</p>
          </Card>
        ) : error ? (
          <StatePanel
            tone="danger"
            title="We could not load checkout payment"
            description={error}
            actionLabel="Try again"
            onAction={() => void refreshPayments()}
          />
        ) : orders.length === 0 ? (
          <StatePanel
            title="No payable orders were found"
            description="The selected orders may already be settled or may no longer belong to the current buyer session."
            actionLabel="Go to order history"
            onAction={() => router.push("/account/orders")}
          />
        ) : (
          orders.map((order) => (
            <Card key={order.id} className="border-stone-200/80 bg-white dark:border-stone-800 dark:bg-stone-900">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-2xl">{order.orderNumber}</CardTitle>
                    <ToneBadge tone={getPaymentTone(order.paymentState)}>{getPaymentLabel(order.paymentState)}</ToneBadge>
                    <OrderStatusBadge status={order.orderStatus} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-stone-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Store className="h-4 w-4" />
                      {order.storeName ?? "Marketplace vendor"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CreditCard className="h-4 w-4" />
                      {formatPrice(order.total)}
                    </span>
                  </div>
                </div>
                <Link href={`/account/orders/${order.id}`}>
                  <Button variant="ghost" rightIcon={<ExternalLink className="h-4 w-4" />}>
                    View order
                  </Button>
                </Link>
              </div>

              {order.paymentState === "requires_payment" ? (
                order.clientSecret ? (
                  <OrderPaymentCard order={order} orderIds={orderIds} onRefresh={refreshPayments} />
                ) : (
                  <div className="mt-5 flex items-start gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{order.paymentIssue ?? "This order is still pending, but Stripe could not prepare a payment form."}</span>
                  </div>
                )
              ) : null}

              {order.paymentState === "processing" ? (
                <div className="mt-5 flex items-start gap-2 border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/20 dark:text-blue-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Stripe is finalizing this payment. Refresh the status if the order history has not updated yet.</span>
                </div>
              ) : null}

              {order.paymentState === "succeeded" ? (
                <div className="mt-5 flex items-start gap-2 border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>Stripe has confirmed payment for this order. Vendor fulfillment can continue from order history.</span>
                </div>
              ) : null}

              {order.paymentState === "canceled" ? (
                <div className="mt-5 flex items-start gap-2 border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-300">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{order.paymentIssue ?? "This payment can no longer be confirmed from checkout. Review order history for the latest status."}</span>
                </div>
              ) : null}
            </Card>
          ))
        )}
      </div>

      {!loading && !error && orders.length > 0 ? (
        readyForConfirmation ? (
          <Card className="mt-8 border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/40 dark:bg-emerald-950/20">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-emerald-700 dark:text-emerald-300">Ready to continue</p>
            <p className="mt-3 text-sm leading-relaxed text-emerald-900 dark:text-emerald-100">
              All selected orders have moved past the payment form. Continue to the confirmation view for the final marketplace summary.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href={successHref}>
                <Button size="lg">Continue to confirmation</Button>
              </Link>
              <Button
                variant="ghost"
                leftIcon={<RefreshCcw className="h-4 w-4" />}
                onClick={() => {
                  addToast({
                    type: "info",
                    title: "Refreshing payment status",
                    description: "We are checking Stripe and order history for the latest confirmation updates.",
                  });
                  void refreshPayments();
                }}
              >
                Refresh before continuing
              </Button>
            </div>
          </Card>
        ) : hasCanceledPayment ? (
          <Card className="mt-8 border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/20">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-rose-700 dark:text-rose-300">Payment follow-up required</p>
            <p className="mt-3 text-sm leading-relaxed text-rose-900 dark:text-rose-100">
              At least one order is no longer payable from this recovery screen. Review order history for the latest payment outcome before trying again.
            </p>
          </Card>
        ) : null
      ) : null}
    </PageTransition>
  );
}
