/** Production site origin (Open Graph, auth redirects, share previews). */
export const PRODUCTION_SITE_URL = "https://legatree.us";

function getValidAbsoluteUrl(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  // Ignore unexpanded placeholders such as "NEXT_PUBLIC_APP_URL".
  if (/^[A-Z0-9_]+$/.test(trimmed)) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return null;
    }
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

/** Canonical site URL for absolute metadata (Open Graph, Twitter, etc.). */
export function getSiteUrl(): string {
  const fromEnv = getValidAbsoluteUrl(process.env.NEXT_PUBLIC_APP_URL);
  if (fromEnv) return fromEnv;

  const vercel = getValidAbsoluteUrl(
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL.trim().replace(/\/$/, "")}` : undefined
  );
  if (vercel) return vercel;

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  return "http://localhost:3000";
}
