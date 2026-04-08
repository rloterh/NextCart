"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle2, Mail, Package, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function CheckoutSuccessPageClient() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="mx-auto max-w-4xl px-6 py-20">
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-emerald-50 dark:bg-emerald-900/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Order confirmed</h1>
          {orderNumber ? (
            <p className="mt-2 text-sm text-stone-500">
              Order number: <span className="font-medium text-stone-900 dark:text-white">{orderNumber}</span>
            </p>
          ) : null}
          <p className="mt-4 text-sm leading-relaxed text-stone-500">
            Your payment was accepted and the order is now in the marketplace workflow. You can follow confirmation, fulfillment, and shipment updates from your order history.
          </p>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-3">
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
            <div key={item.title} className="border border-stone-200 bg-white p-5 text-left dark:border-stone-800 dark:bg-stone-900">
              <item.icon className="h-4 w-4 text-amber-700 dark:text-amber-500" />
              <p className="mt-3 text-sm font-medium text-stone-900 dark:text-white">{item.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-stone-500">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3">
          <Link href="/account/orders">
            <Button leftIcon={<Package className="h-4 w-4" />}>View orders</Button>
          </Link>
          <Link href="/shop">
            <Button variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>
              Continue shopping
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
