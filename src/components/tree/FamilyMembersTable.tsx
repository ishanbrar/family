"use client";

// ══════════════════════════════════════════════════════════
// FamilyMembersTable – Editable table view for family members
// Admins can edit Name, DOB, City inline.
// ══════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { Loader2, User } from "lucide-react";
import type { Profile } from "@/lib/types";
import { CitySearch } from "@/components/ui/CitySearch";
import { cn } from "@/lib/cn";

function formatDob(value: string | null): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toInputDate(value: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromInputDate(value: string): string | null {
  if (!value.trim()) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface FamilyMembersTableProps {
  members: Profile[];
  canEdit: boolean;
  onUpdate: (memberId: string, updates: Partial<Profile>) => Promise<void>;
  onMemberClick?: (memberId: string) => void;
}

export function FamilyMembersTable({
  members,
  canEdit,
  onUpdate,
  onMemberClick,
}: FamilyMembersTableProps) {
  const [editingCell, setEditingCell] = useState<{ memberId: string; field: "name" | "dob" | "city" } | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [draft, setDraft] = useState({ firstName: "", lastName: "", dob: "", city: "" });

  const sortedMembers = [...members].sort((a, b) => {
    const aLast = (a.last_name || "").toLowerCase();
    const bLast = (b.last_name || "").toLowerCase();
    if (aLast !== bLast) return aLast.localeCompare(bLast);
    return (a.first_name || "").toLowerCase().localeCompare((b.first_name || "").toLowerCase());
  });

  const startEdit = useCallback(
    (member: Profile, field: "name" | "dob" | "city") => {
      if (!canEdit) return;
      setEditingCell({ memberId: member.id, field });
      setDraft({
        firstName: member.first_name || "",
        lastName: member.last_name || "",
        dob: toInputDate(member.date_of_birth),
        city: member.location_city || "",
      });
    },
    [canEdit]
  );

  const cancelEdit = useCallback(() => {
    setEditingCell(null);
  }, []);

  const saveEdit = useCallback(
    async (memberId: string) => {
      if (!editingCell || editingCell.memberId !== memberId) return;
      setSavingId(memberId);

      const member = members.find((m) => m.id === memberId);
      if (!member) {
        setEditingCell(null);
        setSavingId(null);
        return;
      }

      try {
        if (editingCell.field === "name") {
          const fn = draft.firstName.trim();
          const ln = draft.lastName.trim();
          if (fn || ln) {
            await onUpdate(memberId, {
              first_name: fn || member.first_name,
              last_name: ln || member.last_name,
            });
          }
        } else if (editingCell.field === "dob") {
          await onUpdate(memberId, {
            date_of_birth: fromInputDate(draft.dob),
          });
        } else if (editingCell.field === "city") {
          await onUpdate(memberId, {
            location_city: draft.city.trim() || null,
          });
        }
      } finally {
        setEditingCell(null);
        setSavingId(null);
      }
    },
    [editingCell, draft, members, onUpdate]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, memberId: string) => {
      if (e.key === "Enter") {
        e.preventDefault();
        saveEdit(memberId);
      }
      if (e.key === "Escape") {
        cancelEdit();
      }
    },
    [saveEdit, cancelEdit]
  );

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.08]">
              <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/45 font-medium">
                Name
              </th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/45 font-medium">
                Birth date
              </th>
              <th className="px-4 py-3 text-[10px] uppercase tracking-wider text-white/45 font-medium">
                City
              </th>
              {canEdit && <th className="w-10 px-4 py-3" />}
            </tr>
          </thead>
          <tbody>
            {sortedMembers.map((member) => {
              const isEditingName = editingCell?.memberId === member.id && editingCell?.field === "name";
              const isEditingDob = editingCell?.memberId === member.id && editingCell?.field === "dob";
              const isEditingCity = editingCell?.memberId === member.id && editingCell?.field === "city";
              const isSaving = savingId === member.id;

              return (
                <tr
                  key={member.id}
                  className={cn(
                    "border-b border-white/[0.04] last:border-0",
                    "hover:bg-white/[0.02] transition-colors",
                    onMemberClick && "cursor-pointer"
                  )}
                  onClick={() => onMemberClick?.(member.id)}
                >
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => {
                      if (canEdit) {
                        e.stopPropagation();
                        startEdit(member, "name");
                      }
                    }}
                  >
                    {isEditingName ? (
                      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={draft.firstName}
                          onChange={(e) => setDraft((p) => ({ ...p, firstName: e.target.value }))}
                          onBlur={() => saveEdit(member.id)}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          placeholder="First"
                          className="flex-1 min-w-0 h-8 rounded-lg px-2.5 app-input text-sm"
                        />
                        <input
                          value={draft.lastName}
                          onChange={(e) => setDraft((p) => ({ ...p, lastName: e.target.value }))}
                          onBlur={() => saveEdit(member.id)}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          placeholder="Last"
                          className="flex-1 min-w-0 h-8 rounded-lg px-2.5 app-input text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-white/88">
                        {member.first_name || member.last_name
                          ? [member.first_name, member.last_name].filter(Boolean).join(" ")
                          : "—"}
                      </span>
                    )}
                  </td>
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => {
                      if (canEdit) {
                        e.stopPropagation();
                        startEdit(member, "dob");
                      }
                    }}
                  >
                    {isEditingDob ? (
                      <input
                        autoFocus
                        type="date"
                        value={draft.dob}
                        onChange={(e) => setDraft((p) => ({ ...p, dob: e.target.value }))}
                        onBlur={() => saveEdit(member.id)}
                        onKeyDown={(e) => handleKeyDown(e, member.id)}
                        className="h-8 rounded-lg px-2.5 app-input text-sm w-[140px]"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="text-white/75">{formatDob(member.date_of_birth)}</span>
                    )}
                  </td>
                  <td
                    className="px-4 py-2.5"
                    onClick={(e) => {
                      if (canEdit) {
                        e.stopPropagation();
                        startEdit(member, "city");
                      }
                    }}
                  >
                    {isEditingCity ? (
                      <div
                        className="min-w-[200px] max-w-[280px]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <CitySearch
                          value={draft.city}
                          onChange={(city) => {
                            setSavingId(member.id);
                            onUpdate(member.id, { location_city: city.trim() || null }).finally(() => {
                              setEditingCell(null);
                              setSavingId(null);
                            });
                          }}
                          onBlur={(currentValue) => {
                            setSavingId(member.id);
                            onUpdate(member.id, { location_city: currentValue.trim() || null }).finally(() => {
                              setEditingCell(null);
                              setSavingId(null);
                            });
                          }}
                          placeholder="Search a city..."
                          className="[&_input]:h-8 [&_input]:py-1.5 [&_input]:rounded-lg [&_input]:text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-white/75">{member.location_city || "—"}</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2.5 w-10">
                      {isSaving && <Loader2 size={14} className="animate-spin text-white/50" />}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {members.length === 0 && (
        <div className="py-12 text-center">
          <User size={28} className="mx-auto text-white/25 mb-2" />
          <p className="text-sm text-white/40">No family members yet</p>
        </div>
      )}
    </div>
  );
}
