import { AuthApiError } from "@supabase/supabase-js";

export function isInvalidRefreshTokenError(error: unknown): boolean {
  if (!error) return false;

  const message =
    error instanceof AuthApiError
      ? error.message
      : error instanceof Error
        ? error.message
        : String(error);

  return /invalid refresh token|refresh token not found|refresh_token/i.test(message);
}
