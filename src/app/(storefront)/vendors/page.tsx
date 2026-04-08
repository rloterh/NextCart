"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Star } from "lucide-react";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { getStoreTrustBadges } from "@/lib/storefront/store-profile";
import type { Store } from "@/types";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function VendorsPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const sb = getSupabaseBrowserClient();
      const { data } = await sb
        .from("stores")
        .select("*, owner:profiles(full_name, avatar_url)")
        .eq("status", "approved")
        .order("rating_avg", { ascending: false });
      setStores((data ?? []) as Store[]);
      setLoading(false);
    }
    void fetch();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-400">Discover</p>
        <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white">Our vendors</h1>
        <p className="mt-3 text-sm text-stone-500">Every vendor is vetted, story-led, and reviewed for fulfillment quality before merchandising.</p>
      </div>

      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="h-64 animate-pulse bg-stone-100 dark:bg-stone-800" />
          ))}
        </div>
      ) : stores.length === 0 ? (
        <p className="py-20 text-center font-serif text-xl text-stone-400">No vendors yet</p>
      ) : (
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {stores.map((store) => {
            const badges = getStoreTrustBadges(store);

            return (
              <motion.div key={store.id} variants={item}>
                <Link href={`/vendors/${store.slug}`} className="group block border border-stone-200 bg-white transition-shadow hover:shadow-md dark:border-stone-800 dark:bg-stone-900">
                  <div className="relative h-32 overflow-hidden bg-stone-100 dark:bg-stone-800">
                    {store.banner_url ? (
                      <Image src={store.banner_url} alt={store.name} fill sizes="(min-width: 1024px) 33vw, 100vw" className="object-cover transition-transform duration-500 group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span className="font-serif text-5xl text-stone-200 dark:text-stone-700">{store.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <div className="relative px-5 pb-5 pt-8">
                    <div className="absolute -top-6 left-5 flex h-12 w-12 items-center justify-center overflow-hidden border-2 border-white bg-stone-900 text-sm font-bold text-white dark:border-stone-900 dark:bg-amber-700">
                      {store.logo_url ? <Image src={store.logo_url} alt={store.name} fill sizes="48px" className="object-cover" /> : store.name.charAt(0)}
                    </div>

                    <h3 className="text-sm font-medium text-stone-900 dark:text-white">{store.name}</h3>
                    {store.description ? <p className="mt-1 line-clamp-2 text-xs text-stone-500">{store.description}</p> : null}

                    {badges.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {badges.map((badge) => (
                          <span key={badge.label} className="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-500 dark:border-stone-700">
                            {badge.label}
                          </span>
                        ))}
                      </div>
                    ) : null}

                    <div className="mt-3 flex items-center gap-4 text-xs text-stone-400">
                      {store.rating_count > 0 ? (
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {Number(store.rating_avg).toFixed(1)} ({store.rating_count})
                        </span>
                      ) : null}
                      <span>{store.total_orders} orders</span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}
