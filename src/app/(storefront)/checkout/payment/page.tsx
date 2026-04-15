import { Suspense } from "react";
import { CheckoutPaymentPageClient } from "./checkout-payment-page-client";

export default function CheckoutPaymentPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-lg px-6 py-20 text-center" />}>
      <CheckoutPaymentPageClient />
    </Suspense>
  );
}
