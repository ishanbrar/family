"use client";

// ══════════════════════════════════════════════════════════
// Demo – Sample Montague family, no auth required.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  GitBranch,
  Filter,
  X,
  UserPlus,
  ChevronDown,
  Crown,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { GenerationInsights } from "@/components/tree/GenerationInsights";
import type { TreeConnection } from "@/components/tree/FamilyTree";
import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { useFamilyStore } from "@/store/family-store";
import {
  MOCK_PROFILES,
  MOCK_RELATIONSHIPS,
} from "@/lib/mock-data";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import { groupByCountry, type CountryGroup } from "@/lib/country-utils";
import { createGenerationAnalytics } from "@/lib/generation-insights";
import type { Profile, RelationshipType } from "@/lib/types";

const TREE_POSITIONS: Record<string, { x: number; y: number }> = {
  "grandparent-001": { x: 330, y: 80 },
  "grandparent-002": { x: 470, y: 80 },
  "parent-001": { x: 240, y: 270 },
  "parent-002": { x: 380, y: 270 },
  "uncle-001": { x: 600, y: 270 },
  "viewer-001": { x: 240, y: 460 },
  "sibling-001": { x: 380, y: 460 },
  "cousin-001": { x: 600, y: 460 },
};

const TREE_CONNECTIONS: TreeConnection[] = [
  { from: "grandparent-001", to: "grandparent-002", type: "spouse" },
  { from: "parent-001", to: "parent-002", type: "spouse" },
  { from: "grandparent-001", to: "parent-001", type: "parent" },
  { from: "grandparent-002", to: "parent-001", type: "parent" },
  { from: "grandparent-001", to: "uncle-001", type: "parent" },
  { from: "grandparent-002", to: "uncle-001", type: "parent" },
  { from: "parent-001", to: "viewer-001", type: "parent" },
  { from: "parent-002", to: "viewer-001", type: "parent" },
  { from: "parent-001", to: "sibling-001", type: "parent" },
  { from: "parent-002", to: "sibling-001", type: "parent" },
  { from: "uncle-001", to: "cousin-001", type: "parent" },
];

export default function DemoPage() {
  const router = useRouter();
  const store = useFamilyStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [focusedCountryCode, setFocusedCountryCode] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [showPercentages, setShowPercentages] = useState(true);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [showLastNames, setShowLastNames] = useState(false);

  useEffect(() => {
    store.setViewer(MOCK_PROFILES[0]);
    store.setMembers(MOCK_PROFILES);
    store.setRelationships(MOCK_RELATIONSHIPS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewer = store.viewer;
  const members = store.members.length > 0 ? store.members : MOCK_PROFILES;
  const relationships = store.relationships.length > 0 ? store.relationships : MOCK_RELATIONSHIPS;

  const navigateToProfile = useCallback(
    (id: string) => router.push(`/demo/profile/${id}`),
    [router]
  );

  const treeMembers = useMemo(() => {
    if (!viewer) return [];
    return members.filter((p) => TREE_POSITIONS[p.id]).map((p) => ({
      profile: p,
      match: calculateGeneticMatch(viewer.id, p.id, relationships, p.gender),
      ...TREE_POSITIONS[p.id],
    }));
  }, [viewer, members, relationships]);

  const generationAnalytics = useMemo(
    () => createGenerationAnalytics(treeMembers),
    [treeMembers]
  );

  const highlightedIds = useMemo(() => {
    if (!store.relatedByFilter) return new Set<string>();
    return findBloodRelatives(store.relatedByFilter, members.map((p) => p.id), relationships);
  }, [store.relatedByFilter, members, relationships]);

  const memberMatches = useMemo(() => {
    if (!viewer) return [];
    return members.filter((p) => p.id !== viewer.id).map((p) => ({
      profile: p,
      match: calculateGeneticMatch(viewer.id, p.id, relationships, p.gender),
    }));
  }, [viewer, members, relationships]);

  const countryGroups = useMemo(() => groupByCountry(members), [members]);

  const handleAddMember = useCallback(
    (
      memberData: Omit<Profile, "id" | "created_at" | "updated_at">,
      rel: { relativeId: string; type: RelationshipType },
      avatarFile?: File
    ) => {
      const newId = `member-${Date.now()}`;
      const now = new Date().toISOString();
      const localAvatar = avatarFile ? URL.createObjectURL(avatarFile) : memberData.avatar_url;
      store.addMember({
        ...memberData,
        avatar_url: localAvatar,
        id: newId,
        created_at: now,
        updated_at: now,
      });
      store.addRelationship({ id: `rel-${Date.now()}`, user_id: newId, relative_id: rel.relativeId, type: rel.type, created_at: now });
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleFocusCountry = useCallback((code: string) => {
    setFocusedCountryCode(code);
    setFocusSignal((prev) => prev + 1);
  }, []);

  if (!viewer) return null;

  const totalMembers = members.length;
  const totalGenerations = generationAnalytics.totalGenerations;
  const locations = new Set(members.map((m) => m.location_city).filter(Boolean)).size;
  const filterMember = store.relatedByFilter ? members.find((p) => p.id === store.relatedByFilter) : null;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      {/* Lightweight demo sidebar */}
      <motion.aside
        initial={{ x: -80, opacity: 0 }} animate={{ x: 0, opacity: 1 }}
        className="fixed left-0 top-0 bottom-0 w-[72px] z-40 glass border-r border-white/[0.06] hidden md:flex flex-col items-center py-4"
      >
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold-400/10 mb-6">
          <Crown size={18} className="text-gold-400" />
        </div>
        <div className="mt-auto px-2 py-2">
          <a href="/login"
            className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-400/10 text-gold-300 text-[10px] font-bold hover:bg-gold-400/15 transition-colors"
            title="Sign in for full experience">
            GO
          </a>
        </div>
      </motion.aside>

      <div
        className="fixed md:hidden inset-x-0 bottom-0 z-40 app-surface border-t border-white/[0.08]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
        }}
      >
        <div className="grid grid-cols-2 gap-2 px-2 py-2">
          <a
            href="/demo"
            className="h-12 rounded-xl flex items-center justify-center text-xs font-medium bg-gold-400/12 text-gold-300"
          >
            Demo
          </a>
          <a
            href="/login"
            className="h-12 rounded-xl flex items-center justify-center text-xs font-medium bg-white/[0.04] border border-white/[0.12] text-white/75 hover:text-white/92 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>

      <AddMemberModal existingMembers={members} isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)} onAdd={handleAddMember} />

      <main className="ml-0 md:ml-[72px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        {/* Demo banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-white/50">
            You&apos;re viewing the <span className="text-gold-300 font-medium">Montague</span> sample family.{" "}
            <a href="/signup" className="text-gold-400 hover:text-gold-300 underline transition-colors">Create your own family</a> to get started.
          </p>
          <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-lg">DEMO</span>
        </motion.div>

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold text-white/95">
              Welcome back,{" "}
              <span style={{ background: "linear-gradient(135deg, var(--accent-300), var(--accent-200))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                {viewer.first_name}
              </span>
            </h1>
            <p className="text-sm text-white/35 mt-1">Your family legacy at a glance</p>
          </div>
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-400/10 text-gold-300 text-sm font-medium hover:bg-gold-400/15 transition-colors border border-gold-400/10">
              <UserPlus size={14} /><span className="hidden sm:inline">Add Member</span>
            </motion.button>
          </div>
        </motion.div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <GlassCard className="xl:col-span-2 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
              <div>
                <h2 className="font-serif text-xl font-semibold text-white/90">Family Tree</h2>
                <p className="text-xs text-white/30 mt-0.5">Genetic relationships from your perspective</p>
              </div>
              <div className="flex w-full sm:w-auto items-center gap-2.5 flex-wrap sm:justify-end">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Filter size={12} className="text-white/25" />
                  <select value={store.relatedByFilter || ""}
                    onChange={(e) => store.setRelatedByFilter(e.target.value || null)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/60 outline-none focus:border-gold-400/30 transition-colors appearance-none cursor-pointer pr-6"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center",
                    }}>
                    <option value="">Related By...</option>
                    {members.map((p) => (<option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>))}
                  </select>
                  {store.relatedByFilter && (
                    <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => store.setRelatedByFilter(null)}
                      className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/30">
                      <X size={12} />
                    </motion.button>
                  )}
                </div>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-white/45 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPercentages}
                    onChange={(e) => setShowPercentages(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400 focus:ring-gold-400/30"
                  />
                  Show %
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-white/45 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRelationLabels}
                    onChange={(e) => setShowRelationLabels(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400 focus:ring-gold-400/30"
                  />
                  Show relations
                </label>
                <label className="inline-flex items-center gap-1.5 text-[11px] text-white/45 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLastNames}
                    onChange={(e) => setShowLastNames(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400 focus:ring-gold-400/30"
                  />
                  Show last names
                </label>
              </div>
            </div>
            {filterMember && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="mb-4 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex items-center gap-3">
                <Filter size={14} className="text-gold-400/60 shrink-0" />
                <p className="text-xs text-white/50">
                  Showing blood relatives of <span className="text-gold-300 font-medium">{filterMember.first_name} {filterMember.last_name}</span>
                  {" "}&mdash; {highlightedIds.size} member{highlightedIds.size !== 1 ? "s" : ""} share blood
                </p>
              </motion.div>
            )}
            <FamilyTree members={treeMembers} connections={TREE_CONNECTIONS}
              highlightedMembers={highlightedIds} dimNonHighlighted={!!store.relatedByFilter}
              viewerId={viewer.id}
              showPercentages={showPercentages}
              showRelationLabels={showRelationLabels}
              showLastNames={showLastNames}
              onMemberClick={(id) => navigateToProfile(id)} />
            <div className="mt-4 mb-4 grid grid-cols-2 gap-3">
              {[
                { label: "Family Members", value: totalMembers, icon: Users, color: "text-gold-300" },
                { label: "Generations", value: totalGenerations, icon: GitBranch, color: "text-severity-mild" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-[10px] text-white/35 font-medium uppercase tracking-wider">{stat.label}</p>
                      <Icon size={13} className={stat.color} />
                    </div>
                    <p className="mt-1.5 text-lg font-serif font-semibold text-white/90">{stat.value}</p>
                  </div>
                );
              })}
            </div>
            <GenerationInsights analytics={generationAnalytics} />
          </GlassCard>

          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="font-serif text-lg font-semibold text-white/90 mb-1">Family Worldwide</h2>
              <p className="text-xs text-white/30 mb-4">{locations} cities across the globe</p>
              <div className="flex flex-col gap-4">
                <div className="flex-1 flex justify-center">
                  <InteractiveGlobe
                    members={members}
                    focusCountryCode={focusedCountryCode}
                    focusSignal={focusSignal}
                    onMemberClick={(m) => navigateToProfile(m.id)}
                  />
                </div>
                {countryGroups.length > 0 && (
                  <div className="w-full flex flex-col gap-1 overflow-y-auto max-h-[220px] lg:max-h-[300px] pr-1"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.05) transparent" }}>
                    {countryGroups.map((g) => (
                      <CountryRow key={g.code} group={g} isExpanded={expandedCountry === g.code}
                        onToggle={() => setExpandedCountry(expandedCountry === g.code ? null : g.code)}
                        onFocusCountry={handleFocusCountry}
                        onMemberClick={navigateToProfile} />
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
            <ProfileCard profile={viewer} isViewer />
          </div>
        </div>

        {/* Blood Match */}
        <GlassCard className="mt-6 p-6">
          <h2 className="font-serif text-xl font-semibold text-white/90 mb-1">Blood Match</h2>
          <p className="text-xs text-white/30 mb-6">Genetic relationship coefficients from your perspective</p>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {memberMatches.sort((a, b) => b.match.percentage - a.match.percentage).map((item) => (
              <motion.div key={item.profile.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }} className="flex flex-col items-center shrink-0 cursor-pointer"
                onClick={() => navigateToProfile(item.profile.id)}>
                <GeneticMatchRing percentage={item.match.percentage} size={90} strokeWidth={2.5}
                  avatarUrl={item.profile.avatar_url}
                  initials={`${item.profile.first_name[0]}${item.profile.last_name[0]}`}
                  label={item.match.relationship} />
                <p className="mt-2 text-xs text-white/60 font-medium">{item.profile.first_name}</p>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      </main>
    </div>
  );
}

function CountryRow({ group, isExpanded, onToggle, onFocusCountry, onMemberClick }: {
  group: CountryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onFocusCountry: (code: string) => void;
  onMemberClick: (id: string) => void;
}) {
  return (
    <div>
      <button
        onClick={() => {
          onToggle();
          onFocusCountry(group.code);
        }}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition-colors text-left group">
        <span className="text-sm leading-none">{group.flag}</span>
        <span className="flex-1 text-[11px] text-white/50 group-hover:text-white/70 truncate transition-colors">{group.name}</span>
        <span className="text-[10px] text-gold-400/50 font-medium tabular-nums">{group.members.length}</span>
        <ChevronDown size={10} className={`text-white/20 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {isExpanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
            <div className="pl-7 pb-1">
              {group.members.map((m) => (
                <button key={m.id} onClick={() => onMemberClick(m.id)}
                  className="w-full flex items-center gap-2 px-2 py-1 rounded-md hover:bg-gold-400/[0.06] transition-colors text-left">
                  <div className="w-4 h-4 rounded-full bg-gold-400/10 flex items-center justify-center text-[7px] text-gold-400/60 font-medium">
                    {m.first_name[0]}
                  </div>
                  <span className="text-[10px] text-white/40 hover:text-white/60 truncate">{m.first_name} {m.last_name}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
