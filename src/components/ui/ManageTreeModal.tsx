"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { GitBranch, Link2, Trash2, UserMinus, X } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Profile, Relationship, RelationshipType } from "@/lib/types";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

interface ManageTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewer: Profile;
  members: Profile[];
  relationships: Relationship[];
  familyName?: string;
  onConnectMembers: (fromMemberId: string, toMemberId: string, type: RelationshipType) => Promise<void>;
  onRemoveRelationship: (relationshipId: string) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
}

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "parent", label: "Parent of" },
  { value: "child", label: "Child of" },
  { value: "sibling", label: "Sibling of" },
  { value: "half_sibling", label: "Half-Sibling of" },
  { value: "spouse", label: "Spouse of" },
];

const SYMMETRIC_RELATIONS = new Set<RelationshipType>(["sibling", "half_sibling", "spouse", "cousin"]);

function relationLabel(type: RelationshipType): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function canonicalRelationship(fromId: string, toId: string, type: RelationshipType): string {
  if (type === "child") {
    return `parent:${toId}:${fromId}`;
  }
  if (type === "parent") {
    return `parent:${fromId}:${toId}`;
  }
  if (SYMMETRIC_RELATIONS.has(type)) {
    const pair = [fromId, toId].sort();
    return `${type}:${pair[0]}:${pair[1]}`;
  }
  return `${type}:${fromId}:${toId}`;
}

function memberName(member: Profile): string {
  return `${member.first_name} ${member.last_name}`.trim();
}

export function ManageTreeModal({
  isOpen,
  onClose,
  viewer,
  members,
  relationships,
  familyName = "Family",
  onConnectMembers,
  onRemoveRelationship,
  onRemoveMember,
}: ManageTreeModalProps) {
  const { dialogRef } = useAccessibleDialog({
    isOpen,
    onClose,
  });
  const [sourceId, setSourceId] = useState(viewer.id);
  const [targetId, setTargetId] = useState("");
  const [relationType, setRelationType] = useState<RelationshipType>("parent");
  const [query, setQuery] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSourceId(viewer.id);
    setTargetId("");
    setRelationType("parent");
    setQuery("");
    setBusyAction(null);
    setError(null);
    setSuccess(null);
  }, [isOpen, viewer.id]);

  const memberById = useMemo(() => new Map(members.map((member) => [member.id, member])), [members]);

  const existingConnectionsForPair = useMemo(() => {
    if (!sourceId || !targetId) return [];
    return relationships.filter(
      (rel) =>
        (rel.user_id === sourceId && rel.relative_id === targetId) ||
        (rel.user_id === targetId && rel.relative_id === sourceId)
    );
  }, [relationships, sourceId, targetId]);

  const duplicateConnection = useMemo(() => {
    if (!sourceId || !targetId) return false;
    const requested = canonicalRelationship(sourceId, targetId, relationType);
    return relationships.some(
      (rel) => canonicalRelationship(rel.user_id, rel.relative_id, rel.type) === requested
    );
  }, [relationships, sourceId, targetId, relationType]);

  const removableMembers = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    const candidates = members.filter((member) => member.id !== viewer.id);
    if (!normalized) return candidates;
    return candidates.filter((member) => {
      const haystack = [
        member.first_name,
        member.last_name,
        member.display_name || "",
        member.location_city || "",
        member.profession || "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(normalized);
    });
  }, [members, viewer.id, query]);

  const canConnect = !!sourceId && !!targetId && sourceId !== targetId && !duplicateConnection;

  const handleConnect = async () => {
    if (!canConnect) return;
    setError(null);
    setSuccess(null);
    setBusyAction("connect");

    try {
      await onConnectMembers(sourceId, targetId, relationType);
      const source = memberById.get(sourceId);
      const target = memberById.get(targetId);
      setSuccess(
        source && target
          ? `Connected ${memberName(source)} as ${relationLabel(relationType)} ${memberName(target)}.`
          : "Connection added."
      );
    } catch {
      setError("Could not create this relationship. Check permissions and try again.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveRelationship = async (relationshipId: string) => {
    setError(null);
    setSuccess(null);
    setBusyAction(`rel:${relationshipId}`);

    try {
      await onRemoveRelationship(relationshipId);
      setSuccess("Relationship removed.");
    } catch {
      setError("Could not remove that relationship.");
    } finally {
      setBusyAction(null);
    }
  };

  const handleRemoveMember = async (member: Profile) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberName(member)} from the ${familyName} Family Tree?`
    );
    if (!confirmed) return;

    setError(null);
    setSuccess(null);
    setBusyAction(`member:${member.id}`);

    try {
      await onRemoveMember(member.id);
      setSuccess(`${memberName(member)} was removed from the tree.`);
      if (sourceId === member.id) setSourceId(viewer.id);
      if (targetId === member.id) setTargetId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove this member.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 app-overlay backdrop-blur-sm z-[72]"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="manage-tree-title"
            tabIndex={-1}
            className="fixed z-[73] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
              sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              w-auto sm:w-[min(760px,94vw)] rounded-3xl app-surface overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.08]">
              <div>
                <h2 id="manage-tree-title" className="font-serif text-lg text-white/92">Manage Tree Structure</h2>
                <p className="text-xs text-white/55 mt-0.5">
                  Connect existing members, remove wrong links, or remove member nodes.
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-lg text-white/45 hover:text-white/80 hover:bg-white/[0.05] transition-colors"
                aria-label="Close"
              >
                <X size={16} className="mx-auto" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">
              <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Link2 size={14} className="text-gold-300" />
                  <h3 className="text-sm font-medium text-white/88">Connect Existing Members</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={sourceId}
                    onChange={(e) => setSourceId(e.target.value)}
                    className="h-10 rounded-xl app-input px-3 text-sm outline-none"
                  >
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberName(member)}
                      </option>
                    ))}
                  </select>

                  <select
                    value={relationType}
                    onChange={(e) => setRelationType(e.target.value as RelationshipType)}
                    className="h-10 rounded-xl app-input px-3 text-sm outline-none"
                  >
                    {RELATIONSHIP_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="h-10 rounded-xl app-input px-3 text-sm outline-none"
                  >
                    <option value="">Choose member...</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {memberName(member)}
                      </option>
                    ))}
                  </select>
                </div>

                {sourceId && targetId && (
                  <div className="mt-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-[11px] uppercase tracking-wider text-white/55 mb-2">Existing links between selected members</p>
                    {existingConnectionsForPair.length === 0 ? (
                      <p className="text-xs text-white/58">No direct links yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {existingConnectionsForPair.map((rel) => {
                          const from = memberById.get(rel.user_id);
                          const to = memberById.get(rel.relative_id);
                          return (
                            <div key={rel.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.01] px-2.5 py-2">
                              <span className="text-xs text-white/78 min-w-0 truncate">
                                {from ? memberName(from) : "Unknown"} → {to ? memberName(to) : "Unknown"}
                              </span>
                              <span className="ml-auto text-[11px] text-gold-300/85">{relationLabel(rel.type)}</span>
                              <button
                                onClick={() => handleRemoveRelationship(rel.id)}
                                disabled={busyAction === `rel:${rel.id}`}
                                className="h-7 px-2 rounded-md border border-white/[0.1] text-xs text-white/70 hover:text-red-300 hover:border-red-400/30 transition-colors disabled:opacity-50"
                              >
                                {busyAction === `rel:${rel.id}` ? "..." : "Remove"}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {duplicateConnection && (
                  <p className="mt-3 text-xs text-amber-300/95">
                    This exact relationship already exists.
                  </p>
                )}

                <button
                  onClick={handleConnect}
                  disabled={!canConnect || busyAction === "connect"}
                  className={cn(
                    "mt-3 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl border text-sm transition-colors",
                    canConnect
                      ? "bg-gold-400/14 border-gold-400/24 text-gold-300 hover:bg-gold-400/20"
                      : "bg-white/[0.03] border-white/[0.1] text-white/45 cursor-not-allowed"
                  )}
                >
                  <GitBranch size={13} />
                  {busyAction === "connect" ? "Connecting..." : "Add Relationship"}
                </button>
              </div>

              <div className="rounded-2xl border border-white/[0.1] bg-white/[0.02] p-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserMinus size={14} className="text-red-300/90" />
                  <h3 className="text-sm font-medium text-white/88">Remove Family Members</h3>
                </div>
                <p className="text-xs text-white/58 mb-3">
                  Removes a member node and all links attached to it. Your own node cannot be removed.
                </p>

                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search members by name, city, or profession..."
                  className="w-full h-10 rounded-xl app-input px-3 text-sm outline-none"
                />

                <div className="mt-3 max-h-[220px] overflow-y-auto space-y-2 pr-1">
                  {removableMembers.length === 0 ? (
                    <p className="text-xs text-white/55">No matching members.</p>
                  ) : (
                    removableMembers.map((member) => (
                      <div key={member.id} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.01] px-2.5 py-2">
                        <div className="min-w-0">
                          <p className="text-sm text-white/86 truncate">{memberName(member)}</p>
                          <p className="text-[11px] text-white/56 truncate">
                            {member.location_city || "No city"}
                            {member.profession ? ` · ${member.profession}` : ""}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveMember(member)}
                          disabled={busyAction === `member:${member.id}`}
                          className="ml-auto inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-red-400/28 text-xs text-red-300 hover:bg-red-400/[0.08] disabled:opacity-50"
                        >
                          <Trash2 size={12} />
                          {busyAction === `member:${member.id}` ? "Removing..." : "Remove"}
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-400/25 bg-red-400/[0.08] px-3 py-2 text-xs text-red-200">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-xl border border-severity-mild/25 bg-severity-mild/10 px-3 py-2 text-xs text-severity-mild">
                  {success}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
