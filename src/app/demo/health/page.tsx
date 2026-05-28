"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, Dna, GitBranch, HeartPulse, Users } from "lucide-react";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GlassCard } from "@/components/ui/GlassCard";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { GenerationInsights } from "@/components/tree/GenerationInsights";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { useSelectedDemoFamily } from "@/lib/demo-family";
import { calculateGeneticMatch, findSharedConditionAncestors } from "@/lib/genetic-match";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { createGenerationAnalytics } from "@/lib/generation-insights";

type FilterType = "all" | "hereditary" | "chronic" | "autoimmune" | "mental_health" | "other";

export default function DemoHealthPage() {
  const demoFamily = useSelectedDemoFamily();
  const viewer = demoFamily.profiles[0]!;
  const members = demoFamily.profiles;
  const relationships = demoFamily.relationships;
  const [filter, setFilter] = useState<FilterType>("all");
  const [showPrivacy, setShowPrivacy] = useState(true);
  const [highlightedCondition, setHighlightedCondition] = useState<string | null>(null);

  const viewerConditions = useMemo(
    () => demoFamily.userConditions.filter((uc) => uc.user_id === viewer.id),
    [demoFamily.userConditions, viewer.id]
  );
  const familyConditions = useMemo(
    () => demoFamily.userConditions.filter((uc) => uc.user_id !== viewer.id),
    [demoFamily.userConditions, viewer.id]
  );

  const filteredFamilyConditions = useMemo(() => {
    if (filter === "all") return familyConditions;
    return familyConditions.filter((uc) => {
      const condition = demoFamily.conditions.find((item) => item.id === uc.condition_id);
      return condition?.type === filter;
    });
  }, [demoFamily.conditions, familyConditions, filter]);

  const conditionMap = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const entry of demoFamily.userConditions) {
      const current = map.get(entry.user_id) || [];
      current.push(entry.condition_id);
      map.set(entry.user_id, current);
    }
    return map;
  }, [demoFamily.userConditions]);

  const sharedConditionMatches = useMemo(
    () =>
      highlightedCondition
        ? findSharedConditionAncestors(viewer.id, highlightedCondition, relationships, conditionMap)
        : [],
    [conditionMap, highlightedCondition, relationships, viewer.id]
  );

  const highlightedMemberIds = useMemo(() => {
    if (!highlightedCondition) return new Set<string>();
    return new Set([viewer.id, ...sharedConditionMatches.map((match) => match.memberId)]);
  }, [highlightedCondition, sharedConditionMatches, viewer.id]);

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

  const generationAnalytics = useMemo(
    () => createGenerationAnalytics(treeLayout.nodes),
    [treeLayout.nodes]
  );

  const highlightedConditionMeta = highlightedCondition
    ? demoFamily.conditions.find((condition) => condition.id === highlightedCondition) || null
    : null;

  const familyCaseCount = familyConditions.length;
  const hereditaryCaseCount = demoFamily.userConditions.filter((uc) => {
    const condition = demoFamily.conditions.find((item) => item.id === uc.condition_id);
    return condition?.type === "hereditary";
  }).length;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <DemoSidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <p className="text-xs text-white/50">
            You&apos;re viewing the <span className="text-gold-300 font-medium">{demoFamily.shortLabel}</span> health timeline.{" "}
            <Link href="/demo/select" className="text-gold-400 hover:text-gold-300 underline transition-colors">Switch demo</Link>
            {" "}or{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline transition-colors">Join</Link>
            {" "}or{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline transition-colors">Create</Link>
            {" "}your own family to unlock private, editable health insights.
          </p>
          <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-lg">DEMO</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8"
        >
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-400/10">
              <HeartPulse size={22} className="text-gold-400" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white/95">Health DNA</h1>
              <p className="text-sm text-white/35 mt-0.5">Read-only hereditary insights from the {demoFamily.shortLabel} family record</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPrivacy((current) => !current)}
              className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/45 hover:text-white/65 transition-colors"
            >
              Privacy {showPrivacy ? "On" : "Off"}
            </button>
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/45">
              Demo health is read-only
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Your Conditions", value: viewerConditions.length, icon: HeartPulse, color: "text-gold-300" },
            { label: "Family Cases", value: familyCaseCount, icon: Users, color: "text-severity-mild" },
            { label: "Hereditary Flags", value: hereditaryCaseCount, icon: Dna, color: "text-severity-moderate" },
            { label: "Generations Tracked", value: generationAnalytics.totalGenerations, icon: GitBranch, color: "text-white/55" },
          ].map((stat) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label} className="p-4">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] uppercase tracking-wider text-white/32 font-medium">{stat.label}</p>
                  <Icon size={14} className={stat.color} />
                </div>
                <p className="mt-2 font-serif text-2xl font-semibold text-white/92">{stat.value}</p>
              </GlassCard>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-lg font-semibold text-white/90">Alexander&apos;s Health Record</h2>
                <span className="text-xs text-white/30">{viewerConditions.length} entries</span>
              </div>
              <div className="space-y-3">
                {viewerConditions.map((entry) => {
                  const condition = demoFamily.conditions.find((item) => item.id === entry.condition_id);
                  if (!condition) return null;
                  return (
                    <MedicalHistoryCard
                      key={entry.id}
                      userCondition={entry}
                      condition={condition}
                      isHighlighted={highlightedCondition === condition.id}
                      onHighlight={(conditionId) =>
                        setHighlightedCondition((current) => (current === conditionId ? null : conditionId))
                      }
                    />
                  );
                })}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h2 className="font-serif text-lg font-semibold text-white/90">Family History</h2>
                <div className="flex flex-wrap gap-1">
                  {(["all", "hereditary", "chronic", "autoimmune", "mental_health", "other"] as FilterType[]).map((value) => (
                    <button
                      key={value}
                      onClick={() => setFilter(value)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                        filter === value ? "bg-gold-400/15 text-gold-300" : "text-white/28 hover:text-white/48"
                      }`}
                    >
                      {value === "mental_health"
                        ? "Mental"
                        : value === "other"
                          ? "Other"
                          : value.charAt(0).toUpperCase() + value.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
                {filteredFamilyConditions.map((entry) => {
                  const member = members.find((profile) => profile.id === entry.user_id);
                  const condition = demoFamily.conditions.find((item) => item.id === entry.condition_id);
                  if (!member || !condition) return null;

                  const isImmediate = relationships.some(
                    (relationship) =>
                      (relationship.user_id === viewer.id || relationship.relative_id === viewer.id) &&
                      (relationship.user_id === member.id || relationship.relative_id === member.id) &&
                      ["parent", "child", "sibling", "spouse"].includes(relationship.type)
                  );

                  return (
                    <div key={entry.id}>
                      <p className="mb-1 ml-1 text-[10px] text-white/28 font-medium">
                        {member.first_name} {member.last_name}
                      </p>
                      <MedicalHistoryCard
                        userCondition={entry}
                        condition={condition}
                        isPrivate={showPrivacy && !isImmediate}
                        isHighlighted={highlightedCondition === condition.id}
                        onHighlight={(conditionId) =>
                          setHighlightedCondition((current) => (current === conditionId ? null : conditionId))
                        }
                      />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <GlassCard className="p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="font-serif text-lg font-semibold text-white/90">Inheritance View</h2>
                  <p className="text-xs text-white/35 mt-1">
                    Highlighted members share the selected condition with Alexander.
                  </p>
                </div>
                {highlightedConditionMeta && (
                  <div className="rounded-xl border border-gold-400/18 bg-gold-400/[0.06] px-3 py-2 text-right">
                    <p className="text-[10px] uppercase tracking-wider text-gold-300/70">Selected condition</p>
                    <p className="text-sm text-gold-300 font-medium mt-0.5">{highlightedConditionMeta.name}</p>
                  </div>
                )}
              </div>
              <FamilyTree
                members={treeMembers}
                connections={treeLayout.connections}
                sibships={treeLayout.sibships}
                viewerId={viewer.id}
                showPercentages
                showRelationLabels
                showLastNames
                highlightedMembers={highlightedMemberIds}
                dimNonHighlighted={highlightedMemberIds.size > 0}
                canvasWidth={treeLayout.width}
                canvasHeight={treeLayout.height}
              />
              <div className="mt-5">
                <GenerationInsights analytics={generationAnalytics} />
              </div>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GlassCard className="p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-400/10">
                    <AlertTriangle size={18} className="text-gold-400" />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-semibold text-white/90">Condition Spotlight</h3>
                    <p className="text-xs text-white/35">Select a card to trace overlapping family history</p>
                  </div>
                </div>
                {highlightedConditionMeta ? (
                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <p className="text-sm font-medium text-white/88">{highlightedConditionMeta.name}</p>
                    <p className="mt-1 text-xs text-white/42 leading-relaxed">{highlightedConditionMeta.description}</p>
                    <div className="mt-4 flex items-center justify-between text-[11px] text-white/34">
                      <span>{sharedConditionMatches.length} blood relatives flagged</span>
                      <span className="rounded-full bg-gold-400/12 px-2 py-0.5 text-gold-300/88">
                        {highlightedConditionMeta.type.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-white/[0.1] bg-white/[0.02] p-5 text-sm text-white/38">
                    Choose any condition card on the left to see how it appears through the sample family tree.
                  </div>
                )}
              </GlassCard>

              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-serif text-lg font-semibold text-white/90">Closest Shared Matches</h3>
                  <span className="text-xs text-white/30">{sharedConditionMatches.length} matches</span>
                </div>
                <div className="space-y-3">
                  {(sharedConditionMatches.length > 0 ? sharedConditionMatches : members
                    .filter((member) => member.id !== viewer.id)
                    .map((member) => ({
                      memberId: member.id,
                      match: calculateGeneticMatch(viewer.id, member.id, relationships, member.gender),
                    }))
                    .filter((item) => item.match.percentage > 0)
                    .sort((a, b) => b.match.percentage - a.match.percentage)
                    .slice(0, 4)
                  ).map((item) => {
                    const member = members.find((profile) => profile.id === item.memberId);
                    if (!member) return null;
                    return (
                      <div
                        key={member.id}
                        className="flex items-center gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] px-3 py-3"
                      >
                        <GeneticMatchRing
                          percentage={item.match.percentage}
                          size={58}
                          strokeWidth={2}
                          avatarUrl={member.avatar_url}
                          initials={`${member.first_name[0]}${member.last_name[0]}`}
                        />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-white/88 truncate">
                            {member.first_name} {member.last_name}
                          </p>
                          <p className="text-xs text-white/36 truncate">{item.match.relationship}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            </div>
          </div>
        </div>

        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <SiteFooter />
        </footer>
      </main>
    </div>
  );
}
