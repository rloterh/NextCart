import { NextResponse } from "next/server";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
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

export async function GET() {
  const context = await getAuthenticatedProfile();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json(await getDigestPayloadForProfile(context.supabase, context.profile));
  } catch (digestError) {
    return NextResponse.json(
      { error: digestError instanceof Error ? digestError.message : "Unable to build platform digest." },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  const context = await getAuthenticatedProfile();
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { scope?: "self" | "policy" } | null;
  const scope = body?.scope === "policy" ? "policy" : "self";

  try {
    const result = await sendDigestForProfile({
      supabase: context.supabase,
      profile: context.profile,
      scope,
    });

    return NextResponse.json({
      success: true,
      recipientCount: result.recipientCount,
      scope,
    });
  } catch (sendError) {
    return createPlatformCapabilityErrorResponse(sendError, "Unable to send platform digest");
  }
}
