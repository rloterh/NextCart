"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronRight, Heart, ShoppingBag, Store, User } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardTitle } from "@/components/ui/card";

interface AccountStats {
  orders: number;
  wishlist: number;
}

export default function AccountOverviewPage() {
  const { profile, isVendor, isAdmin } = useAuth();
  const [stats, setStats] = useState<AccountStats>({ orders: 0, wishlist: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      const sb = getSupabaseBrowserClient();
      const [ordersRes, wishlistRes] = await Promise.all([
        sb.from("orders").select("id", { count: "exact", head: true }),
        sb.from("wishlists").select("id", { count: "exact", head: true }),
      ]);

      setStats({
        orders: ordersRes.count ?? 0,
        wishlist: wishlistRes.count ?? 0,
      });
      setLoading(false);
    }

    fetchStats();
  }, []);

  const quickLinks = [
    {
      href: "/account/orders",
      label: "Orders",
      description: "Track purchases, delivery progress, and order history.",
      icon: ShoppingBag,
      meta: loading ? "Loading..." : `${stats.orders} total`,
    },
    {
      href: "/account/wishlist",
      label: "Wishlist",
      description: "Save products you want to revisit and buy later.",
      icon: Heart,
      meta: loading ? "Loading..." : `${stats.wishlist} saved`,
    },
  ];

  if (isVendor) {
    quickLinks.push({
      href: "/vendor/dashboard",
      label: "Vendor Dashboard",
      description: "Manage products, orders, analytics, and store settings.",
      icon: Store,
      meta: "Vendor tools",
    });
  }

  if (isAdmin) {
    quickLinks.push({
      href: "/admin/dashboard",
      label: "Admin Console",
      description: "Moderate vendors, products, and marketplace operations.",
      icon: User,
      meta: "Marketplace ops",
    });
  }

  return (
    <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-6xl px-6 py-10">
      <div className="mb-10 flex flex-col gap-4 border-b border-stone-200 pb-8 dark:border-stone-800">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Account</p>
          <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white">
            Welcome back{profile?.full_name ? `, ${profile.full_name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Manage your orders, saved products, and marketplace activity from one clear workspace.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-6 md:grid-cols-2">
          {quickLinks.map((link) => (
            <Link key={link.href} href={link.href} className="group">
              <Card className="h-full border-stone-200 transition-all duration-300 hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5 dark:border-stone-800 dark:hover:border-stone-700">
                <div className="flex items-start justify-between">
                  <div className="flex h-11 w-11 items-center justify-center bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-200">
                    <link.icon className="h-5 w-5" />
                  </div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">{link.meta}</span>
                </div>
                <CardTitle className="mt-6 text-2xl">{link.label}</CardTitle>
                <p className="mt-3 text-sm leading-relaxed text-stone-500 dark:text-stone-400">{link.description}</p>
                <div className="mt-6 flex items-center gap-2 text-xs font-medium uppercase tracking-[0.18em] text-stone-500 transition-colors group-hover:text-stone-900 dark:group-hover:text-white">
                  Open <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </Card>
            </Link>
          ))}
        </div>

        <Card className="border-stone-200 dark:border-stone-800">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Profile</p>
          <CardTitle className="mt-4">{profile?.full_name || "NexCart Member"}</CardTitle>
          <div className="mt-6 space-y-4 text-sm">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">Email</p>
              <p className="mt-1 text-stone-700 dark:text-stone-300">{profile?.email}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">Role</p>
              <p className="mt-1 capitalize text-stone-700 dark:text-stone-300">{profile?.role ?? "buyer"}</p>
            </div>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-stone-400">Account focus</p>
              <p className="mt-1 leading-relaxed text-stone-500 dark:text-stone-400">
                {isAdmin
                  ? "Marketplace governance, moderation, and operational oversight."
                  : isVendor
                    ? "Buyer access plus vendor storefront operations and order fulfillment."
                    : "Discovery, saved products, checkout, and post-purchase tracking."}
              </p>
            </div>
          </div>
        </Card>
      </div>
    </motion.div>
  );
}
