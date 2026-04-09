import { NextResponse } from "next/server";
import { getRequestTrace, logPlatformEvent } from "@/lib/platform/observability";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function redirectWithTrace(trace: { requestId: string }, destination: string) {
  const response = NextResponse.redirect(destination);
  response.headers.set("x-request-id", trace.requestId);
  return response;
}

export async function GET(request: Request) {
  const trace = getRequestTrace(request);
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  if (code) {
    const supabase = await getSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      logPlatformEvent({
        level: "info",
        message: "Auth callback completed successfully",
        trace,
        detail: { next },
      });
      return redirectWithTrace(trace, `${origin}${next}`);
    }
    logPlatformEvent({
      level: "warn",
      message: "Auth callback could not exchange code for session",
      trace,
      detail: error.message,
    });
  }
  return redirectWithTrace(trace, `${origin}/login?error=auth_failed`);
}
