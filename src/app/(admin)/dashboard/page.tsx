"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Users, Store, Package, ShoppingCart, DollarSign, TrendingUp } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils/constants";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ users: 0, vendors: 0, products: 0, orders: 0, revenue: 0, pendingVendors: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const sb = getSupabaseBrowserClient();
      const [usersRes, storesRes, pendingRes, productsRes, ordersRes] = await Promise.all([
        sb.from("profiles").select("*", { count: "exact", head: true }),
        sb.from("stores").select("*", { count: "exact", head: true }).eq("status", "approved"),
        sb.from("stores").select("*", { count: "exact", head: true }).eq("status", "pending"),
        sb.from("products").select("*", { count: "exact", head: true }).eq("status", "active"),
        sb.from("orders").select("total, status"),
      ]);

      const orders = ordersRes.data ?? [];
      const revenue = orders.filter((o: any) => o.status === "delivered").reduce((s: number, o: any) => s + Number(o.total), 0);

      setStats({
        users: usersRes.count ?? 0,
        vendors: storesRes.count ?? 0,
        pendingVendors: pendingRes.count ?? 0,
        products: productsRes.count ?? 0,
        orders: orders.length,
        revenue,
      });
      setLoading(false);
    }
    fetch();
  }, []);

  const kpis = [
    { label: "Total Users", value: stats.users.toLocaleString(), icon: Users, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
    { label: "Active Vendors", value: stats.vendors.toLocaleString(), icon: Store, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400", badge: stats.pendingVendors > 0 ? `${stats.pendingVendors} pending` : undefined },
    { label: "Products", value: stats.products.toLocaleString(), icon: Package, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
    { label: "Orders", value: stats.orders.toLocaleString(), icon: ShoppingCart, color: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400" },
    { label: "Revenue", value: formatPrice(stats.revenue), icon: DollarSign, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
    { label: "Avg. Order", value: stats.orders > 0 ? formatPrice(stats.revenue / stats.orders) : "$0", icon: TrendingUp, color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" },
  ];

  if (loading) return <div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-28 animate-pulse bg-stone-100 dark:bg-stone-800" />)}</div>;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Platform overview</h1>
        <p className="mt-1 text-sm text-stone-500">NexCart admin dashboard.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{kpi.label}</p>
              <div className={`p-2 ${kpi.color}`}><kpi.icon className="h-4 w-4" /></div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{kpi.value}</p>
            {kpi.badge && <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">{kpi.badge}</p>}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
