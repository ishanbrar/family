"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Crown, GitBranch, Loader2, Search, Shield, Users } from "lucide-react";

import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { FamilyUsersAdmin } from "@/components/settings/FamilyUsersAdmin";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import type { FamilyRecord } from "@/lib/supabase/db";
import type { GeneticMatchResult, Profile, Relationship } from "@/lib/types";

type SuperAdminFamily = FamilyRecord & {
  created_at: string;
  created_by: string | null;
  memberCount: number;
  joinedUserCount: number;
  adminCount: number;
  relationshipCount: number;
  admins: Array<{ profileId: string; name: string }>;
};

type SuperAdminPayload = {
  families?: SuperAdminFamily[];
  profiles?: Profile[];
  relationships?: Relationship[];
  error?: string;
};

const STATIC_MATCH: GeneticMatchResult = {
  percentage: 0,
  relationship: "Family Member",
  path: [],
};

export default function SuperAdminPage() {
  const [families, setFamilies] = useState<SuperAdminFamily[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [selectedFamilyId, setSelectedFamilyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/super-admin/families", { cache: "no-store" });
        const payload = (await res.json().catch(() => ({}))) as SuperAdminPayload;
        if (!res.ok) throw new Error(payload.error || "Could not load super admin data.");
        if (cancelled) return;

        const nextFamilies = payload.families || [];
        setFamilies(nextFamilies);
        setProfiles(payload.profiles || []);
        setRelationships(payload.relationships || []);
        setSelectedFamilyId((current) => current || nextFamilies[0]?.id || null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load super admin data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredFamilies = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return families;
    return families.filter((family) =>
      [
        family.name,
        family.invite_code,
        ...family.admins.map((admin) => admin.name),
      ]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [families, query]);

  const selectedFamily = useMemo(
    () => families.find((family) => family.id === selectedFamilyId) || null,
    [families, selectedFamilyId]
  );

  const selectedMembers = useMemo(
    () => profiles.filter((profile) => profile.family_id === selectedFamilyId),
    [profiles, selectedFamilyId]
  );

  const selectedRelationships = useMemo(() => {
    const ids = new Set(selectedMembers.map((member) => member.id));
    return relationships.filter((relationship) => ids.has(relationship.user_id) && ids.has(relationship.relative_id));
  }, [relationships, selectedMembers]);

  const treeLayout = useMemo(() => {
    const rootId =
      selectedMembers.find((member) => member.role === "ADMIN")?.id ||
      selectedMembers[0]?.id ||
      null;
    if (!rootId) return { nodes: [], connections: [], sibships: [], width: 900, height: 560 };
    return createFamilyTreeLayout(selectedMembers, selectedRelationships, rootId);
  }, [selectedMembers, selectedRelationships]);

  const treeMembers = useMemo(
    () =>
      treeLayout.nodes.map((node) => ({
        profile: node.profile,
        match: STATIC_MATCH,
        x: node.x,
        y: node.y,
        generation: node.generation,
      })),
    [treeLayout.nodes]
  );

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />
      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20">
              <Crown size={22} className="text-gold-300" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white/95">Super Admin</h1>
              <p className="text-sm text-white/35 mt-0.5">Global tree, user, and family administration</p>
            </div>
          </div>
        </motion.div>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-white/45">
            <Loader2 size={16} className="animate-spin text-gold-300" />
            Loading all families...
          </div>
        ) : error ? (
          <GlassCard className="p-5 border-red-400/15 bg-red-400/[0.06]">
            <p className="text-sm text-red-300/90">{error}</p>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-5">
            <GlassCard className="p-4">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Shield size={16} className="text-gold-300" />
                  <h2 className="text-sm font-semibold text-white/90">All Families</h2>
                </div>
                <span className="text-xs text-white/35">{families.length} total</span>
              </div>

              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search families"
                  className="w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] pl-9 pr-3 text-sm text-white/85 outline-none focus:border-gold-400/30"
                />
              </div>

              <div className="space-y-2 max-h-[calc(100vh-260px)] overflow-y-auto pr-1">
                {filteredFamilies.map((family) => {
                  const active = family.id === selectedFamilyId;
                  return (
                    <button
                      key={family.id}
                      type="button"
                      onClick={() => setSelectedFamilyId(family.id)}
                      className={`w-full rounded-xl border p-3 text-left transition-colors ${
                        active
                          ? "border-gold-400/30 bg-gold-400/[0.1]"
                          : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <p className="truncate text-sm font-medium text-white/90">{family.name}</p>
                      <p className="mt-1 text-[11px] text-white/38">
                        {family.memberCount} members · {family.joinedUserCount} users · {family.adminCount} admins
                      </p>
                      <p className="mt-1 font-mono text-[11px] text-gold-300/70">{family.invite_code}</p>
                    </button>
                  );
                })}
              </div>
            </GlassCard>

            <div className="space-y-5">
              {selectedFamily && (
                <GlassCard className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-5">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">Selected Tree</p>
                      <h2 className="font-serif text-xl text-white/95 mt-1">{selectedFamily.name}</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                        <Users size={14} className="mx-auto mb-1 text-white/45" />
                        <p className="text-sm text-white/90">{selectedFamily.memberCount}</p>
                        <p className="text-[10px] text-white/35">Members</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                        <Shield size={14} className="mx-auto mb-1 text-white/45" />
                        <p className="text-sm text-white/90">{selectedFamily.adminCount}</p>
                        <p className="text-[10px] text-white/35">Admins</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                        <GitBranch size={14} className="mx-auto mb-1 text-white/45" />
                        <p className="text-sm text-white/90">{selectedFamily.relationshipCount}</p>
                        <p className="text-[10px] text-white/35">Edges</p>
                      </div>
                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2">
                        <Users size={14} className="mx-auto mb-1 text-white/45" />
                        <p className="text-sm text-white/90">{selectedFamily.joinedUserCount}</p>
                        <p className="text-[10px] text-white/35">Users</p>
                      </div>
                    </div>
                  </div>

                  {treeMembers.length > 0 ? (
                    <FamilyTree
                      members={treeMembers}
                      connections={treeLayout.connections}
                      sibships={treeLayout.sibships}
                      viewerId={treeMembers[0]?.profile.id}
                      showPercentages={false}
                      showRelationLabels
                      showLastNames
                      showBirthYear
                      canvasWidth={treeLayout.width}
                      canvasHeight={treeLayout.height}
                      fitPadding={48}
                      className="min-h-[520px]"
                    />
                  ) : (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-4 text-sm text-white/40">
                      No members in this family yet.
                    </div>
                  )}
                </GlassCard>
              )}

              {selectedFamilyId && <FamilyUsersAdmin familyId={selectedFamilyId} />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
