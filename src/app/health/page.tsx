"use client";

// ══════════════════════════════════════════════════════════
// Health DNA – Medical History & Inheritance View
// Uses useFamilyData for Supabase or mock data.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useState, useCallback, useMemo } from "react";
import {
  HeartPulse,
  Dna,
  Command,
  Plus,
  Filter,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { CommandSearch } from "@/components/ui/CommandSearch";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { GenerationInsights } from "@/components/tree/GenerationInsights";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { useFamilyData } from "@/hooks/use-family-data";
import { useFamilyStore } from "@/store/family-store";
import { calculateGeneticMatch, findSharedConditionAncestors } from "@/lib/genetic-match";
import type { MedicalCondition } from "@/lib/types";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { createGenerationAnalytics } from "@/lib/generation-insights";

type FilterType = "all" | "hereditary" | "chronic" | "autoimmune" | "mental_health";

export default function HealthPage() {
  const {
    viewer,
    members,
    relationships,
    conditions: allConditions,
    userConditions,
    loading,
    addCondition,
  } = useFamilyData();

  const { highlightedCondition, setHighlightedCondition, setCommandOpen } =
    useFamilyStore();

  const [filter, setFilter] = useState<FilterType>("all");
  const [showPrivacy, setShowPrivacy] = useState(true);

  const handleAddCondition = useCallback(
    async (condition: MedicalCondition) => {
      if (!viewer) return;
      const exists = userConditions.some(
        (uc) => uc.user_id === viewer.id && uc.condition_id === condition.id
      );
      if (exists) return;
      await addCondition(viewer.id, condition.id);
    },
    [viewer, userConditions, addCondition]
  );

  const treeLayout = useMemo(() => {
    if (!viewer) return { nodes: [], connections: [], sibships: [], width: 800, height: 560 };
    return createFamilyTreeLayout(members, relationships, viewer.id);
  }, [members, relationships, viewer]);

  const treeMembers = useMemo(() => {
    if (!viewer) return [];
    return treeLayout.nodes.map((n) => ({
      profile: n.profile,
      match: calculateGeneticMatch(viewer.id, n.profile.id, relationships, n.profile.gender),
      x: n.x,
      y: n.y,
      generation: n.generation,
    }));
  }, [treeLayout.nodes, viewer, relationships]);

  const generationAnalytics = useMemo(
    () => createGenerationAnalytics(treeLayout.nodes),
    [treeLayout.nodes]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <Loader2 size={24} className="text-gold-400 animate-spin" />
      </div>
    );
  }

  if (!viewer) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/50 mb-3">You need to sign in to view health insights.</p>
          <a href="/login" className="text-sm text-gold-300 hover:text-gold-200 transition-colors">Go to login</a>
        </div>
      </div>
    );
  }

  const viewerConditions = userConditions.filter((uc) => uc.user_id === viewer.id);
  const familyConditions = userConditions.filter((uc) => uc.user_id !== viewer.id);

  const filteredFamilyConditions =
    filter === "all"
      ? familyConditions
      : familyConditions.filter((uc) => {
          const cond = uc.condition || allConditions.find((c) => c.id === uc.condition_id);
          return cond?.type === filter;
        });

  // Shared condition ancestors
  const sharedAncestors = highlightedCondition
    ? (() => {
        const conditionMap = new Map<string, string[]>();
        for (const uc of userConditions) {
          if (!conditionMap.has(uc.user_id)) conditionMap.set(uc.user_id, []);
          conditionMap.get(uc.user_id)!.push(uc.condition_id);
        }
        return findSharedConditionAncestors(viewer.id, highlightedCondition, relationships, conditionMap);
      })()
    : [];

  const highlightedMemberIds = new Set([viewer.id, ...sharedAncestors.map((a) => a.memberId)]);

  const highlightedConditionName = highlightedCondition
    ? allConditions.find((c) => c.id === highlightedCondition)?.name : null;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />
      <CommandSearch conditions={allConditions} onSelect={handleAddCondition} />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-400/10">
              <HeartPulse size={22} className="text-gold-400" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white/95">Health DNA</h1>
              <p className="text-sm text-white/35 mt-0.5">Hereditary health insights for your family</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setShowPrivacy(!showPrivacy)}
              className="glass flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-white/40 hover:text-white/60 transition-colors">
              {showPrivacy ? <Eye size={14} /> : <EyeOff size={14} />}
              Privacy {showPrivacy ? "On" : "Off"}
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setCommandOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/10 text-gold-300 text-sm font-medium hover:bg-gold-400/15 transition-colors">
              <Plus size={14} />
              Add Diagnosis
              <kbd className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-black/30 text-[9px] font-mono">
                <Command size={9} />K
              </kbd>
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-1 space-y-6">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-serif text-base font-semibold text-white/90">Your Conditions</h3>
                <span className="text-xs text-white/30">{viewerConditions.length} recorded</span>
              </div>
              <div className="space-y-3">
                <AnimatePresence>
                  {viewerConditions.map((uc) => {
                    const condition = uc.condition || allConditions.find((c) => c.id === uc.condition_id);
                    if (!condition) return null;
                    return (
                      <MedicalHistoryCard key={uc.id} userCondition={uc} condition={condition}
                        isHighlighted={highlightedCondition === condition.id}
                        onHighlight={setHighlightedCondition} />
                    );
                  })}
                </AnimatePresence>
                {viewerConditions.length === 0 && (
                  <div className="text-center py-8">
                    <Dna size={24} className="mx-auto text-white/15 mb-2" />
                    <p className="text-xs text-white/30">No conditions recorded</p>
                    <p className="text-[10px] text-white/20 mt-1">
                      Press <kbd className="px-1 py-0.5 rounded bg-white/5 text-[9px] font-mono">Cmd+K</kbd> to add
                    </p>
                  </div>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <h3 className="font-serif text-base font-semibold text-white/90">Family History</h3>
                <div className="flex flex-wrap items-center gap-1">
                  <Filter size={12} className="text-white/20" />
                  {(["all", "hereditary", "chronic", "autoimmune", "mental_health"] as FilterType[]).map((f) => (
                    <button key={f} onClick={() => setFilter(f)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-medium transition-colors ${
                        filter === f ? "bg-gold-400/15 text-gold-300" : "text-white/25 hover:text-white/40"
                      }`}>
                      {f === "all" ? "All" : f === "mental_health" ? "Mental" : f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {filteredFamilyConditions.map((uc) => {
                  const condition = uc.condition || allConditions.find((c) => c.id === uc.condition_id);
                  const member = members.find((p) => p.id === uc.user_id);
                  if (!condition || !member) return null;
                  const isImmediate = relationships.some((r) =>
                    (r.user_id === viewer.id || r.relative_id === viewer.id) &&
                    (r.user_id === uc.user_id || r.relative_id === uc.user_id) &&
                    ["parent", "child", "sibling", "spouse"].includes(r.type)
                  );
                  return (
                    <div key={uc.id}>
                      <p className="text-[10px] text-white/25 font-medium mb-1 ml-1">{member.first_name} {member.last_name}</p>
                      <MedicalHistoryCard userCondition={uc} condition={condition}
                        isPrivate={showPrivacy && !isImmediate}
                        isHighlighted={highlightedCondition === condition.id}
                        onHighlight={setHighlightedCondition} />
                    </div>
                  );
                })}
              </div>
            </GlassCard>
          </div>

          <div className="xl:col-span-2 space-y-6">
            {highlightedConditionName && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                className="glass-card rounded-2xl p-4 flex items-center gap-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-severity-moderate/10">
                  <AlertTriangle size={18} className="text-severity-moderate" />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-white/80 font-medium">
                    Viewing inheritance path for <span className="text-gold-300">{highlightedConditionName}</span>
                  </p>
                  <p className="text-xs text-white/35 mt-0.5">
                    {sharedAncestors.length} family member{sharedAncestors.length !== 1 ? "s" : ""} share this condition
                  </p>
                </div>
                <button onClick={() => setHighlightedCondition(null)}
                  className="text-xs text-white/30 hover:text-white/50 transition-colors">Clear</button>
              </motion.div>
            )}

            <GlassCard className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
                <div>
                  <h3 className="font-serif text-lg font-semibold text-white/90">Inheritance View</h3>
                  <p className="text-xs text-white/30 mt-0.5">Click a condition to trace its genetic thread</p>
                </div>
                <div className="hidden sm:flex items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] text-white/25">
                    <span className="w-6 h-0.5 bg-gold-400/40 rounded" /> Genetic link
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-white/25">
                    <span className="w-6 h-0.5 bg-severity-moderate/60 rounded" /> Shared condition
                  </span>
                </div>
              </div>
              <FamilyTree members={treeMembers} connections={treeLayout.connections} sibships={treeLayout.sibships}
                highlightedMembers={highlightedCondition ? highlightedMemberIds : new Set<string>()}
                dimNonHighlighted={!!highlightedCondition}
                canvasWidth={treeLayout.width}
                canvasHeight={treeLayout.height} />
              <GenerationInsights analytics={generationAnalytics} />
            </GlassCard>

            {sharedAncestors.length > 0 && (
              <GlassCard className="p-6">
                <h3 className="font-serif text-base font-semibold text-white/90 mb-4">Shared Carriers</h3>
                <div className="flex gap-6 overflow-x-auto pb-2">
                  {sharedAncestors.map((ancestor) => {
                    const member = members.find((p) => p.id === ancestor.memberId);
                    if (!member) return null;
                    return (
                      <div key={ancestor.memberId} className="flex flex-col items-center shrink-0">
                        <GeneticMatchRing percentage={ancestor.match.percentage} size={72} strokeWidth={2}
                          initials={`${member.first_name[0]}${member.last_name[0]}`} />
                        <p className="mt-2 text-xs text-white/60 font-medium">{member.first_name}</p>
                        <p className="text-[10px] text-white/30">{ancestor.match.relationship}</p>
                      </div>
                    );
                  })}
                </div>
              </GlassCard>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
