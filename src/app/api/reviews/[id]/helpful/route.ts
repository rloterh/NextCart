import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getServerUser } from "@/lib/supabase/server";

function getSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase admin environment variables");
  }

  return createClient(supabaseUrl, serviceRoleKey);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await getServerUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await context.params;
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: review, error: reviewError } = await supabaseAdmin
      .from("reviews")
      .select("id, user_id, helpful_count")
      .eq("id", id)
      .single();

    if (reviewError || !review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    if (review.user_id === user.id) {
      return NextResponse.json({ error: "You cannot mark your own review as helpful" }, { status: 400 });
    }

    const { data: existingVote } = await supabaseAdmin
      .from("review_helpful_votes")
      .select("id")
      .eq("review_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      return NextResponse.json({ error: "Already voted" }, { status: 409 });
    }

    const { error: voteError } = await supabaseAdmin.from("review_helpful_votes").insert({
      review_id: id,
      user_id: user.id,
    });

    if (voteError) {
      return NextResponse.json({ error: voteError.message }, { status: 500 });
    }

    const nextHelpfulCount = (review.helpful_count ?? 0) + 1;
    const { error: updateError } = await supabaseAdmin.from("reviews").update({ helpful_count: nextHelpfulCount }).eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ helpfulCount: nextHelpfulCount });
  } catch (error) {
    console.error("Review helpful vote error:", error);
    return NextResponse.json({ error: "Unable to save helpful vote" }, { status: 500 });
  }
}
