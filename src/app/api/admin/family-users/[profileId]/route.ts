import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  isMissingRpcError,
  jsonError,
  listFamilyJoinedUsersFallback,
  listFamilyJoinedUsersViaRpc,
  mapAdminFamilyUser,
  requireFamilyAdmin,
  type ProfileRow,
} from "@/lib/admin-family-user-api";
import { canChangeFamilyUserRole, canRemoveFamilyUserAccess } from "@/lib/admin-family-users";
import type { Role } from "@/lib/types";

type RouteContext = {
  params: Promise<{ profileId: string }>;
};

function cleanOptionalString(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function cleanRole(value: unknown): Role | undefined {
  return value === "ADMIN" || value === "MEMBER" ? value : undefined;
}

function shouldUpdateAuthPhone(phone: string | null | undefined): phone is string {
  if (!phone) return false;
  return /^\+[1-9]\d{7,14}$/.test(phone);
}

async function getAdminCount(client: SupabaseClient, familyId: string): Promise<number> {
  const { count } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("family_id", familyId)
    .eq("role", "ADMIN")
    .not("auth_user_id", "is", null);
  return count || 0;
}

async function reloadUserViaRpc(client: SupabaseClient, profileId: string) {
  const { users, error } = await listFamilyJoinedUsersViaRpc(client);
  if (error || !users) return { user: null, error: error || "Updated user could not be reloaded." };
  return { user: users.find((item) => item.profileId === profileId) || null, error: null };
}

async function patchViaServiceRole(
  admin: SupabaseClient,
  requester: Pick<ProfileRow, "id" | "family_id" | "role"> & { family_id: string },
  profileId: string,
  nextEmail: string | null | undefined,
  nextPhone: string | null | undefined,
  nextRole: Role | undefined
) {
  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("id", profileId)
    .eq("family_id", requester.family_id)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 500);
  if (!target?.auth_user_id) return jsonError("Joined user not found.", 404);

  const targetProfile = target as ProfileRow;
  const targetAuthUserId = targetProfile.auth_user_id;
  if (!targetAuthUserId) return jsonError("Joined user not found.", 404);
  const adminCount = await getAdminCount(admin, requester.family_id);

  if (nextRole) {
    const roleCheck = canChangeFamilyUserRole({
      requesterProfileId: requester.id,
      targetProfileId: targetProfile.id,
      currentRole: targetProfile.role,
      nextRole,
      adminCount,
    });
    if (!roleCheck.ok) return jsonError(roleCheck.error || "Role change is not allowed.", 400);
  }

  const { data: currentAuthUser, error: currentAuthError } = await admin.auth.admin.getUserById(
    targetAuthUserId
  );
  if (currentAuthError) return jsonError(currentAuthError.message, 500);

  const authUpdates: {
    email?: string;
    phone?: string;
    user_metadata?: Record<string, unknown>;
  } = {};

  const metadata = { ...(currentAuthUser.user?.user_metadata || {}) };
  if (nextEmail !== undefined) {
    if (!nextEmail) return jsonError("Email cannot be blank.", 400);
    authUpdates.email = nextEmail;
  }
  if (nextPhone !== undefined) {
    metadata.phone_number = nextPhone;
    authUpdates.user_metadata = metadata;
    if (shouldUpdateAuthPhone(nextPhone)) {
      authUpdates.phone = nextPhone;
    }
  }

  if (Object.keys(authUpdates).length > 0) {
    const { error: updateAuthError } = await admin.auth.admin.updateUserById(
      targetAuthUserId,
      authUpdates
    );
    if (updateAuthError) return jsonError(updateAuthError.message, 400);
  }

  const profileUpdates: {
    role?: Role;
    social_links?: Record<string, unknown>;
  } = {};
  if (nextRole) profileUpdates.role = nextRole;
  if (nextPhone !== undefined) {
    const currentSocialLinks = targetProfile.social_links || {};
    const nextSocialLinks = { ...currentSocialLinks };
    if (nextPhone) nextSocialLinks.phone_number = nextPhone;
    else delete nextSocialLinks.phone_number;
    profileUpdates.social_links = nextSocialLinks;
  }

  if (Object.keys(profileUpdates).length > 0) {
    const { error: profileError } = await admin
      .from("profiles")
      .update(profileUpdates)
      .eq("id", targetProfile.id);
    if (profileError) return jsonError(profileError.message, 500);
  }

  const { data: refreshedProfile, error: refreshProfileError } = await admin
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("id", targetProfile.id)
    .single();
  if (refreshProfileError || !refreshedProfile?.auth_user_id) {
    return jsonError(refreshProfileError?.message || "Updated user could not be reloaded.", 500);
  }
  const { data: refreshedAuthUser } = await admin.auth.admin.getUserById(refreshedProfile.auth_user_id);

  return NextResponse.json({
    user: mapAdminFamilyUser(refreshedProfile as ProfileRow, refreshedAuthUser.user || null),
  });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireFamilyAdmin();
  if (auth.error) return auth.error;
  if (!auth.client || !auth.requester?.family_id) {
    return jsonError("Family admin access required.", 403);
  }

  const { profileId } = await context.params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return jsonError("Invalid request body.", 400);

  const nextEmail = cleanOptionalString(body.email);
  const nextPhone = cleanOptionalString(body.phone);
  const nextRole = cleanRole(body.role);

  const { data: target, error: targetError } = await auth.client
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("id", profileId)
    .eq("family_id", auth.requester.family_id)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 500);
  if (!target?.auth_user_id) return jsonError("Joined user not found.", 404);

  const targetProfile = target as ProfileRow;
  const adminCount = await getAdminCount(auth.client, auth.requester.family_id);

  if (nextRole) {
    const roleCheck = canChangeFamilyUserRole({
      requesterProfileId: auth.requester.id,
      targetProfileId: targetProfile.id,
      currentRole: targetProfile.role,
      nextRole,
      adminCount,
    });
    if (!roleCheck.ok) return jsonError(roleCheck.error || "Role change is not allowed.", 400);
  }

  const familyId = auth.requester.family_id;

  const wantsAuthEmailChange = nextEmail !== undefined;
  const wantsAuthPhoneChange = nextPhone !== undefined;

  const { error: rpcError } = await auth.client.rpc("admin_update_family_joined_user", {
    p_profile_id: profileId,
    p_email: wantsAuthEmailChange ? nextEmail : null,
    p_phone: wantsAuthPhoneChange ? nextPhone : null,
    p_role: nextRole || null,
  });

  if (!rpcError) {
    const reloaded = await reloadUserViaRpc(auth.client, profileId);
    if (reloaded.user) return NextResponse.json({ user: reloaded.user });
    return jsonError(reloaded.error || "Updated user could not be reloaded.", 500);
  }

  if (!isMissingRpcError(rpcError)) {
    return jsonError(rpcError.message, 400);
  }

  if ((wantsAuthEmailChange || wantsAuthPhoneChange) && auth.admin) {
    return patchViaServiceRole(
      auth.admin,
      { id: auth.requester.id, role: auth.requester.role, family_id: familyId },
      profileId,
      nextEmail,
      nextPhone,
      nextRole
    );
  }

  if (wantsAuthEmailChange || wantsAuthPhoneChange) {
    return jsonError(
      "Email and phone login updates require the latest database migration or SUPABASE_SERVICE_ROLE_KEY.",
      503
    );
  }

  const profileUpdates: {
    role?: Role;
    social_links?: Record<string, unknown>;
  } = {};
  if (nextRole) profileUpdates.role = nextRole;
  if (nextPhone !== undefined) {
    const currentSocialLinks = targetProfile.social_links || {};
    const nextSocialLinks = { ...currentSocialLinks };
    if (nextPhone) nextSocialLinks.phone_number = nextPhone;
    else delete nextSocialLinks.phone_number;
    profileUpdates.social_links = nextSocialLinks;
  }

  if (Object.keys(profileUpdates).length === 0) {
    return jsonError("No changes to save.", 400);
  }

  const { error: profileError } = await auth.client
    .from("profiles")
    .update(profileUpdates)
    .eq("id", targetProfile.id);
  if (profileError) return jsonError(profileError.message, 500);

  const reloaded = await listFamilyJoinedUsersFallback(auth.client, familyId);
  const user = reloaded.find((item) => item.profileId === profileId);
  if (!user) return jsonError("Updated user could not be reloaded.", 500);

  return NextResponse.json({ user });
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  const auth = await requireFamilyAdmin();
  if (auth.error) return auth.error;
  if (!auth.client || !auth.requester?.family_id) {
    return jsonError("Family admin access required.", 403);
  }

  const { profileId } = await context.params;
  const { data: target, error: targetError } = await auth.client
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("id", profileId)
    .eq("family_id", auth.requester.family_id)
    .maybeSingle();

  if (targetError) return jsonError(targetError.message, 500);
  if (!target?.auth_user_id) return jsonError("Joined user not found.", 404);

  const targetProfile = target as ProfileRow;
  const adminCount = await getAdminCount(auth.client, auth.requester.family_id);
  const removeCheck = canRemoveFamilyUserAccess({
    requesterProfileId: auth.requester.id,
    targetProfileId: targetProfile.id,
    targetRole: targetProfile.role,
    adminCount,
  });
  if (!removeCheck.ok) return jsonError(removeCheck.error || "User removal is not allowed.", 400);

  const { error: rpcError } = await auth.client.rpc("admin_remove_family_joined_user", {
    p_profile_id: profileId,
  });

  if (!rpcError) return NextResponse.json({ ok: true });

  if (!isMissingRpcError(rpcError)) {
    return jsonError(rpcError.message, 400);
  }

  if (!auth.admin) {
    return jsonError(
      "Removing login access requires the latest database migration or SUPABASE_SERVICE_ROLE_KEY.",
      503
    );
  }

  const targetAuthUserId = targetProfile.auth_user_id;
  if (!targetAuthUserId) return jsonError("Joined user not found.", 404);

  const { error: deleteAuthError } = await auth.admin.auth.admin.deleteUser(targetAuthUserId);
  if (deleteAuthError) return jsonError(deleteAuthError.message, 500);

  const { error: profileError } = await auth.admin
    .from("profiles")
    .update({ auth_user_id: null, role: "MEMBER" })
    .eq("id", targetProfile.id);
  if (profileError) return jsonError(profileError.message, 500);

  return NextResponse.json({ ok: true });
}
