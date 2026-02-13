export const PENDING_SIGNUP_KEY = "legacy:pending-signup";

export interface PendingSignupIntent {
  mode: "create" | "join";
  first_name: string;
  last_name: string;
  gender?: "female" | "male";
  family_name?: string;
  invite_code?: string;
}

export function savePendingSignup(intent: PendingSignupIntent): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PENDING_SIGNUP_KEY, JSON.stringify(intent));
}

export function readPendingSignup(): PendingSignupIntent | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(PENDING_SIGNUP_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PendingSignupIntent;
  } catch {
    return null;
  }
}

export function clearPendingSignup(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(PENDING_SIGNUP_KEY);
}
