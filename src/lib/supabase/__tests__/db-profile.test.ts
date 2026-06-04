import { describe, expect, it } from "vitest";

import { addFamilyMember, getProfile, updateProfile } from "../db";

function profileRow(overrides: Record<string, unknown>) {
  const now = "2026-05-11T00:00:00.000Z";
  return {
    id: "profile-id",
    auth_user_id: null,
    first_name: "Test",
    last_name: "User",
    display_name: null,
    gender: "male",
    avatar_url: null,
    date_of_birth: null,
    date_of_death: null,
    place_of_birth: null,
    profession: null,
    location_city: null,
    location_lat: null,
    location_lng: null,
    pets: [],
    social_links: {},
    about_me: null,
    country_code: null,
    gallery_photos: [],
    role: "MEMBER",
    is_alive: true,
    onboarding_completed: false,
    family_id: "family-id",
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

function fakeSupabaseForProfileLookups(results: Array<{ data: unknown; error: unknown }>) {
  const calls: Array<{ table: string; column: string; value: string }> = [];

  return {
    calls,
    client: {
      from(table: string) {
        const query = {
          select: () => query,
          eq: (column: string, value: string) => {
            calls.push({ table, column, value });
            return query;
          },
          order: () => query,
          limit: () => query,
          maybeSingle: async () => results.shift() ?? { data: null, error: null },
        };
        return query;
      },
    },
  };
}

function fakeSupabaseForProfileUpdate(results: Array<{ data: unknown; error: unknown }>) {
  const updates: Record<string, unknown>[] = [];

  return {
    updates,
    client: {
      from(table: string) {
        expect(table).toBe("profiles");
        const query = {
          update: (payload: Record<string, unknown>) => {
            updates.push({ ...payload });
            return query;
          },
          eq: () => query,
          select: () => query,
          single: async () => results.shift() ?? { data: null, error: null },
        };
        return query;
      },
    },
  };
}

describe("getProfile", () => {
  it("loads a claimed family node by auth_user_id before falling back to profile id", async () => {
    const { calls, client } = fakeSupabaseForProfileLookups([
      {
        data: profileRow({
          id: "claimed-node-id",
          auth_user_id: "auth-user-id",
          first_name: "Claimed",
          last_name: "Node",
        }),
        error: null,
      },
    ]);

    const profile = await getProfile(client as never, "auth-user-id");

    expect(profile?.id).toBe("claimed-node-id");
    expect(profile?.auth_user_id).toBe("auth-user-id");
    expect(calls).toEqual([
      { table: "profiles", column: "auth_user_id", value: "auth-user-id" },
    ]);
  });

  it("falls back to profile id for direct-id profiles", async () => {
    const { calls, client } = fakeSupabaseForProfileLookups([
      { data: null, error: null },
      {
        data: profileRow({
          id: "auth-user-id",
          auth_user_id: null,
          first_name: "Direct",
          last_name: "Profile",
        }),
        error: null,
      },
    ]);

    const profile = await getProfile(client as never, "auth-user-id");

    expect(profile?.id).toBe("auth-user-id");
    expect(profile?.first_name).toBe("Direct");
    expect(calls).toEqual([
      { table: "profiles", column: "auth_user_id", value: "auth-user-id" },
      { table: "profiles", column: "id", value: "auth-user-id" },
    ]);
  });
});

function fakeSupabaseForProfileInsert(results: Array<{ data: unknown; error: unknown }>) {
  const inserts: Record<string, unknown>[] = [];

  return {
    inserts,
    client: {
      from(table: string) {
        expect(table).toBe("profiles");
        const query = {
          insert: (payload: Record<string, unknown>) => {
            inserts.push({ ...payload });
            return query;
          },
          select: () => query,
          single: async () => results.shift() ?? { data: null, error: null },
        };
        return query;
      },
    },
  };
}

describe("addFamilyMember", () => {
  it("retries without optional profile columns missing from Supabase schema cache", async () => {
    const { inserts, client } = fakeSupabaseForProfileInsert([
      {
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the 'middle_name' column of 'profiles' in the schema cache",
        },
      },
      {
        data: profileRow({
          id: "new-member-id",
          first_name: "Test",
          last_name: "Member",
          family_id: "family-id",
        }),
        error: null,
      },
    ]);

    const profile = await addFamilyMember(client as never, {
      name_prefix: null,
      first_name: "Test",
      middle_name: "Optional",
      last_name: "Member",
      family_id: "family-id",
      gender: "male",
      role: "MEMBER",
    });

    expect(profile?.first_name).toBe("Test");
    expect(inserts).toHaveLength(2);
    expect(inserts[0]).toMatchObject({
      first_name: "Test",
      middle_name: "Optional",
      last_name: "Member",
    });
    expect(inserts[1]).not.toHaveProperty("middle_name");
  });
});

describe("updateProfile", () => {
  it("retries without optional profile columns missing from Supabase schema cache", async () => {
    const { updates, client } = fakeSupabaseForProfileUpdate([
      {
        data: null,
        error: {
          code: "PGRST204",
          message: "Could not find the 'middle_name' column of 'profiles' in the schema cache",
        },
      },
      {
        data: profileRow({
          id: "profile-id",
          first_name: "Test",
          middle_name: undefined,
          display_name: "Tester",
        }),
        error: null,
      },
    ]);

    const profile = await updateProfile(client as never, "profile-id", {
      middle_name: "Optional",
      display_name: "Tester",
    });

    expect(profile?.display_name).toBe("Tester");
    expect(updates).toHaveLength(2);
    expect(updates[0]).toMatchObject({
      middle_name: "Optional",
      display_name: "Tester",
    });
    expect(updates[1]).toEqual({ display_name: "Tester" });
  });
});
