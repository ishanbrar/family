"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Save, Shield, Trash2, UserCheck, Users } from "lucide-react";

import { GlassCard } from "@/components/ui/GlassCard";
import type { AdminAssignableProfileNode, AdminFamilyUser, Role } from "@/lib/types";

type Draft = {
  email: string;
  phone: string;
  role: Role;
};

type RowStatus = {
  saving?: boolean;
  removing?: boolean;
  message?: string;
  error?: string;
};

type ApiListResponse = {
  users?: AdminFamilyUser[];
  assignableNodes?: AdminAssignableProfileNode[];
  requesterProfileId?: string;
  error?: string;
  notice?: string;
  capabilities?: {
    authEmail?: boolean;
    removeLogin?: boolean;
    assignNode?: boolean;
    superAdmin?: boolean;
  };
};

function toDraft(user: AdminFamilyUser): Draft {
  return {
    email: user.email || "",
    phone: user.phone || "",
    role: user.role,
  };
}

export function FamilyUsersAdmin({ familyId }: { familyId?: string | null }) {
  const [users, setUsers] = useState<AdminFamilyUser[]>([]);
  const [assignableNodes, setAssignableNodes] = useState<AdminAssignableProfileNode[]>([]);
  const [requesterProfileId, setRequesterProfileId] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [assignTargets, setAssignTargets] = useState<Record<string, string>>({});
  const [rowStatus, setRowStatus] = useState<Record<string, RowStatus>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState({
    authEmail: true,
    removeLogin: true,
    assignNode: true,
    superAdmin: false,
  });

  const adminCount = useMemo(
    () => users.filter((user) => user.role === "ADMIN").length,
    [users]
  );

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    setNotice(null);
    try {
      const query = familyId ? `?familyId=${encodeURIComponent(familyId)}` : "";
      const res = await fetch(`/api/admin/family-users${query}`, { cache: "no-store" });
      const payload = (await res.json().catch(() => ({}))) as ApiListResponse;
      if (!res.ok) throw new Error(payload.error || "Could not load family users.");

      const nextUsers = payload.users || [];
      const nextAssignableNodes = payload.assignableNodes || [];
      setUsers(nextUsers);
      setAssignableNodes(nextAssignableNodes);
      setRequesterProfileId(payload.requesterProfileId || null);
      setNotice(payload.notice || null);
      setCapabilities({
        authEmail: payload.capabilities?.authEmail ?? true,
        removeLogin: payload.capabilities?.removeLogin ?? true,
        assignNode: payload.capabilities?.assignNode ?? true,
        superAdmin: payload.capabilities?.superAdmin ?? false,
      });
      setDrafts(
        Object.fromEntries(nextUsers.map((user) => [user.profileId, toDraft(user)]))
      );
      setAssignTargets({});
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load family users.");
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const updateDraft = (profileId: string, updates: Partial<Draft>) => {
    setDrafts((prev) => ({
      ...prev,
      [profileId]: { ...prev[profileId], ...updates },
    }));
    setRowStatus((prev) => ({ ...prev, [profileId]: {} }));
  };

  const updateAssignTarget = (profileId: string, targetProfileId: string) => {
    setAssignTargets((prev) => ({
      ...prev,
      [profileId]: targetProfileId,
    }));
    setRowStatus((prev) => ({ ...prev, [profileId]: {} }));
  };

  const saveUser = async (user: AdminFamilyUser) => {
    const draft = drafts[user.profileId] || toDraft(user);
    setRowStatus((prev) => ({
      ...prev,
      [user.profileId]: { saving: true },
    }));

    try {
      const query = familyId ? `?familyId=${encodeURIComponent(familyId)}` : "";
      const res = await fetch(`/api/admin/family-users/${encodeURIComponent(user.profileId)}${query}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        user?: AdminFamilyUser;
        error?: string;
      };
      if (!res.ok || !payload.user) throw new Error(payload.error || "Could not save user.");

      setUsers((prev) =>
        prev.map((item) => (item.profileId === user.profileId ? payload.user! : item))
      );
      setDrafts((prev) => ({ ...prev, [user.profileId]: toDraft(payload.user!) }));
      setRowStatus((prev) => ({
        ...prev,
        [user.profileId]: { message: "Saved" },
      }));
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [user.profileId]: {
          error: err instanceof Error ? err.message : "Could not save user.",
        },
      }));
    }
  };

  const removeUser = async (user: AdminFamilyUser) => {
    const confirmed = window.confirm(
      `Remove login access for ${user.name}? Their family tree node and relationships will stay.`
    );
    if (!confirmed) return;

    setRowStatus((prev) => ({
      ...prev,
      [user.profileId]: { removing: true },
    }));

    try {
      const query = familyId ? `?familyId=${encodeURIComponent(familyId)}` : "";
      const res = await fetch(`/api/admin/family-users/${encodeURIComponent(user.profileId)}${query}`, {
        method: "DELETE",
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not remove user access.");

      setUsers((prev) => prev.filter((item) => item.profileId !== user.profileId));
      setDrafts((prev) => {
        const next = { ...prev };
        delete next[user.profileId];
        return next;
      });
      setRowStatus((prev) => {
        const next = { ...prev };
        delete next[user.profileId];
        return next;
      });
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [user.profileId]: {
          error: err instanceof Error ? err.message : "Could not remove user access.",
        },
      }));
    }
  };

  const assignUserToNode = async (user: AdminFamilyUser) => {
    const targetProfileId = assignTargets[user.profileId] || "";
    const targetNode = assignableNodes.find((node) => node.profileId === targetProfileId);
    if (!targetNode) {
      setRowStatus((prev) => ({
        ...prev,
        [user.profileId]: { error: "Choose an unclaimed profile node." },
      }));
      return;
    }

    const confirmed = window.confirm(
      `Assign ${user.name}'s login to ${targetNode.name}? Their account will move to that tree node.`
    );
    if (!confirmed) return;

    setRowStatus((prev) => ({
      ...prev,
      [user.profileId]: { saving: true },
    }));

    try {
      const query = familyId ? `?familyId=${encodeURIComponent(familyId)}` : "";
      const res = await fetch(`/api/admin/family-users/${encodeURIComponent(user.profileId)}${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetProfileId }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(payload.error || "Could not assign account to node.");

      await loadUsers();
    } catch (err) {
      setRowStatus((prev) => ({
        ...prev,
        [user.profileId]: {
          error: err instanceof Error ? err.message : "Could not assign account to node.",
        },
      }));
    }
  };

  return (
    <GlassCard className="p-5 xl:col-span-2">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
            <Users size={16} className="text-gold-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white/90">Family Users</h2>
            <p className="text-xs text-white/45">
              Manage joined accounts, contact info, and admin access.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadUsers()}
          disabled={loading}
          className="h-9 px-3 rounded-xl border border-white/[0.12] bg-white/[0.03] text-xs text-white/70 hover:text-white/90 disabled:opacity-50"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {loadError && (
        <div className="mb-4 rounded-xl border border-red-400/15 bg-red-400/[0.06] px-3 py-2 text-sm text-red-300/90">
          {loadError}
        </div>
      )}

      {notice && !loadError && (
        <div className="mb-4 rounded-xl border border-amber-400/15 bg-amber-400/[0.06] px-3 py-2 text-sm text-amber-200/90">
          {notice}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-4 text-sm text-white/45">
          <Loader2 size={16} className="animate-spin text-gold-300" />
          Loading family users...
        </div>
      ) : users.length === 0 && !loadError ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-4 text-sm text-white/40">
          No joined users yet.
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const draft = drafts[user.profileId] || toDraft(user);
            const status = rowStatus[user.profileId] || {};
            const isSelf = requesterProfileId === user.profileId;
            const isLastAdmin = user.role === "ADMIN" && adminCount <= 1;
            const isSuperAdmin = capabilities.superAdmin;
            const disabled = !!status.saving || !!status.removing;
            const roleLocked = !isSuperAdmin && (isSelf || isLastAdmin);
            const removeLocked = (!isSuperAdmin && (isSelf || isLastAdmin)) || !capabilities.removeLogin;
            const emailLocked = !capabilities.authEmail;
            const assignLocked =
              disabled || !capabilities.assignNode || assignableNodes.length === 0;

            return (
              <div
                key={user.profileId}
                className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3"
              >
                <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1.4fr_1fr_auto] gap-3 items-end">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-white/90">{user.name}</p>
                      {user.role === "ADMIN" && (
                        <span className="inline-flex items-center gap-1 rounded-full border border-gold-400/20 bg-gold-400/10 px-2 py-0.5 text-[11px] text-gold-300">
                          <Shield size={11} />
                          Admin
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-white/35">
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                      {user.lastSignInAt ? ` · Last sign-in ${new Date(user.lastSignInAt).toLocaleDateString()}` : ""}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <label className="block">
                      <span className="text-[11px] text-white/40">Email</span>
                      <input
                        type="email"
                        value={draft.email}
                        onChange={(e) => updateDraft(user.profileId, { email: e.target.value })}
                        disabled={disabled || emailLocked}
                        title={emailLocked ? "Email updates require server configuration" : undefined}
                        placeholder={emailLocked ? "Unavailable until migration is applied" : undefined}
                        className="mt-1 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30 disabled:opacity-60"
                      />
                    </label>
                    <label className="block">
                      <span className="text-[11px] text-white/40">Phone</span>
                      <input
                        type="tel"
                        value={draft.phone}
                        onChange={(e) => updateDraft(user.profileId, { phone: e.target.value })}
                        disabled={disabled}
                        className="mt-1 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30 disabled:opacity-60"
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[11px] text-white/40">Role</span>
                    <select
                      value={draft.role}
                      onChange={(e) => updateDraft(user.profileId, { role: e.target.value as Role })}
                      disabled={disabled || roleLocked}
                      title={roleLocked ? "Self and last-admin role changes are locked" : undefined}
                      className="mt-1 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30 disabled:opacity-60"
                    >
                      <option value="MEMBER">Member</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </label>

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => void saveUser(user)}
                      disabled={disabled}
                      className="h-10 min-w-10 px-3 rounded-xl bg-gold-400/15 border border-gold-400/25 text-gold-300 hover:bg-gold-400/20 disabled:opacity-50 flex items-center justify-center gap-2"
                      aria-label={`Save ${user.name}`}
                    >
                      {status.saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                      <span className="hidden sm:inline text-xs">Save</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeUser(user)}
                      disabled={disabled || removeLocked}
                      title={
                        removeLocked
                          ? !capabilities.removeLogin
                            ? "Login removal requires server configuration"
                            : "Self and last-admin removal are locked"
                          : undefined
                      }
                      className="h-10 min-w-10 px-3 rounded-xl bg-red-400/[0.08] border border-red-400/15 text-red-300/80 hover:bg-red-400/[0.12] disabled:opacity-40 flex items-center justify-center gap-2"
                      aria-label={`Remove ${user.name}`}
                    >
                      {status.removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                    </button>
                  </div>
                </div>

                {(status.error || status.message) && (
                  <p className={`mt-2 text-xs ${status.error ? "text-red-300/90" : "text-emerald-300/80"}`}>
                    {status.error || status.message}
                  </p>
                )}

                <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 border-t border-white/[0.06] pt-3">
                  <label className="block">
                    <span className="text-[11px] text-white/40">Assign login to tree node</span>
                    <select
                      value={assignTargets[user.profileId] || ""}
                      onChange={(e) => updateAssignTarget(user.profileId, e.target.value)}
                      disabled={assignLocked}
                      title={
                        !capabilities.assignNode
                          ? "Assignment requires the latest database migration"
                          : assignableNodes.length === 0
                            ? "No unclaimed profile nodes available"
                            : undefined
                      }
                      className="mt-1 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30 disabled:opacity-60"
                    >
                      <option value="">
                        {assignableNodes.length === 0 ? "No unclaimed nodes" : "Choose unclaimed node"}
                      </option>
                      {assignableNodes.map((node) => (
                        <option key={node.profileId} value={node.profileId}>
                          {node.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="button"
                    onClick={() => void assignUserToNode(user)}
                    disabled={assignLocked || !assignTargets[user.profileId]}
                    className="h-10 self-end px-3 rounded-xl bg-white/[0.04] border border-white/[0.12] text-white/70 hover:text-white/90 hover:bg-white/[0.07] disabled:opacity-40 flex items-center justify-center gap-2"
                    aria-label={`Assign ${user.name} to profile node`}
                  >
                    {status.saving ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
                    <span className="text-xs">Assign</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
