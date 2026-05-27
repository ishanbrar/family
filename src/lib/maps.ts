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

const COUNTRY_EMBED_ZOOM: Record<string, number> = {
  USA: 4,
  GBR: 6,
  FRA: 6,
  DEU: 6,
  ITA: 6,
  ESP: 6,
  AUS: 4,
  CAN: 4,
  IND: 5,
  SGP: 12,
  JPN: 5,
  CHN: 4,
  BRA: 4,
  MEX: 5,
  NZL: 5,
};

export function buildCountryMapEmbedUrl(countryName: string, countryCode: string): string {
  const zoom = COUNTRY_EMBED_ZOOM[countryCode.toUpperCase()] ?? 5;
  return buildGoogleMapsEmbedUrl(countryName, { satellite: true, zoom });
}
