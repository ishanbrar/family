const DEFAULT_APP_URL = "https://legatree.us";

export function getAppWebUrl(): string {
  const raw = process.env.EXPO_PUBLIC_APP_URL?.trim() || DEFAULT_APP_URL;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return DEFAULT_APP_URL;
    }
    return url.toString().replace(/\/$/, "");
  } catch {
    return DEFAULT_APP_URL;
  }
}
