import { NextResponse } from "next/server";
import {
  buildPlatformAutomationPayload,
  isAutomationSecretValid,
  runPlatformAutomationJob,
} from "@/lib/platform/automation";
import { createPlatformCapabilityErrorResponse, getServerPlatformChecks } from "@/lib/platform/readiness.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { PlatformAutomationJobKey } from "@/types/platform";
import type { Profile } from "@/types";

type OperatorProfile = Pick<Profile, "id" | "role" | "full_name" | "email">;

async function resolveOperatorContext(request: Request) {
  if (isAutomationSecretValid(request)) {
    return {
      supabase: getSupabaseAdminClient(),
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
  const context = await resolveOperatorContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const payload = await buildPlatformAutomationPayload({
      supabase: context.supabase,
      profile: context.profile,
      inboxPreview: [],
      emailDeliveryAvailable: getEmailDeliveryAvailable(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    return createPlatformCapabilityErrorResponse(error, "Unable to build automation overview");
  }
}

export async function POST(request: Request) {
  const context = await resolveOperatorContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { jobKey?: PlatformAutomationJobKey } | null;
  if (!body?.jobKey) {
    return NextResponse.json({ error: "jobKey is required" }, { status: 400 });
  }

  try {
    const payload = await runPlatformAutomationJob({
      supabase: context.supabase,
      profile: context.profile,
      jobKey: body.jobKey,
      inboxPreview: [],
      emailDeliveryAvailable: getEmailDeliveryAvailable(),
    });

    return NextResponse.json(payload);
  } catch (error) {
    return createPlatformCapabilityErrorResponse(error, "Unable to run automation preview");
  }
}
