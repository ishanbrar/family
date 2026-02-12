// ══════════════════════════════════════════════════════════
// Supabase – Server Client (server components, route handlers)
// ══════════════════════════════════════════════════════════

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isConfigured } from "./config";

export async function createClient() {
  const cookieStore = await cookies();

  const url = isConfigured()
    ? process.env.NEXT_PUBLIC_SUPABASE_URL!
    : "https://placeholder.supabase.co";
  const key = isConfigured()
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTYwMDAwMDAsImV4cCI6MTkzMTYwMDAwMH0.placeholder";

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Calling from a Server Component — ignore.
        }
      },
    },
  });
}
