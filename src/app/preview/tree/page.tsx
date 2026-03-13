"use client";

import { useMemo } from "react";
import { FamilyTree } from "@/components/tree/FamilyTree";
import type { TreeConnection } from "@/components/tree/FamilyTree";
import { MOCK_PROFILES, MOCK_RELATIONSHIPS } from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import type { Relationship } from "@/lib/types";

const TREE_POSITIONS: Record<string, { x: number; y: number }> = {
  "grandparent-001": { x: 330, y: 80 },
  "grandparent-002": { x: 470, y: 80 },
  "parent-001": { x: 240, y: 270 },
  "parent-002": { x: 380, y: 270 },
  "uncle-001": { x: 600, y: 270 },
  "viewer-001": { x: 240, y: 460 },
  "sibling-001": { x: 380, y: 460 },
  "cousin-001": { x: 600, y: 460 },
};

const TREE_CONNECTIONS: TreeConnection[] = [
  { from: "grandparent-001", to: "grandparent-002", type: "spouse" },
  { from: "parent-001", to: "parent-002", type: "spouse" },
  { from: "grandparent-001", to: "parent-001", type: "parent" },
  { from: "grandparent-002", to: "parent-001", type: "parent" },
  { from: "grandparent-001", to: "uncle-001", type: "parent" },
  { from: "grandparent-002", to: "uncle-001", type: "parent" },
  { from: "parent-001", to: "viewer-001", type: "parent" },
  { from: "parent-002", to: "viewer-001", type: "parent" },
  { from: "parent-001", to: "sibling-001", type: "parent" },
  { from: "parent-002", to: "sibling-001", type: "parent" },
  { from: "uncle-001", to: "cousin-001", type: "parent" },
];

export default function PreviewTreePage() {
  const viewer = MOCK_PROFILES[0];
  const members = MOCK_PROFILES;
  const relationships = MOCK_RELATIONSHIPS as Relationship[];

  const treeMembers = useMemo(
    () =>
      members
        .filter((p) => TREE_POSITIONS[p.id])
        .map((p) => ({
          profile: p,
          match: calculateGeneticMatch(viewer.id, p.id, relationships, p.gender),
          ...TREE_POSITIONS[p.id],
        })),
    [members, relationships]
  );

  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6">
      <FamilyTree
        members={treeMembers}
        connections={TREE_CONNECTIONS}
        viewerId={viewer.id}
        showPercentages
        showRelationLabels
        showLastNames
        canvasWidth={900}
        canvasHeight={520}
      />
    </div>
  );
}
