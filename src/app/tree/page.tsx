"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  GitBranch,
  Loader2,
  MapPin,
  Briefcase,
  Calendar,
  User,
  X,
  Heart,
  Edit3,
  Check,
  UserPlus,
  Users,
  Download,
  ChevronDown,
  LocateFixed,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GlassCard } from "@/components/ui/GlassCard";
import { LegatreeLoader } from "@/components/ui/LegatreeLoader";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { ManageTreeModal } from "@/components/ui/ManageTreeModal";
import { TreeControls } from "@/components/tree/TreeControls";
import { FamilyMembersTable } from "@/components/tree/FamilyMembersTable";
import { useFamilyData } from "@/hooks/use-family-data";
import { useFamilyStore } from "@/store/family-store";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import { createFocusedFamilyTreeLayout } from "@/lib/focused-family-layout";
import { exportFamilyTreesAsPdf, type ExportSideContent, type FamilyTreeExportOptions, type FamilyTreePdfExportItem } from "@/lib/tree-export";
import type { Profile, RelationshipType } from "@/lib/types";
import {
  calculateAgeFromDateOnly,
  formatDateOnly,
  formatGenderLabel,
  formatProfileFullName,
  getProfileInitials,
} from "@/lib/display-format";
import { cn } from "@/lib/cn";
import {
  findSpouseRelationship,
  getSpouseId,
} from "@/lib/spouse-relationship";

function formatBirthDate(value: string | null): string {
  return formatDateOnly(value) ?? "Not set";
}

function getAge(value: string | null): number | null {
  return calculateAgeFromDateOnly(value);
}

function mapQueryForMember(member: Profile): string | null {
  return member.location_city || member.place_of_birth || null;
}

type TreeExportTarget = "close" | "whole" | "both";

export default function TreeExplorerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    viewer,
    family,
    members,
    relationships,
    loading,
    updateFamilyName,
    updateProfile,
    addMember: addMemberAction,
    linkMembers,
    updateRelationship,
    unlinkRelationship,
    removeMember,
  } = useFamilyData();
  const { relatedByFilter, setRelatedByFilter } = useFamilyStore();

  const [showPercentages, setShowPercentages] = useState(false);
  const [showRelationLabels, setShowRelationLabels] = useState(true);
  const [showLastNames, setShowLastNames] = useState(true);
  const [showBirthYear, setShowBirthYear] = useState(true);
  const [showDeathYear, setShowDeathYear] = useState(false);
  const [showBirthCountryFlag, setShowBirthCountryFlag] = useState(false);
  const [showCurrentCountryFlag, setShowCurrentCountryFlag] = useState(false);
  const [showMarriageDate, setShowMarriageDate] = useState(false);
  const [membersTableOpen, setMembersTableOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [draftFamilyName, setDraftFamilyName] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [relationshipModalOpen, setRelationshipModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [exportingTree, setExportingTree] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [exportTarget, setExportTarget] = useState<TreeExportTarget>("close");
  const [exportClosePersonId, setExportClosePersonId] = useState("");
  const [exportOptions, setExportOptions] = useState<FamilyTreeExportOptions>({
    showBirthDates: true,
    showDeathDates: true,
    nameMode: "full",
    avatarMode: "headshot",
    sideContent: ["worldMap", "countries"],
    profileMemberId: null,
  });

  const requestedView = searchParams.get("view");
  const treeViewMode: "close" | "whole" = requestedView === "whole" ? "whole" : "close";
  const requestedPersonId = searchParams.get("person");
  const focusedPerson = useMemo(() => {
    if (!viewer) return null;
    return members.find((member) => member.id === requestedPersonId) || viewer;
  }, [members, requestedPersonId, viewer]);
  const focusedPersonId = focusedPerson?.id || viewer?.id || null;

  const wholeTreeLayout = useMemo(() => {
    if (!viewer) return { nodes: [], connections: [], sibships: [], width: 900, height: 620 };
    return createFamilyTreeLayout(members, relationships, viewer.id);
  }, [viewer, members, relationships]);

  const closeTreeLayout = useMemo(() => {
    if (!viewer || !focusedPersonId) {
      return { nodes: [], connections: [], sibships: [], width: 900, height: 620, scopeMemberIds: new Set<string>() };
    }
    return createFocusedFamilyTreeLayout(members, relationships, focusedPersonId);
  }, [focusedPersonId, members, relationships, viewer]);

  const treeLayout = treeViewMode === "close" ? closeTreeLayout : wholeTreeLayout;
  const activeRootId = treeViewMode === "close" ? focusedPersonId : viewer?.id;

  const treeMembers = useMemo(() => {
    if (!viewer || !activeRootId) return [];
    return treeLayout.nodes.map((node) => ({
      profile: node.profile,
      match: calculateGeneticMatch(activeRootId, node.profile.id, relationships, node.profile.gender, family?.relation_language, members),
      x: node.x,
      y: node.y,
      generation: node.generation,
    }));
  }, [activeRootId, viewer, treeLayout.nodes, relationships, family?.relation_language, members]);

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
    return calculateGeneticMatch(viewer.id, selectedMember.id, relationships, selectedMember.gender, family?.relation_language, members);
  }, [viewer, selectedMember, relationships, family?.relation_language, members]);

  const selectedSpouseRelation = useMemo(
    () => (selectedMember ? findSpouseRelationship(relationships, selectedMember.id) : null),
    [relationships, selectedMember]
  );
  const selectedSpouse = useMemo(() => {
    if (!selectedMember || !selectedSpouseRelation) return null;
    const spouseId = getSpouseId(selectedSpouseRelation, selectedMember.id);
    return members.find((member) => member.id === spouseId) || null;
  }, [members, selectedMember, selectedSpouseRelation]);
  const selectedMarriageDate = selectedSpouseRelation?.marriage_date || null;

  const selectedMapQuery = useMemo(
    () => (selectedMember ? mapQueryForMember(selectedMember) : null),
    [selectedMember]
  );

  const handleMemberClick = useCallback((memberId: string) => {
    setSelectedMemberId(memberId);
  }, []);

  const closeTreeHref = useCallback((personId: string) => {
    return `/tree?view=close&person=${encodeURIComponent(personId)}`;
  }, []);

  const handleViewModeChange = useCallback((nextMode: "close" | "whole") => {
    const personPart = focusedPersonId ? `&person=${encodeURIComponent(focusedPersonId)}` : "";
    router.push(`/tree?view=${nextMode}${personPart}`);
  }, [focusedPersonId, router]);

  const handleFocusedPersonChange = useCallback((personId: string) => {
    router.push(closeTreeHref(personId));
    setSelectedMemberId(null);
  }, [closeTreeHref, router]);

  const handleViewMemberTree = useCallback((personId: string) => {
    router.push(closeTreeHref(personId));
    setSelectedMemberId(null);
  }, [closeTreeHref, router]);

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

  const openExportModal = useCallback(() => {
    setExportError(null);
    setExportTarget(treeViewMode === "whole" ? "whole" : "close");
    setExportClosePersonId(focusedPersonId || viewer?.id || members[0]?.id || "");
    setExportOptions((prev) => ({
      ...prev,
      profileMemberId: prev.profileMemberId || selectedMemberId || viewer?.id || members[0]?.id || null,
    }));
    setExportModalOpen(true);
  }, [focusedPersonId, members, selectedMemberId, treeViewMode, viewer?.id]);

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
      const familyName = family?.name || `${viewer.last_name || "Family"} Family Tree`;
      const pdfItems: FamilyTreePdfExportItem[] = [];

      if (exportTarget === "close" || exportTarget === "both") {
        const closeRootId = exportClosePersonId || focusedPersonId || viewer.id;
        const closeRoot = members.find((member) => member.id === closeRootId) || viewer;
        const closeLayout = createFocusedFamilyTreeLayout(members, relationships, closeRootId);
        const closeIds = new Set(closeLayout.nodes.map((node) => node.profile.id));
        const closeMembers = members.filter((member) => closeIds.has(member.id));
        const closeRelationships = relationships.filter(
          (relationship) =>
            closeIds.has(relationship.user_id) &&
            closeIds.has(relationship.relative_id)
        );

        if (closeMembers.length === 0) {
          throw new Error("No members are available in the selected close-family tree.");
        }

        pdfItems.push({
          familyName,
          members: closeMembers,
          relationships: closeRelationships,
          rootId: closeRootId,
          scope: "related",
          scopeLabel: `Close Family: ${formatProfileFullName(closeRoot)}`,
          layoutMode: "close",
          exportOptions,
        });
      }

      if (exportTarget === "whole" || exportTarget === "both") {
        pdfItems.push({
          familyName,
          members,
          relationships,
          rootId: viewer.id,
          scope: "entire",
          scopeLabel: "Whole Family Tree",
          layoutMode: "whole",
          exportOptions,
        });
      }

      await exportFamilyTreesAsPdf(pdfItems);
      setExportModalOpen(false);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Could not export tree PDF.");
    } finally {
      setExportingTree(false);
    }
  }, [viewer, family?.name, exportTarget, exportClosePersonId, focusedPersonId, members, relationships, exportOptions]);

  if (loading) {
    return <LegatreeLoader fullScreen label="Loading family tree..." />;
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
              initial={{ opacity: 0, y: 18, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="export-tree-title"
              className="fixed z-[71] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
                sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
                w-auto sm:w-[min(720px,94vw)] rounded-2xl app-surface border border-white/[0.08] overflow-hidden flex flex-col"
            >
              <div className="px-5 py-4 border-b border-white/[0.06]">
                <h3 id="export-tree-title" className="font-serif text-lg text-white/92">Export Family Tree</h3>
                <p className="text-xs text-white/40 mt-1">
                  Choose which tree views to include. Exports are generated as high-resolution PDF pages.
                </p>
              </div>
              <div className="px-5 py-4 flex-1 min-h-0 overflow-y-auto space-y-5">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/42 mb-2">Tree Views</p>
                  <div className="grid sm:grid-cols-3 gap-2.5">
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="tree-export-target"
                        checked={exportTarget === "close"}
                        onChange={() => setExportTarget("close")}
                        className="mt-0.5 h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span>
                        <span className="block text-sm text-white/86">Close tree</span>
                        <span className="block text-[11px] text-white/36 mt-0.5">Focused relatives around one person.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="tree-export-target"
                        checked={exportTarget === "whole"}
                        onChange={() => setExportTarget("whole")}
                        className="mt-0.5 h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span>
                        <span className="block text-sm text-white/86">Whole tree</span>
                        <span className="block text-[11px] text-white/36 mt-0.5">All members in one large page.</span>
                      </span>
                    </label>
                    <label className="flex items-start gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="tree-export-target"
                        checked={exportTarget === "both"}
                        onChange={() => setExportTarget("both")}
                        className="mt-0.5 h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span>
                        <span className="block text-sm text-white/86">Both</span>
                        <span className="block text-[11px] text-white/36 mt-0.5">Close tree first, whole tree second.</span>
                      </span>
                    </label>
                  </div>

                  {(exportTarget === "close" || exportTarget === "both") && (
                    <div className="mt-3">
                      <label htmlFor="export-close-person" className="block text-[11px] uppercase tracking-wider text-white/42 mb-1.5">
                        Close tree POV
                      </label>
                      <select
                        id="export-close-person"
                        value={exportClosePersonId || focusedPersonId || viewer.id}
                        onChange={(event) => setExportClosePersonId(event.target.value)}
                        className="h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/82 outline-none"
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
                    </div>
                  )}
                </div>

                <div>
                  <p className="text-[11px] uppercase tracking-wider text-white/42 mb-2">People</p>
                  <div className="grid sm:grid-cols-2 gap-2.5">
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="export-name-mode"
                        checked={exportOptions.nameMode === "full"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, nameMode: "full" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Full names</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="export-name-mode"
                        checked={exportOptions.nameMode === "display"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, nameMode: "display" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Display names when available</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="export-avatar-mode"
                        checked={exportOptions.avatarMode === "headshot"}
                        onChange={() => setExportOptions((prev) => ({ ...prev, avatarMode: "headshot" }))}
                        className="h-4 w-4 text-gold-400 bg-white/[0.04] border-white/[0.2]"
                      />
                      <span className="text-sm text-white/82">Headshots when available</span>
                    </label>
                    <label className="flex items-center gap-2.5 p-3 rounded-xl border border-white/[0.1] bg-white/[0.02] cursor-pointer">
                      <input
                        type="radio"
                        name="export-avatar-mode"
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
                        <span className="block text-[11px] text-white/36 mt-0.5">No city labels; repeated cities get one numbered pin.</span>
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
                        <span className="block text-[11px] text-white/36 mt-0.5">A compact list of countries and resident totals.</span>
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
                        <span className="block text-[11px] text-white/36 mt-0.5">Biodata and about text for one selected person.</span>
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
                  Download PDF
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6"
        >
          <div className="min-w-0">
            <Link
              href="/tree"
              className="font-serif text-2xl sm:text-3xl font-bold text-white/95 hover:text-gold-300 transition-colors"
            >
              {familyTreeTitle}
            </Link>
            <p className="text-sm text-white/40 mt-1 hidden sm:block">
              {treeViewMode === "close" && focusedPerson
                ? `Close family view for ${formatProfileFullName(focusedPerson)}. Switch POV to understand another person's branch.`
                : "Browse your full family graph. Hover a member for quick info, click a member for detailed side panel."}
            </p>
            {editingTitle && canEditTitle && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={draftFamilyName}
                  onChange={(e) => setDraftFamilyName(e.target.value)}
                  placeholder="Family name"
                  className="h-9 w-full min-w-0 sm:min-w-[260px] sm:w-auto rounded-lg px-3 app-input text-sm outline-none"
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
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setAddModalOpen(true)}
              className="app-control inline-flex items-center justify-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] touch-target-44 sm:min-w-0"
            >
              <UserPlus size={15} />
              Add Member
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setRelationshipModalOpen(true)}
              className="app-control inline-flex items-center justify-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] touch-target-44 sm:min-w-0"
            >
              <Users size={15} />
              Modify Relationships
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={openExportModal}
              disabled={exportingTree}
              className="app-control inline-flex items-center justify-center gap-2 h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] disabled:opacity-50 touch-target-44 sm:min-w-0"
            >
              {exportingTree ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Download size={15} />
              )}
              Export Tree
            </motion.button>
            {canEditTitle && !editingTitle && (
              <button
                onClick={startEditTitle}
                className="app-control h-10 min-h-[44px] px-3.5 rounded-xl active:scale-[0.99] flex items-center touch-target-44 sm:min-w-0"
              >
                <span className="inline-flex items-center gap-2">
                  <Edit3 size={15} />
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
              showCurrentCountryFlag={showCurrentCountryFlag}
              onShowCurrentCountryFlagChange={setShowCurrentCountryFlag}
              showMarriageDate={showMarriageDate}
              onShowMarriageDateChange={setShowMarriageDate}
            />
          </div>
        </motion.div>

        <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-xl border border-white/[0.1] bg-white/[0.035] p-1">
              <button
                type="button"
                onClick={() => handleViewModeChange("close")}
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
                onClick={() => handleViewModeChange("whole")}
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

            {treeViewMode === "close" && focusedPerson && (
              <button
                type="button"
                onClick={() => handleFocusedPersonChange(viewer.id)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-3 text-xs text-white/62 transition-colors hover:bg-white/[0.055] hover:text-white/86"
              >
                <LocateFixed size={13} />
                Reset to my tree
              </button>
            )}
          </div>

          {treeViewMode === "close" && focusedPerson && (
            <div className="flex min-w-0 flex-col gap-1 sm:w-[min(420px,45vw)]">
              <label htmlFor="close-family-pov" className="text-[10px] font-medium uppercase tracking-wider text-white/35">
                POV
              </label>
              <select
                id="close-family-pov"
                value={focusedPerson.id}
                onChange={(event) => handleFocusedPersonChange(event.target.value)}
                className="h-10 w-full rounded-xl border border-white/[0.1] bg-white/[0.04] px-3 text-sm text-white/82 outline-none"
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
            </div>
          )}
        </div>

        {filterMember && (
          <div className="mb-4 rounded-xl border border-gold-400/20 bg-gold-400/[0.08] px-4 py-3 text-xs text-white/70">
            Highlighting blood relatives of <span className="text-gold-300 font-medium">{formatProfileFullName(filterMember)}</span>
            {" "}({highlightedIds.size} member{highlightedIds.size !== 1 ? "s" : ""}).
          </div>
        )}

        <div className={cn("grid gap-4 sm:gap-5 items-start", selectedMember ? "grid-cols-1 lg:grid-cols-[1fr_320px]" : "grid-cols-1")}>
          <GlassCard className={cn("p-4 sm:p-5 min-w-0", "lg:col-span-1")}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-serif text-lg text-white/92">Family Network</h2>
                <p className="text-xs text-white/35 mt-0.5">Click empty space to collapse the detail panel</p>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.1] text-[11px] text-white/60">
                <GitBranch size={12} /> {treeMembers.length} shown
              </span>
            </div>

            <FamilyTree
              members={treeMembers}
              sibships={treeLayout.sibships}
              connections={treeLayout.connections}
              highlightedMembers={highlightedIds}
              dimNonHighlighted={!!relatedByFilter}
              viewerId={viewer.id}
              povId={treeViewMode === "close" ? focusedPersonId ?? undefined : undefined}
              povBadgeLabel="POV"
              enableLargeFamilyMode={treeViewMode === "whole"}
              showMinimap={treeViewMode === "whole"}
              showPercentages={showPercentages}
              showRelationLabels={showRelationLabels}
              showLastNames={showLastNames}
              showBirthYear={showBirthYear}
              showDeathYear={showDeathYear}
              showBirthCountryFlag={showBirthCountryFlag}
              showCurrentCountryFlag={showCurrentCountryFlag}
              showMarriageDate={showMarriageDate}
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
                <GlassCard className="p-5 sticky top-6 h-fit">
                  <div className="flex justify-end mb-2">
                    <button
                      onClick={() => setSelectedMemberId(null)}
                      className="w-8 h-8 rounded-lg text-white/45 hover:text-white/82 hover:bg-white/[0.05] shrink-0"
                      aria-label="Close details"
                    >
                      <X size={14} className="mx-auto" />
                    </button>
                  </div>

                  <div className="mb-4 flex flex-col items-center text-center">
                    <GeneticMatchRing
                      percentage={selectedMatch?.percentage || 0}
                      size={104}
                      strokeWidth={3}
                      avatarUrl={selectedMember.avatar_url}
                      initials={getProfileInitials(selectedMember)}
                      showPercentage={false}
                    />
                    <h3 className="mt-3 font-serif text-xl text-white/93">
                      {formatProfileFullName(selectedMember)}
                    </h3>
                    {selectedMember.display_name && (
                      <p className="text-xs text-gold-300/85 mt-0.5">{selectedMember.display_name}</p>
                    )}
                    {selectedMatch && (
                      <p className="text-xs text-white/48 mt-1">{selectedMatch.relationship} · {selectedMatch.percentage}% match</p>
                    )}
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
                    {(selectedSpouse || selectedMarriageDate) && (
                      <DetailRow
                        icon={Heart}
                        label="Anniversary"
                        value={
                          selectedMarriageDate
                            ? `${formatBirthDate(selectedMarriageDate)}${
                                selectedSpouse
                                  ? ` · ${formatProfileFullName(selectedSpouse)}`
                                  : ""
                              }`
                            : selectedSpouse
                              ? formatProfileFullName(selectedSpouse)
                              : "Not set"
                        }
                      />
                    )}
                  </div>

                  {selectedMapQuery && (
                    <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
                      <iframe
                        title={`${formatProfileFullName(selectedMember)} map`}
                        src={`https://www.google.com/maps?q=${encodeURIComponent(selectedMapQuery)}&output=embed`}
                        className="h-32 w-full"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}

                  {selectedMember.about_me && (
                    <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5">
                      <p className="text-[10px] uppercase tracking-wider text-white/45 mb-1">About</p>
                      <p className="text-xs text-white/72 leading-relaxed">{selectedMember.about_me}</p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => handleViewMemberTree(selectedMember.id)}
                    className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.035] text-sm text-white/72 transition-colors hover:bg-white/[0.06] hover:text-white/90"
                  >
                    <GitBranch size={14} />
                    View Their Tree
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push(`/profile/${selectedMember.id}`)}
                    className="mt-2 h-10 w-full rounded-xl border border-gold-400/25 bg-gold-400/14 text-sm text-gold-300 transition-colors hover:bg-gold-400/20"
                  >
                    Open Full Profile
                  </button>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>

          <GlassCard className={cn("p-4 sm:p-5", selectedMember && "lg:col-span-2 mt-5")}>
            <button
              type="button"
              onClick={() => setMembersTableOpen((open) => !open)}
              aria-expanded={membersTableOpen}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <span>
                <span className="block font-serif text-lg text-white/92">Members Table</span>
                <span className="block text-xs text-white/35">{members.length} members</span>
              </span>
              <ChevronDown
                size={18}
                className={cn(
                  "text-white/45 transition-transform",
                  !membersTableOpen && "-rotate-90"
                )}
              />
            </button>
            {membersTableOpen && (
              <div className="mt-4">
                <p className="text-xs text-white/35 mb-4">
                  {canEditTitle
                    ? "Click any cell to edit Name, Birth date, or City. Changes save on blur or Enter."
                    : "View all family members. Click a row to open the detail panel."}
                </p>
                <FamilyMembersTable
                  members={members}
                  canEdit={canEditTitle}
                  onUpdate={async (memberId, updates) => {
                    await updateProfile(memberId, updates);
                  }}
                  onMemberClick={handleMemberClick}
                />
              </div>
            )}
          </GlassCard>
        </div>
        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <SiteFooter />
        </footer>
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
