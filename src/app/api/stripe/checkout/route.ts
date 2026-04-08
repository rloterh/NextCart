import { NextResponse } from "next/server";
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
  try {
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CheckoutRequestBody>;

    if (!Array.isArray(body.items) || !isValidShippingAddress(body.shippingAddress)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const items = body.items.filter(isCheckoutItemInput);
    if (items.length !== body.items.length || items.length === 0) {
      return NextResponse.json({ error: "Invalid checkout items" }, { status: 400 });
    }

    const shippingAddress = sanitizeShippingAddress(body.shippingAddress);
    if (!shippingAddress.fullName || !shippingAddress.line1 || !shippingAddress.city || !shippingAddress.postalCode) {
      return NextResponse.json({ error: "Incomplete shipping address" }, { status: 400 });
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
        return NextResponse.json({ error: "Store not set up for payments" }, { status: 400 });
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
        return NextResponse.json({ error: orderError.message }, { status: 500 });
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
        return NextResponse.json({ error: itemsError.message }, { status: 500 });
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

    return NextResponse.json({ orders: results });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
