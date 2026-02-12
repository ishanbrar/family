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
  if (updates.avatar_url !== undefined) dbUpdates.avatar_url = updates.avatar_url;
  if (updates.date_of_birth !== undefined) dbUpdates.date_of_birth = updates.date_of_birth;
  if (updates.place_of_birth !== undefined) dbUpdates.place_of_birth = updates.place_of_birth;
  if (updates.profession !== undefined) dbUpdates.profession = updates.profession;
  if (updates.location_city !== undefined) dbUpdates.location_city = updates.location_city;
  if (updates.location_lat !== undefined) dbUpdates.location_lat = updates.location_lat;
  if (updates.location_lng !== undefined) dbUpdates.location_lng = updates.location_lng;
  if (updates.social_links !== undefined) dbUpdates.social_links = updates.social_links;
  if (updates.about_me !== undefined) dbUpdates.about_me = updates.about_me;
  if (updates.country_code !== undefined) dbUpdates.country_code = updates.country_code;
  if (updates.is_alive !== undefined) dbUpdates.is_alive = updates.is_alive;

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

  if (error || !data) return null;
  return mapRelationship(data);
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
): Promise<{ id: string; name: string; invite_code: string } | null> {
  const { data, error } = await supabase
    .from("families")
    .select("*")
    .eq("id", familyId)
    .single();

  if (error || !data) return null;
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
      avatar_url: profile.avatar_url,
      date_of_birth: profile.date_of_birth,
      place_of_birth: profile.place_of_birth,
      profession: profile.profession,
      location_city: profile.location_city,
      location_lat: profile.location_lat,
      location_lng: profile.location_lng,
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

// ── Mappers (DB row → TypeScript type) ──────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapProfile(row: any): Profile {
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    avatar_url: row.avatar_url,
    date_of_birth: row.date_of_birth,
    place_of_birth: row.place_of_birth,
    profession: row.profession,
    location_city: row.location_city,
    location_lat: row.location_lat,
    location_lng: row.location_lng,
    social_links: row.social_links || {},
    about_me: row.about_me || null,
    country_code: row.country_code || null,
    role: row.role || "MEMBER",
    is_alive: row.is_alive ?? true,
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
