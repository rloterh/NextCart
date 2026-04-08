"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { CheckCircle2, Package, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CheckoutSuccessPage() {
  const searchParams = useSearchParams();
  const orderNumber = searchParams.get("order");

  return (
    <div className="mx-auto max-w-lg px-6 py-20 text-center">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center bg-emerald-50 dark:bg-emerald-900/20">
          <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Order confirmed</h1>
        {orderNumber && (
          <p className="mt-2 text-sm text-stone-500">Order number: <span className="font-medium text-stone-900 dark:text-white">{orderNumber}</span></p>
        )}
        <p className="mt-4 text-sm leading-relaxed text-stone-500">
          Thank you for your purchase. You'll receive a confirmation email with tracking details once your order ships.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/account/orders"><Button leftIcon={<Package className="h-4 w-4" />}>View orders</Button></Link>
          <Link href="/shop"><Button variant="ghost" rightIcon={<ArrowRight className="h-4 w-4" />}>Continue shopping</Button></Link>
        </div>
      </motion.div>
    </div>
  );
}
