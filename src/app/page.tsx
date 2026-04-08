"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Star, Truck, Shield, Headphones } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { StorefrontFooter } from "@/components/layout/storefront-footer";

const categories = [
  { name: "Electronics", slug: "electronics", image: "", desc: "Cutting-edge gadgets" },
  { name: "Fashion", slug: "fashion", image: "", desc: "Curated apparel" },
  { name: "Home & Living", slug: "home-living", image: "", desc: "Artisan decor" },
  { name: "Beauty", slug: "beauty-health", image: "", desc: "Premium skincare" },
];

const features = [
  { icon: Truck, title: "Free shipping", desc: "On orders over $75" },
  { icon: Shield, title: "Secure payments", desc: "Stripe-powered checkout" },
  { icon: Star, title: "Quality vendors", desc: "Vetted & approved" },
  { icon: Headphones, title: "24/7 support", desc: "Always here to help" },
];

const container = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1, delayChildren: 0.2 } } };
const item = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } } };

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />

      {/* Hero */}
      <section className="relative overflow-hidden bg-stone-100 dark:bg-stone-900">
        <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.3em] text-amber-700 dark:text-amber-500">
              The curated marketplace
            </p>
            <h1 className="mx-auto max-w-3xl font-serif text-5xl leading-[1.1] text-stone-900 sm:text-6xl lg:text-7xl dark:text-white">
              Discover{" "}
              <span className="italic text-amber-700 dark:text-amber-500">exceptional</span>{" "}
              products from independent vendors
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-stone-500 dark:text-stone-400">
              A marketplace where quality craftsmanship meets discerning taste.
              Every vendor is vetted. Every product tells a story.
            </p>
            <div className="mt-10 flex items-center justify-center gap-4">
              <Link href="/shop">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Explore collection
                </Button>
              </Link>
              <Link href="/sell">
                <Button variant="outline" size="lg">Become a vendor</Button>
              </Link>
            </div>
          </motion.div>
        </div>
        {/* Decorative border */}
        <div className="h-px bg-gradient-to-r from-transparent via-stone-300 to-transparent dark:via-stone-700" />
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-7xl px-6 py-20">
        <div className="mb-12 text-center">
          <p className="text-xs font-medium uppercase tracking-[0.3em] text-stone-400">Browse by</p>
          <h2 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">Categories</h2>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
        >
          {categories.map((cat) => (
            <motion.div key={cat.slug} variants={item}>
              <Link href={`/shop?category=${cat.slug}`} className="group block">
                <div className="aspect-[4/5] overflow-hidden bg-stone-100 dark:bg-stone-800">
                  <div className="flex h-full items-center justify-center text-stone-300 transition-transform duration-700 group-hover:scale-105">
                    <span className="text-6xl font-serif opacity-20">{cat.name[0]}</span>
                  </div>
                </div>
                <div className="mt-3">
                  <h3 className="text-sm font-medium uppercase tracking-wider text-stone-900 dark:text-white">
                    {cat.name}
                  </h3>
                  <p className="mt-0.5 text-xs text-stone-500">{cat.desc}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Vendor CTA */}
      <section className="bg-stone-900 py-20 dark:bg-stone-800">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-500">For vendors</p>
            <h2 className="mt-3 font-serif text-3xl text-white sm:text-4xl">
              Turn your craft into a business
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-stone-400">
              Join a marketplace that values quality over quantity. Low commission rates,
              powerful analytics, and a community of discerning buyers.
            </p>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="mt-8" rightIcon={<ArrowRight className="h-4 w-4" />}>
                Apply to sell
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feat) => (
            <div key={feat.title} className="text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center">
                <feat.icon className="h-5 w-5 text-stone-600 dark:text-stone-400" />
              </div>
              <h3 className="text-xs font-medium uppercase tracking-wider text-stone-900 dark:text-white">{feat.title}</h3>
              <p className="mt-1 text-xs text-stone-500">{feat.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <StorefrontFooter />
    </div>
  );
}
