import { NextResponse } from "next/server";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { createConnectOnboardingLink } from "@/lib/stripe/server";

export async function POST(request: Request) {
  try {
    const user = await getServerUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = await getSupabaseServerClient();
    const { data: store } = await supabase.from("stores").select("*").eq("owner_id", user.id).single();
    if (!store) return NextResponse.json({ error: "No store found" }, { status: 404 });

    const { accountId, url } = await createConnectOnboardingLink(
      store.id, store.name, user.email!, store.stripe_account_id
    );

    if (accountId !== store.stripe_account_id) {
      await supabase.from("stores").update({ stripe_account_id: accountId }).eq("id", store.id);
    }

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Connect error:", error);
    return NextResponse.json({ error: "Failed to create onboarding link" }, { status: 500 });
  }
}
