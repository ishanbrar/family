// ──────────────────────────────────────────────
// Legacy – Core Type Definitions
// ──────────────────────────────────────────────

export type Role = "ADMIN" | "MEMBER";

export type RelationshipType =
  | "parent"
  | "child"
  | "sibling"
  | "spouse"
  | "half_sibling"
  | "grandparent"
  | "grandchild"
  | "aunt_uncle"
  | "niece_nephew"
  | "cousin";

export type ConditionSeverity = "mild" | "moderate" | "severe";

export interface Profile {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  profession: string | null;
  location_city: string | null;
  location_lat: number | null;
  location_lng: number | null;
  social_links: SocialLinks;
  about_me: string | null;
  country_code: string | null;
  role: Role;
  is_alive: boolean;
  family_id?: string | null;
  created_at: string;
  updated_at: string;
}

export interface SocialLinks {
  instagram?: string;
  linkedin?: string;
  facebook?: string;
  phone_number?: string;
}

export interface Relationship {
  id: string;
  user_id: string;
  relative_id: string;
  type: RelationshipType;
  created_at: string;
}

export interface MedicalCondition {
  id: string;
  name: string;
  type: "hereditary" | "chronic" | "autoimmune" | "mental_health" | "other";
  description: string;
  icd_code?: string;
}

export interface UserCondition {
  id: string;
  user_id: string;
  condition_id: string;
  severity: ConditionSeverity;
  age_of_onset: number | null;
  notes: string | null;
  diagnosed_at: string | null;
  created_at: string;
  condition?: MedicalCondition;
}

export interface FamilyTreeNode {
  profile: Profile;
  relationships: Relationship[];
  conditions: UserCondition[];
  geneticMatch?: number;
  children?: FamilyTreeNode[];
}

export interface GeneticMatchResult {
  percentage: number;
  relationship: string;
  path: string[];
}
