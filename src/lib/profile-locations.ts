import { getCityCoordinates } from "./cities";
import { inferCountryCodeFromLocation } from "./country-utils";
import type { Profile, ProfileMapLocationSource } from "./types";

export type ProfileLocationSource = ProfileMapLocationSource;

export interface ProfileMapLocation {
  source: ProfileLocationSource;
  label: string;
  query: string;
}

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
  includeAddress?: boolean;
}

export const PROFILE_MAP_SOURCE_LABELS: Record<ProfileLocationSource, string> = {
  birthplace: "Born in",
  current_home: "Lives in",
  secondary_home: "Second home",
  address: "Home address",
};

export const PROFILE_MAP_SOURCE_ACCENTS: Record<ProfileLocationSource, string> = {
  birthplace: "location-chip location-chip-birthplace",
  current_home: "location-chip location-chip-current",
  secondary_home: "location-chip location-chip-secondary",
  address: "location-chip location-chip-address",
};

export const PROFILE_MAP_SOURCE_ORDER: ProfileLocationSource[] = [
  "current_home",
  "birthplace",
  "secondary_home",
  "address",
];

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
    countryCode: (countryCode || inferCountryCodeFromLocation(trimmedCity) || "").toUpperCase() || null,
    lat: coords?.[0] ?? null,
    lng: coords?.[1] ?? null,
  };
}

export function getProfileMapLocations(profile: Profile): ProfileMapLocation[] {
  const locations: ProfileMapLocation[] = [];

  if (profile.location_city?.trim()) {
    locations.push({
      source: "current_home",
      label: PROFILE_MAP_SOURCE_LABELS.current_home,
      query: profile.location_city.trim(),
    });
  }

  if (profile.place_of_birth?.trim()) {
    locations.push({
      source: "birthplace",
      label: PROFILE_MAP_SOURCE_LABELS.birthplace,
      query: profile.place_of_birth.trim(),
    });
  }

  if (profile.secondary_location_city?.trim()) {
    locations.push({
      source: "secondary_home",
      label: PROFILE_MAP_SOURCE_LABELS.secondary_home,
      query: profile.secondary_location_city.trim(),
    });
  }

  if (profile.address?.trim()) {
    locations.push({
      source: "address",
      label: PROFILE_MAP_SOURCE_LABELS.address,
      query: profile.address.trim(),
    });
  }

  return locations;
}

export function resolveProfileMapLocation(profile: Profile): ProfileMapLocation | null {
  const locations = getProfileMapLocations(profile);
  if (locations.length === 0) return null;

  const preferred = profile.map_location_source || "current_home";
  return (
    locations.find((entry) => entry.source === preferred) ||
    locations.find((entry) => entry.source === "current_home") ||
    locations.find((entry) => entry.source === "address") ||
    locations[0]
  );
}

export function getProfileLocationPoints(
  member: Profile,
  options: GetProfileLocationPointsOptions = {}
): ProfileLocationPoint[] {
  const {
    includeBirthplace = false,
    includeCurrent = true,
    includeSecondary = false,
    includeAddress = false,
  } = options;
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

  if (includeAddress) {
    maybePush(
      createPoint(
        member,
        "address",
        member.address,
        member.location_lat,
        member.location_lng,
        member.country_code,
        member.address
      )
    );
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
