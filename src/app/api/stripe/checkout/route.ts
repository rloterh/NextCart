import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { calculatePlatformFee, createCheckoutPaymentIntent } from "@/lib/stripe/server";
import { getServerUser, getSupabaseServerClient } from "@/lib/supabase/server";
import type { CheckoutShippingAddress } from "@/types/orders";

type CheckoutItemInput = {
  storeId: string;
  productId: string;
  variantId?: string | null;
  name: string;
  variantName?: string | null;
  image?: string | null;
  price: number;
  quantity: number;
};

type CheckoutRequestBody = {
  items: CheckoutItemInput[];
  shippingAddress: CheckoutShippingAddress;
};

function isCheckoutItemInput(value: unknown): value is CheckoutItemInput {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CheckoutItemInput>;

  return (
    typeof candidate.storeId === "string" &&
    typeof candidate.productId === "string" &&
    typeof candidate.name === "string" &&
    typeof candidate.price === "number" &&
    Number.isFinite(candidate.price) &&
    typeof candidate.quantity === "number" &&
    Number.isInteger(candidate.quantity) &&
    candidate.quantity > 0
  );
}

function sanitizeShippingAddress(address: CheckoutShippingAddress): CheckoutShippingAddress {
  return {
    fullName: address.fullName.trim(),
    line1: address.line1.trim(),
    line2: address.line2.trim(),
    city: address.city.trim(),
    state: address.state.trim(),
    postalCode: address.postalCode.trim(),
    country: address.country.trim() || "US",
    phone: address.phone.trim(),
  };
}

function isValidShippingAddress(value: unknown): value is CheckoutShippingAddress {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<CheckoutShippingAddress>;

  return (
    typeof candidate.fullName === "string" &&
    typeof candidate.line1 === "string" &&
    typeof candidate.city === "string" &&
    typeof candidate.postalCode === "string" &&
    typeof candidate.country === "string" &&
    typeof candidate.line2 === "string" &&
    typeof candidate.state === "string" &&
    typeof candidate.phone === "string"
  );
}

export async function POST(request: Request) {
  const trace = getRequestTrace(request);
  try {
    const user = await getServerUser();

    if (!user) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 401,
        error: "Unauthorized",
        boundaryClass: "permission",
        operatorGuidance: "Sign in before starting checkout so payment intents can be linked to a buyer session.",
        detail: "Checkout is available only to authenticated buyers.",
      });
    }

    const body = (await request.json()) as Partial<CheckoutRequestBody>;

    if (!Array.isArray(body.items) || !isValidShippingAddress(body.shippingAddress)) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Invalid request",
        boundaryClass: "dependency",
        operatorGuidance: "Retry checkout with valid cart items and a complete shipping payload.",
        detail: "The checkout request body did not satisfy the required item or shipping shape.",
      });
    }

    const items = body.items.filter(isCheckoutItemInput);
    if (items.length !== body.items.length || items.length === 0) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Invalid checkout items",
        boundaryClass: "dependency",
        operatorGuidance: "Ensure each checkout item has a valid store, product, price, and quantity before retrying.",
        detail: "One or more checkout items were missing required identifiers or numeric values.",
      });
    }

    const shippingAddress = sanitizeShippingAddress(body.shippingAddress);
    if (!shippingAddress.fullName || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postalCode) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Incomplete shipping address",
        boundaryClass: "dependency",
        operatorGuidance: "Capture the buyer's full shipping details before creating payment intents.",
        detail: "The shipping address was missing one or more required fields after sanitization.",
      });
    }

    const supabase = await getSupabaseServerClient();
    const storeGroups = new Map<string, CheckoutItemInput[]>();

    for (const item of items) {
      const group = storeGroups.get(item.storeId) ?? [];
      group.push(item);
      storeGroups.set(item.storeId, group);
    }

    const results: Array<{ orderId: string; orderNumber: string; clientSecret: string; total: number }> = [];

    for (const [storeId, storeItems] of storeGroups) {
      const { data: store } = await supabase
        .from("stores")
        .select("id, name, stripe_account_id")
        .eq("id", storeId)
        .single();

      if (!store?.stripe_account_id) {
        return createPlatformBoundaryErrorResponse(trace, {
          status: 400,
          error: "Store not set up for payments",
          boundaryClass: "config",
          operatorGuidance: "Complete vendor Stripe onboarding before accepting checkout for this store.",
          detail: `Store ${storeId} does not currently have a connected Stripe account.`,
        });
      }

      const subtotal = storeItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
      const shippingCost = subtotal >= 75 ? 0 : 9.99;
      const taxAmount = Math.round(subtotal * 0.085 * 100) / 100;
      const total = subtotal + shippingCost + taxAmount;
      const platformFee = calculatePlatformFee(Math.round(total * 100)) / 100;

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          buyer_id: user.id,
          store_id: storeId,
          subtotal,
          shipping_cost: shippingCost,
          tax_amount: taxAmount,
          platform_fee: platformFee,
          total,
          shipping_address: shippingAddress,
        })
        .select()
        .single();

      if (orderError) {
        return createPlatformBoundaryErrorResponse(trace, {
          status: 500,
          error: orderError.message,
          boundaryClass: "dependency",
          operatorGuidance: "Treat this as a checkout persistence failure and verify order table health before retrying payment creation.",
          detail: "The order record could not be inserted before payment intent creation.",
        });
      }

      const { error: itemsError } = await supabase.from("order_items").insert(
        storeItems.map((item) => ({
          order_id: order.id,
          product_id: item.productId,
          variant_id: item.variantId ?? null,
          product_name: item.name,
          variant_name: item.variantName ?? null,
          product_image: item.image ?? null,
          quantity: item.quantity,
          unit_price: item.price,
          total: item.price * item.quantity,
        }))
      );

      if (itemsError) {
        return createPlatformBoundaryErrorResponse(trace, {
          status: 500,
          error: itemsError.message,
          boundaryClass: "dependency",
          operatorGuidance: "Resolve the order-item persistence error before retrying checkout so payment state does not drift from cart state.",
          detail: "The checkout route created the order record but could not persist one or more order items.",
        });
      }

      const { clientSecret, paymentIntentId } = await createCheckoutPaymentIntent({
        amount: Math.round(total * 100),
        currency: "USD",
        vendorStripeAccountId: store.stripe_account_id,
        orderId: order.id,
        buyerEmail: user.email ?? "",
      });

      await supabase.from("orders").update({ stripe_payment_intent_id: paymentIntentId }).eq("id", order.id);

      results.push({
        orderId: order.id,
        orderNumber: order.order_number,
        clientSecret,
        total,
      });
    }

    logPlatformEvent({
      level: "info",
      message: "Checkout payment intents created",
      trace,
      detail: { orderCount: results.length },
    });

    return jsonWithTrace(trace, { orders: results });
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Checkout failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Checkout failed");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
