"use client";

import { Download, FileImage } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { MOCK_PROFILES, MOCK_RELATIONSHIPS } from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewExportPage() {
  usePreviewTheme();
  const viewer = MOCK_PROFILES[0];
  const treeLayout = createFamilyTreeLayout(MOCK_PROFILES, MOCK_RELATIONSHIPS, viewer.id);
  const treeMembers = treeLayout.nodes.map((node) => ({
    profile: node.profile,
    match: calculateGeneticMatch(viewer.id, node.profile.id, MOCK_RELATIONSHIPS, node.profile.gender),
    x: node.x,
    y: node.y,
    generation: node.generation,
  }));

  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] p-6">
      <div className="grid h-full grid-rows-[auto_1fr] gap-4">
        <div className="flex items-center justify-between rounded-2xl border border-[var(--foreground)]/[0.08] bg-[var(--background)]/80 px-4 py-3 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[var(--accent-rgb)]/12 p-2 text-[var(--accent-400)]">
              <FileImage size={18} />
            </div>
            <div>
              <p className="font-serif text-lg font-semibold app-text-primary">Export Family Tree</p>
              <p className="text-xs app-text-secondary">Create a polished image with names, years, and avatars.</p>
            </div>
          </div>
          <div className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-rgb)]/14 px-3 py-2 text-sm text-[var(--accent-400)]">
            <Download size={14} />
            PNG Export
          </div>
        </div>

        <GlassCard className="overflow-hidden p-0">
          <div className="m-4 rounded-[24px] border border-black/8 bg-[#f7f2ea] p-8 shadow-[0_24px_60px_rgba(0,0,0,0.12)] dark:border-white/8 dark:bg-[#f1eadf]">
            <div className="mb-5 text-center">
              <h3 className="font-serif text-2xl font-semibold text-[#2f241c]">The Montague Family</h3>
              <p className="mt-1 text-sm text-[#6b5a4a]">Prepared for sharing and archival keepsake use.</p>
            </div>
            <div className="origin-top scale-[0.55]">
              <FamilyTree
                members={treeMembers}
                connections={treeLayout.connections}
                sibships={treeLayout.sibships}
                viewerId={viewer.id}
                showPercentages
                showRelationLabels
                showLastNames
                showBirthYear
                showDeathYear
                canvasWidth={treeLayout.width}
                canvasHeight={treeLayout.height}
              />
            </div>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
