/**
 * Relation labels in different languages.
 */

import type { Gender } from "./types";

export type RelationLanguageCode = "en" | "punjabi" | "es" | "fr";

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

const SPANISH_LABELS: Record<string, string> = {
  Mother: "Madre",
  Father: "Padre",
  Parent: "Madre/Padre",
  Daughter: "Hija",
  Son: "Hijo",
  Child: "Hija/Hijo",
  Sister: "Hermana",
  Brother: "Hermano",
  Sibling: "Hermana/Hermano",
  Wife: "Esposa",
  Husband: "Esposo",
  Spouse: "Esposa/Esposo",
  Grandmother: "Abuela",
  Grandfather: "Abuelo",
  Grandparent: "Abuela/Abuelo",
  "Maternal Grandmother": "Abuela materna",
  "Maternal Grandfather": "Abuelo materno",
  "Maternal Grandparent": "Abuela/Abuelo materno",
  "Paternal Grandmother": "Abuela paterna",
  "Paternal Grandfather": "Abuelo paterno",
  "Paternal Grandparent": "Abuela/Abuelo paterno",
  Granddaughter: "Nieta",
  Grandson: "Nieto",
  Grandchild: "Nieta/Nieto",
  Aunt: "Tia",
  Uncle: "Tio",
  "Aunt/Uncle": "Tia/Tio",
  "Maternal Aunt": "Tia materna",
  "Maternal Uncle": "Tio materno",
  "Paternal Aunt": "Tia paterna",
  "Paternal Uncle": "Tio paterno",
  "Paternal Uncle (elder)": "Tio paterno mayor",
  "Paternal Uncle (younger)": "Tio paterno menor",
  "Great Aunt": "Tia abuela",
  "Great Uncle": "Tio abuelo",
  "Great Aunt/Uncle": "Tia/Tio abuelo",
  "Half-Aunt": "Media tia",
  "Half-Uncle": "Medio tio",
  "Half-Aunt/Uncle": "Media tia/Medio tio",
  Niece: "Sobrina",
  Nephew: "Sobrino",
  "Niece/Nephew": "Sobrina/Sobrino",
  "Half-Sibling": "Medio hermano",
  "First Cousin": "Primo/a",
  "First Cousin Once Removed": "Primo/a segundo/a",
  "Aunt's/Uncle's Spouse": "Conyuge de tia/tio",
  "Maternal Aunt's Spouse": "Conyuge de tia materna",
  "Maternal Uncle's Spouse": "Conyuge de tio materno",
  "Paternal Aunt's Spouse": "Conyuge de tia paterna",
  "Paternal Uncle's Spouse": "Conyuge de tio paterno",
  "Great-Grandparent": "Bisabuela/Bisabuelo",
  "Great-Grandchild": "Bisnieta/Bisnieto",
  "Not Related": "Sin parentesco",
};

const FRENCH_LABELS: Record<string, string> = {
  Mother: "Mere",
  Father: "Pere",
  Parent: "Mere/Pere",
  Daughter: "Fille",
  Son: "Fils",
  Child: "Enfant",
  Sister: "Soeur",
  Brother: "Frere",
  Sibling: "Soeur/Frere",
  Wife: "Epouse",
  Husband: "Epoux",
  Spouse: "Conjoint",
  Grandmother: "Grand-mere",
  Grandfather: "Grand-pere",
  Grandparent: "Grand-parent",
  "Maternal Grandmother": "Grand-mere maternelle",
  "Maternal Grandfather": "Grand-pere maternel",
  "Maternal Grandparent": "Grand-parent maternel",
  "Paternal Grandmother": "Grand-mere paternelle",
  "Paternal Grandfather": "Grand-pere paternel",
  "Paternal Grandparent": "Grand-parent paternel",
  Granddaughter: "Petite-fille",
  Grandson: "Petit-fils",
  Grandchild: "Petit-enfant",
  Aunt: "Tante",
  Uncle: "Oncle",
  "Aunt/Uncle": "Tante/Oncle",
  "Maternal Aunt": "Tante maternelle",
  "Maternal Uncle": "Oncle maternel",
  "Paternal Aunt": "Tante paternelle",
  "Paternal Uncle": "Oncle paternel",
  "Paternal Uncle (elder)": "Oncle paternel aine",
  "Paternal Uncle (younger)": "Oncle paternel cadet",
  "Great Aunt": "Grand-tante",
  "Great Uncle": "Grand-oncle",
  "Great Aunt/Uncle": "Grand-tante/Grand-oncle",
  "Half-Aunt": "Demi-tante",
  "Half-Uncle": "Demi-oncle",
  "Half-Aunt/Uncle": "Demi-tante/Demi-oncle",
  Niece: "Niece",
  Nephew: "Neveu",
  "Niece/Nephew": "Niece/Neveu",
  "Half-Sibling": "Demi-frere/soeur",
  "First Cousin": "Cousin(e)",
  "First Cousin Once Removed": "Cousin(e) issu(e) de germain",
  "Aunt's/Uncle's Spouse": "Conjoint de tante/oncle",
  "Maternal Aunt's Spouse": "Conjoint de tante maternelle",
  "Maternal Uncle's Spouse": "Conjoint d'oncle maternel",
  "Paternal Aunt's Spouse": "Conjoint de tante paternelle",
  "Paternal Uncle's Spouse": "Conjoint d'oncle paternel",
  "Great-Grandparent": "Arriere-grand-parent",
  "Great-Grandchild": "Arriere-petit-enfant",
  "Not Related": "Sans lien de parente",
};

/** Strip "Maternal " / "Paternal " prefix for shorter English labels. */
function simplifyEnglishLabel(label: string): string {
  return label.replace(/^Maternal /, "").replace(/^Paternal /, "");
}

/**
 * Return the display label for a relation. English keeps short maternal/paternal labels;
 * translated languages preserve specificity where a translated term is available.
 */
export function getRelationDisplayLabel(
  englishLabel: string,
  gender: Gender | null | undefined,
  relationLanguage: RelationLanguageCode | string | undefined
): string {
  if (relationLanguage === "punjabi") {
    if (gender) return PUNJABI_LABELS[englishLabel] ?? englishLabel;
    return englishLabel;
  }
  if (relationLanguage === "es") {
    return SPANISH_LABELS[englishLabel] ?? simplifyEnglishLabel(englishLabel);
  }
  if (relationLanguage === "fr") {
    return FRENCH_LABELS[englishLabel] ?? simplifyEnglishLabel(englishLabel);
  }
  return simplifyEnglishLabel(englishLabel);
}
