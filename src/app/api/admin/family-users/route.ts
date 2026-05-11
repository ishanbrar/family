import { NextResponse } from "next/server";

import {
  jsonError,
  mapAdminFamilyUser,
  requireFamilyAdmin,
  type ProfileRow,
} from "@/lib/admin-family-user-api";
import type { AdminFamilyUser } from "@/lib/types";

export async function GET() {
  const auth = await requireFamilyAdmin();
  if (auth.error) return auth.error;
  if (!auth.admin || !auth.requester?.family_id) {
    return jsonError("Family admin access required.", 403);
  }

  const { data: profiles, error } = await auth.admin
    .from("profiles")
    .select("id,auth_user_id,first_name,last_name,role,family_id,social_links,created_at")
    .eq("family_id", auth.requester.family_id)
    .not("auth_user_id", "is", null)
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 500);

  const users = await Promise.all(
    ((profiles || []) as ProfileRow[]).map(async (profile) => {
      if (!profile.auth_user_id) return null;
      const { data } = await auth.admin!.auth.admin.getUserById(profile.auth_user_id);
      return mapAdminFamilyUser(profile, data.user || null);
    })
  );

  return NextResponse.json({
    users: users.filter((user): user is AdminFamilyUser => user !== null),
    requesterProfileId: auth.requester.id,
  });
}
