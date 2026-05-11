import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { AdminFamilyUser, Role } from "@/lib/types";

export type ProfileRow = {
  id: string;
  auth_user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  family_id: string | null;
  social_links: Record<string, unknown> | null;
  created_at: string;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function requireFamilyAdmin(): Promise<{
  error: NextResponse | null;
  admin: SupabaseClient | null;
  requester: Pick<ProfileRow, "id" | "family_id" | "role"> | null;
}> {
  if (!hasServiceRoleKey()) {
    return {
      error: jsonError("SUPABASE_SERVICE_ROLE_KEY is not configured.", 503),
      admin: null,
      requester: null,
    };
  }

  const serverClient = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) {
    return { error: jsonError("Authentication required.", 401), admin: null, requester: null };
  }

  const admin = createAdminClient();
  const { data: requester, error: requesterError } = await admin
    .from("profiles")
    .select("id,family_id,role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (requesterError || !requester?.family_id || requester.role !== "ADMIN") {
    return { error: jsonError("Family admin access required.", 403), admin: null, requester: null };
  }

  return {
    error: null,
    admin,
    requester: requester as Pick<ProfileRow, "id" | "family_id" | "role">,
  };
}

export function phoneFromProfileOrAuth(profile: ProfileRow, authUser: User | null): string | null {
  const profilePhone =
    typeof profile.social_links?.phone_number === "string"
      ? profile.social_links.phone_number.trim()
      : "";
  const authPhone = authUser?.phone?.trim() || "";
  const metadataPhone =
    typeof authUser?.user_metadata?.phone_number === "string"
      ? authUser.user_metadata.phone_number.trim()
      : "";
  return profilePhone || authPhone || metadataPhone || null;
}

export function mapAdminFamilyUser(profile: ProfileRow, authUser: User | null): AdminFamilyUser | null {
  if (!profile.auth_user_id) return null;
  return {
    profileId: profile.id,
    authUserId: profile.auth_user_id,
    name: `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || "Family Member",
    role: profile.role,
    email: authUser?.email || null,
    phone: phoneFromProfileOrAuth(profile, authUser),
    createdAt: profile.created_at,
    lastSignInAt: authUser?.last_sign_in_at || null,
  };
}
