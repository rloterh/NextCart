import Link from "next/link";
import { ArrowRight, Headphones, Shield, Star, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { RecentlyViewedRail } from "@/components/storefront/recently-viewed-rail";
import { Card } from "@/components/ui/card";
import { HOMEPAGE_QUERY, fetchSanity } from "@/lib/sanity/client";
import { getCategories, getFeaturedProducts, getStores } from "@/lib/supabase/queries";
import { getStoreTrustBadges } from "@/lib/storefront/store-profile";

interface HomepageModule {
  heroTitle?: string;
  heroSubtitle?: string;
}

const defaultFeatures = [
  { icon: Truck, title: "Free shipping", desc: "On orders over $75" },
  { icon: Shield, title: "Secure payments", desc: "Stripe-powered checkout" },
  { icon: Star, title: "Quality vendors", desc: "Vetted & approved" },
  { icon: Headphones, title: "Buyer support", desc: "Clear policies and fast resolution" },
];

async function getHomepageModule() {
  try {
    return await fetchSanity<HomepageModule | null>(HOMEPAGE_QUERY);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [homepageModule, featuredProducts, categories, storesResult] = await Promise.all([
    getHomepageModule(),
    getFeaturedProducts(8),
    getCategories(),
    getStores(1, 4),
  ]);

  const heroTitle = homepageModule?.heroTitle || "Discover exceptional products from independent vendors";
  const heroSubtitle =
    homepageModule?.heroSubtitle ||
    "A premium marketplace where quality craftsmanship, trusted vendors, and editorial curation meet in one polished buying experience.";

  const curatedCategories = categories.slice(0, 4);
  const featuredVendors = storesResult.stores.slice(0, 3);

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />

      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[minmax(0,1.2fr)_420px] lg:items-end lg:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-700 dark:text-amber-500">The curated marketplace</p>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl leading-[1.05] text-stone-900 sm:text-6xl lg:text-7xl dark:text-white">
              {heroTitle}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone-500 dark:text-stone-400">{heroSubtitle}</p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link href="/shop">
                <Button size="lg" rightIcon={<ArrowRight className="h-4 w-4" />}>
                  Explore collection
                </Button>
              </Link>
              <Link href="/vendors">
                <Button variant="outline" size="lg">
                  Meet our vendors
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {curatedCategories.map((category, index) => (
              <Link
                key={category.id}
                href={`/shop?category=${category.slug}`}
                className={`group border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-stone-800 dark:bg-stone-950 ${
                  index === 0 ? "sm:col-span-2" : ""
                }`}
              >
                <p className="text-[11px] uppercase tracking-widest text-stone-400">Curated category</p>
                <h2 className="mt-2 font-serif text-2xl text-stone-900 dark:text-white">{category.name}</h2>
                <p className="mt-2 text-sm text-stone-500">{category.description || "Editorially selected pieces with standout marketplace quality."}</p>
                <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-500">
                  Explore category
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Merchandising</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">Featured this season</h2>
          </div>
          <Link href="/shop?sort=popular" className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white">
            Shop best sellers
          </Link>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {featuredProducts.map((product, index) => (
            <ProductCard key={product.id} product={product} index={index} />
          ))}
        </div>
      </section>

      <section className="bg-stone-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-500">Trust and storytelling</p>
              <h2 className="mt-2 font-serif text-3xl">Featured vendors</h2>
              <p className="mt-3 max-w-2xl text-sm text-stone-400">Meet approved sellers who pair strong product quality with clear fulfillment expectations and consistent buyer trust signals.</p>
            </div>
            <Link href="/vendors" className="text-xs font-medium uppercase tracking-wider text-stone-300 hover:text-white">
              View all vendors
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {featuredVendors.map((store) => {
              const badges = getStoreTrustBadges(store);
              return (
                <Link key={store.id} href={`/vendors/${store.slug}`} className="group block border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-amber-400">Approved vendor</p>
                      <h3 className="mt-2 font-serif text-2xl">{store.name}</h3>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-amber-400">
                      <Store className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-stone-300">{store.description || "A curated storefront with a clear editorial point of view and thoughtful buyer experience."}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {badges.map((badge) => (
                      <span key={badge.label} className="border border-white/10 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-200">
                        {badge.label}
                      </span>
                    ))}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <RecentlyViewedRail />

      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {defaultFeatures.map((feature) => (
            <Card key={feature.title} variant="outlined" className="text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center text-stone-600 dark:text-stone-300">
                <feature.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xs font-medium uppercase tracking-wider text-stone-900 dark:text-white">{feature.title}</h3>
              <p className="mt-1 text-sm text-stone-500">{feature.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      <StorefrontFooter />
    </div>
  );
}
