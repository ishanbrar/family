"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle2, Loader2, UserCheck, UserPlus } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { FamilyTree } from "@/components/tree/FamilyTree";
import { createClient } from "@/lib/supabase/client";
import {
  claimFamilyMemberNode,
  getJoinFamilyPreview,
  getProfile,
  joinFamilyAsNewNode,
  type JoinFamilyPreview,
} from "@/lib/supabase/db";
import { createFamilyTreeLayout } from "@/lib/tree-layout";
import type { GeneticMatchResult, Profile, Relationship } from "@/lib/types";

function previewMemberToProfile(member: JoinFamilyPreview["members"][number]): Profile {
  return {
    id: member.id,
    first_name: member.first_name,
    last_name: member.last_name,
    display_name: null,
    gender: member.gender ?? null,
    avatar_url: member.avatar_url ?? null,
    date_of_birth: null,
    place_of_birth: null,
    profession: null,
    location_city: null,
    location_lat: null,
    location_lng: null,
    pets: [],
    social_links: {},
    about_me: null,
    country_code: null,
    role: "MEMBER",
    is_alive: true,
    family_id: null,
    created_at: member.created_at,
    updated_at: member.created_at,
  };
}

const STATIC_MATCH: GeneticMatchResult = {
  percentage: 0,
  relationship: "Family Member",
  path: [],
};

function JoinFamilyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code")?.trim().toUpperCase() || "";
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<Profile | null>(null);
  const [preview, setPreview] = useState<JoinFamilyPreview | null>(null);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      if (!code) {
        setError("Missing invite code.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push(`/login?code=${encodeURIComponent(code)}`);
        return;
      }

      const profile = await getProfile(supabase, user.id);
      if (!profile) {
        setError("Could not load your account profile.");
        setLoading(false);
        return;
      }

      if (profile.family_id) {
        router.push("/dashboard");
        return;
      }

      const joinPreview = await getJoinFamilyPreview(supabase, code);
      if (!joinPreview) {
        setError("Invalid or inactive invite code.");
        setLoading(false);
        return;
      }

      if (cancelled) return;
      setViewer(profile);
      setPreview(joinPreview);

      const exactCandidate = joinPreview.members.find(
        (m) =>
          m.is_claimable &&
          m.first_name.trim().toLowerCase() === profile.first_name.trim().toLowerCase() &&
          m.last_name.trim().toLowerCase() === profile.last_name.trim().toLowerCase()
      );
      setSelectedClaimId(exactCandidate?.id || null);
      setLoading(false);
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [code, router, supabase]);

  const previewProfiles = useMemo(
    () => (preview ? preview.members.map(previewMemberToProfile) : []),
    [preview]
  );

  const previewRelationships = useMemo(
    () => ((preview?.relationships || []) as Relationship[]),
    [preview]
  );

  const treeLayout = useMemo(() => {
    if (previewProfiles.length === 0) {
      return { nodes: [], connections: [], sibships: [], width: 900, height: 560 };
    }
    const preferredRootId =
      (selectedClaimId && previewProfiles.some((profile) => profile.id === selectedClaimId)
        ? selectedClaimId
        : null) || previewProfiles[0].id;
    return createFamilyTreeLayout(previewProfiles, previewRelationships, preferredRootId);
  }, [previewProfiles, previewRelationships, selectedClaimId]);

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

  const claimableMembers = useMemo(
    () =>
      (preview?.members || [])
        .filter((member) => member.is_claimable)
        .sort((a, b) => `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)),
    [preview]
  );

  const handleCreateNewNode = async () => {
    if (!code) return;
    setSubmitting(true);
    setError(null);
    const joinedId = await joinFamilyAsNewNode(supabase, code);
    if (!joinedId) {
      setError("Could not join this family. Please verify the invite code.");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  const handleClaimNode = async () => {
    if (!code || !selectedClaimId) return;
    setSubmitting(true);
    setError(null);
    const claimedId = await claimFamilyMemberNode(supabase, code, selectedClaimId);
    if (!claimedId) {
      setError("Could not claim this node. It may already be claimed.");
      setSubmitting(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="flex items-center gap-2 text-white/50 text-sm">
          <Loader2 size={16} className="animate-spin text-gold-400" />
          Preparing family join flow...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] p-6 lg:p-8">
      <main className="max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <button
            onClick={() => router.push("/signup")}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-white/65 hover:text-white/90 hover:border-white/[0.2] transition-colors"
          >
            <ArrowLeft size={13} />
            Back
          </button>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-[0.14em] text-white/35">Join Family</p>
            <h1 className="font-serif text-2xl text-white/95">
              {preview?.family_name || "Family"} Network
            </h1>
          </div>
        </div>

        <GlassCard className="p-5">
          <h2 className="font-serif text-lg text-white/92 mb-1">Preview Existing Tree</h2>
          <p className="text-xs text-white/45 mb-4">
            Confirm whether you already exist in this tree. If yes, claim that node. If not, create a new one.
          </p>
          {treeMembers.length > 0 ? (
            <FamilyTree
              members={treeMembers}
              sibships={treeLayout.sibships}
              connections={treeLayout.connections}
              showPercentages={false}
              showRelationLabels={false}
              showLastNames
              onMemberClick={(id) => {
                const match = claimableMembers.find((m) => m.id === id);
                if (match) setSelectedClaimId(id);
              }}
              canvasWidth={treeLayout.width}
              canvasHeight={Math.min(Math.max(treeLayout.height, 560), 860)}
            />
          ) : (
            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 text-sm text-white/45">
              No existing tree members yet. You can create the first node.
            </div>
          )}
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassCard className="p-5">
            <h3 className="font-serif text-lg text-white/92 mb-1">I already exist in this tree</h3>
            <p className="text-xs text-white/45 mb-4">
              Select your existing node and claim it.
            </p>

            {claimableMembers.length > 0 ? (
              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {claimableMembers.map((member) => {
                  const selected = selectedClaimId === member.id;
                  return (
                    <button
                      key={member.id}
                      onClick={() => setSelectedClaimId(member.id)}
                      className={`w-full rounded-xl border px-3 py-2.5 text-left transition-colors ${
                        selected
                          ? "border-gold-400/35 bg-gold-400/[0.08]"
                          : "border-white/[0.08] bg-white/[0.02] hover:border-gold-400/20"
                      }`}
                    >
                      <p className="text-sm text-white/90">{member.first_name} {member.last_name}</p>
                      <p className="text-[11px] text-white/35">Unclaimed family node</p>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-white/40">
                No unclaimed nodes available. Create a new node below.
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleClaimNode}
              disabled={submitting || !selectedClaimId}
              className="mt-4 w-full h-11 rounded-xl bg-gold-400/15 border border-gold-400/25 text-sm font-medium text-gold-300 hover:bg-gold-400/20 disabled:opacity-40 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <UserCheck size={14} />
                Claim Selected Node
              </span>
            </motion.button>
          </GlassCard>

          <GlassCard className="p-5">
            <h3 className="font-serif text-lg text-white/92 mb-1">I am not in this tree yet</h3>
            <p className="text-xs text-white/45 mb-4">
              Create your own node and join this family network.
            </p>

            <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-2">
              <p className="text-sm text-white/90">
                {viewer?.first_name} {viewer?.last_name}
              </p>
              <p className="text-[11px] text-white/35">
                This creates a new member node under your authenticated account.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateNewNode}
              disabled={submitting}
              className="mt-4 w-full h-11 rounded-xl bg-white/[0.04] border border-white/[0.12] text-sm font-medium text-white/80 hover:text-white/95 hover:border-gold-400/25 transition-colors"
            >
              <span className="inline-flex items-center gap-2">
                <UserPlus size={14} />
                Create My Node
              </span>
            </motion.button>
          </GlassCard>
        </div>

        {error && (
          <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-2.5 text-sm text-red-300/90">
            {error}
          </div>
        )}

        {!error && (
          <div className="rounded-xl border border-severity-mild/20 bg-severity-mild/[0.08] px-4 py-2.5 text-xs text-severity-mild/85">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={12} />
              You can claim an existing node now or create your own and connect relatives afterward.
            </span>
          </div>
        )}
      </main>
    </div>
  );
}

function JoinFamilyFallback() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Loader2 size={16} className="animate-spin text-gold-400" />
        Preparing family join flow...
      </div>
    </div>
  );
}

export default function JoinFamilyPage() {
  return (
    <Suspense fallback={<JoinFamilyFallback />}>
      <JoinFamilyPageContent />
    </Suspense>
  );
}
