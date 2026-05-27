import { describe, expect, it } from "vitest";
import {
  isPointInCountryCoreTerritory,
  isPointInCountryMapTerritory,
  isUsaCoreTerritory,
} from "../country-map-geometry";

describe("isUsaCoreTerritory", () => {
  it("includes continental US, Alaska, and Hawaii", () => {
    expect(isUsaCoreTerritory(-74.006, 40.7128)).toBe(true);
    expect(isUsaCoreTerritory(-149.9, 61.2)).toBe(true);
    expect(isUsaCoreTerritory(-157.85, 21.31)).toBe(true);
  });

  it("excludes US territories outside the core map", () => {
    expect(isUsaCoreTerritory(-66.1057, 18.4655)).toBe(false);
    expect(isUsaCoreTerritory(144.7937, 13.4443)).toBe(false);
  });
});

describe("isPointInCountryCoreTerritory", () => {
  it("excludes French overseas territories", () => {
    expect(isPointInCountryCoreTerritory(2.3522, 48.8566, "FRA")).toBe(true);
    expect(isPointInCountryCoreTerritory(-52.3, 4.9, "FRA")).toBe(false);
    expect(isPointInCountryCoreTerritory(55.5, -21.1, "FRA")).toBe(false);
  });

  it("excludes Portuguese archipelagos", () => {
    expect(isPointInCountryCoreTerritory(-9.14, 38.72, "PRT")).toBe(true);
    expect(isPointInCountryCoreTerritory(-25.67, 37.74, "PRT")).toBe(false);
  });

  it("excludes Greenland from Denmark", () => {
    expect(isPointInCountryCoreTerritory(12.57, 55.68, "DNK")).toBe(true);
    expect(isPointInCountryCoreTerritory(-42.6, 76.5, "DNK")).toBe(false);
  });
});

describe("isPointInCountryMapTerritory", () => {
  it("uses core USA bounds instead of full geoContains for USA", () => {
    expect(isPointInCountryMapTerritory(-66.1057, 18.4655, "USA", null)).toBe(false);
    expect(isPointInCountryMapTerritory(-74.006, 40.7128, "USA", null)).toBe(true);
  });
});
