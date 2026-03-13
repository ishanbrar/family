"use client";

import { ProfileCard } from "@/components/ui/ProfileCard";
import { MOCK_PROFILES, MOCK_RELATIONSHIPS } from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import type { Relationship } from "@/lib/types";

export default function PreviewMemberPage() {
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
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-8">
      <ProfileCard
        profile={member}
        geneticMatch={geneticMatch}
        isViewer={false}
      />
    </div>
  );
}
