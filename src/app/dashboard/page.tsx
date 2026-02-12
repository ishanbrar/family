"use client";

// ══════════════════════════════════════════════════════════
// Dashboard – Main Family Hub
// Loads data from Supabase (or mock) via useFamilyData.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  HeartPulse,
  MapPin,
  Activity,
  Command,
  Search,
  Filter,
  X,
  UserPlus,
  ChevronDown,
  Loader2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { CommandSearch } from "@/components/ui/CommandSearch";
import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { FamilyTree } from "@/components/tree/FamilyTree";
import type { TreeConnection } from "@/components/tree/FamilyTree";
import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { useFamilyData } from "@/hooks/use-family-data";
import { useFamilyStore } from "@/store/family-store";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import { groupByCountry, type CountryGroup } from "@/lib/country-utils";
import type { MedicalCondition, Profile, RelationshipType } from "@/lib/types";

// ── Tree layout constants ────────────────────────
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

export default function DashboardPage() {
  const router = useRouter();
  const {
    viewer,
    members,
    relationships,
    conditions,
    userConditions,
    loading,
    isOnline,
    addMember: addMemberAction,
  } = useFamilyData();

  const { relatedByFilter, setRelatedByFilter } = useFamilyStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);

  const navigateToProfile = useCallback(
    (id: string) => router.push(`/profile/${id}`),
    [router]
  );

  const handleConditionSelect = useCallback(
    (_condition: MedicalCondition) => { router.push("/health"); },
    [router]
  );

  // ── Build tree members ──────────────────────────
  const treeMembers = useMemo(() => {
    if (!viewer) return [];
    return members.filter((p) => TREE_POSITIONS[p.id]).map((p) => ({
      profile: p,
      match: calculateGeneticMatch(viewer.id, p.id, relationships),
      ...TREE_POSITIONS[p.id],
    }));
  }, [viewer, members, relationships]);

  // ── "Related By" highlighting ───────────────────
  const highlightedIds = useMemo(() => {
    if (!relatedByFilter) return new Set<string>();
    return findBloodRelatives(relatedByFilter, members.map((p) => p.id), relationships);
  }, [relatedByFilter, members, relationships]);

  // ── Blood Match gallery ─────────────────────────
  const memberMatches = useMemo(() => {
    if (!viewer) return [];
    return members.filter((p) => p.id !== viewer.id).map((p) => ({
      profile: p,
      match: calculateGeneticMatch(viewer.id, p.id, relationships),
    }));
  }, [viewer, members, relationships]);

  // ── Country groups ──────────────────────────────
  const countryGroups = useMemo(() => groupByCountry(members), [members]);

  // ── Handle Add Member ───────────────────────────
  const handleAddMember = useCallback(
    async (
      memberData: Omit<Profile, "id" | "created_at" | "updated_at">,
      rel: { relativeId: string; type: RelationshipType }
    ) => {
      await addMemberAction(memberData, rel);
    },
    [addMemberAction]
  );

  if (loading || !viewer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={24} className="text-gold-400 animate-spin" />
          <p className="text-xs text-white/30">Loading family data...</p>
        </div>
      </div>
    );
  }

  // Stats
  const totalMembers = members.length;
  const livingMembers = members.filter((m) => m.is_alive).length;
  const totalConditions = userConditions.length;
  const locations = new Set(members.map((m) => m.location_city).filter(Boolean)).size;
  const filterMember = relatedByFilter ? members.find((p) => p.id === relatedByFilter) : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <CommandSearch conditions={conditions} onSelect={handleConditionSelect} />
      <AddMemberModal
        existingMembers={members}
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddMember}
      />

      <main className="ml-[72px] lg:ml-[240px] p-6 lg:p-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="font-serif text-3xl font-bold text-white/95">
              Welcome back,{" "}
              <span style={{
                background: "linear-gradient(135deg, #d4a574, #e8c99a)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}>
                {viewer.first_name}
              </span>
            </h1>
            <p className="text-sm text-white/35 mt-1 flex items-center gap-2">
              Your family legacy at a glance
              {isOnline ? (
                <span className="inline-flex items-center gap-1 text-[10px] text-severity-mild/60">
                  <Wifi size={10} /> Live
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[10px] text-white/20">
                  <WifiOff size={10} /> Demo
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                bg-gold-400/10 text-gold-300 text-sm font-medium
                hover:bg-gold-400/15 transition-colors border border-gold-400/10"
            >
              <UserPlus size={14} />
              <span className="hidden sm:inline">Add Member</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass flex items-center gap-3 px-4 py-2.5 rounded-xl
                text-sm text-white/30 hover:text-white/50 transition-colors"
              onClick={() => useFamilyStore.getState().setCommandOpen(true)}
            >
              <Search size={14} />
              <span className="hidden sm:inline">Search conditions...</span>
              <kbd className="ml-2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] font-mono border border-white/10">
                <Command size={10} />K
              </kbd>
            </motion.button>
          </div>
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Family Members", value: totalMembers, icon: Users, color: "text-gold-300" },
            { label: "Living", value: livingMembers, icon: Activity, color: "text-severity-mild" },
            { label: "Health Records", value: totalConditions, icon: HeartPulse, color: "text-severity-moderate" },
            { label: "Locations", value: locations, icon: MapPin, color: "text-gold-400" },
          ].map((stat, i) => {
            const Icon = stat.icon;
            return (
              <GlassCard key={stat.label} className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-white/35 font-medium uppercase tracking-wider">{stat.label}</p>
                    <motion.p
                      initial={{ opacity: 0, scale: 0.5 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + i * 0.1, type: "spring" }}
                      className="text-2xl font-serif font-bold text-white/90 mt-1"
                    >
                      {stat.value}
                    </motion.p>
                  </div>
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5">
                    <Icon size={18} className={stat.color} />
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* ── Family Tree (2 cols) ─────────────── */}
          <GlassCard className="xl:col-span-2 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-serif text-xl font-semibold text-white/90">Family Tree</h2>
                <p className="text-xs text-white/30 mt-0.5">Genetic relationships from your perspective</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={12} className="text-white/25" />
                  <select
                    value={relatedByFilter || ""}
                    onChange={(e) => setRelatedByFilter(e.target.value || null)}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-lg px-3 py-1.5 text-xs text-white/60 outline-none focus:border-gold-400/30 transition-colors appearance-none cursor-pointer pr-6"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='rgba(255,255,255,0.3)' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "right 8px center",
                    }}
                  >
                    <option value="">Related By...</option>
                    {members.map((p) => (
                      <option key={p.id} value={p.id}>{p.first_name} {p.last_name}</option>
                    ))}
                  </select>
                  {relatedByFilter && (
                    <motion.button
                      initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.9 }}
                      onClick={() => setRelatedByFilter(null)}
                      className="flex items-center justify-center w-6 h-6 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-white/30"
                    >
                      <X size={12} />
                    </motion.button>
                  )}
                </div>
                <div className="hidden md:flex items-center gap-2 text-[10px] text-white/25">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold-300" /> 50%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold-500" /> 25%</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gold-700" /> 12.5%</span>
                </div>
              </div>
            </div>

            {filterMember && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                className="mb-4 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex items-center gap-3"
              >
                <Filter size={14} className="text-gold-400/60 shrink-0" />
                <p className="text-xs text-white/50">
                  Showing blood relatives of{" "}
                  <span className="text-gold-300 font-medium">{filterMember.first_name} {filterMember.last_name}</span>
                  {" "}&mdash; {highlightedIds.size} member{highlightedIds.size !== 1 ? "s" : ""} share blood
                </p>
              </motion.div>
            )}

            <FamilyTree
              members={treeMembers}
              connections={TREE_CONNECTIONS}
              highlightedMembers={highlightedIds}
              dimNonHighlighted={!!relatedByFilter}
              onMemberClick={(id) => navigateToProfile(id)}
            />
          </GlassCard>

          {/* ── Right Column ─────────────────────── */}
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h2 className="font-serif text-lg font-semibold text-white/90 mb-1">Family Worldwide</h2>
              <p className="text-xs text-white/30 mb-4">{locations} cities across the globe</p>
              <div className="flex gap-4">
                <div className="flex-1 flex justify-center">
                  <InteractiveGlobe
                    members={members}
                    onMemberClick={(member) => navigateToProfile(member.id)}
                  />
                </div>
                {countryGroups.length > 0 && (
                  <div className="w-[130px] flex flex-col gap-1 overflow-y-auto max-h-[300px] pr-1"
                    style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.05) transparent" }}>
                    {countryGroups.map((g) => (
                      <CountryRow key={g.code} group={g}
                        isExpanded={expandedCountry === g.code}
                        onToggle={() => setExpandedCountry(expandedCountry === g.code ? null : g.code)}
                        onMemberClick={navigateToProfile} />
                    ))}
                  </div>
                )}
              </div>
            </GlassCard>
            <ProfileCard profile={viewer} isViewer />
          </div>
        </div>

        {/* ── Blood Match Gallery ─────────────────── */}
        <GlassCard className="mt-6 p-6">
          <h2 className="font-serif text-xl font-semibold text-white/90 mb-1">Blood Match</h2>
          <p className="text-xs text-white/30 mb-6">Genetic relationship coefficients from your perspective</p>
          <div className="flex gap-8 overflow-x-auto pb-4">
            {memberMatches
              .sort((a, b) => b.match.percentage - a.match.percentage)
              .map((item) => (
                <motion.div key={item.profile.id}
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="flex flex-col items-center shrink-0 cursor-pointer"
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

// ── Country Row ──────────────────────────────────
function CountryRow({ group, isExpanded, onToggle, onMemberClick }: {
  group: CountryGroup; isExpanded: boolean; onToggle: () => void; onMemberClick: (id: string) => void;
}) {
  return (
    <div>
      <button onClick={onToggle}
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
                  {m.avatar_url ? (
                    <img src={m.avatar_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-gold-400/10 flex items-center justify-center text-[7px] text-gold-400/60 font-medium">
                      {m.first_name[0]}
                    </div>
                  )}
                  <span className="text-[10px] text-white/40 hover:text-white/60 truncate">
                    {m.first_name} {m.last_name}
                  </span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
