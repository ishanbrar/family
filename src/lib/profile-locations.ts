import { getCityCoordinates, inferCountryCodeFromCity } from "./cities";
import type { Profile } from "./types";

export type ProfileLocationSource = "birthplace" | "current_home" | "secondary_home";

export interface ProfileLocationPoint {
  key: string;
  member: Profile;
  source: ProfileLocationSource;
  city: string;
  countryCode: string | null;
  lat: number | null;
  lng: number | null;
}

interface GetProfileLocationPointsOptions {
  includeBirthplace?: boolean;
  includeCurrent?: boolean;
  includeSecondary?: boolean;
}

function normalizeLocationKey(city: string, countryCode: string | null): string {
  return `${city.trim().toLowerCase()}::${countryCode || ""}`;
}

function resolveLatLng(city: string, lat?: number | null, lng?: number | null): [number, number] | null {
  if (lat != null && lng != null) {
    return [lat, lng];
  }
  return getCityCoordinates(city);
}

function createPoint(
  member: Profile,
  source: ProfileLocationSource,
  city: string | null | undefined,
  lat?: number | null,
  lng?: number | null,
  countryCode?: string | null,
  fallbackQuery?: string | null
): ProfileLocationPoint | null {
  const trimmedCity = city?.trim();
  if (!trimmedCity) return null;

  const coords = resolveLatLng(trimmedCity, lat, lng) || (fallbackQuery ? getCityCoordinates(fallbackQuery) : null);
  return {
    key: `${member.id}:${source}:${trimmedCity.toLowerCase()}`,
    member,
    source,
    city: trimmedCity,
    countryCode: (countryCode || inferCountryCodeFromCity(trimmedCity) || "").toUpperCase() || null,
    lat: coords?.[0] ?? null,
    lng: coords?.[1] ?? null,
  };
}

export function getProfileLocationPoints(
  member: Profile,
  options: GetProfileLocationPointsOptions = {}
): ProfileLocationPoint[] {
  const { includeBirthplace = false, includeCurrent = true, includeSecondary = false } = options;
  const seen = new Set<string>();
  const points: ProfileLocationPoint[] = [];

  const maybePush = (point: ProfileLocationPoint | null) => {
    if (!point) return;
    const dedupeKey = normalizeLocationKey(point.city, point.countryCode);
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    points.push(point);
  };

  if (includeBirthplace) {
    maybePush(createPoint(member, "birthplace", member.place_of_birth));
  }

  if (includeCurrent) {
    maybePush(
      createPoint(
        member,
        "current_home",
        member.location_city,
        member.location_lat,
        member.location_lng,
        member.country_code,
        member.address || member.location_city
      )
    );
  }

  if (includeSecondary) {
    maybePush(createPoint(member, "secondary_home", member.secondary_location_city));
  }

  return points;
}

export function distanceMilesBetweenCoordinates(
  start: [number, number],
  end: [number, number]
): number {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const deltaLat = toRadians(endLat - startLat);
  const deltaLng = toRadians(endLng - startLng);
  const lat1 = toRadians(startLat);
  const lat2 = toRadians(endLat);

  const a =
    Math.sin(deltaLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;

  return 2 * earthRadiusMiles * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
