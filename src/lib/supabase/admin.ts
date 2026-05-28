import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { isConfigured } from "./config";

function getServiceRoleKey(): string | undefined {
  return process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
}

export function hasServiceRoleKey(): boolean {
  return !!getServiceRoleKey();
}

export function createAdminClient() {
  const serviceRoleKey = getServiceRoleKey();
  if (!isConfigured() || !serviceRoleKey) {
    throw new Error("Supabase service role key is not configured.");
  }

  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
