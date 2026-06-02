import type { RelationLanguageCode } from "@/lib/supabase/db";

export const RELATION_LANGUAGE_OPTIONS: { value: RelationLanguageCode; label: string }[] = [
  { value: "en", label: "English" },
  { value: "punjabi", label: "Punjabi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
];

export function normalizeRelationLanguage(value: string | null | undefined): RelationLanguageCode {
  return RELATION_LANGUAGE_OPTIONS.some((option) => option.value === value)
    ? (value as RelationLanguageCode)
    : "en";
}
