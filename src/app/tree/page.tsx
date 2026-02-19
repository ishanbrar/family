"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { GitBranch, Loader2, MapPin, Briefcase, Calendar, User, PawPrint, X, Edit3, Check } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { TreeControls } from "@/components/tree/TreeControls";
import { useFamilyData } from "@/hooks/use-family-data";
import { useFamilyStore } from "@/store/family-store";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
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

export default function TreeExplorerPage() {
  const router = useRouter();
  const { viewer, family, members, relationships, userConditions, conditions, loading, updateFamilyName } = useFamilyData();
  const { relatedByFilter, setRelatedByFilter } = useFamilyStore();

  const [showPercentages, setShowPercentages] = useState(false);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [showLastNames, setShowLastNames] = useState(true);
  const [showBirthYear, setShowBirthYear] = useState(true);
  const [showDeathYear, setShowDeathYear] = useState(false);
  const [showBirthCountryFlag, setShowBirthCountryFlag] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftFamilyName, setDraftFamilyName] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const treeLayout = useMemo(() => {
    if (!viewer) return { nodes: [], connections: [], sibships: [], width: 900, height: 620 };
    return createFamilyTreeLayout(members, relationships, viewer.id);
  }, [viewer, members, relationships]);

  const treeMembers = useMemo(() => {
    if (!viewer) return [];
    return treeLayout.nodes.map((node) => ({
      profile: node.profile,
      match: calculateGeneticMatch(viewer.id, node.profile.id, relationships, node.profile.gender),
      x: node.x,
      y: node.y,
      generation: node.generation,
    }));
  }, [viewer, treeLayout.nodes, relationships]);

  const highlightedIds = useMemo(() => {
    if (!relatedByFilter) return new Set<string>();
    return findBloodRelatives(relatedByFilter, members.map((p) => p.id), relationships);
  }, [relatedByFilter, members, relationships]);

  const selectedMember = useMemo(
    () => (selectedMemberId ? members.find((member) => member.id === selectedMemberId) || null : null),
    [members, selectedMemberId]
  );

  const selectedMatch = useMemo(() => {
    if (!viewer || !selectedMember) return null;
    return calculateGeneticMatch(viewer.id, selectedMember.id, relationships, selectedMember.gender);
  }, [viewer, selectedMember, relationships]);

  const selectedConditions = useMemo(() => {
    if (!selectedMember) return [];
    return userConditions
      .filter((uc) => uc.user_id === selectedMember.id)
      .map((uc) => uc.condition || conditions.find((c) => c.id === uc.condition_id))
      .filter((c): c is NonNullable<(typeof conditions)[number]> => !!c);
  }, [selectedMember, userConditions, conditions]);

  const handleMemberClick = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
  }, []);

  const canEditTitle = viewer?.role === "ADMIN" && !!family;
  const familyTreeTitle = useMemo(() => {
    const raw = (family?.name || `${viewer?.last_name || "Family"}`).trim();
    if (/family tree$/i.test(raw)) return raw;
    if (/family$/i.test(raw)) return `${raw} Tree`;
    return `The ${raw} Family Tree`;
  }, [family?.name, viewer?.last_name]);

  const startEditTitle = () => {
    if (!family) return;
    setDraftFamilyName(family.name);
    setEditingTitle(true);
  };

  const handleSaveTitle = async () => {
    if (!draftFamilyName.trim()) return;
    setSavingTitle(true);
    await updateFamilyName(draftFamilyName);
    setSavingTitle(false);
    setEditingTitle(false);
  };

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
          <p className="text-sm text-white/50 mb-3">You need to sign in to browse your family tree.</p>
          <a href="/login" className="text-sm text-gold-300 hover:text-gold-200 transition-colors">Go to login</a>
        </div>
      </div>
    );
  }

  const selectedAge = getAge(selectedMember?.date_of_birth || null);
  const filterMember = relatedByFilter ? members.find((m) => m.id === relatedByFilter) : null;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
        >
          <div>
            <h1 className="font-serif text-3xl font-bold text-white/95">{familyTreeTitle}</h1>
            <p className="text-sm text-white/40 mt-1">
              Browse your full family graph. Hover a member for quick info, click a member for detailed side panel.
            </p>
            {editingTitle && canEditTitle && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={draftFamilyName}
                  onChange={(e) => setDraftFamilyName(e.target.value)}
                  placeholder="Family name"
                  className="h-9 min-w-[260px] rounded-lg px-3 app-input text-sm outline-none"
                />
                <button
                  onClick={handleSaveTitle}
                  disabled={savingTitle || !draftFamilyName.trim()}
                  className="h-9 px-3 rounded-lg bg-gold-400/14 border border-gold-400/25 text-xs text-gold-300 hover:bg-gold-400/20 disabled:opacity-50"
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Check size={12} />
                    {savingTitle ? "Saving..." : "Save name"}
                  </span>
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="h-9 px-3 rounded-lg border border-white/[0.12] text-xs text-white/65 hover:text-white/85 hover:bg-white/[0.04]"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>

          <div className="flex w-full lg:w-auto flex-wrap items-center gap-2.5">
            {canEditTitle && !editingTitle && (
              <button
                onClick={startEditTitle}
                className="h-9 px-3 rounded-lg bg-white/[0.04] border border-white/[0.12] text-xs text-white/75 hover:text-white/92 hover:border-gold-400/28 hover:bg-gold-400/[0.08] transition-colors"
              >
                <span className="inline-flex items-center gap-1.5">
                  <Edit3 size={12} />
                  Rename tree
                </span>
              </button>
            )}
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
            />
          </div>
        </motion.div>

        {filterMember && (
          <div className="mb-4 rounded-xl border border-gold-400/20 bg-gold-400/[0.08] px-4 py-3 text-xs text-white/70">
            Highlighting blood relatives of <span className="text-gold-300 font-medium">{filterMember.first_name} {filterMember.last_name}</span>
            {" "}({highlightedIds.size} member{highlightedIds.size !== 1 ? "s" : ""}).
          </div>
        )}

        <div className={cn("grid gap-5 items-start", selectedMember ? "grid-cols-1 lg:grid-cols-3" : "grid-cols-1")}>
          <GlassCard className={cn("p-4 sm:p-5", selectedMember ? "lg:col-span-2" : "lg:col-span-1")}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-serif text-lg text-white/92">Family Network</h2>
                <p className="text-xs text-white/35 mt-0.5">Click empty space to collapse the detail panel</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[11px] text-white/60">
                <GitBranch size={12} /> {members.length} members
              </span>
            </div>

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
              showHoverCard
              onMemberClick={handleMemberClick}
              onBackgroundClick={() => setSelectedMemberId(null)}
              canvasWidth={treeLayout.width}
              canvasHeight={Math.max(treeLayout.height, 740)}
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
                className="lg:col-span-1"
              >
                <GlassCard className="p-5 sticky top-6">
                  <div className="flex items-start justify-between gap-2 mb-4">
                    <div>
                      <h3 className="font-serif text-xl text-white/93">
                        {selectedMember.first_name} {selectedMember.last_name}
                      </h3>
                      {selectedMember.display_name && (
                        <p className="text-xs text-gold-300/85 mt-0.5">{selectedMember.display_name}</p>
                      )}
                      {selectedMatch && (
                        <p className="text-xs text-white/48 mt-1">{selectedMatch.relationship} · {selectedMatch.percentage}% match</p>
                      )}
                    </div>
                    <button
                      onClick={() => setSelectedMemberId(null)}
                      className="w-8 h-8 rounded-lg text-white/45 hover:text-white/82 hover:bg-white/[0.05]"
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
                    <DetailRow icon={PawPrint} label="Pets" value={selectedMember.pets.length ? selectedMember.pets.join(", ") : "None"} />
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
                          <span key={condition.id} className="px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.08] text-[11px] text-white/74">
                            {condition.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => router.push(`/profile/${selectedMember.id}`)}
                    className="mt-4 w-full h-10 rounded-xl bg-gold-400/14 border border-gold-400/25 text-sm text-gold-300 hover:bg-gold-400/20 transition-colors"
                  >
                    Open Full Profile
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
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
