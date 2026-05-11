import { describe, expect, it } from "vitest";

import {
  calculateAggregateYearsLived,
  formatDisplayText,
  formatFamilyTreeTitle,
  formatPersonName,
} from "../display-format";
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

describe("display formatting helpers", () => {
  it("capitalizes person display text without mutating the original", () => {
    const original = "sean gg";
    expect(formatDisplayText(original)).toBe("Sean Gg");
    expect(original).toBe("sean gg");
    expect(formatPersonName("sean", "gg")).toBe("Sean Gg");
  });

  it("formats family tree titles without doubling Family", () => {
    expect(formatFamilyTreeTitle("doe")).toBe("Doe Family Tree");
    expect(formatFamilyTreeTitle("doe family")).toBe("Doe Family Tree");
    expect(formatFamilyTreeTitle(null, "brar")).toBe("Brar Family Tree");
  });

  it("sums lived years for deceased and living members while excluding incomplete data", () => {
    const summary = calculateAggregateYearsLived(
      [
        makeProfile({
          id: "profile-1",
          first_name: "anna",
          last_name: "doe",
          date_of_birth: "1900-01-01",
          date_of_death: "1990-01-01",
          is_alive: false,
        }),
        makeProfile({
          id: "profile-2",
          first_name: "ben",
          last_name: "doe",
          date_of_birth: "1980-01-01",
          is_alive: true,
        }),
        makeProfile({
          id: "profile-3",
          first_name: "cara",
          last_name: "doe",
          date_of_birth: null,
          is_alive: true,
        }),
        makeProfile({
          id: "profile-4",
          first_name: "dave",
          last_name: "doe",
          date_of_birth: "1940-01-01",
          is_alive: false,
          date_of_death: null,
        }),
      ],
      2026
    );

    expect(summary.totalYears).toBe(136);
    expect(summary.excludedCount).toBe(2);
  });
});
