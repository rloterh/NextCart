"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Minus, Plus, X, ShoppingBag, ArrowRight, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCartStore } from "@/stores/cart-store";
import { formatPrice } from "@/lib/utils/constants";

export default function CartPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCartStore();
  const sub = subtotal();
  const shipping = sub >= 75 ? 0 : 9.99;
  const tax = Math.round(sub * 0.085 * 100) / 100;
  const total = sub + shipping + tax;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-7xl px-6 py-20 text-center">
        <ShoppingBag className="mx-auto mb-4 h-16 w-16 text-stone-200 dark:text-stone-700" />
        <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Your cart is empty</h1>
        <p className="mt-2 text-sm text-stone-500">Discover something you'll love.</p>
        <Link href="/shop"><Button className="mt-6" rightIcon={<ArrowRight className="h-4 w-4" />}>Continue shopping</Button></Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-white">Shopping cart</h1>
      <div className="mt-8 grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AnimatePresence mode="popLayout">
            {items.map((item) => {
              const price = Number(item.product.price) + (item.variant ? Number(item.variant.price_adjustment) : 0);
              return (
                <motion.div key={`${item.product.id}-${item.variant?.id ?? "b"}`} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, x: -20 }}
                  className="flex gap-4 border-b border-stone-100 py-6 dark:border-stone-800">
                  <div className="h-28 w-24 shrink-0 bg-stone-100 dark:bg-stone-800">
                    {item.product.images?.[0] ? <img src={item.product.images[0]} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-stone-300"><ShoppingBag className="h-6 w-6" /></div>}
                  </div>
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-stone-900 dark:text-white">{item.product.name}</h3>
                        {item.variant && <p className="text-xs text-stone-500">{item.variant.name}</p>}
                      </div>
                      <button onClick={() => removeItem(item.product.id, item.variant?.id)} className="p-1 text-stone-400 hover:text-stone-700"><X className="h-4 w-4" /></button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center border border-stone-200 dark:border-stone-700">
                        <button onClick={() => updateQuantity(item.product.id, item.quantity - 1, item.variant?.id)} className="flex h-8 w-8 items-center justify-center text-stone-500"><Minus className="h-3 w-3" /></button>
                        <span className="flex h-8 w-10 items-center justify-center text-xs font-medium">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, item.quantity + 1, item.variant?.id)} className="flex h-8 w-8 items-center justify-center text-stone-500"><Plus className="h-3 w-3" /></button>
                      </div>
                      <p className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(price * item.quantity)}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
        <div className="lg:col-span-1">
          <div className="sticky top-24 border border-stone-200 bg-white p-6 dark:border-stone-800 dark:bg-stone-900">
            <h2 className="text-xs font-medium uppercase tracking-widest text-stone-400">Order summary</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatPrice(sub)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Shipping</span><span className={shipping === 0 ? "text-emerald-600" : ""}>{shipping === 0 ? "Free" : formatPrice(shipping)}</span></div>
              <div className="flex justify-between"><span className="text-stone-500">Tax</span><span>{formatPrice(tax)}</span></div>
              <div className="flex justify-between border-t border-stone-200 pt-3 dark:border-stone-700"><span className="font-medium">Total</span><span className="text-lg font-medium">{formatPrice(total)}</span></div>
            </div>
            <Link href="/checkout"><Button className="mt-6 w-full" size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>Checkout</Button></Link>
          </div>
        </div>
      </div>
    </div>
  );
}
