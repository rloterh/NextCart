import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { getStripePublishableKey } from "@/lib/platform/readiness.public";

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripe(): Promise<Stripe | null> {
  const publishableKey = getStripePublishableKey();
  if (!publishableKey) {
    return Promise.resolve(null);
  }
  if (!stripePromise) stripePromise = loadStripe(publishableKey);
  return stripePromise;
}
