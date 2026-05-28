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

export type FamilyJoinedUserRow = {
  profile_id: string;
  auth_user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: Role;
  social_links: Record<string, unknown> | null;
  created_at: string;
  email: string | null;
  phone: string | null;
  last_sign_in_at: string | null;
};

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function isMissingRpcError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  if (error.code === "PGRST202") return true;
  return /function .* does not exist/i.test(error.message || "");
}

export async function requireFamilyAdmin(): Promise<{
  error: NextResponse | null;
  client: SupabaseClient | null;
  admin: SupabaseClient | null;
  requester: Pick<ProfileRow, "id" | "family_id" | "role"> | null;
  serviceRoleAvailable: boolean;
}> {
  const serverClient = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) {
    return {
      error: jsonError("Authentication required.", 401),
      client: null,
      admin: null,
      requester: null,
      serviceRoleAvailable: false,
    };
  }

  const { data: requester, error: requesterError } = await serverClient
    .from("profiles")
    .select("id,family_id,role")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (requesterError || !requester?.family_id || requester.role !== "ADMIN") {
    return {
      error: jsonError("Family admin access required.", 403),
      client: null,
      admin: null,
      requester: null,
      serviceRoleAvailable: false,
    };
  }

  const serviceRoleAvailable = hasServiceRoleKey();

  return {
    error: null,
    client: serverClient,
    admin: serviceRoleAvailable ? createAdminClient() : null,
    requester: requester as Pick<ProfileRow, "id" | "family_id" | "role">,
    serviceRoleAvailable,
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

export function mapJoinedUserRow(row: FamilyJoinedUserRow): AdminFamilyUser {
  return {
    profileId: row.profile_id,
    authUserId: row.auth_user_id,
    name: `${row.first_name || ""} ${row.last_name || ""}`.trim() || "Family Member",
    role: row.role,
    email: row.email,
    phone: row.phone,
    createdAt: row.created_at,
    lastSignInAt: row.last_sign_in_at,
  };
}

export async function listFamilyJoinedUsersViaRpc(
  client: SupabaseClient
): Promise<{ users: AdminFamilyUser[] | null; error: string | null; missingRpc: boolean }> {
  const { data, error } = await client.rpc("list_family_joined_users");
  if (error) {
    return {
      users: null,
      error: error.message,
      missingRpc: isMissingRpcError(error),
    };
  }

  return {
    users: ((data || []) as FamilyJoinedUserRow[]).map(mapJoinedUserRow),
    error: null,
    missingRpc: false,
  };
}

export async function listFamilyJoinedUsersViaServiceRole(
  admin: SupabaseClient,
  familyId: string
): Promise<{ users: AdminFamilyUser[]; error: string | null }> {
  const { data: profiles, error } = await admin
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("family_id", familyId)
    .not("auth_user_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) return { users: [], error: error.message };

  const users = await Promise.all(
    ((profiles || []) as ProfileRow[]).map(async (profile) => {
      if (!profile.auth_user_id) return null;
      const { data } = await admin.auth.admin.getUserById(profile.auth_user_id);
      return mapAdminFamilyUser(profile, data.user || null);
    })
  );

  return {
    users: users.filter((user): user is AdminFamilyUser => user !== null),
    error: null,
  };
}

export async function listFamilyJoinedUsersFallback(
  client: SupabaseClient,
  familyId: string
): Promise<AdminFamilyUser[]> {
  const { data: profiles } = await client
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("family_id", familyId)
    .not("auth_user_id", "is", null)
    .order("created_at", { ascending: true });

  return ((profiles || []) as ProfileRow[])
    .map((profile) => mapAdminFamilyUser(profile, null))
    .filter((user): user is AdminFamilyUser => user !== null);
}
