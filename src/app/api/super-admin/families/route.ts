import { NextResponse } from "next/server";

import {
  isSuperAdminUser,
  jsonError,
} from "@/lib/admin-family-user-api";
import { formatPersonName } from "@/lib/display-format";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export async function GET() {
  const serverClient = await createServerClient();
  const {
    data: { user },
    error: userError,
  } = await serverClient.auth.getUser();

  if (userError || !user) return jsonError("Authentication required.", 401);

  const isSuperAdmin = await isSuperAdminUser(serverClient, user);
  if (!isSuperAdmin) return jsonError("Super admin access required.", 403);

  const client = hasServiceRoleKey() ? createAdminClient() : serverClient;

  const [familiesResult, profilesResult, relationshipsResult] = await Promise.all([
    client
      .from("families")
      .select("id,name,invite_code,relation_language,created_by,created_at")
      .order("created_at", { ascending: false }),
    client
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: true }),
    client
      .from("relationships")
      .select("*")
      .order("created_at", { ascending: true }),
  ]);

  if (familiesResult.error) return jsonError(familiesResult.error.message, 500);
  if (profilesResult.error) return jsonError(profilesResult.error.message, 500);
  if (relationshipsResult.error) return jsonError(relationshipsResult.error.message, 500);

  const profiles = profilesResult.data || [];
  const relationships = relationshipsResult.data || [];

  const families = (familiesResult.data || []).map((family) => {
    const members = profiles.filter((profile) => profile.family_id === family.id);
    const memberIds = new Set(members.map((profile) => profile.id));
    const familyRelationships = relationships.filter(
      (relationship) =>
        memberIds.has(relationship.user_id) && memberIds.has(relationship.relative_id)
    );
    const admins = members
      .filter((member) => member.role === "ADMIN" && member.auth_user_id)
      .map((member) => ({
        profileId: member.id,
        name: formatPersonName(
          member.first_name || "",
          member.middle_name || "",
          member.last_name || "",
          member.name_prefix || ""
        ) || "Family Admin",
      }));

    return {
      ...family,
      memberCount: members.length,
      joinedUserCount: members.filter((member) => member.auth_user_id).length,
      adminCount: admins.length,
      relationshipCount: familyRelationships.length,
      admins,
    };
  });

  return NextResponse.json({
    families,
    profiles,
    relationships,
  });
}
