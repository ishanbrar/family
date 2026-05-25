import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  addFamilyMember,
  addRelationship,
  createFamilyInviteCode,
  deleteRelationship,
  getFamilyInviteCodes,
  getFamilyProfiles,
  getFamilyRelationships,
  getJoinFamilyPreview,
  getProfile,
  joinFamilyAsNewNode,
  resolveFamilyByInviteCode,
  updateRelationship,
} from "../db";
import type { Profile, Relationship } from "../../types";

function loadDotEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const match = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(trimmed);
    if (!match || process.env[match[1]]) continue;
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

loadDotEnvLocal();

const shouldRun =
  process.env.RUN_SUPABASE_E2E === "1" &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const describeSupabase = shouldRun ? describe : describe.skip;

function newClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    }
  );
}

async function signUpClient(email: string): Promise<{ client: SupabaseClient; userId: string }> {
  const client = newClient();
  const { data, error } = await client.auth.signUp({
    email,
    password: "Password123!",
    options: {
      data: {
        first_name: "E2E",
        last_name: "User",
      },
    },
  });

  expect(error).toBeNull();
  expect(data.user?.id).toBeTruthy();
  expect(data.session).toBeTruthy();
  return { client, userId: data.user!.id };
}

describeSupabase("Supabase invite and relationship integration", () => {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  const createdRelationshipIds: string[] = [];
  const createdProfileIds: string[] = [];
  let ownerClient: SupabaseClient;
  let joinerClient: SupabaseClient;
  let familyId = "";
  let ownerId = "";
  let joinerId = "";
  let inviteCode = "";

  beforeAll(async () => {
    const owner = await signUpClient(`legatree-vitest-owner-${stamp}@example.com`);
    ownerClient = owner.client;
    ownerId = owner.userId;
    createdProfileIds.push(ownerId);

    const { data: family, error: familyError } = await ownerClient
      .from("families")
      .insert({
        name: `Vitest Family ${stamp}`,
        created_by: ownerId,
      })
      .select("id")
      .single();

    expect(familyError).toBeNull();
    expect(family?.id).toBeTruthy();
    familyId = family!.id;

    const { error: profileError } = await ownerClient.from("profiles").upsert(
      {
        id: ownerId,
        auth_user_id: ownerId,
        first_name: "Vitest",
        last_name: "Owner",
        gender: "male",
        role: "ADMIN",
        family_id: familyId,
        onboarding_completed: true,
      },
      { onConflict: "id" }
    );

    expect(profileError).toBeNull();

    const existingCodes = await getFamilyInviteCodes(ownerClient, familyId);
    const invite =
      existingCodes[0] ??
      (await createFamilyInviteCode(ownerClient, familyId, undefined, "Vitest primary"));

    expect(invite?.code).toBeTruthy();
    inviteCode = invite!.code;
  }, 30000);

  afterAll(async () => {
    if (!ownerClient) return;

    for (const relationshipId of createdRelationshipIds.reverse()) {
      await deleteRelationship(ownerClient, relationshipId);
    }
    for (const profileId of createdProfileIds.filter((id) => id !== ownerId).reverse()) {
      await ownerClient.from("profiles").delete().eq("id", profileId);
    }
    if (ownerId) {
      await ownerClient.from("profiles").delete().eq("id", ownerId);
    }
    if (familyId) {
      await ownerClient.from("family_invite_codes").delete().eq("family_id", familyId);
      await ownerClient.from("families").delete().eq("id", familyId);
    }
  }, 30000);

  it("resolves valid invite codes and rejects invalid invite codes", async () => {
    const anonClient = newClient();

    await expect(resolveFamilyByInviteCode(anonClient, inviteCode)).resolves.toBe(familyId);
    await expect(resolveFamilyByInviteCode(anonClient, "NOPE0000")).resolves.toBeNull();

    const preview = await getJoinFamilyPreview(anonClient, inviteCode);
    expect(preview?.family_id).toBe(familyId);
    expect(preview?.family_name).toBe(`Vitest Family ${stamp}`);
  });

  it("lets a new authenticated user join by invite without duplicating their profile", async () => {
    const joiner = await signUpClient(`legatree-vitest-joiner-${stamp}@example.com`);
    joinerClient = joiner.client;
    joinerId = joiner.userId;
    createdProfileIds.push(joinerId);

    await expect(joinFamilyAsNewNode(joinerClient, inviteCode)).resolves.toBe(joinerId);
    await expect(joinFamilyAsNewNode(joinerClient, inviteCode)).resolves.toBe(joinerId);

    const profile = await getProfile(joinerClient, joinerId);
    expect(profile?.family_id).toBe(familyId);

    const profiles = await getFamilyProfiles(joinerClient, familyId);
    expect(profiles.filter((member) => member.auth_user_id === joinerId)).toHaveLength(1);
  }, 30000);

  it("creates, updates, and deletes relationship records within the joined family", async () => {
    const spouse = await addFamilyMember(ownerClient, baseMember("Vitest Spouse", "female", familyId));
    const child = await addFamilyMember(ownerClient, baseMember("Vitest Child", "male", familyId));
    expect(spouse?.id).toBeTruthy();
    expect(child?.id).toBeTruthy();
    createdProfileIds.push(spouse!.id, child!.id);

    const spouseRel = await addRelationship(ownerClient, ownerId, spouse!.id, "spouse", "2020-05-26");
    const parentRel = await addRelationship(ownerClient, ownerId, child!.id, "parent");
    expect(spouseRel?.marriage_date).toBe("2020-05-26");
    expect(parentRel?.type).toBe("parent");
    createdRelationshipIds.push(spouseRel!.id, parentRel!.id);

    const duplicateParentRel = await addRelationship(ownerClient, ownerId, child!.id, "parent");
    expect(duplicateParentRel?.id).toBe(parentRel!.id);

    const updated = await updateRelationship(
      ownerClient,
      parentRel!.id,
      child!.id,
      ownerId,
      "child"
    );
    expect(updated?.type).toBe("child");
    expect(updated?.user_id).toBe(child!.id);
    expect(updated?.relative_id).toBe(ownerId);

    const relationships = await getFamilyRelationships(ownerClient, familyId);
    expect(hasRelationship(relationships, ownerId, spouse!.id, "spouse")).toBe(true);
    expect(hasRelationship(relationships, child!.id, ownerId, "child")).toBe(true);

    await expect(deleteRelationship(ownerClient, updated!.id)).resolves.toBe(true);
    createdRelationshipIds.splice(createdRelationshipIds.indexOf(parentRel!.id), 1);

    const afterDelete = await getFamilyRelationships(ownerClient, familyId);
    expect(hasRelationship(afterDelete, child!.id, ownerId, "child")).toBe(false);
  }, 30000);
});

function baseMember(
  name: string,
  gender: Profile["gender"],
  familyId: string
): Omit<Profile, "id" | "created_at" | "updated_at"> & { family_id: string } {
  const [firstName, lastName] = name.split(" ");
  return {
    auth_user_id: null,
    first_name: firstName,
    last_name: lastName,
    display_name: null,
    gender,
    avatar_url: null,
    date_of_birth: null,
    date_of_death: null,
    place_of_birth: null,
    profession: null,
    location_city: null,
    secondary_location_city: null,
    address: null,
    location_lat: null,
    location_lng: null,
    pets: [],
    social_links: {},
    about_me: null,
    country_code: null,
    gallery_photos: [],
    role: "MEMBER",
    is_alive: true,
    onboarding_completed: true,
    family_id: familyId,
  };
}

function hasRelationship(
  relationships: Relationship[],
  userId: string,
  relativeId: string,
  type: Relationship["type"]
): boolean {
  return relationships.some(
    (relationship) =>
      relationship.user_id === userId &&
      relationship.relative_id === relativeId &&
      relationship.type === type
  );
}
