import { NextResponse } from "next/server";
import { exportPlatformData, isAutomationSecretValid } from "@/lib/platform/automation";
import { createPlatformCapabilityErrorResponse } from "@/lib/platform/readiness.server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient, getServerUser } from "@/lib/supabase/server";
import type { PlatformExportFormat, PlatformExportKind } from "@/types/platform";
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

export async function GET(request: Request) {
  const context = await resolveOperatorContext(request);
  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const kind = searchParams.get("kind") as PlatformExportKind | null;
  const format = (searchParams.get("format") as PlatformExportFormat | null) ?? "csv";

  if (!kind) {
    return NextResponse.json({ error: "kind is required" }, { status: 400 });
  }

  if (format !== "csv" && format !== "json") {
    return NextResponse.json({ error: "Unsupported format" }, { status: 400 });
  }

  try {
    const exportFile = await exportPlatformData({
      supabase: context.supabase,
      profile: context.profile,
      kind,
      format,
    });

    return new NextResponse(exportFile.body, {
      status: 200,
      headers: {
        "Content-Type": exportFile.contentType,
        "Content-Disposition": `attachment; filename="${exportFile.filename}"`,
      },
    });
  } catch (error) {
    return createPlatformCapabilityErrorResponse(error, "Unable to create export handoff");
  }
}
