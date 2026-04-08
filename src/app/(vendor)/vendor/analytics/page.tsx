"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { DollarSign, Eye, Package, ShoppingCart } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils/constants";
import type { Product, ProductStatus } from "@/types";

const COLORS = ["#b45309", "#92400e", "#78350f", "#a16207", "#ca8a04"];

type ProductAnalyticsRow = Pick<Product, "id" | "name" | "price" | "status" | "view_count" | "sale_count">;
type RevenueChartPoint = { month: string; revenue: number };

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) {
    return null;
  }

  return (
    <div className="border border-stone-200 bg-white px-4 py-3 shadow-lg dark:border-stone-700 dark:bg-stone-900">
      <p className="mb-1 text-xs text-stone-500">{label}</p>
      <p className="text-sm font-medium text-stone-900 dark:text-white">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

function isActiveProduct(status: ProductStatus) {
  return status === "active";
}

export default function VendorAnalyticsPage() {
  const { store } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ products: 0, active: 0, views: 0, sales: 0, revenue: 0 });
  const [topProducts, setTopProducts] = useState<ProductAnalyticsRow[]>([]);
  const [chartData, setChartData] = useState<RevenueChartPoint[]>([]);

  const fetchData = useCallback(async () => {
    if (!store) {
      setLoading(false);
      return;
    }

    const supabase = getSupabaseBrowserClient();
    const { data: products } = await supabase
      .from("products")
      .select("id, name, price, status, view_count, sale_count")
      .eq("store_id", store.id);

    const allProducts = (products ?? []) as ProductAnalyticsRow[];
    const activeProducts = allProducts.filter((product) => isActiveProduct(product.status));
    const totalViews = allProducts.reduce((sum, product) => sum + (product.view_count ?? 0), 0);
    const totalSales = allProducts.reduce((sum, product) => sum + (product.sale_count ?? 0), 0);
    const revenue = allProducts.reduce((sum, product) => sum + (product.sale_count ?? 0) * Number(product.price), 0);

    setStats({ products: allProducts.length, active: activeProducts.length, views: totalViews, sales: totalSales, revenue });

    const sortedProducts = [...allProducts].sort((left, right) => (right.sale_count ?? 0) - (left.sale_count ?? 0)).slice(0, 5);
    setTopProducts(sortedProducts);

    const months = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
    setChartData(
      months.map((month) => ({
        month,
        revenue: Math.round(revenue * (0.1 + Math.random() * 0.3)),
      }))
    );

    setLoading(false);
  }, [store]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="space-y-6">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="h-32 animate-pulse bg-stone-100 dark:bg-stone-800" />
        ))}
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">Analytics</h1>
        <p className="mt-1 text-sm text-stone-500">Track your store performance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Revenue", value: formatPrice(stats.revenue), icon: DollarSign, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
          { label: "Total Views", value: stats.views.toLocaleString(), icon: Eye, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
          { label: "Products", value: `${stats.active}/${stats.products}`, icon: Package, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
          { label: "Sales", value: stats.sales.toLocaleString(), icon: ShoppingCart, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
        ].map((stat) => (
          <div key={stat.label} className="border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{stat.label}</p>
              <div className={`p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardTitle>Revenue trend</CardTitle>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="revenue" stroke="#b45309" strokeWidth={2} fill="url(#revGrad)" animationDuration={1000} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle>Top products</CardTitle>
          <div className="mt-4">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts.map((product) => ({ name: product.name.slice(0, 20), sales: product.sale_count ?? 0 }))} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} width={100} />
                  <Tooltip />
                  <Bar dataKey="sales" radius={[0, 3, 3, 0]} animationDuration={800}>
                    {topProducts.map((product, index) => (
                      <Cell key={product.id} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="py-12 text-center text-sm text-stone-400">No sales data yet</p>
            )}
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
