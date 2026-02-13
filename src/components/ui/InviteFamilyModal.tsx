"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import {
  X,
  Copy,
  Link2,
  Users,
  Check,
  Plus,
  Pencil,
  Save,
  Trash2,
} from "lucide-react";
import type { FamilyRecord, InviteCodeRecord } from "@/lib/supabase/db";

interface InviteFamilyModalProps {
  isOpen: boolean;
  onClose: () => void;
  family: FamilyRecord;
  inviteCodes: InviteCodeRecord[];
  memberCount: number;
  onCreateCode: (customCode?: string, label?: string) => Promise<void>;
  onUpdateCode: (inviteCodeId: string, nextCode: string, label?: string) => Promise<void>;
  onDeleteCode: (inviteCodeId: string) => Promise<void>;
}

const CODE_PATTERN = /^[A-Z]{2,24}\d{1,4}$/;

function familyInviteCodeBase(name: string): string {
  const tokens = name
    .trim()
    .toUpperCase()
    .split(/\s+/)
    .map((part) => part.replace(/[^A-Z]/g, ""))
    .filter(Boolean);

  let raw = "";
  for (let i = tokens.length - 1; i >= 0; i -= 1) {
    if (tokens[i] !== "FAMILY") {
      raw = tokens[i];
      break;
    }
  }

  if (!raw) raw = tokens[tokens.length - 1] || "";
  if (!raw || raw.length < 2) raw = "FAMILY";
  return raw.slice(0, 24);
}

export function InviteFamilyModal({
  isOpen,
  onClose,
  family,
  inviteCodes,
  memberCount,
  onCreateCode,
  onUpdateCode,
  onDeleteCode,
}: InviteFamilyModalProps) {
  const [copyDoneId, setCopyDoneId] = useState<string | null>(null);
  const [copyLinkDoneId, setCopyLinkDoneId] = useState<string | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [label, setLabel] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCode, setEditingCode] = useState("");
  const expectedPrefix = familyInviteCodeBase(family.name);

  const sortedCodes = useMemo(
    () => [...inviteCodes].sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [inviteCodes]
  );

  const codeToLink = (code: string) => {
    if (typeof window === "undefined") return "";
    const url = new URL("/signup", window.location.origin);
    url.searchParams.set("mode", "join");
    url.searchParams.set("code", code);
    return url.toString();
  };

  const copyText = async (text: string, codeId: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(text);
      if (kind === "code") {
        setCopyDoneId(codeId);
        setTimeout(() => setCopyDoneId((prev) => (prev === codeId ? null : prev)), 1400);
      } else {
        setCopyLinkDoneId(codeId);
        setTimeout(() => setCopyLinkDoneId((prev) => (prev === codeId ? null : prev)), 1400);
      }
    } catch {
      // no-op
    }
  };

  const handleCreateAuto = async () => {
    setCreating(true);
    await onCreateCode(undefined, label.trim() || undefined);
    setCreating(false);
    setLabel("");
  };

  const handleCreateCustom = async () => {
    const normalized = customCode.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized) || !normalized.startsWith(expectedPrefix)) return;
    setCreating(true);
    await onCreateCode(normalized, label.trim() || undefined);
    setCreating(false);
    setCustomCode("");
    setLabel("");
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    await onDeleteCode(id);
    setBusyId(null);
  };

  const startEdit = (code: InviteCodeRecord) => {
    setEditingId(code.id);
    setEditingCode(code.code);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const normalized = editingCode.trim().toUpperCase();
    if (!CODE_PATTERN.test(normalized) || !normalized.startsWith(expectedPrefix)) return;
    setBusyId(editingId);
    await onUpdateCode(editingId, normalized);
    setBusyId(null);
    setEditingId(null);
    setEditingCode("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 app-overlay backdrop-blur-sm z-[80]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            className="fixed z-[81] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
              sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              w-auto sm:w-[min(760px,94vw)] sm:max-h-[86vh] rounded-3xl overflow-hidden app-surface"
          >
            <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl text-white/95">Invite Codes</h2>
                <p className="text-xs text-white/35 mt-0.5">
                  {family.name} · {memberCount} member{memberCount !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl text-white/35 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                aria-label="Close"
              >
                <X size={18} className="mx-auto" />
              </button>
            </div>

            <div className="p-4 sm:p-6 overflow-y-auto max-h-none sm:max-h-[68vh] space-y-5">
              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                <p className="text-[11px] uppercase tracking-wider text-white/35 mb-3">Create New Code</p>
                <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr_auto_auto] gap-2">
                  <input
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="Custom code (e.g., MONTAGUE4821)"
                    className="h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-white/85 placeholder:text-white/28 outline-none focus:border-gold-400/35"
                  />
                  <input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="Label (optional)"
                    className="h-10 rounded-xl bg-white/[0.04] border border-white/[0.08] px-3 text-sm text-white/85 placeholder:text-white/28 outline-none focus:border-gold-400/35"
                  />
                  <button
                    onClick={handleCreateCustom}
                    disabled={
                      creating ||
                      !CODE_PATTERN.test(customCode.trim().toUpperCase()) ||
                      !customCode.trim().toUpperCase().startsWith(expectedPrefix)
                    }
                    className="h-10 px-3 rounded-xl bg-gold-400/14 border border-gold-400/22 text-xs text-gold-300 hover:bg-gold-400/20 disabled:opacity-40 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5"><Plus size={12} /> Add Custom</span>
                  </button>
                  <button
                    onClick={handleCreateAuto}
                    disabled={creating}
                    className="h-10 px-3 rounded-xl bg-white/[0.04] border border-white/[0.1] text-xs text-white/72 hover:text-white/92 hover:border-gold-400/22 transition-colors"
                  >
                    Auto Code
                  </button>
                </div>
                <p className="mt-2 text-[11px] text-white/35">
                  Required format: {expectedPrefix} + up to 4 digits.
                </p>
              </div>

              <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
                <div className="px-4 py-3 border-b border-white/[0.06]">
                  <p className="text-[11px] uppercase tracking-wider text-white/35">
                    Active Codes ({sortedCodes.length})
                  </p>
                </div>

                {sortedCodes.length === 0 ? (
                  <div className="px-4 py-5 text-sm text-white/45">No active invite codes.</div>
                ) : (
                  <div className="divide-y divide-white/[0.06]">
                    {sortedCodes.map((code) => {
                      const link = codeToLink(code.code);
                      const isEditing = editingId === code.id;
                      const isBusy = busyId === code.id;
                      const isPrimary = family.invite_code === code.code;
                      return (
                        <div key={code.id} className="px-4 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            {isEditing ? (
                              <>
                                <input
                                  value={editingCode}
                                  onChange={(e) => setEditingCode(e.target.value.toUpperCase())}
                                  className="h-9 min-w-[220px] rounded-lg bg-white/[0.04] border border-white/[0.12] px-2.5 text-sm text-white/85 outline-none focus:border-gold-400/35"
                                />
                                <button
                                  onClick={handleSaveEdit}
                                  disabled={
                                    isBusy ||
                                    !CODE_PATTERN.test(editingCode.trim().toUpperCase()) ||
                                    !editingCode.trim().toUpperCase().startsWith(expectedPrefix)
                                  }
                                  className="h-9 px-2.5 rounded-lg bg-gold-400/14 border border-gold-400/22 text-xs text-gold-300 disabled:opacity-40 transition-colors"
                                >
                                  <span className="inline-flex items-center gap-1"><Save size={12} /> Save</span>
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingId(null);
                                    setEditingCode("");
                                  }}
                                  className="h-9 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-white/70"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <code className="text-sm font-mono tracking-[0.08em] text-white/95">
                                  {code.code}
                                </code>
                                {isPrimary && (
                                  <span className="px-2 py-0.5 rounded-md bg-gold-400/12 border border-gold-400/22 text-[10px] text-gold-300">
                                    Primary
                                  </span>
                                )}
                                {code.label && (
                                  <span className="px-2 py-0.5 rounded-md bg-white/[0.05] text-[10px] text-white/50">
                                    {code.label}
                                  </span>
                                )}
                                <span className="ml-auto text-[11px] text-white/30">
                                  {new Date(code.created_at).toLocaleDateString("en-US")}
                                </span>
                              </>
                            )}
                          </div>

                          {!isEditing && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                              <button
                                onClick={() => copyText(code.code, code.id, "code")}
                                className="h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 hover:text-white/92 transition-colors"
                              >
                                <span className="inline-flex items-center gap-1">
                                  {copyDoneId === code.id ? <Check size={12} /> : <Copy size={12} />}
                                  {copyDoneId === code.id ? "Copied" : "Copy code"}
                                </span>
                              </button>

                              <button
                                onClick={() => copyText(link, code.id, "link")}
                                className="h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/70 hover:text-white/92 transition-colors"
                              >
                                <span className="inline-flex items-center gap-1">
                                  {copyLinkDoneId === code.id ? <Check size={12} /> : <Link2 size={12} />}
                                  {copyLinkDoneId === code.id ? "Copied" : "Copy link"}
                                </span>
                              </button>

                              <button
                                onClick={() => startEdit(code)}
                                className="h-8 px-2.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-white/65 hover:text-white/90 transition-colors"
                              >
                                <span className="inline-flex items-center gap-1"><Pencil size={12} /> Edit</span>
                              </button>

                              <button
                                onClick={() => handleDelete(code.id)}
                                disabled={isBusy || sortedCodes.length <= 1}
                                className="h-8 px-2.5 rounded-lg bg-red-400/[0.08] border border-red-400/20 text-xs text-red-300 hover:bg-red-400/[0.14] disabled:opacity-35 transition-colors"
                                title={sortedCodes.length <= 1 ? "Keep at least one active code" : "Delete code"}
                              >
                                <span className="inline-flex items-center gap-1"><Trash2 size={12} /> Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="px-6 py-4 border-t border-white/[0.06] flex items-center justify-between">
              <div className="inline-flex items-center gap-1.5 text-[11px] text-white/30">
                <Users size={12} />
                Shared family invite network
              </div>
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-xs text-white/60 hover:text-white/85 hover:bg-white/[0.04] transition-colors"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
