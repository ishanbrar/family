export function buildGoogleMapsSearchUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export function googleMapsHrefFor(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? buildGoogleMapsSearchUrl(trimmed) : null;
}

export function buildGoogleMapsEmbedUrl(query: string, options?: { satellite?: boolean; zoom?: number }): string {
  const zoom = options?.zoom ?? 13;
  const base = `https://www.google.com/maps?q=${encodeURIComponent(query)}`;
  const layer = options?.satellite === false ? "" : "&t=k";
  return `${base}${layer}&z=${zoom}&output=embed`;
}
