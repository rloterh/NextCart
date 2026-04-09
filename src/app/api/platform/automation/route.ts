import {
  buildPlatformAutomationPayload,
  isAutomationSecretValid,
  runPlatformAutomationJob,
} from "@/lib/platform/automation";
import { sendDigestForProfile } from "@/lib/platform/digest-service";
import { getRequestTrace, jsonWithTrace, logPlatformEvent } from "@/lib/platform/observability";
import { createPlatformCapabilityErrorResponse, getServerPlatformChecks } from "@/lib/platform/readiness.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { PlatformAutomationJobKey } from "@/types/platform";
import type { Profile } from "@/types";

type OperatorProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

async function resolveOperatorContext(request: Request) {
  const url = new URL(request.url);
  if (isAutomationSecretValid(request)) {
    const adminSupabase = getSupabaseAdminClient();
    const audience = url.searchParams.get("audience");
    const ownerId = url.searchParams.get("ownerId");

    if (audience === "vendor" && ownerId) {
      const { data: profile, error } = await adminSupabase
        .from("profiles")
        .select("id, role, full_name, email")
        .eq("id", ownerId)
        .single();

      if (error || !profile || profile.role !== "vendor") {
        return null;
      }

      return {
        supabase: adminSupabase,
        profile: profile as OperatorProfile,
      };
    }

    return {
      supabase: adminSupabase,
      profile: {
        id: "scheduled-admin",
        role: "admin",
        full_name: "Scheduled automation",
        email: "automation@nexcart.local",
      } as OperatorProfile,
    };
  }

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

  if (error || !profile || (profile.role !== "admin" && profile.role !== "vendor")) {
    return null;
  }

  return {
    supabase,
    profile: profile as OperatorProfile,
  };
}

function getEmailDeliveryAvailable() {
  return getServerPlatformChecks().some(
    (check) => check.id === "notification_delivery" && check.status !== "blocked"
  );
}

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const context = await resolveOperatorContext(request);
  if (!context) {
    return jsonWithTrace(trace, { error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const run = searchParams.get("run") as PlatformAutomationJobKey | null;
    const deliver = searchParams.get("deliver") === "policy";

    if (run) {
      const payload = await runPlatformAutomationJob({
        supabase: context.supabase,
        profile: context.profile,
        jobKey: run,
        inboxPreview: [],
        emailDeliveryAvailable: getEmailDeliveryAvailable(),
        deliverDigest: deliver,
      });

      const delivery =
        deliver && run === "delay_digest"
          ? await sendDigestForProfile({
              supabase: context.supabase,
              profile: context.profile,
              scope: "policy",
            })
          : null;

      return jsonWithTrace(trace, {
        ...payload,
        deliveredRecipientCount: delivery?.recipientCount ?? 0,
      });
    }

    const payload = await buildPlatformAutomationPayload({
      supabase: context.supabase,
      profile: context.profile,
      inboxPreview: [],
      emailDeliveryAvailable: getEmailDeliveryAvailable(),
    });

    return jsonWithTrace(trace, payload);
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Platform automation GET failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Unable to build automation overview");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}

export async function POST(request: Request) {
  const trace = getRequestTrace(request);
  const context = await resolveOperatorContext(request);
  if (!context) {
    return jsonWithTrace(trace, { error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { jobKey?: PlatformAutomationJobKey } | null;
  if (!body?.jobKey) {
    return jsonWithTrace(trace, { error: "jobKey is required" }, { status: 400 });
  }

  try {
    const payload = await runPlatformAutomationJob({
      supabase: context.supabase,
      profile: context.profile,
      jobKey: body.jobKey,
      inboxPreview: [],
      emailDeliveryAvailable: getEmailDeliveryAvailable(),
    });

    return jsonWithTrace(trace, payload);
  } catch (error) {
    logPlatformEvent({
      level: "error",
      message: "Platform automation POST failed",
      trace,
      detail: error instanceof Error ? error.message : error,
    });
    const response = createPlatformCapabilityErrorResponse(error, "Unable to run automation preview");
    response.headers.set("x-request-id", trace.requestId);
    return response;
  }
}
