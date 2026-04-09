"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Mail, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { ToneBadge } from "@/components/ui/status-badge";

export function CheckoutSuccessPageClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <PageTransition className="mx-auto max-w-4xl px-6 py-20">
      <div className="mx-auto flex h-16 w-16 items-center justify-center bg-emerald-50 dark:bg-emerald-900/20">
        <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
      </div>

      <PageIntro
        className="mx-auto max-w-2xl text-center sm:block"
        eyebrow="Checkout complete"
        title="Order confirmed"
        description="Your payment was accepted and the order is now in the marketplace workflow. You can follow confirmation, fulfillment, and shipment updates from your order history."
        actions={
          orderNumber ? (
            <ToneBadge tone="success" className="mx-auto">
              Order {orderNumber}
            </ToneBadge>
          ) : null
        }
      />

      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            icon: Mail,
            title: "Confirmation",
            description: "Keep an eye on your order history for vendor-specific details and checkout confirmation context.",
          },
          {
            icon: Package,
            title: "Preparation",
            description: "Vendors will confirm, process, and prepare your order before moving it into shipment.",
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
          <Button leftIcon={<Package className="h-4 w-4" />}>View orders</Button>
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
