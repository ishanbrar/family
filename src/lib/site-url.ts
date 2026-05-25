/** Production site origin (Open Graph, auth redirects, share previews). */
export const PRODUCTION_SITE_URL = "https://legatree.us";

/** Canonical site URL for absolute metadata (Open Graph, Twitter, etc.). */
export function getSiteUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_SITE_URL;
  }

  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel.replace(/\/$/, "")}`;

  return "http://localhost:3000";
}
