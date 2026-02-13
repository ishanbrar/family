import { cn } from "@/lib/cn";
import type { Profile } from "@/lib/types";
import type { TreeGenerationAnalytics } from "@/lib/generation-insights";

interface GenerationInsightsProps {
  analytics: TreeGenerationAnalytics;
  className?: string;
}

function formatPerson(profile: Profile | null): string {
  if (!profile) return "Not enough birth-date data";
  const parsedDob = Date.parse(profile.date_of_birth || "");
  const year = Number.isNaN(parsedDob) ? null : new Date(parsedDob).getUTCFullYear();
  const fullName = `${profile.first_name} ${profile.last_name}`.trim();
  return year ? `${fullName} (${year})` : fullName;
}

export function GenerationInsights({ analytics, className }: GenerationInsightsProps) {
  if (analytics.totalGenerations === 0) return null;

  return (
    <div className={cn("mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-white/35 uppercase tracking-wider">Generation Depth</p>
          <p className="text-sm text-white/75 mt-1">
            {analytics.totalGenerations} generation{analytics.totalGenerations !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
        {analytics.generations.map((generation) => (
          <div
            key={generation.index}
            className="rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2.5"
          >
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-xs text-gold-300 font-medium">Generation {generation.index}</p>
              <p className="text-[10px] text-white/30">
                {generation.memberCount} member{generation.memberCount !== 1 ? "s" : ""}
              </p>
            </div>
            <p className="text-[11px] text-white/45">
              Oldest: <span className="text-white/70">{formatPerson(generation.oldest)}</span>
            </p>
            <p className="text-[11px] text-white/45 mt-1">
              Youngest: <span className="text-white/70">{formatPerson(generation.youngest)}</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
