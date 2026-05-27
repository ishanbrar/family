import { describe, expect, it } from "vitest";

import { buildFarAndWideRows, buildWorldCountrySummaries } from "../world-locations";
import { inferCountryCodeFromLocation } from "../country-utils";
import { MOCK_PROFILES } from "../mock-data";
import type { Profile } from "../types";

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: overrides.id || "profile-1",
    first_name: overrides.first_name || "John",
    last_name: overrides.last_name || "Doe",
    display_name: overrides.display_name || null,
    gender: overrides.gender || null,
    avatar_url: overrides.avatar_url || null,
    date_of_birth: overrides.date_of_birth || null,
    date_of_death: overrides.date_of_death || null,
    place_of_birth: overrides.place_of_birth || null,
    profession: overrides.profession || null,
    location_city: overrides.location_city || null,
    secondary_location_city: overrides.secondary_location_city || null,
    address: overrides.address || null,
    location_lat: overrides.location_lat || null,
    location_lng: overrides.location_lng || null,
    map_location_source: overrides.map_location_source || null,
    pets: overrides.pets || [],
    social_links: overrides.social_links || {},
    about_me: overrides.about_me || null,
    country_code: overrides.country_code || null,
    gallery_photos: overrides.gallery_photos || [],
    role: overrides.role || "MEMBER",
    is_alive: overrides.is_alive ?? true,
    onboarding_completed: overrides.onboarding_completed ?? false,
    family_id: overrides.family_id ?? null,
    auth_user_id: overrides.auth_user_id ?? null,
    created_at: overrides.created_at || "2026-01-01T00:00:00.000Z",
    updated_at: overrides.updated_at || "2026-01-01T00:00:00.000Z",
  };
}

describe("buildWorldCountrySummaries", () => {
  it("groups birthplace, current city, and address by country", () => {
    const summaries = buildWorldCountrySummaries([
      makeProfile({
        id: "1",
        first_name: "Sean",
        place_of_birth: "London",
        location_city: "New York, NY, USA",
        country_code: "USA",
      }),
      makeProfile({
        id: "2",
        first_name: "Raj",
        location_city: "Toronto, Canada",
        country_code: "CAN",
      }),
    ]);

    expect(summaries.map((entry) => entry.code).sort()).toEqual(["CAN", "GBR", "USA"]);
    const usa = summaries.find((entry) => entry.code === "USA");
    expect(usa?.memberCount).toBe(1);
    expect(usa?.locations.some((location) => location.source === "current_home")).toBe(true);
  });

  it("does not assign unrelated demo birthplaces to India", () => {
    const summaries = buildWorldCountrySummaries(MOCK_PROFILES);
    expect(summaries.find((entry) => entry.code === "IND")).toBeUndefined();
  });
});

describe("inferCountryCodeFromLocation", () => {
  it("parses trailing country names from location strings", () => {
    expect(inferCountryCodeFromLocation("Cleveland, OH, USA")).toBe("USA");
    expect(inferCountryCodeFromLocation("Inverness, United Kingdom")).toBe("GBR");
    expect(inferCountryCodeFromLocation("Singapore")).toBe("SGP");
  });
});

describe("buildFarAndWideRows", () => {
  it("computes miles between birthplace and current city", () => {
    const rows = buildFarAndWideRows([
      makeProfile({
        id: "1",
        first_name: "Sean",
        place_of_birth: "London",
        location_city: "New York, NY, USA",
        location_lat: 40.7128,
        location_lng: -74.006,
      }),
    ]);

    expect(rows).toHaveLength(1);
    expect(rows[0]?.birthCity).toBe("London");
    expect(rows[0]?.currentCity).toBe("New York, NY, USA");
    expect(rows[0]?.miles).toBeGreaterThan(3000);
  });
});
