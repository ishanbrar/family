"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  Bell,
  Cake,
  ChevronDown,
  Flower2,
  Heart,
  Sparkles,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import {
  buildFamilyMilestones,
  type FamilyMilestone,
  type MilestoneKind,
} from "@/lib/family-milestones";
import type { Profile, Relationship } from "@/lib/types";

interface UpcomingMilestonesSectionProps {
  members: Profile[];
  relationships: Relationship[];
  onMemberClick?: (memberId: string) => void;
}

const KIND_META: Record<
  MilestoneKind,
  { label: string; icon: typeof Cake; accent: string; chip: string }
> = {
  birthday: {
    label: "Birthday",
    icon: Cake,
    accent: "text-gold-300",
    chip: "bg-gold-400/12 text-gold-200 border-gold-400/20",
  },
  anniversary: {
    label: "Anniversary",
    icon: Heart,
    accent: "text-rose-300",
    chip: "bg-rose-400/12 text-rose-200 border-rose-400/20",
  },
  memorial: {
    label: "Remembrance",
    icon: Flower2,
    accent: "text-violet-300",
    chip: "bg-violet-400/12 text-violet-200 border-violet-400/20",
  },
};

function MilestoneRow({
  milestone,
  onMemberClick,
}: {
  milestone: FamilyMilestone;
  onMemberClick?: (memberId: string) => void;
}) {
  const meta = KIND_META[milestone.kind];
  const Icon = meta.icon;
  const timingLabel =
    milestone.daysFromToday === 0
      ? "Today"
      : milestone.daysFromToday < 0
        ? `${Math.abs(milestone.daysFromToday)} day${Math.abs(milestone.daysFromToday) === 1 ? "" : "s"} ago`
        : `In ${milestone.daysFromToday} day${milestone.daysFromToday === 1 ? "" : "s"}`;

  return (
    <button
      type="button"
      onClick={() => onMemberClick?.(milestone.memberIds[0])}
      disabled={!onMemberClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-left transition-colors",
        onMemberClick && "hover:border-white/[0.12] hover:bg-white/[0.04]"
      )}
    >
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border", meta.chip)}>
        <Icon size={15} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white/88">{milestone.title}</p>
        <p className="mt-0.5 text-[11px] text-white/42">
          {meta.label} · {milestone.detail}
        </p>
      </div>
      <div className="shrink-0 text-right">
        <p className={cn("text-xs font-medium", milestone.daysFromToday === 0 ? meta.accent : "text-white/72")}>
          {milestone.dateLabel}
        </p>
        <p className="mt-0.5 text-[10px] text-white/35">{timingLabel}</p>
      </div>
    </button>
  );
}

function MilestoneGroup({
  title,
  items,
  emptyLabel,
  onMemberClick,
}: {
  title: string;
  items: FamilyMilestone[];
  emptyLabel: string;
  onMemberClick?: (memberId: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/32">{title}</p>
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/[0.08] px-3 py-4 text-center text-xs text-white/30">
          {emptyLabel}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((milestone) => (
            <MilestoneRow key={milestone.id} milestone={milestone} onMemberClick={onMemberClick} />
          ))}
        </div>
      )}
    </div>
  );
}

export function UpcomingMilestonesSection({
  members,
  relationships,
  onMemberClick,
}: UpcomingMilestonesSectionProps) {
  const milestones = useMemo(
    () => buildFamilyMilestones(members, relationships),
    [members, relationships]
  );
  const [expanded, setExpanded] = useState(false);

  const summaryParts = [
    milestones.today.length > 0 ? `${milestones.today.length} today` : null,
    milestones.upcoming.length > 0 ? `${milestones.upcoming.length} upcoming` : null,
    milestones.recentlyPassed.length > 0 ? `${milestones.recentlyPassed.length} recent` : null,
  ].filter(Boolean);

  const summaryText =
    summaryParts.length > 0 ? summaryParts.join(" · ") : "No milestones in the next 60 days";

  return (
    <GlassCard className="mb-6 overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-3 px-4 py-3.5 sm:px-5 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={expanded}
      >
        <div
          className={cn(
            "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border",
            milestones.hasTodayAlert
              ? "border-gold-400/30 bg-gold-400/12 text-gold-300"
              : "border-white/[0.08] bg-white/[0.03] text-white/45"
          )}
        >
          {milestones.hasTodayAlert ? (
            <>
              <Bell size={17} className="animate-pulse" />
              <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold-400 shadow-[0_0_10px_rgba(212,175,55,0.8)]" />
            </>
          ) : (
            <Sparkles size={17} />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-serif text-lg text-white/92">Upcoming Milestones</h2>
            {milestones.hasTodayAlert && (
              <span className="inline-flex items-center rounded-full border border-gold-400/25 bg-gold-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-gold-300">
                Today
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-white/38">{summaryText}</p>
        </div>

        <ChevronDown
          size={18}
          className={cn("shrink-0 text-white/30 transition-transform duration-200", expanded && "rotate-180")}
        />
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="border-t border-white/[0.06] px-4 py-4 sm:px-5 sm:py-5">
              {milestones.totalCount === 0 ? (
                <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center">
                  <p className="text-sm text-white/45">
                    Add birth dates, anniversaries, or remembrance dates to see family milestones here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 lg:grid-cols-3">
                  <MilestoneGroup
                    title="Today"
                    items={milestones.today}
                    emptyLabel="Nothing scheduled for today."
                    onMemberClick={onMemberClick}
                  />
                  <MilestoneGroup
                    title="Recently Passed"
                    items={milestones.recentlyPassed}
                    emptyLabel="No milestones in the last 30 days."
                    onMemberClick={onMemberClick}
                  />
                  <MilestoneGroup
                    title="Upcoming"
                    items={milestones.upcoming}
                    emptyLabel="Nothing coming up in the next 60 days."
                    onMemberClick={onMemberClick}
                  />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}
