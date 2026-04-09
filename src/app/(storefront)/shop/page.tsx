import { Suspense } from "react";
import { ShopPageClient } from "./shop-page-client";

export default function ShopPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-6 py-8" />}>
      <ShopPageClient />
    </Suspense>
  );
}
