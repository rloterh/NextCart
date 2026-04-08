"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Package, ChevronRight } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice, formatDate } from "@/lib/utils/constants";

const statusColors: Record<string, string> = {
  pending: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400",
  confirmed: "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400",
  processing: "bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400",
  shipped: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400",
  delivered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400",
  cancelled: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400",
};

export default function BuyerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const sb = getSupabaseBrowserClient();
      const { data } = await sb.from("orders")
        .select("*, store:stores(name, slug), items:order_items(id, product_name, product_image, quantity, unit_price)")
        .order("created_at", { ascending: false });
      setOrders(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="font-serif text-3xl text-stone-900 dark:text-white">My orders</h1>
      <p className="mt-1 text-sm text-stone-500">{orders.length} order{orders.length !== 1 ? "s" : ""}</p>

      <div className="mt-8 space-y-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-32 animate-pulse bg-stone-100 dark:bg-stone-800" />) :
        orders.length === 0 ? (
          <div className="py-16 text-center">
            <Package className="mx-auto mb-3 h-10 w-10 text-stone-300" />
            <p className="font-serif text-lg text-stone-400">No orders yet</p>
          </div>
        ) : orders.map((order) => (
          <motion.div key={order.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
            <Link href={`/account/orders/${order.id}`} className="block border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-stone-800 dark:bg-stone-900">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-stone-900 dark:text-white">{order.order_number}</p>
                  <p className="text-xs text-stone-500">{formatDate(order.created_at)} &middot; {order.store?.name}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${statusColors[order.status] ?? statusColors.pending}`}>
                    {order.status}
                  </span>
                  <span className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(Number(order.total))}</span>
                  <ChevronRight className="h-4 w-4 text-stone-400" />
                </div>
              </div>
              {order.items?.length > 0 && (
                <div className="mt-3 flex gap-2">
                  {order.items.slice(0, 4).map((item: any) => (
                    <div key={item.id} className="h-12 w-12 bg-stone-100 dark:bg-stone-800">
                      {item.product_image && <img src={item.product_image} alt="" className="h-full w-full object-cover" />}
                    </div>
                  ))}
                  {order.items.length > 4 && <div className="flex h-12 w-12 items-center justify-center bg-stone-100 text-xs text-stone-400 dark:bg-stone-800">+{order.items.length - 4}</div>}
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
