import { describe, expect, it } from "vitest";

import { buildFamilyMilestones } from "../family-milestones";
import type { Profile, Relationship } from "../types";

function makeProfile(overrides: Partial<Profile>): Profile {
  return {
    id: overrides.id || "profile-1",
    name_prefix: overrides.name_prefix || null,
    first_name: overrides.first_name || "John",
    middle_name: overrides.middle_name || null,
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
    map_location_source: overrides.map_location_source || undefined,
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

describe("buildFamilyMilestones", () => {
  const today = new Date(2026, 4, 27);

  it("places today's birthday in the today bucket and triggers alert", () => {
    const result = buildFamilyMilestones(
      [
        makeProfile({
          id: "1",
          first_name: "Sean",
          date_of_birth: "1990-05-27",
        }),
      ],
      [],
      { today }
    );

    expect(result.hasTodayAlert).toBe(true);
    expect(result.today).toHaveLength(1);
    expect(result.today[0]?.kind).toBe("birthday");
    expect(result.today[0]?.title).toBe("Sean Doe");
  });

  it("dedupes spouse anniversaries and groups upcoming milestones", () => {
    const result = buildFamilyMilestones(
      [
        makeProfile({ id: "a", first_name: "Amy" }),
        makeProfile({ id: "b", first_name: "Ben" }),
      ],
      [
        {
          id: "r1",
          user_id: "a",
          relative_id: "b",
          type: "spouse",
          marriage_date: "2010-06-10",
          created_at: "2026-01-01T00:00:00.000Z",
        },
        {
          id: "r2",
          user_id: "b",
          relative_id: "a",
          type: "spouse",
          marriage_date: "2010-06-10",
          created_at: "2026-01-01T00:00:00.000Z",
        },
      ] satisfies Relationship[],
      { today }
    );

    expect(result.upcoming.filter((item) => item.kind === "anniversary")).toHaveLength(1);
    expect(result.upcoming[0]?.daysFromToday).toBe(14);
  });

  it("includes memorial dates in recently passed", () => {
    const result = buildFamilyMilestones(
      [
        makeProfile({
          id: "1",
          first_name: "Nani",
          date_of_death: "2021-05-20",
          is_alive: false,
        }),
      ],
      [],
      { today }
    );

    expect(result.recentlyPassed.some((item) => item.kind === "memorial")).toBe(true);
  });
});
