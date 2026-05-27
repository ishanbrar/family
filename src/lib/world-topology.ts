import { feature } from "topojson-client";
import { countryName } from "./country-utils";
import { prepareCountryMapFeature } from "./country-map-geometry";

export const WORLD_TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json";
export const WORLD_TOPO_FALLBACK_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
export const WORLD_TOPO_CACHE_KEY = "legatree:world-topology:v2";

export interface WorldCountryFeature {
  type: "Feature";
  id: string;
  geometry: GeoJSON.Geometry;
  properties: { name: string };
}

const COUNTRY_NAME_ALIASES: Record<string, string[]> = {
  USA: ["United States of America", "United States"],
  GBR: ["United Kingdom"],
  RUS: ["Russia", "Russian Federation"],
  KOR: ["South Korea", "Republic of Korea"],
  CZE: ["Czech Republic", "Czechia"],
  VNM: ["Vietnam", "Viet Nam"],
};

export function normalizeCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function extractCountryFeatures(topology: unknown): WorldCountryFeature[] {
  if (!topology || typeof topology !== "object") return [];
  const topoObject = topology as { objects?: { countries?: unknown } };
  if (!topoObject.objects?.countries) return [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geo = feature(topology as any, topoObject.objects.countries as any) as any;
  if (!Array.isArray(geo?.features)) return [];
  return geo.features as WorldCountryFeature[];
}

export function resolveCountryFeatureByCode(
  countries: WorldCountryFeature[],
  code: string
): WorldCountryFeature | null {
  if (countries.length === 0) return null;

  const byNormalizedName = new Map<string, WorldCountryFeature>();
  countries.forEach((country) => {
    byNormalizedName.set(normalizeCountryName(country.properties.name), country);
  });

  const names = [countryName(code), ...(COUNTRY_NAME_ALIASES[code.toUpperCase()] || [])]
    .filter(Boolean)
    .map((name) => normalizeCountryName(name));

  for (const normalizedName of names) {
    const exact = byNormalizedName.get(normalizedName);
    if (exact) return exact;
  }

  for (const normalizedName of names) {
    const partial = countries.find((country) => {
      const countryNorm = normalizeCountryName(country.properties.name);
      return countryNorm.includes(normalizedName) || normalizedName.includes(countryNorm);
    });
    if (partial) return partial;
  }

  return null;
}

export function resolveCountryMapFeatureByCode(
  countries: WorldCountryFeature[],
  code: string
): WorldCountryFeature | null {
  const featureMatch = resolveCountryFeatureByCode(countries, code);
  if (!featureMatch) return null;
  return prepareCountryMapFeature(featureMatch, code);
}

export async function loadWorldTopology(): Promise<WorldCountryFeature[]> {
  const sources = [WORLD_TOPO_URL, WORLD_TOPO_FALLBACK_URL];

  for (const source of sources) {
    try {
      const response = await fetch(source);
      if (!response.ok) continue;
      const topology = await response.json();
      const features = extractCountryFeatures(topology);
      if (features.length > 0) {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(WORLD_TOPO_CACHE_KEY, JSON.stringify(topology));
        }
        return features;
      }
    } catch {
      // Try next source.
    }
  }

  if (typeof window !== "undefined") {
    const cached = window.localStorage.getItem(WORLD_TOPO_CACHE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const features = extractCountryFeatures(parsed);
        if (features.length > 0) return features;
      } catch {
        // Ignore malformed cache.
      }
    }
  }

  return [];
}
