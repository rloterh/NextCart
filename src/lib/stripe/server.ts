import Stripe from "stripe";
import { getPublicAppUrl } from "@/lib/platform/readiness.public";
import { requirePlatformCapability } from "@/lib/platform/readiness.server";

let stripeClient: Stripe | null = null;

const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 10);

export function getStripeServerClient() {
  if (stripeClient) return stripeClient;

  requirePlatformCapability("stripe_server");
  const secretKey = process.env.STRIPE_SECRET_KEY!;

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });

  return stripeClient;
}

export async function createConnectOnboardingLink(
  storeId: string, storeName: string, email: string, existingAccountId?: string | null
): Promise<{ accountId: string; url: string }> {
  requirePlatformCapability("stripe_vendor_payouts");
  const stripe = getStripeServerClient();
  const appUrl = getPublicAppUrl();
  let accountId = existingAccountId;
  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express", email,
      business_profile: { name: storeName },
      metadata: { store_id: storeId },
      capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
    });
    accountId = account.id;
  }
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${appUrl}/vendor/settings?stripe=refresh`,
    return_url: `${appUrl}/vendor/settings?stripe=success`,
    type: "account_onboarding",
  });
  return { accountId, url: link.url };
}

export async function createCheckoutPaymentIntent(params: {
  amount: number; currency: string; vendorStripeAccountId: string;
  orderId: string; buyerEmail: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  requirePlatformCapability("stripe_checkout");
  const stripe = getStripeServerClient();
  const platformFee = Math.round(params.amount * (PLATFORM_FEE_PERCENT / 100));
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    payment_method_types: ["card"],
    application_fee_amount: platformFee,
    transfer_data: { destination: params.vendorStripeAccountId },
    transfer_group: `order_${params.orderId}`,
    metadata: { order_id: params.orderId },
    receipt_email: params.buyerEmail,
  });
  return { clientSecret: paymentIntent.client_secret!, paymentIntentId: paymentIntent.id };
}

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
}

export async function createDashboardLink(accountId: string): Promise<string> {
  requirePlatformCapability("stripe_vendor_payouts");
  const stripe = getStripeServerClient();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
