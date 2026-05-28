import { NextResponse } from "next/server";

import {
  jsonError,
  listFamilyAssignableProfileNodes,
  listFamilyJoinedUsersFallback,
  listFamilyJoinedUsersViaRpc,
  listFamilyJoinedUsersViaServiceRole,
  requireFamilyAdmin,
} from "@/lib/admin-family-user-api";

export async function GET(request: Request) {
  const familyIdFromQuery = new URL(request.url).searchParams.get("familyId");
  const auth = await requireFamilyAdmin({ familyId: familyIdFromQuery });
  if (auth.error) return auth.error;
  const familyId = auth.effectiveFamilyId || auth.requester?.family_id || null;
  if (!auth.client || !familyId) {
    return jsonError("Family admin access required.", 403);
  }

  const rpcResult = await listFamilyJoinedUsersViaRpc(
    auth.client,
    auth.isSuperAdmin ? familyId : null
  );
  const assignableNodes = await listFamilyAssignableProfileNodes(
    auth.client,
    familyId
  );

  if (rpcResult.users) {
    return NextResponse.json({
      users: rpcResult.users,
      assignableNodes,
      requesterProfileId: auth.requester?.id || null,
      capabilities: {
        authEmail: true,
        removeLogin: true,
        assignNode: true,
        superAdmin: auth.isSuperAdmin,
      },
    });
  }

  if (auth.admin) {
    const serviceRoleResult = await listFamilyJoinedUsersViaServiceRole(
      auth.admin,
      familyId
    );
    if (serviceRoleResult.error) return jsonError(serviceRoleResult.error, 500);

    return NextResponse.json({
      users: serviceRoleResult.users,
      assignableNodes,
      requesterProfileId: auth.requester?.id || null,
      capabilities: {
        authEmail: true,
        removeLogin: true,
        assignNode: true,
        superAdmin: auth.isSuperAdmin,
      },
    });
  }

  if (!rpcResult.missingRpc) {
    return jsonError(rpcResult.error || "Could not load family users.", 500);
  }

  const users = await listFamilyJoinedUsersFallback(auth.client, familyId);

  return NextResponse.json({
    users,
    assignableNodes,
    requesterProfileId: auth.requester?.id || null,
    capabilities: {
      authEmail: false,
      removeLogin: false,
      assignNode: false,
      superAdmin: auth.isSuperAdmin,
    },
    notice:
      "Email, login removal, and node assignment require the latest database migrations. Apply supabase/migrations/20260527200000_family_admin_user_management.sql and 20260528194207_family_admin_assign_account_to_node.sql in Supabase.",
  });
}
