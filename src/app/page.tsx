import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Headphones, Shield, Star, Store, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/ui/product-card";
import { StorefrontFooter } from "@/components/layout/storefront-footer";
import { StorefrontHeader } from "@/components/layout/storefront-header";
import { RecentlyViewedRail } from "@/components/storefront/recently-viewed-rail";
import { Card } from "@/components/ui/card";
import { HOMEPAGE_QUERY, fetchSanity, urlFor } from "@/lib/sanity/client";
import { getCategories, getStores } from "@/lib/supabase/queries";
import { getStoreTrustBadges } from "@/lib/storefront/store-profile";
import {
  type HomepageModule,
  type MerchandisingCategory,
  getSanitySlug,
  resolveHomepageRails,
} from "@/lib/storefront/merchandising";

const defaultFeatures = [
  { icon: Truck, title: "Free shipping", desc: "On orders over $75" },
  { icon: Shield, title: "Secure payments", desc: "Stripe-powered checkout" },
  { icon: Star, title: "Quality vendors", desc: "Vetted & approved" },
  { icon: Headphones, title: "Buyer support", desc: "Clear policies and fast resolution" },
];

type SanityImageSource = Parameters<typeof urlFor>[0];

function getSanityImageUrl(source: unknown, width: number, height: number) {
  if (!source) return null;

  try {
    return urlFor(source as SanityImageSource).width(width).height(height).fit("crop").quality(85).url();
  } catch {
    return null;
  }
}

async function getHomepageModule() {
  try {
    return await fetchSanity<HomepageModule | null>(HOMEPAGE_QUERY);
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const [homepageModule, categories, storesResult] = await Promise.all([getHomepageModule(), getCategories(), getStores(1, 4)]);
  const editorialRails = await resolveHomepageRails(homepageModule);

  const heroTitle = homepageModule?.heroTitle || "Discover exceptional products from independent vendors";
  const heroSubtitle =
    homepageModule?.heroSubtitle ||
    "A premium marketplace where quality craftsmanship, trusted vendors, and editorial curation meet in one polished buying experience.";
  const heroImageUrl = getSanityImageUrl(homepageModule?.heroImage, 960, 1120);
  const featuredVendors = storesResult.stores.slice(0, 3);
  const featuredBanners = (homepageModule?.featuredBanners ?? []).filter((banner) => banner.isActive !== false).slice(0, 2);
  const curatedCategories: MerchandisingCategory[] =
    homepageModule?.featuredCategories?.length
      ? homepageModule.featuredCategories.slice(0, 4)
      : categories.slice(0, 4).map((category) => ({
          _id: category.id,
          title: category.name,
          slug: category.slug,
          description: category.description ?? undefined,
          image: null,
        }));

  return (
    <div className="flex min-h-screen flex-col">
      <StorefrontHeader />

      <section className="relative overflow-hidden border-b border-stone-200 bg-stone-100 dark:border-stone-800 dark:bg-stone-900">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_460px] lg:items-center lg:py-24">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.3em] text-amber-700 dark:text-amber-500">
              The curated marketplace
            </p>
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
              <Link href="/compare">
                <Button variant="outline" size="lg">
                  Compare shortlist
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative min-h-[420px] overflow-hidden border border-stone-200 bg-stone-200 dark:border-stone-800 dark:bg-stone-950">
            {heroImageUrl ? (
              <Image src={heroImageUrl} alt={heroTitle} fill priority sizes="(min-width: 1024px) 460px, 100vw" className="object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/10 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-6 text-white">
              <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">Editorial curation</p>
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-100">
                CMS-led storytelling, stronger vendor trust, and premium commerce flows now shape the marketplace front door.
              </p>
            </div>
          </div>
        </div>
      </section>

      {featuredBanners.length > 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid gap-6 lg:grid-cols-2">
            {featuredBanners.map((banner) => {
              const imageUrl = getSanityImageUrl(banner.image, 1200, 780);
              const href = banner.link?.trim() || "/shop";

              return (
                <Link
                  key={banner._id}
                  href={href}
                  className="group relative min-h-[280px] overflow-hidden border border-stone-200 bg-stone-900 p-8 text-white dark:border-stone-800"
                >
                  {imageUrl ? (
                    <Image
                      src={imageUrl}
                      alt={banner.title || "Editorial banner"}
                      fill
                      sizes="(min-width: 1024px) 50vw, 100vw"
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : null}
                  <div className="absolute inset-0 bg-gradient-to-r from-stone-950/90 via-stone-950/60 to-stone-950/20" />
                  <div className="relative z-10 max-w-md">
                    <p className="text-[11px] uppercase tracking-[0.28em] text-amber-300">CMS feature</p>
                    <h2 className="mt-4 font-serif text-3xl leading-tight">{banner.title || "Curated marketplace story"}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-stone-100">
                      {banner.subtitle || "Highlight a promotion, seasonal message, or high-conviction discovery path from Sanity."}
                    </p>
                    <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-200">
                      Explore now
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Curated navigation</p>
            <h2 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">Shop by editorial category</h2>
          </div>
          <Link
            href="/shop"
            className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white"
          >
            Browse all
          </Link>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {curatedCategories.map((category, index) => {
            const slug = getSanitySlug(category.slug);
            const imageUrl = getSanityImageUrl(category.image, 640, 720);

            return (
              <Link
                key={category._id ?? `${slug}-${index}`}
                href={slug ? `/shop?category=${slug}` : "/shop"}
                className={`group relative min-h-[240px] overflow-hidden border border-stone-200 bg-white p-5 transition-shadow hover:shadow-sm dark:border-stone-800 dark:bg-stone-950 ${
                  index === 0 ? "sm:col-span-2" : ""
                }`}
              >
                {imageUrl ? (
                  <Image
                    src={imageUrl}
                    alt={category.title || "Featured category"}
                    fill
                    sizes={index === 0 ? "(min-width: 640px) 50vw, 100vw" : "(min-width: 1024px) 25vw, 100vw"}
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                ) : null}
                <div className={`absolute inset-0 ${imageUrl ? "bg-gradient-to-t from-stone-950/80 via-stone-950/35 to-transparent" : ""}`} />
                <div className={`relative ${imageUrl ? "text-white" : ""}`}>
                  <p className={`text-[11px] uppercase tracking-widest ${imageUrl ? "text-stone-100" : "text-stone-400 group-hover:text-stone-200"}`}>
                    Curated category
                  </p>
                  <h2 className={`mt-2 font-serif text-2xl ${imageUrl ? "text-white" : "text-stone-900 dark:text-white"}`}>
                    {category.title || "Marketplace category"}
                  </h2>
                  <p className={`mt-2 max-w-md text-sm ${imageUrl ? "text-stone-100" : "text-stone-500 group-hover:text-stone-100"}`}>
                    {category.description || "Editorially selected pieces with standout marketplace quality."}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-amber-700 dark:text-amber-500">
                    Explore category
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {editorialRails.map((rail) => (
        <section key={rail.id} className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">{rail.eyebrow}</p>
              <h2 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">{rail.title}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-stone-500">{rail.subtitle}</p>
            </div>
            <Link
              href={rail.ctaHref}
              className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white"
            >
              {rail.ctaLabel}
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {rail.products.map((product, index) => (
              <ProductCard key={product.id} product={product} index={index} />
            ))}
          </div>
        </section>
      ))}

      <section className="bg-stone-950 py-16 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-500">Trust and storytelling</p>
              <h2 className="mt-2 font-serif text-3xl">Featured vendors</h2>
              <p className="mt-3 max-w-2xl text-sm text-stone-400">
                Meet approved sellers who pair strong product quality with clear fulfillment expectations and consistent buyer trust signals.
              </p>
            </div>
            <Link href="/vendors" className="text-xs font-medium uppercase tracking-wider text-stone-300 hover:text-white">
              View all vendors
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {featuredVendors.map((store) => {
              const badges = getStoreTrustBadges(store);
              return (
                <Link
                  key={store.id}
                  href={`/vendors/${store.slug}`}
                  className="group block border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/10"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-widest text-amber-400">Approved vendor</p>
                      <h3 className="mt-2 font-serif text-2xl">{store.name}</h3>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 text-amber-400">
                      <Store className="h-5 w-5" />
                    </div>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-stone-300">
                    {store.description || "A curated storefront with a clear editorial point of view and thoughtful buyer experience."}
                  </p>
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
