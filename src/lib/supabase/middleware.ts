// ══════════════════════════════════════════════════════════
// Supabase – Middleware Helper
// Refreshes auth session. Skips auth checks in demo mode.
// ══════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isConfigured } from "./config";

export async function updateSession(request: NextRequest) {
  // In demo mode, skip all auth checks
  if (!isConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup";
  const isPublicPage = request.nextUrl.pathname === "/";
  const isCallbackPage = request.nextUrl.pathname.startsWith("/auth/callback");
  const isDemoPage = request.nextUrl.pathname.startsWith("/demo");

  if (!user && !isAuthPage && !isPublicPage && !isCallbackPage && !isDemoPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
