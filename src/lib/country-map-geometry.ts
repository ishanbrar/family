import { geoCentroid, geoContains } from "d3-geo";
import type { WorldCountryFeature } from "./world-topology";

interface TerritoryBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

/** Core landmass bounds — excludes overseas territories from map rendering and pin checks. */
const COUNTRY_CORE_TERRITORY: Record<string, TerritoryBox[]> = {
  USA: [
    { minLat: 24.3, maxLat: 49.6, minLng: -124.9, maxLng: -66.9 },
    { minLat: 51.0, maxLat: 71.5, minLng: -179.9, maxLng: -129.0 },
    { minLat: 18.7, maxLat: 22.6, minLng: -160.9, maxLng: -154.6 },
  ],
  FRA: [{ minLat: 41.0, maxLat: 51.2, minLng: -5.5, maxLng: 10.0 }],
  GBR: [{ minLat: 49.85, maxLat: 60.95, minLng: -8.65, maxLng: 1.85 }],
  PRT: [{ minLat: 36.95, maxLat: 42.15, minLng: -9.55, maxLng: -6.05 }],
  NLD: [{ minLat: 50.75, maxLat: 53.55, minLng: 3.0, maxLng: 7.25 }],
  DNK: [{ minLat: 54.55, maxLat: 57.75, minLng: 8.0, maxLng: 15.25 }],
  ESP: [{ minLat: 35.9, maxLat: 43.9, minLng: -9.6, maxLng: 4.6 }],
  ITA: [{ minLat: 36.5, maxLat: 47.5, minLng: 6.5, maxLng: 18.5 }],
  AUS: [{ minLat: -44.0, maxLat: -10.0, minLng: 112.0, maxLng: 154.5 }],
  NZL: [{ minLat: -47.5, maxLat: -34.0, minLng: 166.0, maxLng: 179.0 }],
  CHL: [{ minLat: -56.0, maxLat: -17.0, minLng: -76.0, maxLng: -66.0 }],
  ECU: [{ minLat: -5.2, maxLat: 1.5, minLng: -81.5, maxLng: -75.0 }],
  BRA: [{ minLat: -34.0, maxLat: 5.5, minLng: -74.0, maxLng: -34.0 }],
};

const COUNTRY_FEATURE_NUMERIC_IDS: Record<string, string> = {
  "840": "USA",
  "250": "FRA",
  "826": "GBR",
  "620": "PRT",
  "528": "NLD",
  "208": "DNK",
  "724": "ESP",
  "380": "ITA",
  "036": "AUS",
  "554": "NZL",
  "152": "CHL",
  "218": "ECU",
  "076": "BRA",
};

function pointInBox(lng: number, lat: number, box: TerritoryBox): boolean {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
}

export function hasCoreTerritoryFilter(countryCode: string): boolean {
  return Object.prototype.hasOwnProperty.call(COUNTRY_CORE_TERRITORY, countryCode.toUpperCase());
}

export function isPointInCountryCoreTerritory(lng: number, lat: number, countryCode: string): boolean {
  const boxes = COUNTRY_CORE_TERRITORY[countryCode.toUpperCase()];
  if (!boxes) return true;
  return boxes.some((box) => pointInBox(lng, lat, box));
}

/** @deprecated Use isPointInCountryCoreTerritory with countryCode "USA". */
export function isUsaCoreTerritory(lng: number, lat: number): boolean {
  return isPointInCountryCoreTerritory(lng, lat, "USA");
}

export function resolveCountryCodeFromFeature(
  feature: Pick<WorldCountryFeature, "id" | "properties">
): string | null {
  const byId = COUNTRY_FEATURE_NUMERIC_IDS[String(feature.id)];
  if (byId) return byId;

  const name = feature.properties.name.toLowerCase();
  if (name.includes("united states")) return "USA";
  if (name.includes("united kingdom")) return "GBR";
  if (name.includes("france")) return "FRA";
  if (name.includes("portugal")) return "PRT";
  if (name.includes("netherlands")) return "NLD";
  if (name.includes("denmark")) return "DNK";
  if (name.includes("spain")) return "ESP";
  if (name.includes("italy")) return "ITA";
  if (name.includes("australia")) return "AUS";
  if (name.includes("new zealand")) return "NZL";

  return null;
}

/** @deprecated Use resolveCountryCodeFromFeature(feature) === "USA". */
export function isUsaCountryFeature(feature: Pick<WorldCountryFeature, "id" | "properties">): boolean {
  return resolveCountryCodeFromFeature(feature) === "USA";
}

function polygonInCoreTerritory(coordinates: number[][][], countryCode: string): boolean {
  const [lng, lat] = geoCentroid({
    type: "Polygon",
    coordinates,
  } as GeoJSON.Polygon);
  return isPointInCountryCoreTerritory(lng, lat, countryCode);
}

export function simplifyCountryGeometry(
  geometry: GeoJSON.Geometry,
  countryCode: string
): GeoJSON.Geometry {
  if (!hasCoreTerritoryFilter(countryCode)) return geometry;

  if (geometry.type === "MultiPolygon") {
    const filtered = geometry.coordinates.filter((polygon) =>
      polygonInCoreTerritory(polygon, countryCode)
    );
    if (filtered.length === 0) return geometry;
    if (filtered.length === 1) {
      return { type: "Polygon", coordinates: filtered[0] };
    }
    return { type: "MultiPolygon", coordinates: filtered };
  }

  if (geometry.type === "Polygon") {
    return polygonInCoreTerritory(geometry.coordinates, countryCode) ? geometry : geometry;
  }

  return geometry;
}

export function prepareCountryMapFeature(
  feature: WorldCountryFeature,
  countryCode: string
): WorldCountryFeature {
  const code = countryCode.toUpperCase();
  if (!hasCoreTerritoryFilter(code)) return feature;

  return {
    ...feature,
    geometry: simplifyCountryGeometry(feature.geometry, code),
  };
}

export function isPointInCountryMapTerritory(
  lng: number,
  lat: number,
  countryCode: string,
  feature: WorldCountryFeature | null
): boolean {
  const code = countryCode.toUpperCase();
  if (hasCoreTerritoryFilter(code)) {
    return isPointInCountryCoreTerritory(lng, lat, code);
  }

  const featureCode = feature ? resolveCountryCodeFromFeature(feature) : null;
  if (featureCode && hasCoreTerritoryFilter(featureCode)) {
    return isPointInCountryCoreTerritory(lng, lat, featureCode);
  }

  if (!feature) return true;

  try {
    return geoContains(feature as unknown as GeoJSON.Feature, [lng, lat]);
  } catch {
    return true;
  }
}
