// ══════════════════════════════════════════════════════════
// Supabase – Browser Client (client components)
// Returns null if Supabase is not configured.
// ══════════════════════════════════════════════════════════

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isConfigured } from "./config";

export { isConfigured };

let _client: SupabaseClient | null = null;

export function createClient(): SupabaseClient {
  if (_client) return _client;

  if (!isConfigured()) {
    // Return a dummy client that won't crash
    // Pages will fall back to mock data
    _client = createBrowserClient(
      "https://placeholder.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsYWNlaG9sZGVyIiwicm9sZSI6ImFub24iLCJpYXQiOjE2MTYwMDAwMDAsImV4cCI6MTkzMTYwMDAwMH0.placeholder"
    );
    return _client;
  }

  _client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return _client;
}
