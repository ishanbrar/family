// ══════════════════════════════════════════════════════════
// Legacy – "Blood Match" Genetic Algorithm
// Coefficient of Relationship (r) Calculator
// ══════════════════════════════════════════════════════════
//
// Based on Sewall Wright's coefficient of relationship.
// r = Σ[(1/2)^(L₁+L₂) × (1 + Fₐ)]
//
// Simplified lookup for direct relationships:
// ──────────────────────────────────────────────
// Self / Identical Twin     → 100%  (r = 1.0)
// Parent / Child            → 50%   (r = 0.5)
// Full Sibling              → 50%   (r = 0.5)
// Grandparent / Grandchild  → 25%   (r = 0.25)
// Aunt / Uncle / Half-Sib   → 25%   (r = 0.25)
// First Cousin              → 12.5% (r = 0.125)
// ══════════════════════════════════════════════════════════

import type { Relationship, RelationshipType, GeneticMatchResult, Gender } from "./types";
import { getRelationDisplayLabel, type RelationLanguageCode } from "./relation-labels";

/** Minimal member info for resolving maternal/paternal and elder/younger labels */
export interface MemberForLabel {
  id: string;
  gender?: Gender | null;
  date_of_birth?: string | null;
}

/** Coefficient of relationship for each edge type */
const RELATIONSHIP_COEFFICIENTS: Record<RelationshipType, number> = {
  parent: 0.5,
  child: 0.5,
  sibling: 0.5,
  spouse: 0,
  half_sibling: 0.25,
  grandparent: 0.25,
  grandchild: 0.25,
  aunt_uncle: 0.25,
  maternal_aunt: 0.25,
  paternal_aunt: 0.25,
  maternal_uncle: 0.25,
  paternal_uncle: 0.25,
  niece_nephew: 0.25,
  cousin: 0.125,
};

/** Human-readable labels (from the VIEWER's perspective: "what they are to me") */
const RELATIONSHIP_LABELS: Record<RelationshipType, string> = {
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  spouse: "Spouse",
  half_sibling: "Half-Sibling",
  grandparent: "Grandparent",
  grandchild: "Grandchild",
  aunt_uncle: "Aunt/Uncle",
  maternal_aunt: "Maternal Aunt",
  paternal_aunt: "Paternal Aunt",
  maternal_uncle: "Maternal Uncle",
  paternal_uncle: "Paternal Uncle",
  niece_nephew: "Niece/Nephew",
  cousin: "First Cousin",
};

// ── Graph helpers ────────────────────────────────────────

function buildGraph(
  relationships: Relationship[]
): Map<string, { id: string; type: RelationshipType }[]> {
  const graph = new Map<string, { id: string; type: RelationshipType }[]>();

  for (const rel of relationships) {
    if (!graph.has(rel.user_id)) graph.set(rel.user_id, []);
    graph.get(rel.user_id)!.push({ id: rel.relative_id, type: rel.type });

    if (!graph.has(rel.relative_id)) graph.set(rel.relative_id, []);
    graph.get(rel.relative_id)!.push({
      id: rel.user_id,
      type: invertRelationship(rel.type),
    });
  }

  return graph;
}

/** Invert a directed relationship type (parent ↔ child, etc.) */
function invertRelationship(type: RelationshipType): RelationshipType {
  const inversions: Partial<Record<RelationshipType, RelationshipType>> = {
    parent: "child",
    child: "parent",
    grandparent: "grandchild",
    grandchild: "grandparent",
    aunt_uncle: "niece_nephew",
    maternal_aunt: "niece_nephew",
    paternal_aunt: "niece_nephew",
    maternal_uncle: "niece_nephew",
    paternal_uncle: "niece_nephew",
    niece_nephew: "aunt_uncle",
  };
  return inversions[type] || type;
}

function resolveSpecificDirectAuntUncleLabel(
  viewerId: string,
  targetId: string,
  relationships: Relationship[]
): string | null {
  const directFromTarget = relationships.find(
    (rel) => rel.user_id === targetId && rel.relative_id === viewerId
  );
  const directFromViewer = relationships.find(
    (rel) => rel.user_id === viewerId && rel.relative_id === targetId
  );
  const direct = directFromTarget || directFromViewer;
  if (!direct) return null;

  if (
    direct.type === "maternal_aunt" ||
    direct.type === "paternal_aunt" ||
    direct.type === "maternal_uncle" ||
    direct.type === "paternal_uncle"
  ) {
    return RELATIONSHIP_LABELS[direct.type];
  }
  if (direct.type === "niece_nephew" && direct.user_id === targetId) return "Aunt/Uncle";
  if (direct.type === "aunt_uncle" && direct.relative_id === targetId) return "Aunt/Uncle";

  return null;
}

/** Get viewer's father id (parent who is male) when members are available */
function getViewerFatherId(
  viewerId: string,
  relationships: Relationship[],
  members: MemberForLabel[]
): string | null {
  const parentIds = new Set<string>();
  for (const rel of relationships) {
    if (rel.relative_id === viewerId && rel.type === "parent") parentIds.add(rel.user_id);
    if (rel.user_id === viewerId && rel.type === "child") parentIds.add(rel.relative_id);
  }
  for (const id of parentIds) {
    const m = members.find((x) => x.id === id);
    if (m?.gender === "male") return id;
  }
  return null;
}

function applyGenderToRelationshipLabel(
  label: string,
  gender?: Gender | null
): string {
  if (!gender) return label;

  const map: Record<string, { female: string; male: string }> = {
    Parent: { female: "Mother", male: "Father" },
    Child: { female: "Daughter", male: "Son" },
    Sibling: { female: "Sister", male: "Brother" },
    Spouse: { female: "Wife", male: "Husband" },
    Grandparent: { female: "Grandmother", male: "Grandfather" },
    "Maternal Grandparent": { female: "Maternal Grandmother", male: "Maternal Grandfather" },
    "Paternal Grandparent": { female: "Paternal Grandmother", male: "Paternal Grandfather" },
    Grandchild: { female: "Granddaughter", male: "Grandson" },
    "Aunt/Uncle": { female: "Aunt", male: "Uncle" },
    "Great Aunt/Uncle": { female: "Great Aunt", male: "Great Uncle" },
    "Half-Aunt/Uncle": { female: "Half-Aunt", male: "Half-Uncle" },
    "Niece/Nephew": { female: "Niece", male: "Nephew" },
  };

  return map[label]?.[gender] || label;
}

// ── Core algorithm ──────────────────────────────────────

/**
 * Calculate the genetic match % between two individuals using BFS.
 *
 * Edge types in BFS describe "what the VIEWER is to the neighbour".
 * e.g. when going viewer → parent, the edge type is `child` ("I am their child").
 *
 * To get the LABEL we invert the chain: "they are my parent".
 * To get the COEFFICIENT we multiply the raw edge coefficients.
 */
export function calculateGeneticMatch(
  viewerId: string,
  targetId: string,
  relationships: Relationship[],
  targetGender?: Gender | null,
  relationLanguage?: RelationLanguageCode | string | null,
  members?: MemberForLabel[]
): GeneticMatchResult {
  if (viewerId === targetId) {
    return { percentage: 100, relationship: "Self", path: [viewerId] };
  }

  const graph = buildGraph(relationships);

  const visited = new Set<string>();
  const queue: { id: string; path: string[]; types: RelationshipType[] }[] = [
    { id: viewerId, path: [viewerId], types: [] },
  ];
  visited.add(viewerId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = graph.get(current.id) || [];

    for (const neighbor of neighbors) {
      if (neighbor.id === targetId) {
        const path = [...current.path, targetId];
        const edgeTypes = [...current.types, neighbor.type];

        // ── Coefficient: straight product of edge coefficients ──
        const coefficient = edgeTypes.reduce(
          (acc, t) => acc * RELATIONSHIP_COEFFICIENTS[t],
          1
        );

        // ── Label: invert every edge to get "what they are to me" ──
        const viewerPerspective = edgeTypes.map((t) => invertRelationship(t));

        let label: string;
        if (viewerPerspective.length === 1) {
          label =
            resolveSpecificDirectAuntUncleLabel(viewerId, targetId, relationships) ||
            RELATIONSHIP_LABELS[viewerPerspective[0]];
          // Paternal uncle: elder (Tayaji) vs younger (Chacha ji) from birth dates
          if (label === "Paternal Uncle" && members?.length) {
            const fatherId = getViewerFatherId(viewerId, relationships, members);
            const father = fatherId ? members.find((m) => m.id === fatherId) : null;
            const target = members.find((m) => m.id === targetId);
            if (father?.date_of_birth && target?.date_of_birth) {
              const fBirth = new Date(father.date_of_birth).getTime();
              const tBirth = new Date(target.date_of_birth).getTime();
              if (tBirth < fBirth) label = "Paternal Uncle (elder)";
              else label = "Paternal Uncle (younger)";
            }
          }
        } else {
          label = inferRelationship(viewerPerspective);
          // Grandparent: maternal vs paternal from middle person's gender (path = viewer -> parent -> grandparent)
          if (
            label === "Grandparent" &&
            path.length === 3 &&
            viewerPerspective[0] === "parent" &&
            viewerPerspective[1] === "parent" &&
            members?.length
          ) {
            const parentInPath = members.find((m) => m.id === path[1]);
            if (parentInPath?.gender === "female") label = "Maternal Grandparent";
            else if (parentInPath?.gender === "male") label = "Paternal Grandparent";
          }
          // Aunt/uncle: maternal vs paternal from parent's gender (path = viewer -> parent -> sibling)
          if (
            label === "Aunt/Uncle" &&
            path.length === 3 &&
            viewerPerspective[0] === "parent" &&
            viewerPerspective[1] === "sibling" &&
            members?.length
          ) {
            const parentInPath = members.find((m) => m.id === path[1]);
            const auntOrUncle = members.find((m) => m.id === path[2]);
            const maternal = parentInPath?.gender === "female";
            const aunt = auntOrUncle?.gender === "female";
            if (maternal && aunt) label = "Maternal Aunt";
            else if (maternal && !aunt) label = "Maternal Uncle";
            else if (!maternal && aunt) label = "Paternal Aunt";
            else if (!maternal && !aunt) {
              label = "Paternal Uncle";
              // Elder (Tayaji) vs younger (Chacha ji) when birth dates available
              const fatherId = getViewerFatherId(viewerId, relationships, members);
              const father = fatherId ? members.find((m) => m.id === fatherId) : null;
              if (father?.date_of_birth && auntOrUncle?.date_of_birth) {
                const fBirth = new Date(father.date_of_birth).getTime();
                const uBirth = new Date(auntOrUncle.date_of_birth).getTime();
                if (uBirth < fBirth) label = "Paternal Uncle (elder)";
                else label = "Paternal Uncle (younger)";
              }
            }
          }
          // Aunt/uncle's spouse: maternal/paternal and aunt vs uncle from path (viewer -> parent -> sibling -> spouse)
          if (
            label === "Aunt's/Uncle's Spouse" &&
            path.length === 4 &&
            viewerPerspective[0] === "parent" &&
            viewerPerspective[1] === "sibling" &&
            viewerPerspective[2] === "spouse" &&
            members?.length
          ) {
            const parentInPath = members.find((m) => m.id === path[1]);
            const auntOrUncleInPath = members.find((m) => m.id === path[2]);
            const maternal = parentInPath?.gender === "female";
            const aunt = auntOrUncleInPath?.gender === "female";
            if (maternal && aunt) label = "Maternal Aunt's Spouse";
            else if (maternal && !aunt) label = "Maternal Uncle's Spouse";
            else if (!maternal && aunt) label = "Paternal Aunt's Spouse";
            else if (!maternal && !aunt) label = "Paternal Uncle's Spouse";
          }
        }

        const englishRelationship = applyGenderToRelationshipLabel(label, targetGender);
        const relationship = getRelationDisplayLabel(
          englishRelationship,
          targetGender ?? null,
          relationLanguage ?? "en"
        );
        return {
          percentage: Math.round(coefficient * 100 * 10) / 10,
          relationship,
          path,
        };
      }

      if (!visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        queue.push({
          id: neighbor.id,
          path: [...current.path, neighbor.id],
          types: [...current.types, neighbor.type],
        });
      }
    }
  }

  return { percentage: 0, relationship: "Not Related", path: [] };
}

/**
 * Infer a human-readable label from a chain of VIEWER-PERSPECTIVE types.
 *
 * Example chains (after inversion):
 *   parent→parent        = Grandparent  (I go up two generations)
 *   child→child          = Grandchild
 *   parent→sibling       = Aunt/Uncle
 *   sibling→child        = Niece/Nephew
 *   parent→sibling→child = First Cousin
 */
function inferRelationship(types: RelationshipType[]): string {
  const chain = types.join("→");

  const patterns: Record<string, string> = {
    // Ascending
    "parent→parent": "Grandparent",
    "parent→parent→parent": "Great-Grandparent",
    // Descending
    "child→child": "Grandchild",
    "child→child→child": "Great-Grandchild",
    // Collateral - via explicit sibling
    "parent→sibling": "Aunt/Uncle",
    "sibling→child": "Niece/Nephew",
    "parent→sibling→child": "First Cousin",
    "parent→parent→sibling": "Great Aunt/Uncle",
    "parent→parent→sibling→child": "First Cousin Once Removed",
    // Via grandparents only (no explicit sibling links) - common when adding new members
    "parent→parent→child": "Aunt/Uncle",
    "parent→parent→child→child": "First Cousin",
    // Aunt/uncle's spouse (in-law)
    "parent→sibling→spouse": "Aunt's/Uncle's Spouse",
    // Through spouse (coefficient will be 0 anyway)
    "spouse": "Spouse",
  };

  if (patterns[chain]) return patterns[chain];
  if (types.includes("aunt_uncle") || types.includes("maternal_aunt") || types.includes("paternal_aunt") || types.includes("maternal_uncle") || types.includes("paternal_uncle")) return "Aunt/Uncle";
  if (types.includes("niece_nephew")) return "Niece/Nephew";
  if (types.includes("cousin")) return "First Cousin";
  return `Extended Family (${types.length}°)`;
}

// ── Blood-relative finder (for "Related By" filter) ─────

/**
 * Find every person who shares blood with `personId`.
 * Uses calculateGeneticMatch for each candidate; anyone with r > 0 is blood.
 * Spouse edges naturally zero out the coefficient, so in-laws are excluded.
 */
export function findBloodRelatives(
  personId: string,
  allMemberIds: string[],
  relationships: Relationship[]
): Set<string> {
  const blood = new Set<string>();
  blood.add(personId);

  for (const memberId of allMemberIds) {
    if (memberId === personId) continue;
    const match = calculateGeneticMatch(personId, memberId, relationships);
    if (match.percentage > 0) {
      blood.add(memberId);
    }
  }

  return blood;
}

// ── Medical condition helpers ────────────────────────────

export function findSharedConditionAncestors(
  userId: string,
  conditionId: string,
  relationships: Relationship[],
  userConditions: Map<string, string[]>
): { memberId: string; match: GeneticMatchResult }[] {
  const results: { memberId: string; match: GeneticMatchResult }[] = [];

  for (const [memberId, conditions] of userConditions) {
    if (memberId === userId) continue;
    if (conditions.includes(conditionId)) {
      const match = calculateGeneticMatch(userId, memberId, relationships);
      if (match.percentage > 0) {
        results.push({ memberId, match });
      }
    }
  }

  return results.sort((a, b) => b.match.percentage - a.match.percentage);
}

// ── Visual helpers ──────────────────────────────────────

export function getMatchColor(percentage: number): string {
  if (percentage <= 0) return "rgba(255, 255, 255, 0.14)";

  // 0% -> light gold, 50%+ -> rich gold.
  const t = Math.max(0, Math.min(1, percentage / 50));
  const start = { r: 232, g: 201, b: 154 }; // #e8c99a
  const end = { r: 184, g: 134, b: 74 }; // #b8864a

  const r = Math.round(start.r + (end.r - start.r) * t);
  const g = Math.round(start.g + (end.g - start.g) * t);
  const b = Math.round(start.b + (end.b - start.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

export function getMatchGlow(percentage: number): string {
  if (percentage <= 0) return "none";

  const t = Math.max(0, Math.min(1, percentage / 50));
  const blur = Math.round(10 + t * 14);
  const alpha = 0.22 + t * 0.32;
  return `0 0 ${blur}px rgba(212, 165, 116, ${alpha.toFixed(2)})`;
}

export function getMatchTextColor(percentage: number): string {
  if (percentage >= 25) return "#fff7eb";
  if (percentage > 0) return "#2b1906";
  return "#fff7eb";
}
