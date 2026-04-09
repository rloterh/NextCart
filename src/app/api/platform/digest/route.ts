import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { createPlatformBoundaryErrorResponse } from "@/lib/platform/boundaries";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getDigestPayloadForProfile, sendDigestForProfile } from "@/lib/platform/digest-service";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { Profile } from "@/types";

type DigestProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

async function getAuthenticatedProfile() {
  const user = await getServerUser();
  if (!user) {
    return null;
  }

  const supabase = await getSupabaseServerClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return null;
  }

  return {
    supabase,
    profile: profile as DigestProfile,
  };
}

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const context = await getAuthenticatedProfile();
  if (!context) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Sign in with an operator account before previewing or sending platform digests.",
      detail: "Digest surfaces are available only to authenticated admin or vendor operators.",
    });
  }

  try {
    return jsonWithTrace(trace, await getDigestPayloadForProfile(context.supabase, context.profile));
  } catch (digestError) {
    logPlatformEvent({
      level: "error",
      message: "Platform digest GET failed",
      trace,
      detail: digestError instanceof Error ? digestError.message : digestError,
    });
    return jsonWithTrace(
      trace,
      { error: digestError instanceof Error ? digestError.message : "Unable to build platform digest." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const trace = getRequestTrace(request);
  const context = await getAuthenticatedProfile();
  if (!context) {
    return createPlatformBoundaryErrorResponse(trace, {
      status: 401,
      error: "Unauthorized",
      boundaryClass: "permission",
      operatorGuidance: "Sign in with an operator account before previewing or sending platform digests.",
      detail: "Digest surfaces are available only to authenticated admin or vendor operators.",
    });
  }

  const body = (await request.json().catch(() => null)) as { scope?: "self" | "policy" } | null;
  const scope = body?.scope === "policy" ? "policy" : "self";

  try {
    const result = await sendDigestForProfile({
      supabase: context.supabase,
      profile: context.profile,
      scope,
    });

    return jsonWithTrace(trace, {
      success: true,
      recipientCount: result.recipientCount,
      scope,
    });
  } catch (sendError) {
    logPlatformEvent({
      level: "error",
      message: "Platform digest POST failed",
      trace,
      detail: sendError instanceof Error ? sendError.message : sendError,
    });
    const response = createPlatformCapabilityErrorResponse(sendError, "Unable to send platform digest");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
