"use client";

// ══════════════════════════════════════════════════════════
// Demo – Sample family, no auth required.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useCallback, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  GitBranch,
  Filter,
  ChevronDown,
  MoreHorizontal,
  Download,
  Loader2,
  UserPlus,
  GitFork,
} from "lucide-react";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GlassCard } from "@/components/ui/GlassCard";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { TreeControls } from "@/components/tree/TreeControls";
import { GenerationInsights } from "@/components/tree/GenerationInsights";
import { useFamilyStore } from "@/store/family-store";
import { useSelectedDemoFamily } from "@/lib/demo-family";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import { groupByCountry, type CountryGroup } from "@/lib/country-utils";
import { createGenerationAnalytics } from "@/lib/generation-insights";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { createRoyalDemoTreeLayout } from "@/lib/royal-demo-layout";
import { exportFamilyTreeAsImage } from "@/lib/tree-export";
import { UpcomingMilestonesSection } from "@/components/dashboard/UpcomingMilestonesSection";

export default function DemoPage() {
  const router = useRouter();
  const store = useFamilyStore();
  const demoFamily = useSelectedDemoFamily();
  const [expandedCountry, setExpandedCountry] = useState<string | null>(null);
  const [focusedCountryCode, setFocusedCountryCode] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const [showPercentages, setShowPercentages] = useState(false);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [showLastNames, setShowLastNames] = useState(true);
  const [showBirthYear, setShowBirthYear] = useState(true);
  const [showDeathYear, setShowDeathYear] = useState(false);
  const [showBirthCountryFlag, setShowBirthCountryFlag] = useState(false);
  const [showCurrentCountryFlag, setShowCurrentCountryFlag] = useState(false);
  const [treeViewResetSignal, setTreeViewResetSignal] = useState(0);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [exportingTree, setExportingTree] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    store.setViewer(demoFamily.profiles[0] ?? null);
    store.setMembers(demoFamily.profiles);
    store.setRelationships(demoFamily.relationships);
    store.setRelatedByFilter(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoFamily.key]);

  const viewer = store.viewer;
  const members = store.members.length > 0 ? store.members : demoFamily.profiles;
  const relationships = store.relationships.length > 0 ? store.relationships : demoFamily.relationships;

  const navigateToProfile = useCallback(
    (id: string) => router.push(`/demo/profile/${id}`),
    [router]
  );

  const treeLayout = useMemo(
    () =>
      viewer
        ? demoFamily.key === "windsor"
          ? createRoyalDemoTreeLayout(members, relationships)
          : createFamilyTreeLayout(members, relationships, viewer.id)
        : null,
    [demoFamily.key, viewer, members, relationships]
  );

  const treeMembers = useMemo(() => {
    if (!viewer || !treeLayout) return [];
    return treeLayout.nodes.map((node) => ({
      profile: node.profile,
      match: calculateGeneticMatch(viewer.id, node.profile.id, relationships, node.profile.gender),
      x: node.x,
      y: node.y,
      generation: node.generation,
    }));
  }, [viewer, treeLayout, relationships]);

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

  const handleFocusCountry = useCallback((code: string) => {
    setFocusedCountryCode(code);
    setFocusSignal((prev) => prev + 1);
  }, []);

  const handleExportTree = useCallback(async () => {
    if (!viewer) return;
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
      setMoreActionsOpen(false);
    }
  }, [demoFamily.exportFamilyName, members, relationships, viewer]);

  useEffect(() => {
    if (!moreActionsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!moreActionsRef.current) return;
      if (!moreActionsRef.current.contains(event.target as Node)) {
        setMoreActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [moreActionsOpen]);

  if (!viewer) return null;

  const totalMembers = members.length;
  const totalGenerations = generationAnalytics.totalGenerations;
  const filterMember = store.relatedByFilter ? members.find((p) => p.id === store.relatedByFilter) : null;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <DemoSidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        {/* Demo banner */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <p className="text-xs text-white/50">
            You&apos;re viewing the <span className="text-gold-300 font-medium">{demoFamily.shortLabel}</span> sample family.{" "}
            <Link href="/demo/select" className="text-gold-400 hover:text-gold-300 underline transition-colors">Switch demo</Link>
            {" "}or{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline transition-colors">Join</Link>
            {" "}or{" "}
            <Link href="/" className="text-gold-400 hover:text-gold-300 underline transition-colors">Create</Link>
            {" "}your own family to get started.
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
            <p className="text-sm text-white/35 mt-1">Your family tree at a glance</p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/45">
            Demo mode is read-only
          </div>
        </motion.div>

        <UpcomingMilestonesSection
          members={members}
          relationships={relationships}
          onMemberClick={(id) => router.push(`/demo/profile/${id}`)}
        />

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <GlassCard className="xl:col-span-2 p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-6 gap-3">
              <h2 className="font-serif text-xl font-semibold text-white/90">Family Tree</h2>
              <div className="flex w-full sm:w-auto items-center gap-2.5 flex-wrap sm:flex-nowrap sm:justify-end">
                <TreeControls
                  members={members}
                  relatedByFilter={store.relatedByFilter}
                  onRelatedByFilterChange={store.setRelatedByFilter}
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

                <div className="relative" ref={moreActionsRef}>
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="button"
                    onClick={() => setMoreActionsOpen((prev) => !prev)}
                    className="inline-flex items-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl border border-white/[0.10]
                      bg-white/[0.03] text-sm text-white/72 hover:text-white/88 hover:bg-white/[0.05]
                      active:scale-[0.98] transition-colors touch-target-44"
                    aria-haspopup="menu"
                    aria-expanded={moreActionsOpen}
                  >
                    <MoreHorizontal size={14} />
                    More
                  </motion.button>

                  {moreActionsOpen && (
                    <div
                      role="menu"
                      className="absolute right-0 top-full mt-2 w-56 rounded-xl app-popover border border-white/[0.12] p-2 shadow-2xl z-40"
                    >
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Demo mode is read-only"
                        className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/30 bg-white/[0.02] cursor-not-allowed inline-flex items-center gap-2"
                      >
                        <UserPlus size={14} />
                        Add Member
                      </button>
                      <button
                        type="button"
                        disabled
                        aria-disabled="true"
                        title="Demo mode is read-only"
                        className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/30 bg-white/[0.02] cursor-not-allowed inline-flex items-center gap-2"
                      >
                        <GitFork size={14} />
                        Modify Relationships
                      </button>
                      <button
                        type="button"
                        onClick={handleExportTree}
                        disabled={exportingTree}
                        className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/78 hover:text-white/92 hover:bg-white/[0.05] transition-colors inline-flex items-center gap-2 disabled:opacity-50"
                      >
                        {exportingTree ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Export Tree
                      </button>
                    </div>
                  )}
                </div>
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
            <FamilyTree members={treeMembers} connections={treeLayout?.connections || []}
              sibships={treeLayout?.sibships || []}
              highlightedMembers={highlightedIds} dimNonHighlighted={!!store.relatedByFilter}
              viewerId={viewer.id}
              showPercentages={showPercentages}
              showRelationLabels={showRelationLabels}
              showLastNames={showLastNames}
              showBirthYear={showBirthYear}
              showDeathYear={showDeathYear}
              showBirthCountryFlag={showBirthCountryFlag}
              showCurrentCountryFlag={showCurrentCountryFlag}
              viewResetSignal={treeViewResetSignal}
              onMemberClick={(id) => navigateToProfile(id)}
              canvasWidth={treeLayout?.width}
              canvasHeight={treeLayout?.height} />
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
              <div className="flex flex-col gap-4">
                <div className="flex-1 flex justify-center">
                  <InteractiveGlobe
                    members={members}
                    focusCountryCode={focusedCountryCode}
                    focusSignal={focusSignal}
                    onMemberClick={(m) => navigateToProfile(m.id)}
                    onGlobeOpen={() => router.push("/demo/world")}
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
            <ProfileCard profile={viewer} isViewer compactViewer />
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

        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <SiteFooter />
        </footer>
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
