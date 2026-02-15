// ══════════════════════════════════════════════════════════
// Legacy – Country Utilities
// Flag emojis, alpha-3 → alpha-2 mapping, country names.
// ══════════════════════════════════════════════════════════

import { inferCountryCodeFromCity } from "./cities";

const A3_TO_A2: Record<string, string> = {
  USA: "US", GBR: "GB", FRA: "FR", AUS: "AU", CAN: "CA", DEU: "DE",
  ITA: "IT", ESP: "ES", NLD: "NL", BEL: "BE", CHE: "CH", AUT: "AT",
  PRT: "PT", IRL: "IE", DNK: "DK", SWE: "SE", NOR: "NO", FIN: "FI",
  GRC: "GR", CZE: "CZ", POL: "PL", HUN: "HU", ROU: "RO", TUR: "TR",
  JPN: "JP", KOR: "KR", CHN: "CN", HKG: "HK", TWN: "TW", SGP: "SG",
  THA: "TH", MYS: "MY", IDN: "ID", PHL: "PH", VNM: "VN", IND: "IN",
  PAK: "PK", BGD: "BD", LKA: "LK", NPL: "NP", ARE: "AE", SAU: "SA",
  QAT: "QA", ISR: "IL", JOR: "JO", LBN: "LB", KWT: "KW", EGY: "EG",
  NGA: "NG", KEN: "KE", ZAF: "ZA", GHA: "GH", ETH: "ET", MAR: "MA",
  TUN: "TN", TZA: "TZ", UGA: "UG", RWA: "RW", SEN: "SN", BRA: "BR",
  ARG: "AR", CHL: "CL", PER: "PE", COL: "CO", ECU: "EC", URY: "UY",
  VEN: "VE", MEX: "MX", CRI: "CR", PAN: "PA", CUB: "CU", JAM: "JM",
  NZL: "NZ", RUS: "RU", UKR: "UA",
};

const A3_TO_NAME: Record<string, string> = {
  USA: "United States", GBR: "United Kingdom", FRA: "France", AUS: "Australia",
  CAN: "Canada", DEU: "Germany", ITA: "Italy", ESP: "Spain", NLD: "Netherlands",
  BEL: "Belgium", CHE: "Switzerland", AUT: "Austria", PRT: "Portugal",
  IRL: "Ireland", DNK: "Denmark", SWE: "Sweden", NOR: "Norway", FIN: "Finland",
  GRC: "Greece", CZE: "Czech Republic", POL: "Poland", HUN: "Hungary",
  ROU: "Romania", TUR: "Turkey", JPN: "Japan", KOR: "South Korea", CHN: "China",
  HKG: "Hong Kong", TWN: "Taiwan", SGP: "Singapore", THA: "Thailand",
  MYS: "Malaysia", IDN: "Indonesia", PHL: "Philippines", VNM: "Vietnam",
  IND: "India", PAK: "Pakistan", BGD: "Bangladesh", LKA: "Sri Lanka",
  NPL: "Nepal", ARE: "UAE", SAU: "Saudi Arabia", QAT: "Qatar", ISR: "Israel",
  JOR: "Jordan", LBN: "Lebanon", KWT: "Kuwait", EGY: "Egypt", NGA: "Nigeria",
  KEN: "Kenya", ZAF: "South Africa", GHA: "Ghana", ETH: "Ethiopia",
  MAR: "Morocco", TUN: "Tunisia", TZA: "Tanzania", UGA: "Uganda", RWA: "Rwanda",
  SEN: "Senegal", BRA: "Brazil", ARG: "Argentina", CHL: "Chile", PER: "Peru",
  COL: "Colombia", ECU: "Ecuador", URY: "Uruguay", VEN: "Venezuela",
  MEX: "Mexico", CRI: "Costa Rica", PAN: "Panama", CUB: "Cuba", JAM: "Jamaica",
  NZL: "New Zealand", RUS: "Russia", UKR: "Ukraine",
};

/** Convert ISO 3166-1 alpha-2 code to flag emoji */
export function alpha2ToFlag(code: string): string {
  const pts = [...code.toUpperCase()].map(
    (ch) => 0x1f1e6 - 65 + ch.charCodeAt(0)
  );
  return String.fromCodePoint(...pts);
}

/** Convert alpha-3 country code to flag emoji */
export function countryFlag(alpha3: string): string {
  const a2 = A3_TO_A2[alpha3.toUpperCase()];
  return a2 ? alpha2ToFlag(a2) : "🏳️";
}

/** Get human-readable country name from alpha-3 */
export function countryName(alpha3: string): string {
  return A3_TO_NAME[alpha3.toUpperCase()] || alpha3;
}

import type { Profile } from "./types";

export interface CountryGroup {
  code: string;
  name: string;
  flag: string;
  members: Profile[];
}

/** Group family members by country, sorted by member count desc */
export function groupByCountry(members: Profile[]): CountryGroup[] {
  const map = new Map<string, Profile[]>();

  for (const m of members) {
    const code = m.country_code || inferCountryCodeFromCity(m.location_city || "");
    if (!code) continue;
    if (!map.has(code)) map.set(code, []);
    map.get(code)!.push(m);
  }

  return [...map.entries()]
    .map(([code, mems]) => ({
      code,
      name: countryName(code),
      flag: countryFlag(code),
      members: mems,
    }))
    .sort((a, b) => b.members.length - a.members.length);
}
