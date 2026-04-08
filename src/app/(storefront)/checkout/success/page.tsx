import { Suspense } from "react";
import { CheckoutSuccessPageClient } from "./checkout-success-page-client";

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-20 text-center" />}>
      <CheckoutSuccessPageClient />
    </Suspense>
  );
}
