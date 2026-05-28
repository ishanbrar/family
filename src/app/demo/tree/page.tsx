"use client";

// ══════════════════════════════════════════════════════════
// Demo Tree – Full tree explorer for the selected sample family
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  GitBranch,
  Loader2,
  MapPin,
  Briefcase,
  Calendar,
  User,
  PawPrint,
  X,
  UserPlus,
  Download,
  GitFork,
} from "lucide-react";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GlassCard } from "@/components/ui/GlassCard";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { TreeControls } from "@/components/tree/TreeControls";
import { FamilyMembersTable } from "@/components/tree/FamilyMembersTable";
import { useFamilyStore } from "@/store/family-store";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { exportFamilyTreeAsImage } from "@/lib/tree-export";
import { useSelectedDemoFamily } from "@/lib/demo-family";
import type { MedicalCondition } from "@/lib/types";
import { formatGenderLabel } from "@/lib/display-format";
import { cn } from "@/lib/cn";

function formatBirthDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function getAge(value: string | null): number | null {
  if (!value) return null;
  const dob = new Date(value);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let years = now.getFullYear() - dob.getFullYear();
  const monthOffset = now.getMonth() - dob.getMonth();
  if (monthOffset < 0 || (monthOffset === 0 && now.getDate() < dob.getDate())) years -= 1;
  return years;
}

export default function DemoTreePage() {
  const router = useRouter();
  const store = useFamilyStore();
  const demoFamily = useSelectedDemoFamily();
  const [showPercentages, setShowPercentages] = useState(false);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [showLastNames, setShowLastNames] = useState(true);
  const [showBirthYear, setShowBirthYear] = useState(true);
  const [showDeathYear, setShowDeathYear] = useState(false);
  const [showBirthCountryFlag, setShowBirthCountryFlag] = useState(false);
  const [showCurrentCountryFlag, setShowCurrentCountryFlag] = useState(false);
  const [treeViewResetSignal, setTreeViewResetSignal] = useState(0);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [exportingTree, setExportingTree] = useState(false);

  useEffect(() => {
    store.setViewer(demoFamily.profiles[0] ?? null);
    store.setMembers(demoFamily.profiles);
    store.setRelationships(demoFamily.relationships);
    store.setRelatedByFilter(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoFamily.key]);

  const viewer = store.viewer ?? demoFamily.profiles[0];
  const members = store.members.length > 0 ? store.members : demoFamily.profiles;
  const relationships = store.relationships.length > 0 ? store.relationships : demoFamily.relationships;
  const relatedByFilter = store.relatedByFilter;
  const setRelatedByFilter = store.setRelatedByFilter;

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

  const highlightedIds = useMemo(() => {
    if (!relatedByFilter) return new Set<string>();
    return findBloodRelatives(relatedByFilter, members.map((p) => p.id), relationships);
  }, [relatedByFilter, members, relationships]);

  const selectedMember = useMemo(
    () => (selectedMemberId ? members.find((member) => member.id === selectedMemberId) || null : null),
    [members, selectedMemberId]
  );

  const selectedMatch = useMemo(() => {
    if (!selectedMember) return null;
    return calculateGeneticMatch(viewer.id, selectedMember.id, relationships, selectedMember.gender);
  }, [viewer.id, selectedMember, relationships]);

  const selectedConditions = useMemo(() => {
    if (!selectedMember) return [];
    return demoFamily.userConditions.filter((uc) => uc.user_id === selectedMember.id)
      .map((uc) => demoFamily.conditions.find((c) => c.id === uc.condition_id))
      .filter((c): c is MedicalCondition => !!c);
  }, [demoFamily.conditions, demoFamily.userConditions, selectedMember]);

  const handleMemberClick = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
  }, []);

  const handleExportTree = useCallback(async () => {
    setExportingTree(true);
    try {
      await exportFamilyTreeAsImage({
        familyName: demoFamily.exportFamilyName,
        members,
        relationships,
        rootId: viewer.id,
        scope: "entire",
        scopeLabel: "Demo Family Tree",
      });
    } finally {
      setExportingTree(false);
    }
  }, [demoFamily.exportFamilyName, members, relationships, viewer.id]);

  const selectedAge = getAge(selectedMember?.date_of_birth || null);
  const filterMember = relatedByFilter ? members.find((m) => m.id === relatedByFilter) : null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[color:var(--background)]"
    >
      <DemoSidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
        >
          <p className="text-xs text-white/50">
            Explore the full <span className="text-gold-300 font-medium">{demoFamily.shortLabel}</span> family tree — filters, member details, and export work in demo.{" "}
            <Link href="/demo/select" className="text-gold-400 hover:text-gold-300 underline transition-colors">Switch demo</Link>
            {" "}or{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline transition-colors">Join</Link>
            {" "}or{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline transition-colors">Create</Link>
            {" "}your own to edit members and relationships.
          </p>
          <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-lg shrink-0">DEMO</span>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
        >
          <motion.div className="min-w-0">
            <div className="flex items-center gap-3 sm:gap-4">
              <motion.div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-400/10">
                <GitBranch size={22} className="text-gold-400" />
              </motion.div>
              <div>
                <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white/95">{demoFamily.treeTitle}</h1>
                <p className="text-sm text-white/40 mt-0.5">
                  Hover for quick info, click a member for the side panel, or open their full profile.
                </p>
              </div>
            </div>
          </motion.div>

          <div className="flex w-full lg:w-auto flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Demo mode is read-only"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-white/[0.08]
                bg-white/[0.02] text-sm text-white/30 cursor-not-allowed touch-target-44"
            >
              <UserPlus size={14} />
              Add Member
            </button>
            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Demo mode is read-only"
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-white/[0.08]
                bg-white/[0.02] text-sm text-white/30 cursor-not-allowed touch-target-44"
            >
              <GitFork size={14} />
              Modify Relationships
            </button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={handleExportTree}
              disabled={exportingTree}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-3.5 py-2 rounded-xl border border-white/[0.12]
                bg-white/[0.03] text-sm text-white/70 hover:text-white/90 hover:border-gold-400/30
                hover:bg-gold-400/[0.08] active:scale-[0.98] transition-colors disabled:opacity-50 touch-target-44"
            >
              {exportingTree ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Export Tree
            </motion.button>
            <TreeControls
              members={members}
              relatedByFilter={relatedByFilter}
              onRelatedByFilterChange={setRelatedByFilter}
              showPercentages={showPercentages}
              onShowPercentagesChange={setShowPercentages}
              showRelationLabels={showRelationLabels}
              onShowRelationLabelsChange={setShowRelationLabels}
              showLastNames={showLastNames}
              onShowLastNamesChange={setShowLastNames}
              showBirthYear={showBirthYear}
              onShowBirthYearChange={setShowBirthYear}
              showDeathYear={showDeathYear}
              onShowDeathYearChange={setShowDeathYear}
              showBirthCountryFlag={showBirthCountryFlag}
              onShowBirthCountryFlagChange={setShowBirthCountryFlag}
              showCurrentCountryFlag={showCurrentCountryFlag}
              onShowCurrentCountryFlagChange={setShowCurrentCountryFlag}
              onResetView={() => setTreeViewResetSignal((prev) => prev + 1)}
            />
          </div>
        </motion.div>

        {filterMember && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mb-4 rounded-xl border border-gold-400/20 bg-gold-400/[0.08] px-4 py-3 text-xs text-white/70"
          >
            Highlighting blood relatives of{" "}
            <span className="text-gold-300 font-medium">
              {filterMember.first_name} {filterMember.last_name}
            </span>{" "}
            ({highlightedIds.size} member{highlightedIds.size !== 1 ? "s" : ""}).
          </motion.div>
        )}

        <div
          className={cn(
            "grid gap-4 sm:gap-5 items-start",
            selectedMember ? "grid-cols-1 lg:grid-cols-[1fr_320px]" : "grid-cols-1"
          )}
        >
          <GlassCard className="p-4 sm:p-5 min-w-0">
            <motion.div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-serif text-lg text-white/92">Family Network</h2>
                <p className="text-xs text-white/35 mt-0.5">Click empty space to collapse the detail panel</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[11px] text-white/60">
                <GitBranch size={12} /> {members.length} members
              </span>
            </motion.div>

            <FamilyTree
              members={treeMembers}
              sibships={treeLayout.sibships}
              connections={treeLayout.connections}
              highlightedMembers={highlightedIds}
              dimNonHighlighted={!!relatedByFilter}
              viewerId={viewer.id}
              showPercentages={showPercentages}
              showRelationLabels={showRelationLabels}
              showLastNames={showLastNames}
              showBirthYear={showBirthYear}
              showDeathYear={showDeathYear}
              showBirthCountryFlag={showBirthCountryFlag}
              showCurrentCountryFlag={showCurrentCountryFlag}
              viewResetSignal={treeViewResetSignal}
              showHoverCard
              onMemberClick={handleMemberClick}
              onBackgroundClick={() => setSelectedMemberId(null)}
              canvasWidth={treeLayout.width}
              canvasHeight={treeLayout.height}
              fitPadding={32}
            />
          </GlassCard>

          <AnimatePresence>
            {selectedMember && (
              <motion.div
                key={selectedMember.id}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 24 }}
                transition={{ duration: 0.2 }}
                className="min-w-[280px] w-full lg:w-[320px]"
              >
                <GlassCard className="p-5 lg:sticky lg:top-6 h-fit">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <motion.div>
                      <h3 className="font-serif text-xl text-white/93">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </h3>
                      {selectedMember.display_name && (
                        <p className="text-xs text-gold-300/85 mt-0.5">{selectedMember.display_name}</p>
                      )}
                      {selectedMatch && (
                        <p className="text-xs text-white/48 mt-1">
                          {selectedMatch.relationship} · {selectedMatch.percentage}% match
                        </p>
                      )}
                    </motion.div>
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(null)}
                      className="w-8 h-8 rounded-lg text-white/45 hover:text-white/82 hover:bg-white/[0.05] shrink-0"
                      aria-label="Close details"
                    >
                      <X size={14} className="mx-auto" />
                    </button>
                  </div>

                  <div className="space-y-2.5 text-sm">
                    <DetailRow icon={User} label="Gender" value={formatGenderLabel(selectedMember.gender) || "Not set"} />
                    <DetailRow icon={MapPin} label="City" value={selectedMember.location_city || "Not set"} />
                    <DetailRow icon={Briefcase} label="Profession" value={selectedMember.profession || "Not set"} />
                    <DetailRow
                      icon={Calendar}
                      label="Birth"
                      value={`${formatBirthDate(selectedMember.date_of_birth)}${selectedAge !== null ? ` (${selectedAge})` : ""}`}
                    />
                    <DetailRow
                      icon={PawPrint}
                      label="Pets"
                      value={selectedMember.pets.length ? selectedMember.pets.join(", ") : "None"}
                    />
                  </div>

                  {selectedMember.about_me && (
                    <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">About</p>
                      <p className="text-xs text-white/72 leading-relaxed">{selectedMember.about_me}</p>
                    </div>
                  )}

                  <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                    <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">Health Conditions</p>
                    {selectedConditions.length === 0 ? (
                      <p className="text-xs text-white/50">No recorded conditions</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedConditions.slice(0, 8).map((condition) => (
                          <span
                            key={condition.id}
                            className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/74"
                          >
                            {condition.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push(`/demo/profile/${selectedMember.id}`)}
                    className="mt-4 w-full h-10 rounded-xl bg-gold-400/14 border border-gold-400/25 text-sm text-gold-300 hover:bg-gold-400/20 transition-colors"
                  >
                    Open Full Profile
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <GlassCard className={cn("p-4 sm:p-5", selectedMember && "lg:col-span-2 mt-5")}>
            <h2 className="font-serif text-lg text-white/92 mb-3">Members Table</h2>
            <p className="text-xs text-white/35 mb-4">
              View every {demoFamily.shortLabel} relative. Click a row to open the detail panel, or use filters on the tree above.
            </p>
            <FamilyMembersTable
              members={members}
              canEdit={false}
              onUpdate={async () => {}}
              onMemberClick={handleMemberClick}
            />
          </GlassCard>
        </div>

        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <SiteFooter />
        </footer>
      </main>
    </motion.div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-white/[0.06] bg-white/[0.015] px-2.5 py-2">
      <Icon size={13} className="text-white/35 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
        <p className="text-sm text-white/82 break-words">{value}</p>
      </div>
    </div>
  );
}
