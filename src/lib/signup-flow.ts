export const JOIN_FAMILY_SIGNUP_PATH = "/signup";
export const CREATE_FAMILY_SIGNUP_PATH = "/signup/create";

export function normalizeInviteCode(inviteCode: string): string {
  return inviteCode.trim().toUpperCase();
}

export function joinFamilySignupPath(inviteCode?: string): string {
  const normalized = inviteCode ? normalizeInviteCode(inviteCode) : "";
  if (!normalized) return JOIN_FAMILY_SIGNUP_PATH;
  return `${JOIN_FAMILY_SIGNUP_PATH}?code=${encodeURIComponent(normalized)}`;
}

export function loginPathForInvite(inviteCode?: string): string {
  const normalized = inviteCode ? normalizeInviteCode(inviteCode) : "";
  if (!normalized) return "/login";
  return `/login?code=${encodeURIComponent(normalized)}`;
}
