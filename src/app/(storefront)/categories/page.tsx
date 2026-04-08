"use client";

import Image from "next/image";
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
    async function fetchCategories() {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.from("categories").select("*").eq("is_active", true).is("parent_id", null).order("sort_order");
      setCategories((data ?? []) as Category[]);
    }

    void fetchCategories();
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-12 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-400">Browse by</p>
        <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white">Categories</h1>
      </div>

      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <motion.div key={category.id} variants={item}>
            <Link href={`/shop?category=${category.slug}`} className="group block">
              <div className="relative aspect-[4/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
                {category.image_url ? (
                  <Image
                    src={category.image_url}
                    alt={category.name}
                    fill
                    sizes="(min-width: 1024px) 33vw, 100vw"
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <span className="font-serif text-7xl text-stone-200 dark:text-stone-700">{category.name[0]}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-stone-900/60 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6">
                  <h2 className="text-sm font-medium uppercase tracking-[0.2em] text-white">{category.name}</h2>
                  {category.description ? <p className="mt-1 text-xs text-stone-300">{category.description}</p> : null}
                </div>
              </div>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
