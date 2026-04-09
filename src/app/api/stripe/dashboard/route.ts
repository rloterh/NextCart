import { NextResponse } from "next/server";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { createDashboardLink } from "@/lib/stripe/server";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

export async function GET() {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = await getSupabaseServerClient();
    const { data: store } = await supabase
      .from("stores")
      .select("stripe_account_id")
      .eq("owner_id", user.id)
      .single();

    if (!store?.stripe_account_id) {
      return NextResponse.json({ error: "Stripe is not connected for this store" }, { status: 400 });
    }

    const url = await createDashboardLink(store.stripe_account_id);
    return NextResponse.json({ url });
  } catch (error) {
    console.error("Stripe dashboard error:", error);
    return createPlatformCapabilityErrorResponse(error, "Unable to open Stripe dashboard");
  }
}
