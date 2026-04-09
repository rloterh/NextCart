import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import { createConnectOnboardingLink } from "@/lib/stripe/server";

export async function POST(request: Request) {
  const trace = getRequestTrace(request);
  try {
    const user = await getServerUser();
    if (!user) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 401,
        error: "Unauthorized",
        boundaryClass: "permission",
        operatorGuidance: "Sign in with the vendor account that owns the store before starting Stripe onboarding.",
        detail: "Vendor Stripe onboarding is restricted to authenticated store owners.",
      });
    }

    const supabase = await getSupabaseServerClient();
    const { data: store } = await supabase.from("stores").select("*").eq("owner_id", user.id).single();
    if (!store) {
      return createPlatformBoundaryErrorResponse(trace, {
        status: 404,
        error: "No store found",
        boundaryClass: "dependency",
        operatorGuidance: "Create or restore the vendor store before starting Stripe onboarding.",
        detail: "The current vendor account does not have a store record available for onboarding.",
      });
    }

    const { accountId, url } = await createConnectOnboardingLink(
      store.id, store.name, user.email!, store.stripe_account_id
    );

    if (accountId !== store.stripe_account_id) {
      await supabase.from("stores").update({ stripe_account_id: accountId }).eq("id", store.id);
    }

    logPlatformEvent({
      level: "info",
      message: "Created Stripe onboarding link",
      trace,
      detail: { storeId: store.id },
    });

    return jsonWithTrace(trace, { url });
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Stripe onboarding link creation failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Failed to create onboarding link");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
