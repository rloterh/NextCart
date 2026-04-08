import Stripe from "stripe";

let stripeClient: Stripe | null = null;

const PLATFORM_FEE_PERCENT = Number(process.env.STRIPE_PLATFORM_FEE_PERCENT ?? 10);

export function getStripeServerClient() {
  if (stripeClient) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: "2024-12-18.acacia",
    typescript: true,
  });

  return stripeClient;
}

export async function createConnectOnboardingLink(
  storeId: string, storeName: string, email: string, existingAccountId?: string | null
): Promise<{ accountId: string; url: string }> {
  const stripe = getStripeServerClient();
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
    refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/settings?stripe=refresh`,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/settings?stripe=success`,
    type: "account_onboarding",
  });
  return { accountId, url: link.url };
}

export async function createCheckoutPaymentIntent(params: {
  amount: number; currency: string; vendorStripeAccountId: string;
  orderId: string; buyerEmail: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripeServerClient();
  const platformFee = Math.round(params.amount * (PLATFORM_FEE_PERCENT / 100));
  const paymentIntent = await stripe.paymentIntents.create({
    amount: params.amount,
    currency: params.currency.toLowerCase(),
    payment_method_types: ["card"],
    application_fee_amount: platformFee,
    transfer_data: { destination: params.vendorStripeAccountId },
    metadata: { order_id: params.orderId },
    receipt_email: params.buyerEmail,
  });
  return { clientSecret: paymentIntent.client_secret!, paymentIntentId: paymentIntent.id };
}

export function calculatePlatformFee(amount: number): number {
  return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
}

export async function createDashboardLink(accountId: string): Promise<string> {
  const stripe = getStripeServerClient();
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}
