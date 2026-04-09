import { createClient } from "@supabase/supabase-js";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getPublicSupabaseConfig } from "@/lib/platform/readiness.public";
import { createPlatformCapabilityErrorResponse, requirePlatformCapability } from "@/lib/platform/readiness.server";
import { getServerUser } from "@/lib/supabase/server";

function getSupabaseAdminClient() {
  requirePlatformCapability("supabase_admin");
  const { url } = getPublicSupabaseConfig();
  return createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const trace = getRequestTrace(_request);
  try {
    const user = await getServerUser();
    if (!user) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 401,
        error: "Unauthorized",
        boundaryClass: "permission",
        operatorGuidance: "Sign in before voting on review helpfulness.",
        detail: "Helpful votes are available only to authenticated marketplace users.",
      });
    }

    const { id } = await context.params;
    const supabaseAdmin = getSupabaseAdminClient();

    const { data: review, error: reviewError } = await supabaseAdmin
      .from("reviews")
      .select("id, user_id, helpful_count")
      .eq("id", id)
      .single();

    if (reviewError || !review) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 404,
        error: "Review not found",
        boundaryClass: "dependency",
        operatorGuidance: "Refresh the product page and retry after confirming the review still exists.",
        detail: `No review row was found for ${id}.`,
      });
    }

    if (review.user_id === user.id) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "You cannot mark your own review as helpful",
        boundaryClass: "permission",
        operatorGuidance: "Helpful votes are limited to other shoppers so review trust signals stay credible.",
        detail: "The current user is the author of the target review.",
      });
    }

    const { data: existingVote } = await supabaseAdmin
      .from("review_helpful_votes")
      .select("id")
      .eq("review_id", id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingVote) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 409,
        error: "Already voted",
        boundaryClass: "dependency",
        operatorGuidance: "Treat this as an idempotent shopper action rather than a write failure.",
        detail: "A helpful-vote record already exists for this user and review.",
      });
    }

    const { error: voteError } = await supabaseAdmin.from("review_helpful_votes").insert({
      review_id: id,
      user_id: user.id,
    });

    if (voteError) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 500,
        error: voteError.message,
        boundaryClass: "dependency",
        operatorGuidance: "Retry after confirming the helpful-vote table and service-role access are healthy.",
        detail: "The helpful-vote insert failed before the review count could be updated.",
      });
    }

    const nextHelpfulCount = (review.helpful_count ?? 0) + 1;
    const { error: updateError } = await supabaseAdmin.from("reviews").update({ helpful_count: nextHelpfulCount }).eq("id", id);

    if (updateError) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 500,
        error: updateError.message,
        boundaryClass: "dependency",
        operatorGuidance: "Retry after confirming review update access is healthy so the helpful count stays in sync.",
        detail: "The helpful-vote row was created, but the review helpful count could not be updated.",
      });
    }

    logPlatformEvent({
      level: "info",
      message: "Recorded review helpful vote",
      trace,
      detail: { reviewId: id },
    });

    return jsonWithTrace(trace, { helpfulCount: nextHelpfulCount });
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Review helpful vote failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Unable to save helpful vote");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
