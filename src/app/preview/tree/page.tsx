"use client";

import { useMemo } from "react";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { MOCK_PROFILES, MOCK_RELATIONSHIPS } from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import type { Relationship } from "@/lib/types";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewTreePage() {
  usePreviewTheme();
  const viewer = MOCK_PROFILES[0];
  const members = MOCK_PROFILES;
  const relationships = MOCK_RELATIONSHIPS as Relationship[];
  const treeLayout = useMemo(
    () => createFamilyTreeLayout(members, relationships, viewer.id),
    [members, relationships, viewer.id]
  );

  const treeMembers = useMemo(
    () =>
      treeLayout.nodes.map((node) => ({
        profile: node.profile,
        match: calculateGeneticMatch(viewer.id, node.profile.id, relationships, node.profile.gender),
        x: node.x,
        y: node.y,
        generation: node.generation,
      })),
    [relationships, treeLayout.nodes, viewer.id]
  );

  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] flex items-center justify-center p-6">
      <FamilyTree
        members={treeMembers}
        connections={treeLayout.connections}
        sibships={treeLayout.sibships}
        viewerId={viewer.id}
        showPercentages
        showRelationLabels
        showLastNames
        canvasWidth={treeLayout.width}
        canvasHeight={treeLayout.height}
      />
    </div>
  );
}
