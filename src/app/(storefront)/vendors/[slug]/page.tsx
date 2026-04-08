import Image from "next/image";
import Link from "next/link";
import { Mail, Package, ShieldCheck, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/ui/product-card";
import { Card } from "@/components/ui/card";
import { getStoreBySlug, getProducts } from "@/lib/supabase/queries";
import { getStoreProfileContent, getStoreTrustBadges } from "@/lib/storefront/store-profile";

export default async function VendorDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const store = await getStoreBySlug(slug);

  if (!store) {
    return (
      <div className="mx-auto max-w-4xl px-6 py-20 text-center">
        <p className="font-serif text-3xl text-stone-900 dark:text-white">Vendor not found</p>
        <p className="mt-3 text-sm text-stone-500">This storefront may be unavailable or no longer approved for marketplace visibility.</p>
        <Link href="/vendors" className="mt-6 inline-block text-sm font-medium uppercase tracking-wider text-amber-700 dark:text-amber-500">
          Back to vendors
        </Link>
      </div>
    );
  }

  const profile = getStoreProfileContent(store);
  const badges = getStoreTrustBadges(store);
  const productsResult = await getProducts({ storeId: store.id, pageSize: 8, sort: "popular" });

  return (
    <div className="mx-auto max-w-7xl px-6 py-10">
      <div className="overflow-hidden border border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
        <div className="relative h-72 bg-stone-100 dark:bg-stone-800">
          {store.banner_url ? <Image src={store.banner_url} alt={store.name} fill sizes="100vw" className="object-cover" /> : null}
          <div className="absolute inset-0 bg-gradient-to-t from-stone-950/70 via-stone-950/10 to-transparent" />
        </div>

        <div className="relative px-6 pb-8 pt-0 sm:px-10">
          <div className="-mt-14 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden border-4 border-white bg-stone-900 text-3xl font-serif text-white dark:border-stone-900">
                {store.logo_url ? <Image src={store.logo_url} alt={store.name} fill sizes="96px" className="object-cover" /> : store.name.charAt(0)}
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-amber-700 dark:text-amber-500">Approved vendor</p>
                <h1 className="mt-2 font-serif text-4xl text-stone-900 dark:text-white">{store.name}</h1>
                <p className="mt-2 max-w-2xl text-sm text-stone-500">{profile.storyHeadline || store.description || "A curated storefront bringing considered products to the NexCart marketplace."}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {badges.map((badge) => (
                <span key={badge.label} className="border border-stone-200 px-3 py-2 text-[10px] font-medium uppercase tracking-widest text-stone-600 dark:border-stone-700 dark:text-stone-300">
                  {badge.label}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <Card variant="outlined">
                <h2 className="font-serif text-2xl text-stone-900 dark:text-white">Store story</h2>
                <p className="mt-3 text-sm leading-relaxed text-stone-600 dark:text-stone-400">
                  {profile.craftsmanshipNote || store.description || "This vendor is building out their full marketplace story. Product pages and fulfillment policies remain active in the meantime."}
                </p>
              </Card>

              <div>
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.28em] text-stone-400">Merchandising</p>
                    <h2 className="mt-2 font-serif text-3xl text-stone-900 dark:text-white">Featured products</h2>
                  </div>
                  <Link href={`/shop?store=${store.id}`} className="text-xs font-medium uppercase tracking-wider text-stone-500 hover:text-stone-900 dark:hover:text-white">
                    Browse full catalog
                  </Link>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
                  {productsResult.products.map((product, index) => (
                    <ProductCard key={product.id} product={product} index={index} />
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Card variant="outlined">
                <h2 className="font-serif text-2xl text-stone-900 dark:text-white">Buyer confidence</h2>
                <div className="mt-4 space-y-4 text-sm text-stone-600 dark:text-stone-400">
                  <div className="flex items-start gap-3">
                    <ShieldCheck className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">Marketplace approval</p>
                      <p>NexCart has approved this store for buyer-facing discovery and checkout.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Truck className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">Shipping promise</p>
                      <p>{profile.shippingNote || profile.processingTime || "Standard marketplace shipping details apply at checkout."}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <div>
                      <p className="font-medium text-stone-900 dark:text-white">Returns and care</p>
                      <p>{profile.returnsPolicy || "Return terms vary by product, with clear details shared before purchase."}</p>
                    </div>
                  </div>
                  {profile.supportEmail ? (
                    <div className="flex items-start gap-3">
                      <Mail className="mt-0.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                      <div>
                        <p className="font-medium text-stone-900 dark:text-white">Support contact</p>
                        <p>{profile.supportEmail}</p>
                      </div>
                    </div>
                  ) : null}
                </div>
              </Card>

              <Card variant="outlined">
                <h2 className="font-serif text-2xl text-stone-900 dark:text-white">Marketplace reputation</h2>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-400">Orders</p>
                    <p className="mt-2 text-2xl font-medium text-stone-900 dark:text-white">{store.total_orders}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-widest text-stone-400">Rating</p>
                    <p className="mt-2 inline-flex items-center gap-2 text-2xl font-medium text-stone-900 dark:text-white">
                      <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
                      {store.rating_count > 0 ? Number(store.rating_avg).toFixed(1) : "New"}
                    </p>
                  </div>
                </div>
                {profile.policyHighlights.length > 0 ? (
                  <div className="mt-5 flex flex-wrap gap-2">
                    {profile.policyHighlights.map((item) => (
                      <span key={item} className="border border-stone-200 px-2 py-1 text-[10px] uppercase tracking-widest text-stone-500 dark:border-stone-700">
                        {item}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
