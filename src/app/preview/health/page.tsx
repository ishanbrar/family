"use client";

import { Dna, GitBranch, HeartPulse, Users } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { MOCK_CONDITIONS, MOCK_USER_CONDITIONS } from "@/lib/mock-data";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewHealthPage() {
  usePreviewTheme();

  const viewerConditions = MOCK_USER_CONDITIONS
    .slice(0, 3)
    .map((entry) => ({
      entry,
      condition: MOCK_CONDITIONS.find((condition) => condition.id === entry.condition_id),
    }))
    .filter((item): item is { entry: (typeof MOCK_USER_CONDITIONS)[number]; condition: (typeof MOCK_CONDITIONS)[number] } => Boolean(item.condition));

  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] p-6">
      <div className="grid h-full grid-rows-[auto_1fr] gap-4">
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Your Conditions", value: 3, icon: HeartPulse },
            { label: "Family Cases", value: 15, icon: Users },
            { label: "Hereditary Flags", value: 7, icon: Dna },
            { label: "Generations", value: 4, icon: GitBranch },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label} className="p-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-white/32 font-medium">{stat.label}</p>
                  <Icon size={13} className="text-gold-300" />
                </div>
                <p className="mt-2 font-serif text-xl font-semibold text-white/92">{stat.value}</p>
              </GlassCard>
            );
          })}
        </div>

        <GlassCard className="p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-semibold text-white/90">Health DNA</h3>
              <p className="mt-1 text-xs text-white/38">Read-only hereditary insights across the family record.</p>
            </div>
            <span className="rounded-full border border-gold-400/20 bg-gold-400/10 px-2.5 py-1 text-[11px] text-gold-300">
              Demo
            </span>
          </div>
          <div className="space-y-3">
            {viewerConditions.map(({ entry, condition }) => (
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
  );
}
