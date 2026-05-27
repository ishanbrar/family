// ══════════════════════════════════════════════════════════
// Supabase – Middleware Helper
// Refreshes auth session. Skips auth checks in demo mode.
// ══════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isConfigured } from "./config";
import { isInvalidRefreshTokenError } from "./auth-errors";
import { createTimeoutFetch, SUPABASE_REQUEST_TIMEOUT_MS } from "./timeout-fetch";
import { DEV_SUPER_ADMIN_COOKIE, DEV_SUPER_ADMIN_ENABLED } from "@/lib/dev-auth";

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach(({ name, value }) => {
    to.cookies.set(name, value);
  });
}

export async function updateSession(request: NextRequest) {
  const isAuthPage =
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/signup" ||
    request.nextUrl.pathname === "/signup/create";
  const isPublicPage = request.nextUrl.pathname === "/";
  const isCallbackPage = request.nextUrl.pathname.startsWith("/auth/callback");
  const isDemoPage = request.nextUrl.pathname.startsWith("/demo");
  const isPreviewPage = request.nextUrl.pathname.startsWith("/preview");
  const isDevSuperAdmin = DEV_SUPER_ADMIN_ENABLED && request.cookies.get(DEV_SUPER_ADMIN_COOKIE)?.value === "1";

  // Dev super-admin bypasses Supabase auth in all environments.
  if (isDevSuperAdmin) {
    if (isAuthPage) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
    return NextResponse.next({ request });
  }

  // In demo mode, skip all auth checks
  if (!isConfigured()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      db: { timeout: SUPABASE_REQUEST_TIMEOUT_MS },
      global: { fetch: createTimeoutFetch("Supabase middleware session refresh") },
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

  let user = null;
  let authError: unknown = null;

  try {
    const result = await supabase.auth.getUser();
    user = result.data.user;
    authError = result.error;
  } catch (error) {
    authError = error;
    if (process.env.NODE_ENV !== "production") {
      console.warn("[Supabase middleware] Session refresh failed:", error);
    }
  }

  if (isInvalidRefreshTokenError(authError)) {
    try {
      await supabase.auth.signOut();
    } catch (signOutError) {
      if (process.env.NODE_ENV !== "production") {
        console.warn("[Supabase middleware] Failed to clear stale session:", signOutError);
      }
    }
    user = null;
  }

  if (!user && !isAuthPage && !isPublicPage && !isCallbackPage && !isDemoPage && !isPreviewPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "session_expired");
    const redirect = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    const redirect = NextResponse.redirect(url);
    copyCookies(supabaseResponse, redirect);
    return redirect;
  }

  return supabaseResponse;
}
