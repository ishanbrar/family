export interface PendingIntentPayload {
  mode: "create" | "join";
  first_name: string;
  last_name: string;
  gender?: "female" | "male" | null;
  family_name?: string | null;
  invite_code?: string | null;
  phone_number?: string | null;
}

export const AUTH_TIMEOUT_MS = 30000;
export const SETUP_CHECK_TIMEOUT_MS = 10000;

export async function withTimeout<T>(
  promise: PromiseLike<T>,
  message = "Connection timed out. Please check your internet and try again.",
  timeoutMs = AUTH_TIMEOUT_MS
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  try {
    return await Promise.race([
      Promise.resolve(promise),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(message)), timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

export function normalizeLoginEmail(identifier: string): string {
  return identifier.trim().toLowerCase();
}

export function friendlyAuthMessage(message: string): string {
  const isTimeout = /timed\s*out|timeout/i.test(message);
  const isLoadFailed = /load\s*failed|failed\s*to\s*fetch|network\s*error|abort/i.test(message);
  const isRateLimit = /rate\s*limit|too\s*many\s*requests|429/i.test(message);
  const isInvalidCredentials = /invalid.*login|invalid.*credentials|email.*password/i.test(message);
  if (isTimeout) return "Supabase Auth is taking longer than expected. Please try again.";
  if (isLoadFailed) return "Could not reach Supabase Auth. Please check your internet and try again.";
  if (isRateLimit) return "Too many attempts. Please wait an hour and try again.";
  if (isInvalidCredentials) return "Invalid email or password. Please check your credentials and try again.";
  return message;
}

export function parsePendingSignupIntent(value: unknown): PendingIntentPayload | null {
  if (!value || typeof value !== "object") return null;
  const maybeIntent = value as Partial<PendingIntentPayload>;
  if (maybeIntent.mode !== "create" && maybeIntent.mode !== "join") return null;
  return {
    mode: maybeIntent.mode,
    first_name: maybeIntent.first_name || "Family",
    last_name: maybeIntent.last_name || "Member",
    gender: maybeIntent.gender === "female" || maybeIntent.gender === "male" ? maybeIntent.gender : null,
    family_name: maybeIntent.family_name || null,
    invite_code: maybeIntent.invite_code || null,
    phone_number: maybeIntent.phone_number || null,
  };
}

export async function resolvePostAuthRedirect({
  fallbackRedirect,
  consumePendingIntent,
  completeDeferredSetup,
  onSetupCheckError,
}: {
  fallbackRedirect: string;
  consumePendingIntent: () => Promise<unknown>;
  completeDeferredSetup: (intent: PendingIntentPayload) => Promise<string>;
  onSetupCheckError?: (error: unknown) => void;
}): Promise<{
  redirectPath: string;
  pendingIntent: PendingIntentPayload | null;
  setupError: Error | null;
  setupCheckFailed: boolean;
}> {
  let consumedIntent: unknown = null;
  try {
    consumedIntent = await consumePendingIntent();
  } catch (error) {
    onSetupCheckError?.(error);
    return {
      redirectPath: fallbackRedirect,
      pendingIntent: null,
      setupError: null,
      setupCheckFailed: true,
    };
  }

  const pendingIntent = parsePendingSignupIntent(consumedIntent);
  if (!pendingIntent) {
    return {
      redirectPath: fallbackRedirect,
      pendingIntent: null,
      setupError: null,
      setupCheckFailed: false,
    };
  }

  try {
    return {
      redirectPath: await completeDeferredSetup(pendingIntent),
      pendingIntent: null,
      setupError: null,
      setupCheckFailed: false,
    };
  } catch (error) {
    return {
      redirectPath: fallbackRedirect,
      pendingIntent,
      setupError: error instanceof Error ? error : new Error("Deferred setup failed."),
      setupCheckFailed: false,
    };
  }
}
