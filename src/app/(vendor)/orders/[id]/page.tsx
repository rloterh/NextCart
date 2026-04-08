"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Package, Truck, CheckCircle2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardTitle } from "@/components/ui/card";
import { useUIStore } from "@/stores/ui-store";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice, formatDate } from "@/lib/utils/constants";

export default function VendorOrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const addToast = useUIStore((s) => s.addToast);
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [tracking, setTracking] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function fetch() {
      const sb = getSupabaseBrowserClient();
      const { data } = await sb.from("orders")
        .select("*, buyer:profiles(full_name, email), items:order_items(*)")
        .eq("id", id).single();
      setOrder(data);
      setTracking(data?.tracking_number ?? "");
      setLoading(false);
    }
    if (id) fetch();
  }, [id]);

  async function updateStatus(status: string) {
    setUpdating(true);
    const sb = getSupabaseBrowserClient();
    const updates: Record<string, any> = { status };
    if (status === "shipped") { updates.shipped_at = new Date().toISOString(); updates.tracking_number = tracking || null; }
    if (status === "delivered") updates.delivered_at = new Date().toISOString();
    if (status === "cancelled") updates.cancelled_at = new Date().toISOString();

    const { error } = await sb.from("orders").update(updates).eq("id", id);
    if (error) addToast({ type: "error", title: "Update failed", description: error.message });
    else { addToast({ type: "success", title: `Order ${status}` }); setOrder((prev: any) => ({ ...prev, status, ...updates })); }
    setUpdating(false);
  }

  if (loading) return <div className="mx-auto max-w-3xl space-y-6"><div className="h-96 animate-pulse bg-stone-100 dark:bg-stone-800" /></div>;
  if (!order) return <div className="py-20 text-center"><p className="font-serif text-xl text-stone-400">Order not found</p></div>;

  const address = order.shipping_address as any;
  const canProcess = order.status === "confirmed";
  const canShip = order.status === "processing";
  const canDeliver = order.status === "shipped";

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendor/orders"><button className="p-1.5 text-stone-400 hover:text-stone-900 dark:hover:text-white"><ArrowLeft className="h-5 w-5" /></button></Link>
          <div>
            <h1 className="font-serif text-2xl text-stone-900 dark:text-white">{order.order_number}</h1>
            <p className="text-sm text-stone-500">{formatDate(order.created_at)} &middot; {order.buyer?.full_name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canProcess && <Button onClick={() => updateStatus("processing")} isLoading={updating} leftIcon={<Package className="h-4 w-4" />}>Start processing</Button>}
          {canShip && <Button onClick={() => updateStatus("shipped")} isLoading={updating} leftIcon={<Truck className="h-4 w-4" />}>Mark shipped</Button>}
          {canDeliver && <Button onClick={() => updateStatus("delivered")} isLoading={updating} leftIcon={<CheckCircle2 className="h-4 w-4" />}>Mark delivered</Button>}
        </div>
      </div>

      {/* Items */}
      <Card>
        <CardTitle>Order items</CardTitle>
        <div className="mt-4 divide-y divide-stone-100 dark:divide-stone-800">
          {(order.items ?? []).map((item: any) => (
            <div key={item.id} className="flex items-center gap-4 py-3">
              <div className="h-14 w-12 shrink-0 bg-stone-100 dark:bg-stone-800">{item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}</div>
              <div className="flex-1">
                <p className="text-sm font-medium text-stone-900 dark:text-white">{item.product_name}</p>
                <p className="text-xs text-stone-500">Qty: {item.quantity} &times; {formatPrice(Number(item.unit_price))}</p>
              </div>
              <p className="text-sm font-medium">{formatPrice(Number(item.total))}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 space-y-1 border-t border-stone-200 pt-4 text-sm dark:border-stone-700">
          <div className="flex justify-between"><span className="text-stone-500">Subtotal</span><span>{formatPrice(Number(order.subtotal))}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Shipping</span><span>{formatPrice(Number(order.shipping_cost))}</span></div>
          <div className="flex justify-between"><span className="text-stone-500">Platform fee</span><span className="text-red-500">-{formatPrice(Number(order.platform_fee))}</span></div>
          <div className="flex justify-between border-t border-stone-200 pt-2 font-medium dark:border-stone-700"><span>Your payout</span><span className="text-emerald-600">{formatPrice(Number(order.total) - Number(order.platform_fee))}</span></div>
        </div>
      </Card>

      {/* Tracking */}
      {(canShip || order.status === "shipped") && (
        <Card>
          <CardTitle>Tracking information</CardTitle>
          <div className="mt-4">
            <Input label="Tracking number" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="Enter tracking number" />
          </div>
        </Card>
      )}

      {/* Shipping */}
      {address && (
        <Card>
          <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-stone-400" /><CardTitle>Ship to</CardTitle></div>
          <div className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            <p className="font-medium text-stone-900 dark:text-white">{address.fullName}</p>
            <p>{address.line1}{address.line2 ? `, ${address.line2}` : ""}</p>
            <p>{address.city}, {address.state} {address.postalCode}</p>
            {address.phone && <p className="mt-1">{address.phone}</p>}
          </div>
        </Card>
      )}
    </motion.div>
  );
}
