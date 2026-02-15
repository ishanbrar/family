"use client";

// ══════════════════════════════════════════════════════════
// Profile/[id] – View Any Family Member's Profile
// Uses useFamilyData for DB-backed or mock data.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin,
  Briefcase,
  Calendar,
  User,
  Edit3,
  Shield,
  Crown,
  ArrowLeft,
  Heart,
  Quote,
  Loader2,
  PawPrint,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { SocialDock } from "@/components/ui/SocialDock";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { EditProfileModal } from "@/components/ui/EditProfileModal";
import { useFamilyData } from "@/hooks/use-family-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import { formatGenderLabel } from "@/lib/display-format";
import type { Profile } from "@/lib/types";

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    viewer,
    members,
    relationships,
    conditions,
    userConditions,
    loading,
    updateProfile,
  } = useFamilyData();

  const [editOpen, setEditOpen] = useState(false);

  const member = members.find((m) => m.id === id);

  if (loading) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <Loader2 size={24} className="text-gold-400 animate-spin" />
      </div>
    );
  }

  if (!viewer) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/50 mb-3">You need to sign in to view profiles.</p>
          <a href="/login" className="text-sm text-gold-300 hover:text-gold-200 transition-colors">Go to login</a>
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <p className="text-white/40">Member not found</p>
      </div>
    );
  }

  const isViewer = member.id === viewer.id;
  const isAdmin = viewer.role === "ADMIN";
  const canEdit = isViewer || isAdmin;

  const geneticMatch = isViewer
    ? { percentage: 100, relationship: "Self", path: [viewer.id] }
    : calculateGeneticMatch(viewer.id, member.id, relationships, member.gender);

  const memberConditions = userConditions.filter((uc) => uc.user_id === member.id);

  const isImmediate =
    isViewer ||
    ["parent", "child", "sibling", "spouse"].some((type) =>
      relationships.some(
        (r) =>
          (r.user_id === viewer.id && r.relative_id === member.id && r.type === type) ||
          (r.relative_id === viewer.id && r.user_id === member.id && r.type === type)
      )
    );

  const age = member.date_of_birth
    ? (() => {
        const birth = new Date(member.date_of_birth);
        const today = new Date();
        let years = today.getFullYear() - birth.getFullYear();
        const monthOffset = today.getMonth() - birth.getMonth();
        if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < birth.getDate())) years--;
        return years;
      })()
    : null;

  const connections = members.filter((p) => p.id !== member.id).map((p) => ({
    profile: p,
    match: calculateGeneticMatch(member.id, p.id, relationships, p.gender),
  }));

  const handleSave = async (updates: Partial<Profile> & { avatarFile?: File }) => {
    const { avatarFile, ...profileUpdates } = updates;
    await updateProfile(member.id, profileUpdates, avatarFile);
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />

      <EditProfileModal
        profile={member}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onSave={handleSave}
      />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <button onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 rounded-xl glass hover:bg-white/5 transition-colors text-white/40 hover:text-white/70">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white/95">
                {member.first_name} {member.last_name}
              </h1>
              {member.display_name && (
                <p className="text-sm text-gold-300/80 mt-0.5">
                  {member.display_name}
                </p>
              )}
              <p className="text-sm text-white/35 mt-0.5">
                {isViewer ? "Your profile" : `${geneticMatch.relationship} · ${geneticMatch.percentage}% blood match`}
              </p>
            </div>
          </div>
          {canEdit && (
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => setEditOpen(true)}
              className="self-start flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/10 text-gold-300 text-sm font-medium hover:bg-gold-400/15 transition-colors">
              <Edit3 size={14} />
              {isViewer ? "Edit Profile" : "Edit (Admin)"}
            </motion.button>
          )}
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <GlassCard glow={isViewer} className="xl:col-span-1 p-5 sm:p-8">
            <div className="flex flex-col items-center">
              <GeneticMatchRing percentage={geneticMatch.percentage} size={160} strokeWidth={3}
                avatarUrl={member.avatar_url}
                initials={`${member.first_name[0]}${member.last_name[0]}`}
                showPercentage={!isViewer} label={isViewer ? "You" : geneticMatch.relationship} />

              <h2 className="mt-5 font-serif text-2xl font-bold text-white/95">
                {member.first_name} {member.last_name}
              </h2>
              {member.display_name && (
                <p className="text-xs text-gold-300/85 mt-1">{member.display_name}</p>
              )}

              <div className="mt-2 flex items-center gap-2">
                {member.role === "ADMIN" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-400/10 text-gold-300 text-[10px] font-semibold tracking-wider uppercase">
                    <Crown size={10} /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px] font-semibold tracking-wider uppercase">
                    <Shield size={10} /> Member
                  </span>
                )}
                {!member.is_alive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-white/25 text-[10px] font-semibold tracking-wider uppercase">
                    <Heart size={10} /> In Memoriam
                  </span>
                )}
              </div>

              {member.about_me && (
                <div className="mt-5 w-full">
                  <div className="flex items-center gap-1.5 mb-2">
                    <Quote size={12} className="text-gold-400/40" />
                    <span className="text-[10px] text-white/25 font-medium uppercase tracking-wider">About</span>
                  </div>
                  <p className="text-xs text-white/50 leading-relaxed italic">&ldquo;{member.about_me}&rdquo;</p>
                </div>
              )}

              <div className="mt-5 w-full space-y-3">
                {[
                  { icon: User, label: "Display Name", value: member.display_name },
                  {
                    icon: User,
                    label: "Gender",
                    value: formatGenderLabel(member.gender),
                  },
                  { icon: Briefcase, label: "Profession", value: member.profession },
                  { icon: PawPrint, label: "Pets", value: member.pets.length > 0 ? member.pets.join(", ") : null },
                  { icon: MapPin, label: "Location", value: member.location_city },
                  {
                    icon: Calendar, label: "Date of Birth",
                    value: member.date_of_birth
                      ? `${new Date(member.date_of_birth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${age !== null ? ` (${age})` : ""}`
                      : null,
                  },
                  { icon: MapPin, label: "Place of Birth", value: member.place_of_birth },
                ].map((field) => {
                  const Icon = field.icon;
                  return (
                    <div key={field.label} className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                      <Icon size={14} className="text-white/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/25 font-medium uppercase tracking-wider">{field.label}</p>
                        <p className="text-sm text-white/70 mt-0.5">{field.value || "Not set"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5">
                <SocialDock links={member.social_links} />
              </div>
            </div>
          </GlassCard>

          <div className="xl:col-span-2 space-y-6">
            <GlassCard className="p-6">
              <h3 className="font-serif text-lg font-semibold text-white/90 mb-4">Health Conditions</h3>
              <div className="space-y-3">
                {memberConditions.length > 0 ? (
                  memberConditions.map((uc) => {
                    const condition = uc.condition || conditions.find((c) => c.id === uc.condition_id);
                    if (!condition) return null;
                    return (
                      <MedicalHistoryCard key={uc.id} userCondition={uc} condition={condition}
                        isPrivate={!isViewer && !isImmediate} />
                    );
                  })
                ) : (
                  <p className="text-sm text-white/30 py-4 text-center">No conditions recorded</p>
                )}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-serif text-lg font-semibold text-white/90 mb-4">Family Connections</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {connections
                  .filter((c) => c.match.percentage > 0)
                  .sort((a, b) => b.match.percentage - a.match.percentage)
                  .map((item) => (
                    <motion.div key={item.profile.id} whileHover={{ y: -4 }}
                      onClick={() => router.push(`/profile/${item.profile.id}`)}
                      className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-gold-400/20 transition-colors cursor-pointer">
                      <GeneticMatchRing percentage={item.match.percentage} size={64} strokeWidth={2}
                        avatarUrl={item.profile.avatar_url}
                        initials={`${item.profile.first_name[0]}${item.profile.last_name[0]}`} />
                      <p className="mt-2 text-xs text-white/60 font-medium">{item.profile.first_name}</p>
                      <p className="text-[10px] text-white/30">{item.match.relationship}</p>
                    </motion.div>
                  ))}
              </div>
            </GlassCard>
          </div>
        </div>
      </main>
    </div>
  );
}
