"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { CreditCard, Lock, Mail, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/utils/constants";
import { useCartStore } from "@/stores/cart-store";
import { useUIStore } from "@/stores/ui-store";
import type { CheckoutShippingAddress } from "@/types/orders";

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, clearCart } = useCartStore();
  const addToast = useUIStore((state) => state.addToast);
  const [loading, setLoading] = useState(false);
  const [address, setAddress] = useState<CheckoutShippingAddress>({
    fullName: "",
    line1: "",
    line2: "",
    city: "",
    state: "",
    postalCode: "",
    country: "US",
    phone: "",
  });

  const sub = subtotal();
  const shipping = sub >= 75 ? 0 : 9.99;
  const tax = Math.round(sub * 0.085 * 100) / 100;
  const total = sub + shipping + tax;

  const vendorCount = useMemo(() => new Set(items.map((item) => item.product.store_id)).size, [items]);

  const setField = (key: keyof CheckoutShippingAddress, value: string) => {
    setAddress((prev) => ({ ...prev, [key]: value }));
  };

  async function handleCheckout(event: React.FormEvent) {
    event.preventDefault();

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

      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: checkoutItems, shippingAddress: address }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error);
      }

      clearCart();
      addToast({ type: "success", title: "Order placed!" });
      router.push(`/checkout/success?order=${data.orders?.[0]?.orderNumber ?? ""}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unexpected checkout error";
      addToast({ type: "error", title: "Checkout failed", description: message });
    }

    setLoading(false);
  }

  useEffect(() => {
    if (items.length === 0) {
      router.replace("/cart");
    }
  }, [items.length, router]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="max-w-2xl">
        <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Checkout</h1>
        <p className="mt-3 text-sm leading-relaxed text-stone-500">
          Secure your order with clear shipping expectations, Stripe-protected payment handling, and post-purchase updates that keep every step visible.
        </p>
      </div>

      <form onSubmit={handleCheckout} className="mt-8 grid gap-8 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Shipping address</h2>
            <div className="space-y-4">
              <Input label="Full name" value={address.fullName} onChange={(event) => setField("fullName", event.target.value)} />
              <Input label="Address" placeholder="Street address" value={address.line1} onChange={(event) => setField("line1", event.target.value)} />
              <Input label="Apt / Suite (optional)" value={address.line2} onChange={(event) => setField("line2", event.target.value)} />
              <div className="grid grid-cols-2 gap-4">
                <Input label="City" value={address.city} onChange={(event) => setField("city", event.target.value)} />
                <Input label="State" value={address.state} onChange={(event) => setField("state", event.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input label="Postal code" value={address.postalCode} onChange={(event) => setField("postalCode", event.target.value)} />
                <Input label="Phone" type="tel" value={address.phone} onChange={(event) => setField("phone", event.target.value)} />
              </div>
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">Payment</h2>
            <div className="flex items-center gap-3 border border-dashed border-stone-200 p-4 text-sm text-stone-500 dark:border-stone-700">
              <CreditCard className="h-5 w-5 text-stone-400" />
              Stripe Elements integration - card form renders here in production
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs text-stone-400">
              <Lock className="h-3 w-3" /> Secured by Stripe. Your data is encrypted and payment is split correctly for each marketplace vendor.
            </div>
          </Card>

          <Card>
            <h2 className="mb-4 text-xs font-medium uppercase tracking-widest text-stone-400">What happens next</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "Payment confirmation",
                  description: "You will get an order confirmation after the payment intent is created and accepted.",
                },
                {
                  icon: Truck,
                  title: "Shipping updates",
                  description: `Orders from ${vendorCount} ${vendorCount === 1 ? "vendor" : "vendors"} will move through confirmation, processing, and shipment with visible status updates.`,
                },
                {
                  icon: Mail,
                  title: "Support clarity",
                  description: "Store-specific tracking or service details will appear in your order history after purchase.",
                },
              ].map((item) => (
                <div key={item.title} className="border border-stone-200 p-4 dark:border-stone-700">
                  <item.icon className="h-4 w-4 text-amber-700 dark:text-amber-500" />
                  <p className="mt-3 text-sm font-medium text-stone-900 dark:text-white">{item.title}</p>
                  <p className="mt-2 text-xs leading-relaxed text-stone-500">{item.description}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <div className="sticky top-24 border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">Order summary</h2>
            <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3 py-3">
                  <div className="relative h-12 w-10 shrink-0 overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {item.product.images?.[0] ? (
                      <Image src={item.product.images[0]} alt={item.product.name} fill sizes="40px" className="object-cover" />
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-stone-900 dark:text-white">{item.product.name}</p>
                    <p className="text-xs text-stone-400">Qty: {item.quantity}</p>
                  </div>
                  <p className="text-sm font-medium">{formatPrice(Number(item.product.price) * item.quantity)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-2 border-t border-stone-200 pt-4 text-sm dark:border-stone-700">
              <div className="flex justify-between">
                <span className="text-stone-500">Subtotal</span>
                <span>{formatPrice(sub)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Shipping</span>
                <span className={shipping === 0 ? "text-emerald-600" : ""}>{shipping === 0 ? "Free" : formatPrice(shipping)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Tax</span>
                <span>{formatPrice(tax)}</span>
              </div>
              <div className="flex justify-between border-t border-stone-200 pt-2 dark:border-stone-700">
                <span className="font-medium">Total</span>
                <span className="text-lg font-medium">{formatPrice(total)}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-stone-200 pt-4 text-xs leading-relaxed text-stone-500 dark:border-stone-700">
              Shipping confirmation, tracking details, and support context will be available from your order history after purchase.
            </div>
            <Button type="submit" isLoading={loading} className="mt-6 w-full" size="lg">
              Place secure order
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
