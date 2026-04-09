import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { createDashboardLink } from "@/lib/stripe/server";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  try {
    const user = await getServerUser();
    if (!user) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 401,
        error: "Unauthorized",
        boundaryClass: "permission",
        operatorGuidance: "Sign in with the vendor account that owns the connected store before opening Stripe Express.",
        detail: "Stripe dashboard access is restricted to authenticated store owners.",
      });
    }

    const supabase = await getSupabaseServerClient();
    const { data: store } = await supabase
      .from("stores")
      .select("stripe_account_id")
      .eq("owner_id", user.id)
      .single();

    if (!store?.stripe_account_id) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 400,
        error: "Stripe is not connected for this store",
        boundaryClass: "config",
        operatorGuidance: "Finish vendor Stripe onboarding before opening the Stripe dashboard.",
        detail: "The current store does not yet have a connected Stripe account id.",
      });
    }

    const url = await createDashboardLink(store.stripe_account_id);
    logPlatformEvent({
      level: "info",
      message: "Created Stripe dashboard link",
      trace,
      detail: { hasStripeAccount: true },
    });
    return jsonWithTrace(trace, { url });
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Stripe dashboard link failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Unable to open Stripe dashboard");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
