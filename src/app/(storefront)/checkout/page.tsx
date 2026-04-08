"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, CreditCard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import { formatPrice } from "@/lib/utils/constants";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const addToast = useUIStore((s) => s.addToast);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState({
    fullName: "", line1: "", line2: "", city: "", state: "", postalCode: "", country: "US", phone: "",
  });

  const sub = subtotal();
  const shipping = sub >= 75 ? 0 : 9.99;
  const tax = Math.round(sub * 0.085 * 100) / 100;
  const total = sub + shipping + tax;

  const set = (key: string, value: string) => setAddress((prev) => ({ ...prev, [key]: value }));

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (!address.fullName || !address.line1 || !address.city || !address.postalCode) {
      addToast({ type: "error", title: "Please fill in all required fields" });
      return;
    }

    setLoading(true);
    try {
      const checkoutItems = items.map((item) => ({
        storeId: item.product.store_id,
        productId: item.product.id,
        variantId: item.variant?.id,
        name: item.product.name,
        variantName: item.variant?.name,
        image: item.product.images?.[0],
        price: Number(item.product.price) + (item.variant ? Number(item.variant.price_adjustment) : 0),
        quantity: item.quantity,
      }));

      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems, shippingAddress: address }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // In production: use Stripe Elements to confirm payment with clientSecret
      // For demo: simulate success
      clearCart();
      addToast({ type: "success", title: "Order placed!" });
      router.push(`/checkout/success?order=${data.orders?.[0]?.orderNumber ?? ""}`);
    } catch (err: any) {
      addToast({ type: "error", title: "Checkout failed", description: err.message });
    }
    setLoading(false);
  }

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  if (items.length === 0) return null;

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Checkout</h1>

      <form onSubmit={handleCheckout} className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          {/* Shipping */}
          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Shipping address</h2>
            <div className="space-y-4">
              <Input label="Full name" value={address.fullName} onChange={(e) => set("fullName", e.target.value)} />
              <Input label="Address" placeholder="Street address" value={address.line1} onChange={(e) => set("line1", e.target.value)} />
              <Input label="Apt / Suite (optional)" value={address.line2} onChange={(e) => set("line2", e.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={address.city} onChange={(e) => set("city", e.target.value)} />
                <Input label="State" value={address.state} onChange={(e) => set("state", e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Postal code" value={address.postalCode} onChange={(e) => set("postalCode", e.target.value)} />
                <Input label="Phone" type="tel" value={address.phone} onChange={(e) => set("phone", e.target.value)} />
              </div>
            </div>
          </Card>

          {/* Payment info */}
          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Payment</h2>
            <div className="flex items-center gap-3 border border-dashed border-stone-200 p-4 text-sm text-stone-500 dark:border-stone-700">
              <CreditCard className="h-5 w-5 text-stone-400" />
              Stripe Elements integration — card form renders here in production
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
              <Lock className="h-3 w-3" /> Secured by Stripe. Your data is encrypted.
            </div>
          </Card>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="sticky top-24 border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">Order summary</h2>
            <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 py-3">
                  <div className="h-12 w-10 shrink-0 bg-stone-100 dark:bg-stone-800">
                    {item.product.images?.[0] && <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm text-stone-900 dark:text-white">{item.product.name}</p>
                    <p className="text-xs text-stone-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(Number(item.product.price) * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-700">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatPrice(sub)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Shipping</span><span className={shipping === 0 ? "text-emerald-600" : ""}>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-2 dark:border-stone-700"><span className="font-medium">Total</span><span className="text-lg font-medium">{formatPrice(total)}</span></div>
            </div>
            <Button type="submit" isLoading={loading} className="mt-6 w-full" size="lg">Place order</Button>
          </div>
        </div>
      </form>
    </div>
  );
}
