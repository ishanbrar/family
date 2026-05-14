"use client";

import { ProfilePlacesCard } from "@/components/profile/ProfilePlacesCard";
import { GlassCard } from "@/components/ui/GlassCard";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { ProfileCard } from "@/components/ui/ProfileCard";
import {
  MOCK_CONDITIONS,
  MOCK_PROFILES,
  MOCK_RELATIONSHIPS,
  MOCK_USER_CONDITIONS,
} from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewProfileExpandedPage() {
  usePreviewTheme();

  const viewer = MOCK_PROFILES[0];
  const member = MOCK_PROFILES[2];
  const geneticMatch = calculateGeneticMatch(viewer.id, member.id, MOCK_RELATIONSHIPS, member.gender);
  const memberConditions = MOCK_USER_CONDITIONS
    .filter((entry) => entry.user_id === member.id)
    .map((entry) => ({
      entry,
      condition: MOCK_CONDITIONS.find((condition) => condition.id === entry.condition_id),
    }))
    .filter((item): item is { entry: (typeof MOCK_USER_CONDITIONS)[number]; condition: (typeof MOCK_CONDITIONS)[number] } => Boolean(item.condition));

  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] p-6">
      <div className="grid h-full grid-cols-[1.05fr_1.35fr] gap-5">
        <ProfileCard profile={member} geneticMatch={geneticMatch} className="max-w-none" />

        <div className="space-y-4">
          <ProfilePlacesCard profile={member} />
          <GlassCard className="p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-white/90">Health Conditions</h3>
              <span className="text-[11px] text-white/35">{memberConditions.length} recorded</span>
            </div>
            <div className="space-y-3">
              {memberConditions.slice(0, 2).map(({ entry, condition }) => (
                <MedicalHistoryCard
                  key={entry.id}
                  userCondition={entry}
                  condition={condition}
                  isPrivate={false}
                />
              ))}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
