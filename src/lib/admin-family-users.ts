import type { AdminFamilyUser, Role } from "@/lib/types";

export type AdminUserActionResult = {
  ok: boolean;
  error?: string;
};

export function canChangeFamilyUserRole({
  requesterProfileId,
  targetProfileId,
  currentRole,
  nextRole,
  adminCount,
}: {
  requesterProfileId: string;
  targetProfileId: string;
  currentRole: Role;
  nextRole: Role;
  adminCount: number;
}): AdminUserActionResult {
  if (nextRole !== "ADMIN" && nextRole !== "MEMBER") {
    return { ok: false, error: "Invalid role." };
  }
  if (
    requesterProfileId === targetProfileId &&
    currentRole === "ADMIN" &&
    nextRole === "MEMBER"
  ) {
    return { ok: false, error: "You cannot remove your own admin access." };
  }
  if (currentRole === "ADMIN" && nextRole === "MEMBER" && adminCount <= 1) {
    return { ok: false, error: "Add another admin before demoting the last admin." };
  }
  return { ok: true };
}

export function canRemoveFamilyUserAccess({
  requesterProfileId,
  targetProfileId,
  targetRole,
  adminCount,
}: {
  requesterProfileId: string;
  targetProfileId: string;
  targetRole: Role;
  adminCount: number;
}): AdminUserActionResult {
  if (requesterProfileId === targetProfileId) {
    return { ok: false, error: "You cannot remove your own access." };
  }
  if (targetRole === "ADMIN" && adminCount <= 1) {
    return { ok: false, error: "Add another admin before removing the last admin." };
  }
  return { ok: true };
}

export function canAssignFamilyUserToNode({
  sourceProfileId,
  targetProfileId,
}: {
  sourceProfileId: string;
  targetProfileId: string | null | undefined;
}): AdminUserActionResult {
  if (!targetProfileId) {
    return { ok: false, error: "Choose an unclaimed profile node." };
  }
  if (sourceProfileId === targetProfileId) {
    return { ok: false, error: "Choose a different profile node." };
  }
  return { ok: true };
}

export function normalizeAdminFamilyUserPhone(user: Pick<AdminFamilyUser, "phone">): string {
  return user.phone?.trim() || "";
}
