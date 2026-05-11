import { findCityByInput, inferCountryCodeFromCity } from "./cities";
import { countryFlag } from "./country-utils";
import { formatDisplayText } from "./display-format";
import type { Profile } from "./types";

export interface LocationTickerItem {
  city: string;
  countryCode: string;
  flag: string;
  memberNames: string[];
}

function cityOnly(locationCity: string | null | undefined): string {
  return (locationCity || "").split(",")[0].trim();
}

function canonicalCityName(locationCity: string | null | undefined): string {
  const rawCity = cityOnly(locationCity);
  if (!rawCity) return "";
  const matched = findCityByInput(locationCity || rawCity);
  return formatDisplayText(matched?.name || rawCity);
}

function memberTickerName(member: Profile): string {
  return formatDisplayText(member.display_name || member.first_name || "");
}

export function buildLocationTickerItems(members: Profile[]): LocationTickerItem[] {
  const groups = new Map<
    string,
    {
      city: string;
      countryCode: string;
      memberNames: string[];
    }
  >();

  for (const member of members) {
    const city = canonicalCityName(member.location_city);
    const countryCode = (member.country_code || inferCountryCodeFromCity(member.location_city || "") || "")
      .toUpperCase()
      .trim();

    if (!city || !countryCode) continue;

    const key = `${city.toLowerCase()}::${countryCode}`;
    const existing = groups.get(key);

    if (existing) {
      existing.memberNames.push(memberTickerName(member));
      continue;
    }

    groups.set(key, {
      city,
      countryCode,
      memberNames: [memberTickerName(member)],
    });
  }

  return [...groups.values()]
    .map((group) => ({
      city: group.city,
      countryCode: group.countryCode,
      flag: countryFlag(group.countryCode),
      memberNames: [...group.memberNames].sort((a, b) => a.localeCompare(b)),
    }))
    .sort((a, b) => {
      if (b.memberNames.length !== a.memberNames.length) {
        return b.memberNames.length - a.memberNames.length;
      }
      return a.city.localeCompare(b.city);
    });
}
