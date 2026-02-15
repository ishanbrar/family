// ══════════════════════════════════════════════════════════
// Supabase Database Access Layer
// All DB read/write operations for profiles, relationships,
// conditions, and families.
// ══════════════════════════════════════════════════════════

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  Profile,
  Relationship,
  MedicalCondition,
  UserCondition,
  RelationshipType,
} from "@/lib/types";

export interface FamilyRecord {
  id: string;
  name: string;
  invite_code: string;
}

export interface InviteCodeRecord {
  id: string;
  family_id: string;
  code: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

export interface JoinPreviewMember {
  id: string;
  first_name: string;
  last_name: string;
  gender: Profile["gender"];
  avatar_url: string | null;
  created_at: string;
  is_claimable: boolean;
}

export interface JoinPreviewRelationship {
  id: string;
  user_id: string;
  relative_id: string;
  type: RelationshipType;
  created_at: string;
}

export interface JoinFamilyPreview {
  family_id: string;
  family_name: string;
  members: JoinPreviewMember[];
  relationships: JoinPreviewRelationship[];
}

function familyInviteCodeBase(name: string): string {
  const tokens = name
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Z]/g, ""))
    .filter(Boolean);

  let raw = "";
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i] !== "FAMILY") {
      raw = tokens[i];
      break;
    }
  }

  if (!raw) raw = tokens[tokens.length - 1] || "";
  if (!raw || raw.length < 2) raw = "FAMILY";
  return raw.slice(0, 24);
}

// ── Profiles ────────────────────────────────────

export async function getProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error || !data) return null;
  return mapProfile(data);
}

export async function getFamilyProfiles(
  supabase: SupabaseClient,
  familyId: string
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("family_id", familyId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map(mapProfile);
}

export async function updateProfile(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Profile>
): Promise<Profile | null> {
  // Map our Profile type fields to DB column names
  const dbUpdates: Record<string, unknown> = {};
  if (updates.first_name !== undefined) dbUpdates.first_name = updates.first_name;
  if (updates.last_name !== undefined) dbUpdates.last_name = updates.last_name;
  if (updates.display_name !== undefined) dbUpdates.display_name = updates.display_name;
  if (updates.gender !== undefined) dbUpdates.gender = updates.gender;
  if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
  if (updates.date_of_birth !== undefined) dbUpdates.date_of_birth = updates.date_of_birth;
  if (updates.place_of_birth !== undefined) dbUpdates.place_of_birth = updates.place_of_birth;
  if (updates.profession !== undefined) dbUpdates.profession = updates.profession;
  if (updates.location_city !== undefined) dbUpdates.location_city = updates.location_city;
  if (updates.location_lat !== undefined) dbUpdates.location_lat = updates.location_lat;
  if (updates.location_lng !== undefined) dbUpdates.location_lng = updates.location_lng;
  if (updates.pets !== undefined) dbUpdates.pets = updates.pets;
  if (updates.social_links !== undefined) dbUpdates.social_links = updates.social_links;
  if (updates.about_me !== undefined) dbUpdates.about_me = updates.about_me;
  if (updates.country_code !== undefined) dbUpdates.country_code = updates.country_code;
  if (updates.is_alive !== undefined) dbUpdates.is_alive = updates.is_alive;
  if (updates.onboarding_completed !== undefined) {
    dbUpdates.onboarding_completed = updates.onboarding_completed;
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(dbUpdates)
    .eq("id", userId)
    .select("*")
    .single();

  if (error || !data) return null;
  return mapProfile(data);
}

// ── Relationships ───────────────────────────────

export async function getFamilyRelationships(
  supabase: SupabaseClient,
  familyId: string
): Promise<Relationship[]> {
  // Get all profiles in the family, then get their relationships
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id")
    .eq("family_id", familyId);

  if (!profiles || profiles.length === 0) return [];

  const ids = profiles.map((p) => p.id);

  const { data, error } = await supabase
    .from("relationships")
    .select("*")
    .or(`user_id.in.(${ids.join(",")}),relative_id.in.(${ids.join(",")})`);

  if (error || !data) return [];
  return data.map(mapRelationship);
}

export async function addRelationship(
  supabase: SupabaseClient,
  userId: string,
  relativeId: string,
  type: RelationshipType
): Promise<Relationship | null> {
  const { data, error } = await supabase
    .from("relationships")
    .insert({ user_id: userId, relative_id: relativeId, type })
    .select("*")
    .single();

  if (error?.code === "23505") {
    const { data: existing } = await supabase
      .from("relationships")
      .select("*")
      .eq("user_id", userId)
      .eq("relative_id", relativeId)
      .eq("type", type)
      .maybeSingle();
    if (existing) return mapRelationship(existing);
  }

  if (error || !data) return null;
  return mapRelationship(data);
}

export async function deleteRelationship(
  supabase: SupabaseClient,
  relationshipId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("relationships")
    .delete()
    .eq("id", relationshipId);

  return !error;
}

// ── Conditions ──────────────────────────────────

export async function getAllConditions(
  supabase: SupabaseClient
): Promise<MedicalCondition[]> {
  const { data, error } = await supabase
    .from("medical_conditions")
    .select("*")
    .order("name");

  if (error || !data) return [];
  return data.map(mapCondition);
}

export async function getUserConditions(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<UserCondition[]> {
  if (userIds.length === 0) return [];

  const { data, error } = await supabase
    .from("user_conditions")
    .select("*, medical_conditions(*)")
    .in("user_id", userIds);

  if (error || !data) return [];
  return data.map(mapUserCondition);
}

export async function addUserCondition(
  supabase: SupabaseClient,
  userId: string,
  conditionId: string,
  severity: "mild" | "moderate" | "severe" = "mild"
): Promise<UserCondition | null> {
  const { data, error } = await supabase
    .from("user_conditions")
    .insert({
      user_id: userId,
      condition_id: conditionId,
      severity,
      diagnosed_at: new Date().toISOString().split("T")[0],
    })
    .select("*, medical_conditions(*)")
    .single();

  if (error || !data) return null;
  return mapUserCondition(data);
}

// ── Families ────────────────────────────────────

export async function getFamily(
  supabase: SupabaseClient,
  familyId: string
): Promise<FamilyRecord | null> {
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();

  if (error || !data) return null;
  return data;
}

export async function updateFamilyName(
  supabase: SupabaseClient,
  familyId: string,
  nextName: string
): Promise<FamilyRecord | null> {
  const normalized = nextName.trim();
  if (!normalized) return null;

  const { data, error } = await supabase
    .from("families")
    .update({ name: normalized })
    .eq("id", familyId)
    .select("*")
    .single();

  if (error || !data) return null;
  return data;
}

export async function regenerateFamilyInviteCode(
  supabase: SupabaseClient,
  familyId: string
): Promise<FamilyRecord | null> {
  const created = await createFamilyInviteCode(supabase, familyId);
  if (!created) return null;
  return getFamily(supabase, familyId);
}

export async function getFamilyInviteCodes(
  supabase: SupabaseClient,
  familyId: string
): Promise<InviteCodeRecord[]> {
  const { data, error } = await supabase
    .from("family_invite_codes")
    .select("id,family_id,code,label,is_active,created_at")
    .eq("family_id", familyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data.map(mapInviteCode);
}

export async function createFamilyInviteCode(
  supabase: SupabaseClient,
  familyId: string,
  customCode?: string,
  label?: string
): Promise<InviteCodeRecord | null> {
  let codeToInsert = customCode?.trim().toUpperCase() || "";
  const formatOk = /^[A-Z]{2,24}\d{1,4}$/;
  const { data: family, error: famErr } = await supabase
    .from("families")
    .select("name")
    .eq("id", familyId)
    .single();
  if (famErr || !family?.name) return null;
  const expectedPrefix = familyInviteCodeBase(family.name);

  if (!codeToInsert) {
    const { data: generated, error: genErr } = await supabase.rpc("generate_family_invite_code", {
      p_family_name: family.name,
    });
    if (genErr || typeof generated !== "string") return null;
    codeToInsert = generated.toUpperCase();
  }

  if (!formatOk.test(codeToInsert) || !codeToInsert.startsWith(expectedPrefix)) return null;

  const { data, error } = await supabase
    .from("family_invite_codes")
    .insert({
      family_id: familyId,
      code: codeToInsert,
      label: label?.trim() || null,
      is_active: true,
    })
    .select("id,family_id,code,label,is_active,created_at")
    .single();

  if (error || !data) return null;
  return mapInviteCode(data);
}

export async function updateFamilyInviteCode(
  supabase: SupabaseClient,
  inviteCodeId: string,
  nextCode: string,
  label?: string
): Promise<InviteCodeRecord | null> {
  const normalized = nextCode.trim().toUpperCase();
  const formatOk = /^[A-Z]{2,24}\d{1,4}$/;
  const { data: current } = await supabase
    .from("family_invite_codes")
    .select("family_id")
    .eq("id", inviteCodeId)
    .single();
  if (!current?.family_id) return null;
  const { data: family } = await supabase
    .from("families")
    .select("name")
    .eq("id", current.family_id)
    .single();
  if (!family?.name) return null;
  const expectedPrefix = familyInviteCodeBase(family.name);
  if (!formatOk.test(normalized) || !normalized.startsWith(expectedPrefix)) return null;

  const updates: { code: string; label?: string | null } = { code: normalized };
  if (label !== undefined) updates.label = label.trim() || null;

  const { data, error } = await supabase
    .from("family_invite_codes")
    .update(updates)
    .eq("id", inviteCodeId)
    .select("id,family_id,code,label,is_active,created_at")
    .single();

  if (error || !data) return null;
  return mapInviteCode(data);
}

export async function deleteFamilyInviteCode(
  supabase: SupabaseClient,
  inviteCodeId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("family_invite_codes")
    .delete()
    .eq("id", inviteCodeId);
  return !error;
}

export async function resolveFamilyByInviteCode(
  supabase: SupabaseClient,
  inviteCode: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("lookup_family_by_invite_code", {
    p_invite_code: inviteCode.trim(),
  });
  if (error || typeof data !== "string" || !data) return null;
  return data;
}

export async function getJoinFamilyPreview(
  supabase: SupabaseClient,
  inviteCode: string
): Promise<JoinFamilyPreview | null> {
  const { data, error } = await supabase.rpc("get_join_family_preview", {
    p_invite_code: inviteCode.trim(),
  });
  if (error || !data || typeof data !== "object") return null;

  const payload = data as {
    family_id?: string;
    family_name?: string;
    members?: JoinPreviewMember[];
    relationships?: JoinPreviewRelationship[];
  };

  if (!payload.family_id || !payload.family_name) return null;
  return {
    family_id: payload.family_id,
    family_name: payload.family_name,
    members: Array.isArray(payload.members) ? payload.members : [],
    relationships: Array.isArray(payload.relationships) ? payload.relationships : [],
  };
}

export async function joinFamilyAsNewNode(
  supabase: SupabaseClient,
  inviteCode: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("join_family_as_new_node", {
    p_invite_code: inviteCode.trim(),
  });
  if (error || typeof data !== "string" || !data) return null;
  return data;
}

export async function claimFamilyMemberNode(
  supabase: SupabaseClient,
  inviteCode: string,
  targetProfileId: string
): Promise<string | null> {
  const { data, error } = await supabase.rpc("claim_family_member_node", {
    p_invite_code: inviteCode.trim(),
    p_target_profile_id: targetProfileId,
  });
  if (error || typeof data !== "string" || !data) return null;
  return data;
}

// ── Add a non-auth member (family member without account) ──

export async function addFamilyMember(
  supabase: SupabaseClient,
  profile: Omit<Profile, "id" | "created_at" | "updated_at"> & { family_id: string }
): Promise<Profile | null> {
  // For non-auth members, we generate a UUID on the server
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      first_name: profile.first_name,
      last_name: profile.last_name,
      display_name: profile.display_name,
      gender: profile.gender,
      avatar_url: profile.avatar_url,
      date_of_birth: profile.date_of_birth,
      place_of_birth: profile.place_of_birth,
      profession: profile.profession,
      location_city: profile.location_city,
      location_lat: profile.location_lat,
      location_lng: profile.location_lng,
      pets: profile.pets || [],
      social_links: profile.social_links || {},
      about_me: profile.about_me,
      country_code: profile.country_code,
      role: profile.role || "MEMBER",
      is_alive: profile.is_alive ?? true,
      family_id: profile.family_id,
    })
    .select("*")
    .single();

  if (error || !data) {
    console.error("Add family member error:", error);
    return null;
  }
  return mapProfile(data);
}

export async function deleteFamilyMember(
  supabase: SupabaseClient,
  memberId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("profiles")
    .delete()
    .eq("id", memberId);

  return !error;
}

// ── Mappers (DB row → TypeScript type) ──────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): Profile {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    display_name: row.display_name || null,
    gender: row.gender || null,
    avatar_url: row.avatar_url,
    date_of_birth: row.date_of_birth,
    place_of_birth: row.place_of_birth,
    profession: row.profession,
    location_city: row.location_city,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    pets: Array.isArray(row.pets) ? row.pets : [],
    social_links: row.social_links || {},
    about_me: row.about_me || null,
    country_code: row.country_code || null,
    role: row.role || "MEMBER",
    is_alive: row.is_alive ?? true,
    onboarding_completed: row.onboarding_completed ?? false,
    family_id: row.family_id || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapRelationship(row: any): Relationship {
  return {
    id: row.id,
    user_id: row.user_id,
    relative_id: row.relative_id,
    type: row.type,
    created_at: row.created_at,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapCondition(row: any): MedicalCondition {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    description: row.description,
    icd_code: row.icd_code,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapUserCondition(row: any): UserCondition {
  return {
    id: row.id,
    user_id: row.user_id,
    condition_id: row.condition_id,
    severity: row.severity,
    age_of_onset: row.age_of_onset,
    notes: row.notes,
    diagnosed_at: row.diagnosed_at,
    created_at: row.created_at,
    condition: row.medical_conditions ? mapCondition(row.medical_conditions) : undefined,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapInviteCode(row: any): InviteCodeRecord {
  return {
    id: row.id,
    family_id: row.family_id,
    code: row.code,
    label: row.label || null,
    is_active: row.is_active ?? true,
    created_at: row.created_at,
  };
}
