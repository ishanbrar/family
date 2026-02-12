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

import type { Relationship, RelationshipType, GeneticMatchResult } from "./types";

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
    niece_nephew: "aunt_uncle",
  };
  return inversions[type] || type;
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
  relationships: Relationship[]
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
          label = RELATIONSHIP_LABELS[viewerPerspective[0]];
        } else {
          label = inferRelationship(viewerPerspective);
        }

        return {
          percentage: Math.round(coefficient * 100 * 10) / 10,
          relationship: label,
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
    // Collateral
    "parent→sibling": "Aunt/Uncle",
    "sibling→child": "Niece/Nephew",
    "parent→sibling→child": "First Cousin",
    "parent→parent→sibling": "Great Aunt/Uncle",
    "parent→parent→sibling→child": "First Cousin Once Removed",
    "parent→parent→child": "Half-Aunt/Uncle",
    // Through spouse (coefficient will be 0 anyway)
    "spouse": "Spouse",
  };

  return patterns[chain] || `Extended Family (${types.length}°)`;
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
  if (percentage >= 50) return "#d4a574";
  if (percentage >= 25) return "#c49a6c";
  if (percentage >= 12.5) return "#a0845c";
  if (percentage > 0) return "#7a6a50";
  return "#3a3a3a";
}

export function getMatchGlow(percentage: number): string {
  if (percentage >= 50) return "0 0 20px rgba(212, 165, 116, 0.6)";
  if (percentage >= 25) return "0 0 15px rgba(196, 154, 108, 0.4)";
  if (percentage >= 12.5) return "0 0 10px rgba(160, 132, 92, 0.3)";
  return "none";
}
