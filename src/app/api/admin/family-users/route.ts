import { NextResponse } from "next/server";

import {
  jsonError,
  listFamilyJoinedUsersFallback,
  listFamilyJoinedUsersViaRpc,
  listFamilyJoinedUsersViaServiceRole,
  requireFamilyAdmin,
} from "@/lib/admin-family-user-api";

export async function GET() {
  const auth = await requireFamilyAdmin();
  if (auth.error) return auth.error;
  if (!auth.client || !auth.requester?.family_id) {
    return jsonError("Family admin access required.", 403);
  }

  const rpcResult = await listFamilyJoinedUsersViaRpc(auth.client);
  if (rpcResult.users) {
    return NextResponse.json({
      users: rpcResult.users,
      requesterProfileId: auth.requester.id,
      capabilities: {
        authEmail: true,
        removeLogin: true,
      },
    });
  }

  if (auth.admin) {
    const serviceRoleResult = await listFamilyJoinedUsersViaServiceRole(
      auth.admin,
      auth.requester.family_id
    );
    if (serviceRoleResult.error) return jsonError(serviceRoleResult.error, 500);

    return NextResponse.json({
      users: serviceRoleResult.users,
      requesterProfileId: auth.requester.id,
      capabilities: {
        authEmail: true,
        removeLogin: true,
      },
    });
  }

  if (!rpcResult.missingRpc) {
    return jsonError(rpcResult.error || "Could not load family users.", 500);
  }

  const users = await listFamilyJoinedUsersFallback(auth.client, auth.requester.family_id);

  return NextResponse.json({
    users,
    requesterProfileId: auth.requester.id,
    capabilities: {
      authEmail: false,
      removeLogin: false,
    },
    notice:
      "Email and login removal require the latest database migration. Apply supabase/migrations/20260527200000_family_admin_user_management.sql in Supabase, or add SUPABASE_SERVICE_ROLE_KEY to your environment.",
  });
}
