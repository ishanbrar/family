"use client";

// ══════════════════════════════════════════════════════════
// FamilyMembersTable – Editable table view for family members
// Admins can edit Name, DOB, City inline.
// ══════════════════════════════════════════════════════════

import { useState, useCallback } from "react";
import { Loader2, User } from "lucide-react";
import type { Profile } from "@/lib/types";
import { CitySearch } from "@/components/ui/CitySearch";
import { ManualDateInput } from "@/components/ui/ManualDateInput";
import { cn } from "@/lib/cn";
import { shouldCommitCompositeBlur } from "@/lib/flow-readiness";
import { formatDateOnly, formatPersonName, parseDateOnly } from "@/lib/display-format";

function formatDob(value: string | null): string {
  return formatDateOnly(value, { month: "short", day: "numeric", year: "numeric" }) ?? "—";
}

function toInputDate(value: string | null): string {
  return parseDateOnly(value) ? String(value).slice(0, 10) : "";
}

function fromInputDate(value: string): string | null {
  const normalized = value.trim().slice(0, 10);
  return parseDateOnly(normalized) ? normalized : null;
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
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState({ namePrefix: "", firstName: "", middleName: "", lastName: "", dob: "", city: "" });

  const sortedMembers = [...members].sort((a, b) => {
    const aLast = (a.last_name || "").toLowerCase();
    const bLast = (b.last_name || "").toLowerCase();
    if (aLast !== bLast) return aLast.localeCompare(bLast);
    const aFirst = `${a.first_name || ""} ${a.middle_name || ""}`.trim().toLowerCase();
    const bFirst = `${b.first_name || ""} ${b.middle_name || ""}`.trim().toLowerCase();
    return aFirst.localeCompare(bFirst);
  });

  const startEdit = useCallback(
    (member: Profile, field: "name" | "dob" | "city") => {
      if (!canEdit) return;
      setError(null);
      setEditingCell({ memberId: member.id, field });
      setDraft({
        namePrefix: member.name_prefix || "",
        firstName: member.first_name || "",
        middleName: member.middle_name || "",
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
      setError(null);

      const member = members.find((m) => m.id === memberId);
      if (!member) {
        setEditingCell(null);
        setSavingId(null);
        return;
      }

      try {
        if (editingCell.field === "name") {
          const fn = draft.firstName.trim();
          const mn = draft.middleName.trim();
          const ln = draft.lastName.trim();
          if (fn || ln) {
            await onUpdate(memberId, {
              name_prefix: draft.namePrefix.trim() || null,
              first_name: fn || member.first_name,
              middle_name: mn || null,
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
        setEditingCell(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save this edit.");
      } finally {
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
                      <div
                        className="grid grid-cols-2 gap-2 lg:grid-cols-[0.75fr_1fr_1fr_1fr]"
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => {
                          if (!shouldCommitCompositeBlur(e.currentTarget, e.relatedTarget as Node | null)) return;
                          void saveEdit(member.id);
                        }}
                      >
                        <input
                          value={draft.namePrefix}
                          onChange={(e) => setDraft((p) => ({ ...p, namePrefix: e.target.value }))}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          placeholder="Prefix"
                          className="min-w-0 h-8 rounded-lg px-2.5 app-input text-sm"
                        />
                        <input
                          autoFocus
                          value={draft.firstName}
                          onChange={(e) => setDraft((p) => ({ ...p, firstName: e.target.value }))}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          placeholder="First"
                          className="min-w-0 h-8 rounded-lg px-2.5 app-input text-sm"
                        />
                        <input
                          value={draft.middleName}
                          onChange={(e) => setDraft((p) => ({ ...p, middleName: e.target.value }))}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          placeholder="Middle"
                          className="min-w-0 h-8 rounded-lg px-2.5 app-input text-sm"
                        />
                        <input
                          value={draft.lastName}
                          onChange={(e) => setDraft((p) => ({ ...p, lastName: e.target.value }))}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          placeholder="Last"
                          className="min-w-0 h-8 rounded-lg px-2.5 app-input text-sm"
                        />
                      </div>
                    ) : (
                      <span className="text-white/88">
                        {member.first_name || member.last_name
                          ? formatPersonName(member.first_name, member.middle_name || "", member.last_name, member.name_prefix || "")
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
                      <div onClick={(e) => e.stopPropagation()}>
                        <ManualDateInput
                          autoFocus
                          value={draft.dob}
                          onChange={(nextDob) => setDraft((p) => ({ ...p, dob: nextDob }))}
                          onBlur={() => void saveEdit(member.id)}
                          onKeyDown={(e) => handleKeyDown(e, member.id)}
                          className="h-8 rounded-lg px-2.5 app-input text-sm w-[140px]"
                          wrapperClassName="w-[188px]"
                          showPickerButton={false}
                        />
                      </div>
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
                              const next = city.trim();
                              setDraft((p) => ({ ...p, city: next }));
                              setError(null);
                              setSavingId(member.id);
                              void onUpdate(member.id, { location_city: next || null })
                                .then(() => {
                                  setEditingCell(null);
                                })
                                .catch((err) => {
                                  setError(err instanceof Error ? err.message : "Could not save city.");
                                })
                                .finally(() => {
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
      {error && (
        <div className="border-t border-red-400/20 bg-red-400/[0.06] px-4 py-2 text-xs text-red-300/90">
          {error}
        </div>
      )}
    </div>
  );
}
