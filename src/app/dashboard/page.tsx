"use client";

// ══════════════════════════════════════════════════════════
// Dashboard – Main Family Hub
// Loads data from Supabase (or mock) via useFamilyData.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  GitBranch,
  Search,
  Filter,
  UserPlus,
  MailPlus,
  Clock3,
  Download,
  MoreHorizontal,
  Loader2,
  Share2,
  Copy,
  Check,
  Link2,
  LocateFixed,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GlassCard } from "@/components/ui/GlassCard";
import { LegatreeLoader } from "@/components/ui/LegatreeLoader";
import { ProfileCard } from "@/components/ui/ProfileCard";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { TreeControls } from "@/components/tree/TreeControls";
import { GenerationInsights } from "@/components/tree/GenerationInsights";
import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { ManageTreeModal } from "@/components/ui/ManageTreeModal";
import { InviteFamilyModal } from "@/components/ui/InviteFamilyModal";
import { UpcomingMilestonesSection } from "@/components/dashboard/UpcomingMilestonesSection";
import { FamilyOnboardingWizard } from "@/components/onboarding/FamilyOnboardingWizard";
import { useFamilyData } from "@/hooks/use-family-data";
import { useFamilyStore } from "@/store/family-store";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import type { Profile, RelationshipType } from "@/lib/types";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { createFocusedFamilyTreeLayout } from "@/lib/focused-family-layout";
import { createGenerationAnalytics } from "@/lib/generation-insights";
import { cn } from "@/lib/cn";
import { exportFamilyTreeAsImage, type ExportSideContent, type FamilyTreeExportOptions } from "@/lib/tree-export";
import { shouldPromptPostJoinLink } from "@/lib/flow-readiness";
import {
  calculateAggregateYearsLived,
  formatDisplayText,
  formatFamilyTreeTitle,
  formatProfileFullName,
  getProfileInitials,
} from "@/lib/display-format";

const ONBOARDING_SNOOZE_KEY = "legatree:onboarding-snoozed-until";
const POST_JOIN_LINK_ONLY_KEY = "legatree:post-join-link-only";
const DIRECT_RELATION_TYPES: RelationshipType[] = ["parent", "child", "sibling", "spouse", "half_sibling"];

export default function DashboardPage() {
  const router = useRouter();
  const {
    viewer,
    members,
    relationships,
    loading,
    isOnline,
    family,
    inviteCodes,
    updateProfile,
    updateFamilyRelationLanguage,
    addMember: addMemberAction,
    linkMembers,
    updateRelationship,
    unlinkRelationship,
    removeMember,
    regenerateInviteCode,
    createInviteCode,
    updateInviteCode,
    deleteInviteCode,
  } = useFamilyData();

  const { relatedByFilter, setRelatedByFilter } = useFamilyStore();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [suppressAutoOnboarding, setSuppressAutoOnboarding] = useState(false);
  const [focusedCountryCode, setFocusedCountryCode] = useState<string | null>(null);
  const [focusSignal, setFocusSignal] = useState(0);
  const globeHostRef = useRef<HTMLDivElement | null>(null);
  const [globeSize, setGlobeSize] = useState(360);
  const [memberSearchQuery, setMemberSearchQuery] = useState("");
  const [memberSearchOpen, setMemberSearchOpen] = useState(false);
  const [treeViewMode, setTreeViewMode] = useState<"close" | "whole">("whole");
  const [closeFamilyPovId, setCloseFamilyPovId] = useState("");
  const [showPercentages, setShowPercentages] = useState(false);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [showLastNames, setShowLastNames] = useState(true);
  const [showBirthYear, setShowBirthYear] = useState(true);
  const [showDeathYear, setShowDeathYear] = useState(false);
  const [showBirthCountryFlag, setShowBirthCountryFlag] = useState(false);
  const [showCurrentCountryFlag, setShowCurrentCountryFlag] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const [shareActionsOpen, setShareActionsOpen] = useState(false);
  const [copiedShareItem, setCopiedShareItem] = useState<"code" | "link" | null>(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportScope, setExportScope] = useState<"entire" | "related">("entire");
  const [exportingTree, setExportingTree] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportOptions, setExportOptions] = useState<FamilyTreeExportOptions>({
    showBirthDates: true,
    showDeathDates: true,
    nameMode: "full",
    avatarMode: "headshot",
    sideContent: ["worldMap", "countries"],
    profileMemberId: null,
  });
  const [onboardingSnoozedUntil, setOnboardingSnoozedUntil] = useState<number | null>(null);
  const [postJoinLinkOnlyRequired, setPostJoinLinkOnlyRequired] = useState(false);
  const moreActionsRef = useRef<HTMLDivElement | null>(null);
  const shareActionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = globeHostRef.current;
    if (!host) return;

    const updateSize = () => {
      const width = Math.floor(host.getBoundingClientRect().width);
      if (width <= 0) return;
      setGlobeSize(Math.max(260, Math.min(420, width)));
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const navigateToProfile = useCallback(
    (id: string) => router.push(`/profile/${id}`),
    [router]
  );

  // ── Build tree members ──────────────────────────
  // The whole-family layout always backs the summary stats + generation
  // insights so toggling the close/whole view never changes those numbers.
  const treeLayout = useMemo(() => {
    if (!viewer) return { nodes: [], connections: [], sibships: [], width: 800, height: 560 };
    return createFamilyTreeLayout(members, relationships, viewer.id);
  }, [viewer, members, relationships]);

  const closeTreeLayout = useMemo(() => {
    if (!viewer) return { nodes: [], connections: [], sibships: [], width: 800, height: 560 };
    const rootId = closeFamilyPovId && members.some((member) => member.id === closeFamilyPovId)
      ? closeFamilyPovId
      : viewer.id;
    return createFocusedFamilyTreeLayout(members, relationships, rootId);
  }, [closeFamilyPovId, viewer, members, relationships]);

  const displayTreeLayout = treeViewMode === "close" ? closeTreeLayout : treeLayout;
  const activeTreeRootId =
    treeViewMode === "close" && closeFamilyPovId && members.some((member) => member.id === closeFamilyPovId)
      ? closeFamilyPovId
      : viewer?.id ?? "";
  const closeFamilyPov = members.find((member) => member.id === activeTreeRootId) || viewer;

  const treeMembers = useMemo(() => {
    if (!viewer) return [];
    return displayTreeLayout.nodes.map((n) => ({
      profile: n.profile,
      match: calculateGeneticMatch(activeTreeRootId || viewer.id, n.profile.id, relationships, n.profile.gender, family?.relation_language, members),
      x: n.x,
      y: n.y,
      generation: n.generation,
    }));
  }, [activeTreeRootId, viewer, displayTreeLayout.nodes, relationships, family?.relation_language, members]);

  const generationAnalytics = useMemo(
    () => createGenerationAnalytics(treeLayout.nodes),
    [treeLayout.nodes]
  );

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
      match: calculateGeneticMatch(viewer.id, p.id, relationships, p.gender, family?.relation_language, members),
    }));
  }, [viewer, members, relationships, family?.relation_language]);

  const memberSearchResults = useMemo(() => {
    if (!viewer) return [];
    const q = memberSearchQuery.trim().toLowerCase();

    return members
      .map((member) => {
        const fullName = formatProfileFullName(member);
        const displayName = member.display_name ?? "";
        const relationship =
          member.id === viewer.id
            ? "Self"
            : calculateGeneticMatch(viewer.id, member.id, relationships, member.gender, family?.relation_language, members).relationship;
        const relationTokens = relationshipSearchTokens(relationship);
        const location = member.location_city ?? "";
        const profession = member.profession ?? "";
        const country = member.country_code ?? "";
        const haystack = [
          fullName,
          member.first_name,
          member.middle_name || "",
          member.last_name,
          member.name_prefix || "",
          displayName,
          location,
          profession,
          country,
          relationTokens.join(" "),
        ]
          .join(" ")
          .toLowerCase();

        let score = 0;
        if (!q) {
          score += member.id === viewer.id ? 120 : 80;
          if (location) score += 10;
          if (profession) score += 10;
        } else {
          const fullNameLower = fullName.toLowerCase();
          if (fullNameLower === q) score += 220;
          if (fullNameLower.startsWith(q)) score += 150;
          if (displayName.toLowerCase() === q) score += 180;
          if (displayName.toLowerCase().startsWith(q)) score += 130;
          if (member.first_name.toLowerCase().startsWith(q)) score += 120;
          if ((member.middle_name || "").toLowerCase().startsWith(q)) score += 90;
          if (member.last_name.toLowerCase().startsWith(q)) score += 120;
          if (relationship.toLowerCase().includes(q)) score += 95;
          if (profession.toLowerCase().includes(q)) score += 80;
          if (location.toLowerCase().includes(q)) score += 80;
          if (country.toLowerCase().includes(q)) score += 65;
          if (relationTokens.some((token) => token.includes(q))) score += 70;
          if (haystack.includes(q)) score += 55;
        }

        return {
          profile: member,
          relationship,
          score,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score ||
          formatProfileFullName(a.profile).localeCompare(formatProfileFullName(b.profile))
      )
      .slice(0, 8);
  }, [viewer, members, relationships, memberSearchQuery, family?.relation_language]);

  // ── Handle Add Member ───────────────────────────
  const handleAddMember = useCallback(
    async (
      memberData: Omit<Profile, "id" | "created_at" | "updated_at">,
      rel: { relativeId: string; type: RelationshipType; marriageDate?: string | null },
      avatarFile?: File
    ) => {
      await addMemberAction(memberData, rel, avatarFile);
    },
    [addMemberAction]
  );

  const handleSelectSearchMember = useCallback(
    (id: string) => {
      setMemberSearchOpen(false);
      setMemberSearchQuery("");
      navigateToProfile(id);
    },
    [navigateToProfile]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(ONBOARDING_SNOOZE_KEY);
    const parsed = raw ? Number(raw) : NaN;
    setOnboardingSnoozedUntil(Number.isFinite(parsed) ? parsed : null);
  }, []);

  useEffect(() => {
    if (!moreActionsOpen && !shareActionsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (moreActionsRef.current && !moreActionsRef.current.contains(target)) {
        setMoreActionsOpen(false);
      }
      if (shareActionsRef.current && !shareActionsRef.current.contains(target)) {
        setShareActionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMoreActionsOpen(false);
        setShareActionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [moreActionsOpen, shareActionsOpen]);

  useEffect(() => {
    if (typeof window === "undefined" || !viewer?.id) return;
    const raw = window.localStorage.getItem(POST_JOIN_LINK_ONLY_KEY);
    if (!raw) {
      setPostJoinLinkOnlyRequired(false);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as { userId?: string; required?: boolean };
      setPostJoinLinkOnlyRequired(parsed.userId === viewer.id && parsed.required === true);
    } catch {
      setPostJoinLinkOnlyRequired(false);
    }
  }, [viewer?.id]);

  const viewerHasDirectRelationship = useMemo(() => {
    if (!viewer) return false;
    return relationships.some(
      (rel) =>
        DIRECT_RELATION_TYPES.includes(rel.type) &&
        (rel.user_id === viewer.id || rel.relative_id === viewer.id)
    );
  }, [relationships, viewer]);

  /** User has been added to a real tree: other members exist and/or they have a direct family link. */
  const isEstablishedInTree = useMemo(
    () => members.length > 1 || viewerHasDirectRelationship,
    [members.length, viewerHasDirectRelationship]
  );

  useEffect(() => {
    if (typeof window === "undefined" || !viewer?.id) return;
    if (!postJoinLinkOnlyRequired) return;
    if (!viewerHasDirectRelationship) return;
    window.localStorage.removeItem(POST_JOIN_LINK_ONLY_KEY);
    setPostJoinLinkOnlyRequired(false);
  }, [postJoinLinkOnlyRequired, viewerHasDirectRelationship, viewer?.id]);

  useEffect(() => {
    if (!shouldPromptPostJoinLink({ postJoinLinkOnlyRequired, viewerHasDirectRelationship })) return;
    setSuppressAutoOnboarding(false);
    setWizardOpen(true);
  }, [postJoinLinkOnlyRequired, viewerHasDirectRelationship]);

  const isOnboardingSnoozed =
    onboardingSnoozedUntil != null && onboardingSnoozedUntil > Date.now();

  const onboardingRequired =
    !!viewer &&
    isOnline &&
    !viewer.onboarding_completed &&
    !suppressAutoOnboarding &&
    !isOnboardingSnoozed;

  const dismissOnboarding = useCallback(async () => {
    setSuppressAutoOnboarding(true);
    setWizardOpen(false);
    const snoozeUntil = Date.now() + 1000 * 60 * 60 * 24; // 24h snooze
    setOnboardingSnoozedUntil(snoozeUntil);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ONBOARDING_SNOOZE_KEY, String(snoozeUntil));
    }
  }, []);

  const completeOnboarding = useCallback(async () => {
    setSuppressAutoOnboarding(true);
    setWizardOpen(false);
    if (viewer) {
      try {
        await updateProfile(viewer.id, { onboarding_completed: true });
        if (typeof window !== "undefined") {
          window.localStorage.removeItem(ONBOARDING_SNOOZE_KEY);
        }
      } catch (err) {
        console.error("[Onboarding] Complete update failed:", err);
      }
    }
  }, [viewer, updateProfile]);

  useEffect(() => {
    if (!viewer?.onboarding_completed) return;
    setSuppressAutoOnboarding(false);
  }, [viewer?.onboarding_completed]);

  const handleFocusCountry = useCallback((code: string) => {
    setFocusedCountryCode(code);
    setFocusSignal((prev) => prev + 1);
  }, []);

  const canExportRelated = !!relatedByFilter && highlightedIds.size > 0;
  const primaryInviteCode = useMemo(() => {
    const activeCodes = inviteCodes.filter((code) => code.is_active);
    const primary =
      activeCodes.find((code) => code.code === family?.invite_code) ||
      activeCodes[0];
    return primary?.code || family?.invite_code || "";
  }, [family?.invite_code, inviteCodes]);
  const primaryInviteLink = useMemo(() => {
    if (!primaryInviteCode) return "";
    const path = `/join?code=${encodeURIComponent(primaryInviteCode)}`;
    if (typeof window === "undefined") return path;
    return `${window.location.origin}${path}`;
  }, [primaryInviteCode]);

  const handleOpenExportModal = useCallback(() => {
    if (!canExportRelated) setExportScope("entire");
    setExportError(null);
    setExportOptions((prev) => ({
      ...prev,
      profileMemberId: prev.profileMemberId || viewer?.id || members[0]?.id || null,
    }));
    setExportModalOpen(true);
  }, [canExportRelated, members, viewer?.id]);

  const copyShareText = useCallback(async (text: string, item: "code" | "link") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopiedShareItem(item);
      window.setTimeout(() => {
        setCopiedShareItem((current) => (current === item ? null : current));
      }, 1400);
    } catch (err) {
      console.error("[Dashboard] Could not copy share text:", err);
    }
  }, []);

  const toggleExportSideContent = useCallback((content: ExportSideContent) => {
    setExportOptions((prev) => {
      const current = new Set(prev.sideContent);
      if (current.has(content)) current.delete(content);
      else current.add(content);
      return { ...prev, sideContent: [...current] };
    });
  }, []);

  const handleExportTree = useCallback(async () => {
    if (!viewer) return;
    setExportingTree(true);
    setExportError(null);

    try {
      const useRelatedScope = exportScope === "related" && !!relatedByFilter && canExportRelated;
      const selectedIds = useRelatedScope ? highlightedIds : null;

      const exportMembers = useRelatedScope
        ? members.filter((member) => selectedIds!.has(member.id))
        : members;

      const exportRelationships = useRelatedScope
        ? relationships.filter(
            (relationship) =>
              selectedIds!.has(relationship.user_id) && selectedIds!.has(relationship.relative_id)
          )
        : relationships;

      if (exportMembers.length === 0) {
        throw new Error("No members are available in the selected scope.");
      }

      const scopedMember = useRelatedScope
        ? members.find((member) => member.id === relatedByFilter) || null
        : null;

      await exportFamilyTreeAsImage({
        familyName: family?.name || `${viewer.last_name || "Family"} Family`,
        members: exportMembers,
        relationships: exportRelationships,
        rootId: useRelatedScope && relatedByFilter ? relatedByFilter : viewer.id,
        scope: useRelatedScope ? "related" : "entire",
        scopeLabel: useRelatedScope
          ? `Scope: Related By – ${
              scopedMember ? formatProfileFullName(scopedMember) : "Selection"
            }`
          : "Scope: Entire Family Tree",
        exportOptions,
      });

      setExportModalOpen(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export tree image.");
    } finally {
      setExportingTree(false);
    }
  }, [
    viewer,
    exportScope,
    relatedByFilter,
    canExportRelated,
    highlightedIds,
    members,
    relationships,
    family,
    exportOptions,
  ]);

  useEffect(() => {
    if (!exportModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExportModalOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [exportModalOpen]);

  if (loading) {
    return <LegatreeLoader fullScreen label="Loading family data..." />;
  }

  if (!viewer) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/50 mb-3">You need to sign in to view your family dashboard.</p>
          <a href="/login" className="text-sm text-gold-300 hover:text-gold-200 transition-colors">Go to login</a>
        </div>
      </div>
    );
  }

  // Stats
  const totalMembers = members.length;
  const totalGenerations = generationAnalytics.totalGenerations;
  const visibleViewerName = formatDisplayText(viewer.first_name);
  const familyTreeTitle = formatFamilyTreeTitle(family?.name, viewer.last_name);
  const yearsLivedSummary = calculateAggregateYearsLived(members);
  const filterMember = relatedByFilter ? members.find((p) => p.id === relatedByFilter) : null;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />
      <AddMemberModal
        existingMembers={members}
        defaultRelativeId={viewer.id}
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onAdd={handleAddMember}
      />
      <ManageTreeModal
        isOpen={relationshipModalOpen}
        onClose={() => setRelationshipModalOpen(false)}
        viewer={viewer}
        members={members}
        relationships={relationships}
        familyName={family?.name}
        onConnectMembers={linkMembers}
        onUpdateRelationship={updateRelationship}
        onRemoveRelationship={unlinkRelationship}
        onRemoveMember={removeMember}
        restrictToViewer={viewer.role !== "ADMIN"}
      />
      <FamilyOnboardingWizard
        viewer={viewer}
        members={members}
        relationships={relationships}
        family={family}
        isOpen={wizardOpen || onboardingRequired}
        mandatory={false}
        onDismiss={dismissOnboarding}
        onComplete={completeOnboarding}
        onRegenerateInviteCode={regenerateInviteCode}
        updateProfile={updateProfile}
        updateFamilyRelationLanguage={updateFamilyRelationLanguage}
        addMember={handleAddMember}
        linkMembers={linkMembers}
        linkOnlyMode={postJoinLinkOnlyRequired}
        onLinkOnlySatisfied={() => {
          if (typeof window !== "undefined") {
            window.localStorage.removeItem(POST_JOIN_LINK_ONLY_KEY);
          }
          setPostJoinLinkOnlyRequired(false);
        }}
      />
      {family && viewer.role === "ADMIN" && (
        <InviteFamilyModal
          isOpen={inviteModalOpen}
          onClose={() => setInviteModalOpen(false)}
          family={family}
          inviteCodes={inviteCodes}
          memberCount={members.length}
          onCreateCode={createInviteCode}
          onUpdateCode={updateInviteCode}
          onDeleteCode={deleteInviteCode}
        />
      )}
      <AnimatePresence>
        {exportModalOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setExportModalOpen(false)}
              className="fixed inset-0 app-overlay backdrop-blur-sm z-[70]"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-tree-title"
              tabIndex={-1}
              className="fixed z-[71] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
                sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                w-auto sm:w-[min(720px,94vw)] rounded-2xl app-surface border border-white/[0.08] overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 id="export-tree-title" className="font-serif text-lg text-white/92">Export Family Tree Image</h3>
                <p className="text-xs text-white/40 mt-1">
                  Generates a high-resolution landscape PNG in an old-school print style.
                </p>
              </div>
              <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto space-y-5">
                <div className="space-y-3">
                <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                  <input
                    type="radio"
                    name="export-scope"
                    checked={exportScope === "entire"}
                    onChange={() => setExportScope("entire")}
                    className="mt-0.5 h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                  />
                  <span>
                    <span className="block text-sm text-white/86">Entire tree</span>
                    <span className="block text-xs text-white/38 mt-0.5">
                      Includes every member and connection in your family network.
                    </span>
                  </span>
                </label>

                <label
                  className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer ${
                    canExportRelated
                      ? "border-white/[0.1] bg-white/[0.02]"
                      : "border-white/[0.06] bg-white/[0.01] opacity-55 cursor-not-allowed"
                  }`}
                >
                  <input
                    type="radio"
                    name="export-scope"
                    checked={exportScope === "related"}
                    onChange={() => setExportScope("related")}
                    disabled={!canExportRelated}
                    className="mt-0.5 h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                  />
                  <span>
                    <span className="block text-sm text-white/86">Related By filter only</span>
                    <span className="block text-xs text-white/38 mt-0.5">
                      Exports only blood relatives from the current Related By selection.
                    </span>
                    {!canExportRelated && (
                      <span className="block text-[11px] text-white/32 mt-1">
                        Select a person in the Related By dropdown to enable this.
                      </span>
                    )}
                  </span>
                </label>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/42 mb-2">People</p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="dashboard-export-name-mode"
                        checked={exportOptions.nameMode === "full"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, nameMode: "full" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Full names</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="dashboard-export-name-mode"
                        checked={exportOptions.nameMode === "display"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, nameMode: "display" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Display names when available</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="dashboard-export-avatar-mode"
                        checked={exportOptions.avatarMode === "headshot"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, avatarMode: "headshot" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Headshots when available</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="dashboard-export-avatar-mode"
                        checked={exportOptions.avatarMode === "initials"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, avatarMode: "initials" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Initials only</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.showBirthDates}
                        onChange={(event) => setExportOptions((prev) => ({ ...prev, showBirthDates: event.target.checked }))}
                        className="h-4 w-4 rounded text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Birth dates</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.showDeathDates}
                        onChange={(event) => setExportOptions((prev) => ({ ...prev, showDeathDates: event.target.checked }))}
                        className="h-4 w-4 rounded text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Death dates</span>
                    </label>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/42 mb-2">Side Content</p>
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.sideContent.includes("worldMap")}
                        onChange={() => toggleExportSideContent("worldMap")}
                        className="mt-0.5 h-4 w-4 rounded text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span>
                        <span className="block text-sm text-white/84">World map pins</span>
                        <span className="block text-[11px] text-white/36 mt-0.5">No labels; repeated cities get numbered pins.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.sideContent.includes("countries")}
                        onChange={() => toggleExportSideContent("countries")}
                        className="mt-0.5 h-4 w-4 rounded text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span>
                        <span className="block text-sm text-white/84">Country counts</span>
                        <span className="block text-[11px] text-white/36 mt-0.5">Countries and resident totals.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="checkbox"
                        checked={exportOptions.sideContent.includes("profile")}
                        onChange={() => toggleExportSideContent("profile")}
                        className="mt-0.5 h-4 w-4 rounded text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span>
                        <span className="block text-sm text-white/84">Profile panel</span>
                        <span className="block text-[11px] text-white/36 mt-0.5">Biodata and about text for one person.</span>
                      </span>
                    </label>
                  </div>
                  {exportOptions.sideContent.includes("profile") && (
                    <div className="mt-3">
                      <label className="block text-[11px] uppercase tracking-wider text-white/42 mb-1.5">Profile person</label>
                      <select
                        value={exportOptions.profileMemberId || ""}
                        onChange={(event) => setExportOptions((prev) => ({ ...prev, profileMemberId: event.target.value || null }))}
                        className="h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/82 outline-none"
                      >
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {formatProfileFullName(member)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {exportError && (
                  <div className="rounded-lg border border-red-400/20 bg-red-400/[0.08] px-3 py-2 text-xs text-red-200/90">
                    {exportError}
                  </div>
                )}
              </div>
              <div className="px-5 py-4 border-t border-white/[0.06] flex items-center justify-end gap-2">
                <button
                  onClick={() => setExportModalOpen(false)}
                  className="px-3.5 py-2 rounded-lg text-xs text-white/55 hover:text-white/80 hover:bg-white/[0.04] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExportTree}
                  disabled={exportingTree}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg
                    bg-gold-400/14 border border-gold-400/24 text-xs text-gold-300
                    hover:bg-gold-400/20 disabled:opacity-40 transition-colors"
                >
                  {exportingTree ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  Download Image
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <div className="mx-auto w-full max-w-[1700px]">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-6 sm:mb-8"
        >
          <div className="min-w-0">
            <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white/95">
              Welcome back,{" "}
              <span
                style={{
                  background: "linear-gradient(135deg, var(--accent-300), var(--accent-200))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {visibleViewerName}
              </span>
            </h1>
          </div>

          <div className="w-full lg:w-[540px] space-y-2.5 min-w-0">
            <div className="flex flex-wrap items-center lg:justify-end gap-2">
              {family && viewer.role === "ADMIN" && (
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setInviteModalOpen(true)}
                  className="app-control app-control-primary inline-flex items-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] touch-target-44"
                >
                  <MailPlus size={15} />
                  Invite Family
                </motion.button>
              )}

              <div className="relative" ref={shareActionsRef}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setShareActionsOpen((prev) => !prev);
                    setMoreActionsOpen(false);
                  }}
                  className="app-control inline-flex items-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] touch-target-44"
                  aria-haspopup="menu"
                  aria-expanded={shareActionsOpen}
                >
                  <Share2 size={15} />
                  Share
                </motion.button>

                {shareActionsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-[min(320px,calc(100vw-2rem))] rounded-xl app-popover border border-white/[0.12] p-2 shadow-2xl z-40"
                  >
                    <div className="px-3 py-2">
                      <p className="text-[10px] uppercase tracking-wider text-white/35">Family Invite Code</p>
                      {primaryInviteCode ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <code className="min-w-0 flex-1 truncate font-mono text-sm tracking-[0.12em] text-gold-300">
                            {primaryInviteCode}
                          </code>
                          <button
                            type="button"
                            onClick={() => copyShareText(primaryInviteCode, "code")}
                            className="app-control app-icon-button flex items-center justify-center"
                            aria-label="Copy family invite code"
                            title="Copy invite code"
                          >
                            {copiedShareItem === "code" ? <Check size={14} /> : <Copy size={14} />}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs text-white/40">No active invite code available.</p>
                      )}
                    </div>

                    <div className="px-3 py-2 border-t border-white/[0.06]">
                      <p className="text-[10px] uppercase tracking-wider text-white/35">Invite Link</p>
                      {primaryInviteLink ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="min-w-0 flex-1 truncate text-xs text-white/58">
                            {primaryInviteLink}
                          </div>
                          <button
                            type="button"
                            onClick={() => copyShareText(primaryInviteLink, "link")}
                            className="app-control app-icon-button flex items-center justify-center"
                            aria-label="Copy family invite link"
                            title="Copy invite link"
                          >
                            {copiedShareItem === "link" ? <Check size={14} /> : <Link2 size={14} />}
                          </button>
                        </div>
                      ) : (
                        <p className="mt-1.5 text-xs text-white/40">Create an invite code to generate a link.</p>
                      )}
                    </div>

                    {family && viewer.role === "ADMIN" && (
                      <button
                        type="button"
                        onClick={() => {
                          setShareActionsOpen(false);
                          setInviteModalOpen(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/78 hover:text-white/92 hover:bg-white/[0.05] transition-colors inline-flex items-center gap-2"
                      >
                        <MailPlus size={14} />
                        Manage Invites
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShareActionsOpen(false);
                        handleOpenExportModal();
                      }}
                      className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/78 hover:text-white/92 hover:bg-white/[0.05] transition-colors inline-flex items-center gap-2"
                    >
                      <Download size={14} />
                      Export Tree
                    </button>
                  </div>
                )}
              </div>

              <div className="relative" ref={moreActionsRef}>
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={() => {
                    setMoreActionsOpen((prev) => !prev);
                    setShareActionsOpen(false);
                  }}
                  className="app-control inline-flex items-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] touch-target-44"
                  aria-haspopup="menu"
                  aria-expanded={moreActionsOpen}
                >
                  <MoreHorizontal size={15} />
                  More
                </motion.button>

                {moreActionsOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-56 rounded-xl app-popover border border-white/[0.12] p-2 shadow-2xl z-40"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        setAddModalOpen(true);
                      }}
                      className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/78 hover:text-white/92 hover:bg-white/[0.05] transition-colors inline-flex items-center gap-2"
                    >
                      <UserPlus size={14} />
                      Add Member
                    </button>
                    {viewer && !viewer.onboarding_completed && !isEstablishedInTree && (
                      <button
                        type="button"
                        onClick={() => {
                          setMoreActionsOpen(false);
                          setSuppressAutoOnboarding(false);
                          setWizardOpen(true);
                        }}
                        className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/78 hover:text-white/92 hover:bg-white/[0.05] transition-colors"
                      >
                        Guided Setup
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setMoreActionsOpen(false);
                        setRelationshipModalOpen(true);
                      }}
                      className="w-full px-3 py-2.5 rounded-lg text-left text-sm text-white/78 hover:text-white/92 hover:bg-white/[0.05] transition-colors"
                    >
                      Modify Relationships
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="relative">
              <Search size={18} className="app-input-icon absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={memberSearchQuery}
                onChange={(e) => {
                  setMemberSearchQuery(e.target.value);
                  setMemberSearchOpen(true);
                }}
                onFocus={() => setMemberSearchOpen(true)}
                onBlur={() => setTimeout(() => setMemberSearchOpen(false), 120)}
                placeholder="Search members..."
                className="w-full h-12 min-h-[44px] rounded-2xl pl-12 pr-4 app-input font-sans text-sm font-medium outline-none transition-colors"
              />

              {memberSearchOpen && (
                <div className="absolute z-30 top-full mt-1 w-full rounded-xl overflow-hidden app-popover shadow-2xl">
                  {memberSearchResults.length > 0 ? (
                    memberSearchResults.map((entry) => (
                      <button
                        key={entry.profile.id}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectSearchMember(entry.profile.id)}
                        className="w-full px-3 py-3 sm:py-2.5 min-h-[44px] text-left border-b border-white/[0.06] last:border-b-0
                          hover:bg-white/[0.05] active:bg-white/[0.06] transition-colors flex flex-col justify-center"
                      >
                        <p className="text-sm text-white/85">
                          {formatProfileFullName(entry.profile)}
                        </p>
                        {entry.profile.display_name && (
                          <p className="text-[11px] text-gold-300/70 mt-0.5">
                            {entry.profile.display_name}
                          </p>
                        )}
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {entry.relationship}
                          {entry.profile.profession ? ` · ${entry.profile.profession}` : ""}
                          {entry.profile.location_city ? ` · ${entry.profile.location_city}` : ""}
                        </p>
                      </button>
                    ))
                  ) : (
                    <div className="px-3 py-3 text-xs text-white/35">
                      No members found for “{memberSearchQuery.trim()}”
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <UpcomingMilestonesSection
          members={members}
          relationships={relationships}
          onMemberClick={navigateToProfile}
        />

        {shouldPromptPostJoinLink({ postJoinLinkOnlyRequired, viewerHasDirectRelationship }) && (
          <div className="mb-6 rounded-2xl border border-gold-400/25 bg-gold-400/[0.08] px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-gold-200">Connect yourself to the family tree</p>
              <p className="text-xs text-white/55 mt-0.5">
                You joined as a new node. Link yourself to one existing relative so everyone can find you in the tree.
              </p>
            </div>
            <button
              onClick={() => {
                setSuppressAutoOnboarding(false);
                setWizardOpen(true);
              }}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-gold-400/15 border border-gold-400/25 text-xs font-medium text-gold-300 hover:bg-gold-400/20 transition-colors"
            >
              Link My Node
            </button>
          </div>
        )}

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(380px,520px)] 2xl:grid-cols-[minmax(0,1.55fr)_minmax(400px,540px)] gap-4 sm:gap-6 items-start">
          {/* ── Family Tree (2 cols) ─────────────── */}
          <GlassCard className="p-4 sm:p-6">
            <div className="w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-5 gap-3">
                <Link
                  href="/tree"
                  className="font-serif text-xl font-semibold text-white/90 hover:text-gold-300 transition-colors"
                >
                  {familyTreeTitle}
                </Link>
                <div className="flex w-full sm:w-auto items-center gap-2.5 flex-wrap sm:flex-nowrap sm:justify-end">
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
                  />
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div className="inline-flex w-fit rounded-xl border border-white/[0.1] bg-white/[0.035] p-1">
                  <button
                    type="button"
                    onClick={() => setTreeViewMode("close")}
                    aria-pressed={treeViewMode === "close"}
                    className={cn(
                      "h-9 rounded-lg px-3 text-xs font-medium transition-colors",
                      treeViewMode === "close"
                        ? "bg-gold-400/15 text-gold-300"
                        : "text-white/52 hover:bg-white/[0.05] hover:text-white/82"
                    )}
                  >
                    Close Family
                  </button>
                  <button
                    type="button"
                    onClick={() => setTreeViewMode("whole")}
                    aria-pressed={treeViewMode === "whole"}
                    className={cn(
                      "h-9 rounded-lg px-3 text-xs font-medium transition-colors",
                      treeViewMode === "whole"
                        ? "bg-gold-400/15 text-gold-300"
                        : "text-white/52 hover:bg-white/[0.05] hover:text-white/82"
                    )}
                  >
                    Whole Family
                  </button>
                </div>

                {treeViewMode === "close" && closeFamilyPov && (
                  <div className="flex min-w-0 flex-1 flex-col gap-1 lg:max-w-[460px]">
                    <label htmlFor="dashboard-close-family-pov" className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                      POV
                    </label>
                    <div className="flex min-w-0 items-center gap-2">
                      <select
                        id="dashboard-close-family-pov"
                        value={closeFamilyPov.id}
                        onChange={(event) => setCloseFamilyPovId(event.target.value)}
                        className="h-10 min-w-0 flex-1 rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/82 outline-none"
                      >
                        {members
                          .slice()
                          .sort((a, b) => formatProfileFullName(a).localeCompare(formatProfileFullName(b)))
                          .map((member) => (
                            <option key={member.id} value={member.id}>
                              {formatProfileFullName(member)}
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setCloseFamilyPovId(viewer.id)}
                        className="app-control app-icon-button flex items-center justify-center"
                        aria-label="Reset close family POV"
                        title="Reset to my tree"
                      >
                        <LocateFixed size={15} />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {filterMember && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  className="mb-4 px-4 py-3 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex items-center gap-3"
                >
                  <Filter size={14} className="text-gold-400/60 shrink-0" />
                  <p className="text-xs text-white/50">
                    Showing blood relatives of{" "}
                    <span className="text-gold-300 font-medium">
                      {formatProfileFullName(filterMember)}
                    </span>
                    {" "}&mdash; {highlightedIds.size} member{highlightedIds.size !== 1 ? "s" : ""} share blood
                  </p>
                </motion.div>
              )}

              <FamilyTree
                members={treeMembers}
                sibships={displayTreeLayout.sibships}
                connections={displayTreeLayout.connections}
                highlightedMembers={highlightedIds}
                dimNonHighlighted={!!relatedByFilter}
                viewerId={viewer.id}
                povId={treeViewMode === "close" ? activeTreeRootId : undefined}
                povBadgeLabel={treeViewMode === "close" && activeTreeRootId !== viewer.id ? "POV" : "YOU"}
                enableLargeFamilyMode={treeViewMode === "whole"}
                showPercentages={showPercentages}
                showRelationLabels={showRelationLabels}
                showLastNames={showLastNames}
                showBirthYear={showBirthYear}
                showDeathYear={showDeathYear}
                showBirthCountryFlag={showBirthCountryFlag}
                showCurrentCountryFlag={showCurrentCountryFlag}
                onMemberClick={(id) => navigateToProfile(id)}
                onBackgroundClick={() => router.push("/tree")}
                canvasWidth={displayTreeLayout.width}
                canvasHeight={displayTreeLayout.height}
                fitPadding={32}
              />
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  { label: "Family Members", value: totalMembers, icon: Users, color: "text-gold-300" },
                  { label: "Generations", value: totalGenerations, icon: GitBranch, color: "text-severity-mild" },
                  { label: "Years Lived", value: yearsLivedSummary.totalYears, icon: Clock3, color: "text-white/60" },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-white/35 font-medium uppercase tracking-wider">{stat.label}</p>
                        <Icon size={12} className={stat.color} />
                      </div>
                      <p className="mt-1 text-base font-serif font-semibold text-white/90">{stat.value}</p>
                    </div>
                  );
                })}
              </div>
              {yearsLivedSummary.excludedCount > 0 && (
                <p className="mt-2 text-[11px] text-white/38">
                  Known birth and death years only.
                </p>
              )}
              <GenerationInsights analytics={generationAnalytics} />
            </div>
          </GlassCard>

          {/* ── Right Column ─────────────────────── */}
          <div className="space-y-6 xl:justify-self-end xl:w-full xl:max-w-[540px]">
            <GlassCard className="p-4 sm:p-5 xl:p-6">
              <div ref={globeHostRef} className="flex min-w-0 max-w-full flex-col items-center overflow-hidden">
                <InteractiveGlobe
                  members={members}
                  size={globeSize}
                  focusCountryCode={focusedCountryCode}
                  focusSignal={focusSignal}
                  onMemberClick={(member) => navigateToProfile(member.id)}
                  onCountryClick={handleFocusCountry}
                  onGlobeOpen={() => router.push("/world")}
                />
              </div>
            </GlassCard>
          </div>
        </div>

        {/* Viewer profile — full width below tree + globe */}
        <ProfileCard profile={viewer} isViewer className="mt-6" />

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
                    initials={getProfileInitials(item.profile)}
                    label={item.match.relationship} />
                  <p className="mt-2 text-xs text-white/60 font-medium">
                    {formatDisplayText(item.profile.first_name)}
                  </p>
                </motion.div>
            ))}
          </div>
        </GlassCard>
        </div>
        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <SiteFooter />
        </footer>
      </main>
    </div>
  );
}

function relationshipSearchTokens(label: string): string[] {
  const normalized = label.toLowerCase();
  const tokens = new Set<string>([normalized]);

  if (normalized.includes("mother") || normalized.includes("father") || normalized.includes("parent")) {
    tokens.add("parent");
    tokens.add("mother");
    tokens.add("father");
  }
  if (normalized.includes("brother") || normalized.includes("sister") || normalized.includes("sibling")) {
    tokens.add("sibling");
    tokens.add("brother");
    tokens.add("sister");
  }
  if (normalized.includes("uncle") || normalized.includes("aunt")) {
    tokens.add("uncle");
    tokens.add("aunt");
    tokens.add("aunt uncle");
  }
  if (normalized.includes("niece") || normalized.includes("nephew")) {
    tokens.add("niece");
    tokens.add("nephew");
  }
  if (normalized.includes("cousin")) tokens.add("cousin");
  if (normalized.includes("son") || normalized.includes("daughter") || normalized.includes("child")) {
    tokens.add("child");
    tokens.add("son");
    tokens.add("daughter");
  }
  if (normalized.includes("grand")) {
    tokens.add("grandparent");
    tokens.add("grandchild");
  }

  return [...tokens];
}
