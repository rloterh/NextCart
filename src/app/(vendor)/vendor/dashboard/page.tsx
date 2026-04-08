"use client";

import { motion } from "framer-motion";
import { Package, ShoppingCart, DollarSign, Eye } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const stats = [
  { label: "Products", value: "0", icon: Package, color: "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400" },
  { label: "Orders", value: "0", icon: ShoppingCart, color: "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400" },
  { label: "Revenue", value: "$0", icon: DollarSign, color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" },
  { label: "Views", value: "0", icon: Eye, color: "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400" },
];

export default function VendorDashboard() {
  const { store } = useAuth();

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl text-stone-900 dark:text-white">
          Welcome, {store?.name ?? "Vendor"}
        </h1>
        <p className="mt-1 text-sm text-stone-500">Your store overview at a glance.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="border border-stone-200 bg-white p-5 dark:border-stone-800 dark:bg-stone-900">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-widest text-stone-400">{stat.label}</p>
              <div className={`p-2 ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
            </div>
            <p className="mt-3 text-2xl font-medium text-stone-900 dark:text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="border border-dashed border-stone-300 p-12 text-center text-sm text-stone-400 dark:border-stone-700">
        Product management, order fulfillment, and analytics — coming in Phase 2
      </div>
    </motion.div>
  );
}
