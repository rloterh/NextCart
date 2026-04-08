"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Category } from "@/types";

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    async function fetch() {
      const sb = getSupabaseBrowserClient();
      const { data } = await sb.from("categories").select("*").eq("is_active", true).is("parent_id", null).order("sort_order");
      setCategories((data ?? []) as Category[]);
    }
    fetch();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-400">Browse by</p>
        <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white">Categories</h1>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((cat) => (
          <motion.div key={cat.id} variants={item}>
            <Link href={`/shop?category=${cat.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
                {cat.image_url ? (
                  <img src={cat.image_url} alt={cat.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-serif text-7xl text-stone-200 dark:text-stone-700">{cat.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">{cat.name}</h2>
                  {cat.description && (
                    <p className="mt-1 text-xs text-stone-300">{cat.description}</p>
                  )}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
