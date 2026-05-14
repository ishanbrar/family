"use client";

import { ProfileCard } from "@/components/ui/ProfileCard";
import { MOCK_PROFILES, MOCK_RELATIONSHIPS } from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import type { Relationship } from "@/lib/types";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewMemberPage() {
  usePreviewTheme();
  const viewer = MOCK_PROFILES[0];
  const member = MOCK_PROFILES[2]; // Edward Montague - parent
  const relationships = MOCK_RELATIONSHIPS as Relationship[];
  const geneticMatch = calculateGeneticMatch(
    viewer.id,
    member.id,
    relationships,
    member.gender
  );

  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] flex items-center justify-center p-8">
      <ProfileCard
        profile={member}
        geneticMatch={geneticMatch}
        isViewer={false}
      />
    </div>
  );
}
