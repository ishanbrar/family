/**
 * Relation labels in different languages.
 * When relation language is Punjabi and gender is known, show Punjabi terms (with ji for elders).
 * When gender is unknown, keep English (per product requirement).
 */

import type { Gender } from "./types";

export type RelationLanguageCode = "en" | "punjabi";

/** English label (after applyGenderToRelationshipLabel) -> Punjabi (English script, with ji). */
const PUNJABI_LABELS: Record<string, string> = {
  // Grandparents: maternal = Nana/Nani, paternal = Dada/Dadi
  Grandmother: "Nani ji",
  Grandfather: "Dada ji",
  "Maternal Grandmother": "Nani ji",
  "Maternal Grandfather": "Nana ji",
  "Paternal Grandmother": "Dadi ji",
  "Paternal Grandfather": "Dada ji",
  // Aunts / uncles
  "Maternal Aunt": "Masi ji",
  "Paternal Aunt": "Bua ji",
  "Maternal Uncle": "Mamaji",
  "Paternal Uncle": "Chacha ji / Tayaji",
  "Paternal Uncle (elder)": "Tayaji",
  "Paternal Uncle (younger)": "Chacha ji",
  Aunt: "Masi ji / Bua ji",
  Uncle: "Mamaji / Chacha ji",
  "Great Aunt": "Masi ji / Bua ji",
  "Great Uncle": "Mamaji / Chacha ji",
  "Half-Aunt": "Masi ji / Bua ji",
  "Half-Uncle": "Mamaji / Chacha ji",
  // Aunt/uncle's spouse (in-law) specific terms
  "Maternal Aunt's Spouse": "Masar ji",
  "Maternal Uncle's Spouse": "Mami ji",
  "Paternal Aunt's Spouse": "Phupha ji",
  "Paternal Uncle's Spouse": "Chachi ji",
};

/** Strip "Maternal " / "Paternal " prefix for shorter English labels. */
function simplifyEnglishLabel(label: string): string {
  return label.replace(/^Maternal /, "").replace(/^Paternal /, "");
}

/**
 * Return the display label for a relation. When language is Punjabi and gender is known,
 * returns Punjabi term (for supported types only). For English, returns the label without
 * "Maternal"/"Paternal" prefix to keep wording short.
 */
export function getRelationDisplayLabel(
  englishLabel: string,
  gender: Gender | null | undefined,
  relationLanguage: RelationLanguageCode | string | undefined
): string {
  if (relationLanguage === "punjabi") {
    if (gender != null && gender !== "") return PUNJABI_LABELS[englishLabel] ?? englishLabel;
    return englishLabel;
  }
  return simplifyEnglishLabel(englishLabel);
}
