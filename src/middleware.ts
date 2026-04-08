import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/_next") || pathname.startsWith("/api/webhooks") || pathname.startsWith("/api/stripe/webhooks") || pathname.includes(".")) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  // Auth routes — redirect authenticated users
  if (["/login", "/signup"].includes(pathname) && user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Vendor routes — require authenticated vendor/admin
  if (pathname.startsWith("/vendor") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url));
  }

  // Admin routes — require admin
  if (pathname.startsWith("/admin") && !user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Account routes — require auth
  if (pathname.startsWith("/account") && !user) {
    return NextResponse.redirect(new URL(`/login?redirect=${pathname}`, request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
