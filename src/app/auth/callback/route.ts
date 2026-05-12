// ══════════════════════════════════════════════════════════
// Auth Callback – OAuth (e.g. Google) and email confirmation redirects
// ══════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureProfileForAuthUser } from "@/lib/supabase/db";

function safeRedirectPath(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/dashboard";
  return value;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeRedirectPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const profile = await ensureProfileForAuthUser(supabase, data.user);
      if (!profile) {
        return NextResponse.redirect(`${origin}/login?error=Could+not+set+up+profile`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=Could+not+authenticate`);
}
