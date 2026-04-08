import { NextResponse } from "next/server";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { createCheckoutPaymentIntent, calculatePlatformFee } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { items, shippingAddress } = await request.json();
    if (!items?.length || !shippingAddress) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

    const supabase = await getSupabaseServerClient();

    // Group items by store
    const storeGroups = new Map<string, any[]>();
    for (const item of items) {
      const group = storeGroups.get(item.storeId) ?? [];
      group.push(item);
      storeGroups.set(item.storeId, group);
    }

    const results = [];

    for (const [storeId, storeItems] of storeGroups) {
      const { data: store } = await supabase.from("stores").select("id, name, stripe_account_id").eq("id", storeId).single();
      if (!store?.stripe_account_id) return NextResponse.json({ error: `Store not set up for payments` }, { status: 400 });

      const subtotal = storeItems.reduce((s: number, i: any) => s + i.price * i.quantity, 0);
      const shippingCost = subtotal >= 75 ? 0 : 9.99;
      const taxAmount = Math.round(subtotal * 0.085 * 100) / 100;
      const total = subtotal + shippingCost + taxAmount;
      const platformFee = calculatePlatformFee(Math.round(total * 100)) / 100;

      const { data: order, error: orderError } = await supabase.from("orders").insert({
        buyer_id: user.id, store_id: storeId, subtotal, shipping_cost: shippingCost,
        tax_amount: taxAmount, platform_fee: platformFee, total, shipping_address: shippingAddress,
      }).select().single();

      if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

      await supabase.from("order_items").insert(storeItems.map((item: any) => ({
        order_id: order.id, product_id: item.productId, variant_id: item.variantId || null,
        product_name: item.name, product_image: item.image || null,
        quantity: item.quantity, unit_price: item.price, total: item.price * item.quantity,
      })));

      const { clientSecret, paymentIntentId } = await createCheckoutPaymentIntent({
        amount: Math.round(total * 100), currency: "USD",
        vendorStripeAccountId: store.stripe_account_id, orderId: order.id, buyerEmail: user.email!,
      });

      await supabase.from("orders").update({ stripe_payment_intent_id: paymentIntentId }).eq("id", order.id);
      results.push({ orderId: order.id, orderNumber: order.order_number, clientSecret, total });
    }

    return NextResponse.json({ orders: results });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json({ error: "Checkout failed" }, { status: 500 });
  }
}
