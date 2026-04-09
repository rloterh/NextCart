"use client";

import { useEffect, useState, useCallback } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { AlertTriangle, DollarSign, Eye, Package, ShieldCheck, Timer, Undo2 } from "lucide-react";
import { Card, CardTitle } from "@/components/ui/card";
import { PageIntro, PageTransition } from "@/components/ui/page-shell";
import { SkeletonBlock, StatePanel } from "@/components/ui/state-panel";
import { useAuth } from "@/hooks/use-auth";
import { getExceptionRate, getAverageFulfillmentDays, getMonthlyNetRevenueSeries, getReturnRate, getSettlementRate } from "@/lib/orders/operations-metrics";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { formatPrice } from "@/lib/utils/constants";
import type { Product, ProductStatus } from "@/types";
import type { Order } from "@/types/orders";

const COLORS = ["#b45309", "#92400e", "#78350f", "#a16207", "#ca8a04"];

type ProductAnalyticsRow = Pick<Product, "id" | "name" | "price" | "status" | "view_count" | "sale_count">;
type AnalyticsOrder = Pick<Order, "status" | "total" | "platform_fee" | "created_at" | "delivered_at" | "stripe_transfer_status" | "stripe_transfer_id">;

interface TooltipPayloadItem {
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string;
}

function RevenueTooltip({ active, payload, label }: CustomTooltipProps) {
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
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState({
    products: 0,
    active: 0,
    views: 0,
    sales: 0,
    revenue: 0,
    netRevenue: 0,
    exceptionRate: 0,
    returnRate: 0,
    settlementRate: 0,
    fulfillmentDays: 0,
  });
  const [topProducts, setTopProducts] = useState<ProductAnalyticsRow[]>([]);
  const [chartData, setChartData] = useState<Array<{ month: string; revenue: number; net: number }>>([]);

  const fetchData = useCallback(async () => {
    if (!store) {
      setLoading(false);
      setError(null);
      return;
    }

    setError(null);
    const supabase = getSupabaseBrowserClient();
    const [{ data: products, error: productsError }, { data: orders, error: ordersError }] = await Promise.all([
      supabase.from("products").select("id, name, price, status, view_count, sale_count").eq("store_id", store.id),
      supabase
        .from("orders")
        .select("status, total, platform_fee, created_at, delivered_at, stripe_transfer_status, stripe_transfer_id")
        .eq("store_id", store.id),
    ]);

    const queryError = productsError ?? ordersError;
    if (queryError) {
      setError(queryError.message);
      setTopProducts([]);
      setChartData([]);
      setLoading(false);
      return;
    }

    const allProducts = (products ?? []) as ProductAnalyticsRow[];
    const allOrders = (orders ?? []) as AnalyticsOrder[];
    const activeProducts = allProducts.filter((product) => isActiveProduct(product.status));
    const totalViews = allProducts.reduce((sum, product) => sum + (product.view_count ?? 0), 0);
    const totalSales = allProducts.reduce((sum, product) => sum + (product.sale_count ?? 0), 0);
    const revenue = allOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const netRevenue = allOrders.reduce((sum, order) => sum + Number(order.total) - Number(order.platform_fee), 0);

    setStats({
      products: allProducts.length,
      active: activeProducts.length,
      views: totalViews,
      sales: totalSales,
      revenue,
      netRevenue,
      exceptionRate: getExceptionRate(allOrders),
      returnRate: getReturnRate(allOrders),
      settlementRate: getSettlementRate(allOrders),
      fulfillmentDays: getAverageFulfillmentDays(allOrders),
    });

    const sortedProducts = [...allProducts].sort((left, right) => (right.sale_count ?? 0) - (left.sale_count ?? 0)).slice(0, 5);
    setTopProducts(sortedProducts);
    setChartData(getMonthlyNetRevenueSeries(allOrders));
    setLoading(false);
  }, [store]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <PageTransition>
        <PageIntro title="Analytics" description="Track sales performance, fulfillment health, and settlement quality from one vendor view." />
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index} className="space-y-3">
            <SkeletonBlock lines={4} />
          </Card>
        ))}
      </PageTransition>
    );
  }

  if (!store) {
    return (
      <PageTransition>
        <PageIntro title="Analytics" description="Track sales performance, fulfillment health, and settlement quality from one vendor view." />
        <StatePanel
          title="Store access is unavailable"
          description="Finish your store setup before using the analytics workspace."
          tone="warning"
        />
      </PageTransition>
    );
  }

  if (error) {
    return (
      <PageTransition>
        <PageIntro title="Analytics" description="Track sales performance, fulfillment health, and settlement quality from one vendor view." />
        <StatePanel
          title="We could not load vendor analytics"
          description={error}
          tone="danger"
          actionLabel="Try again"
          onAction={() => void fetchData()}
        />
      </PageTransition>
    );
  }

  const healthCards = [
    {
      label: "Net revenue",
      value: formatPrice(stats.netRevenue),
      detail: `${formatPrice(stats.revenue)} gross marketplace sales`,
      icon: DollarSign,
      color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400",
    },
    {
      label: "Total views",
      value: stats.views.toLocaleString(),
      detail: `${stats.sales.toLocaleString()} attributed sales`,
      icon: Eye,
      color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400",
    },
    {
      label: "Catalog health",
      value: `${stats.active}/${stats.products}`,
      detail: "active vs total products",
      icon: Package,
      color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400",
    },
    {
      label: "Exception rate",
      value: `${stats.exceptionRate}%`,
      detail: "delivery and return exceptions",
      icon: AlertTriangle,
      color: "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400",
    },
    {
      label: "Settlement rate",
      value: `${stats.settlementRate}%`,
      detail: "delivered orders with payout reconciliation",
      icon: ShieldCheck,
      color: "bg-teal-50 text-teal-600 dark:bg-teal-900/20 dark:text-teal-400",
    },
    {
      label: "Avg. fulfillment",
      value: stats.fulfillmentDays > 0 ? `${stats.fulfillmentDays}d` : "N/A",
      detail: `${stats.returnRate}% return rate`,
      icon: Timer,
      color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400",
    },
  ];

  const healthBars = [
    { label: "Exception rate", value: stats.exceptionRate },
    { label: "Return rate", value: stats.returnRate },
    { label: "Settlement rate", value: stats.settlementRate },
  ];

  return (
    <PageTransition>
      <PageIntro title="Analytics" description="Track sales performance, fulfillment health, and settlement quality from one vendor view." />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {healthCards.map((stat) => (
          <div key={stat.label} className="border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{stat.label}</p>
              <div className={`p-2 ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{stat.value}</p>
            <p className="mt-1 text-xs text-stone-500">{stat.detail}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardTitle>Net revenue trend</CardTitle>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="netRevenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#b45309" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#b45309" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} tickFormatter={(value: number) => `$${Math.round(value / 1000)}k`} />
                <Tooltip content={<RevenueTooltip />} />
                <Area type="monotone" dataKey="net" stroke="#b45309" strokeWidth={2} fill="url(#netRevenueGradient)" animationDuration={700} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle>Operational health</CardTitle>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={healthBars} layout="vertical" margin={{ left: 0, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} domain={[0, 100]} />
                <YAxis type="category" dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} width={110} />
                <Tooltip formatter={(value: number) => `${value}%`} />
                <Bar dataKey="value" radius={[0, 3, 3, 0]} animationDuration={700}>
                  {healthBars.map((item, index) => (
                    <Cell key={item.label} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardTitle>Top products</CardTitle>
          <div className="mt-4">
            {topProducts.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={topProducts.map((product) => ({ name: product.name.slice(0, 20), sales: product.sale_count ?? 0 }))} layout="vertical" margin={{ left: 0, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" horizontal={false} />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#a8a29e" }} />
                  <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#78716c" }} width={110} />
                  <Tooltip />
                  <Bar dataKey="sales" radius={[0, 3, 3, 0]} animationDuration={700}>
                    {topProducts.map((product, index) => (
                      <Cell key={product.id} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <StatePanel
                title="No sales data yet"
                description="As orders start converting, top-performing products will appear here automatically."
                icon={Package}
                className="border-none bg-transparent py-12 shadow-none"
              />
            )}
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <CardTitle>Health playbook</CardTitle>
          <div className="mt-4 space-y-4 text-sm text-stone-500">
            <div className="border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex items-center gap-2 text-stone-900 dark:text-white">
                <AlertTriangle className="h-4 w-4 text-rose-500" />
                <p className="font-medium">Exception watch</p>
              </div>
              <p className="mt-2">Keep delivery failures and returns under review. A double-digit exception rate usually signals a fulfillment or quality issue worth correcting.</p>
            </div>
            <div className="border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex items-center gap-2 text-stone-900 dark:text-white">
                <ShieldCheck className="h-4 w-4 text-teal-500" />
                <p className="font-medium">Settlement confidence</p>
              </div>
              <p className="mt-2">Use settlement rate to confirm whether delivered orders are also reconciling cleanly through Stripe transfers.</p>
            </div>
            <div className="border border-stone-200 p-4 dark:border-stone-800">
              <div className="flex items-center gap-2 text-stone-900 dark:text-white">
                <Undo2 className="h-4 w-4 text-amber-500" />
                <p className="font-medium">Returns discipline</p>
              </div>
              <p className="mt-2">When return rate climbs, review product detail clarity, sizing/expectation copy, and packaging quality to reduce preventable reversals.</p>
            </div>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
