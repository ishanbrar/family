import { formatProfileFullName } from "./display-format";
import { countryFlag, countryName } from "./country-utils";
import {
  distanceMilesBetweenCoordinates,
  getProfileLocationPoints,
  PROFILE_MAP_SOURCE_ACCENTS,
  PROFILE_MAP_SOURCE_LABELS,
  type ProfileLocationSource,
} from "./profile-locations";
import type { Profile } from "./types";

export interface WorldCountryPin {
  id: string;
  memberId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  source: ProfileLocationSource;
  sourceLabel: string;
  query: string;
  city: string;
  lat: number | null;
  lng: number | null;
  accentClass: string;
}

export interface WorldCountrySummary {
  code: string;
  name: string;
  flag: string;
  locations: WorldCountryPin[];
  memberCount: number;
  locationCount: number;
}

export interface WorldCountryMemberGroup {
  memberId: string;
  memberName: string;
  memberAvatarUrl: string | null;
  locations: WorldCountryPin[];
  sources: ProfileLocationSource[];
}

export interface FarAndWideRow {
  id: string;
  name: string;
  birthCity: string;
  currentCity: string;
  miles: number;
}

export function buildWorldCountrySummaries(members: Profile[]): WorldCountrySummary[] {
  const countryMap = new Map<string, WorldCountryPin[]>();
  const memberIdsByCountry = new Map<string, Set<string>>();

  for (const member of members) {
    const points = getProfileLocationPoints(member, {
      includeBirthplace: true,
      includeCurrent: true,
      includeSecondary: true,
      includeAddress: true,
    });

    for (const point of points) {
      const code = (point.countryCode || "").toUpperCase();
      if (!code) continue;

      if (!countryMap.has(code)) {
        countryMap.set(code, []);
        memberIdsByCountry.set(code, new Set());
      }

      countryMap.get(code)!.push({
        id: point.key,
        memberId: member.id,
        memberName: formatProfileFullName(member),
        memberAvatarUrl: member.avatar_url ?? null,
        source: point.source,
        sourceLabel: PROFILE_MAP_SOURCE_LABELS[point.source],
        query: point.city,
        city: point.city,
        lat: point.lat,
        lng: point.lng,
        accentClass: PROFILE_MAP_SOURCE_ACCENTS[point.source],
      });
      memberIdsByCountry.get(code)!.add(member.id);
    }
  }

  return [...countryMap.entries()]
    .map(([code, locations]) => ({
      code,
      name: countryName(code),
      flag: countryFlag(code),
      locations,
      memberCount: memberIdsByCountry.get(code)?.size ?? 0,
      locationCount: locations.length,
    }))
    .sort((a, b) => b.locationCount - a.locationCount || a.name.localeCompare(b.name));
}

export function groupWorldCountryByMember(country: WorldCountrySummary): WorldCountryMemberGroup[] {
  const byMember = new Map<string, WorldCountryMemberGroup>();

  for (const location of country.locations) {
    const existing = byMember.get(location.memberId);
    if (existing) {
      existing.locations.push(location);
      if (!existing.sources.includes(location.source)) {
        existing.sources.push(location.source);
      }
      continue;
    }

    byMember.set(location.memberId, {
      memberId: location.memberId,
      memberName: location.memberName,
      memberAvatarUrl: location.memberAvatarUrl,
      locations: [location],
      sources: [location.source],
    });
  }

  return [...byMember.values()].sort((a, b) => a.memberName.localeCompare(b.memberName));
}

export function shouldLinkLocationToGoogleMaps(location: WorldCountryPin): boolean {
  return location.source === "address";
}

export function filterWorldCountryLocations(
  country: WorldCountrySummary,
  activeSources: ReadonlySet<ProfileLocationSource>
): WorldCountryPin[] {
  return country.locations.filter((location) => activeSources.has(location.source));
}

export function filterWorldCountryMemberGroups(
  country: WorldCountrySummary,
  activeSources: ReadonlySet<ProfileLocationSource>
): WorldCountryMemberGroup[] {
  const filtered = filterWorldCountryLocations(country, activeSources);
  if (filtered.length === 0) return [];

  const filteredCountry: WorldCountrySummary = {
    ...country,
    locations: filtered,
    locationCount: filtered.length,
    memberCount: new Set(filtered.map((location) => location.memberId)).size,
  };

  return groupWorldCountryByMember(filteredCountry);
}

export function buildFarAndWideRows(members: Profile[]): FarAndWideRow[] {
  return members
    .map((member) => {
      const birthPoint = getProfileLocationPoints(member, {
        includeBirthplace: true,
        includeCurrent: false,
        includeSecondary: false,
      })[0];
      const currentPoint = getProfileLocationPoints(member, {
        includeBirthplace: false,
        includeCurrent: true,
        includeSecondary: false,
      })[0];

      if (!birthPoint || !currentPoint) return null;
      if (birthPoint.lat == null || birthPoint.lng == null) return null;
      if (currentPoint.lat == null || currentPoint.lng == null) return null;

      return {
        id: member.id,
        name: formatProfileFullName(member),
        birthCity: birthPoint.city,
        currentCity: currentPoint.city,
        miles: Math.round(
          distanceMilesBetweenCoordinates(
            [birthPoint.lat, birthPoint.lng],
            [currentPoint.lat, currentPoint.lng]
          )
        ),
      };
    })
    .filter((row): row is FarAndWideRow => row !== null)
    .sort((a, b) => b.miles - a.miles || a.name.localeCompare(b.name));
}
