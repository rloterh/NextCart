import { type NextRequest, NextResponse } from "next/server";
import { buildRedirectTarget } from "@/lib/auth/navigation";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/stripe/webhooks") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const redirectTarget = buildRedirectTarget(pathname, search);
  const { supabaseResponse, user, profileRole } = await updateSession(request);

  if (["/login", "/signup"].includes(pathname) && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/vendor") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirectTarget)}`, request.url));
  }

  if (pathname.startsWith("/vendor") && profileRole !== "vendor" && profileRole !== "admin") {
    return NextResponse.redirect(
      new URL(`/account?boundary=vendor&from=${encodeURIComponent(redirectTarget)}`, request.url)
    );
  }

  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirectTarget)}`, request.url));
  }

  if (pathname.startsWith("/admin") && profileRole !== "admin") {
    return NextResponse.redirect(
      new URL(`/account?boundary=admin&from=${encodeURIComponent(redirectTarget)}`, request.url)
    );
  }

  if (pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${encodeURIComponent(redirectTarget)}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
