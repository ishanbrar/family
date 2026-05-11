import { describe, expect, it } from "vitest";

import { buildLocationTickerItems } from "../location-summary";
import type { Profile } from "../types";

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: overrides.id || "profile-1",
    first_name: overrides.first_name || "john",
    last_name: overrides.last_name || "doe",
    display_name: overrides.display_name || null,
    gender: overrides.gender || null,
    avatar_url: overrides.avatar_url || null,
    date_of_birth: overrides.date_of_birth || null,
    date_of_death: overrides.date_of_death || null,
    place_of_birth: overrides.place_of_birth || null,
    profession: overrides.profession || null,
    location_city: overrides.location_city || null,
    location_lat: overrides.location_lat || null,
    location_lng: overrides.location_lng || null,
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

describe("buildLocationTickerItems", () => {
  it("groups members by full city name and preserves full labels", () => {
    const items = buildLocationTickerItems([
      makeProfile({
        id: "1",
        first_name: "sean",
        location_city: "New York, NY, USA",
        country_code: "USA",
      }),
      makeProfile({
        id: "2",
        first_name: "raj",
        location_city: "New York, NY, USA",
        country_code: "USA",
      }),
      makeProfile({
        id: "3",
        first_name: "nani",
        location_city: "Chan",
        country_code: null,
      }),
      makeProfile({
        id: "4",
        first_name: "karan",
        location_city: "New",
        country_code: "USA",
      }),
      makeProfile({
        id: "5",
        first_name: "ghost",
        location_city: null,
        country_code: "USA",
      }),
    ]);

    expect(items).toEqual([
      {
        city: "New York",
        countryCode: "USA",
        flag: "🇺🇸",
        memberNames: ["Karan", "Raj", "Sean"],
      },
      {
        city: "Chandigarh",
        countryCode: "IND",
        flag: "🇮🇳",
        memberNames: ["Nani"],
      },
    ]);
  });
});
