"use client";

// ══════════════════════════════════════════════════════════
// Demo Profile – View sample family member (no auth)
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import {
  MapPin, Briefcase, Calendar, User, Shield, Crown,
  ArrowLeft, Heart, Quote, PawPrint,
} from "lucide-react";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { SocialDock } from "@/components/ui/SocialDock";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { ProfilePlacesCard } from "@/components/profile/ProfilePlacesCard";
import { useFamilyStore } from "@/store/family-store";
import {
  MOCK_PROFILES,
  MOCK_RELATIONSHIPS,
  MOCK_CONDITIONS,
  MOCK_USER_CONDITIONS,
} from "@/lib/mock-data";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import { formatGenderLabel } from "@/lib/display-format";
import { useResolvedGalleryPhotos } from "@/hooks/use-resolved-gallery-photos";
import { buildGoogleMapsSearchUrl } from "@/lib/maps";
import type { Profile } from "@/lib/types";

export default function DemoProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const store = useFamilyStore();

  useEffect(() => {
    if (!store.viewer) {
      store.setViewer(MOCK_PROFILES[0]);
      store.setMembers(MOCK_PROFILES);
      store.setRelationships(MOCK_RELATIONSHIPS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const viewer = store.viewer;
  const members = store.members.length > 0 ? store.members : MOCK_PROFILES;
  const relationships = store.relationships.length > 0 ? store.relationships : MOCK_RELATIONSHIPS;
  const member = members.find((m) => m.id === id);
  const resolvedGalleryPhotos = useResolvedGalleryPhotos(member?.gallery_photos || []);

  if (!viewer || !member) {
    return <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center"><p className="text-white/40">Member not found</p></div>;
  }

  const isViewer = member.id === viewer.id;
  const geneticMatch = isViewer
    ? { percentage: 100, relationship: "Self", path: [viewer.id] }
    : calculateGeneticMatch(viewer.id, member.id, relationships, member.gender);

  const memberConditions = MOCK_USER_CONDITIONS.filter((uc) => uc.user_id === member.id);
  const isImmediate = isViewer || relationships.some((r) =>
    ((r.user_id === viewer.id && r.relative_id === member.id) || (r.relative_id === viewer.id && r.user_id === member.id)) &&
    ["parent", "child", "sibling", "spouse"].includes(r.type)
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
    profile: p, match: calculateGeneticMatch(member.id, p.id, relationships, p.gender),
  }));
  const spouseRelation = relationships.find(
    (rel) =>
      rel.type === "spouse" &&
      ((rel.user_id === member.id && rel.relative_id !== member.id) ||
        (rel.relative_id === member.id && rel.user_id !== member.id))
  );
  const marriageDate = spouseRelation?.marriage_date || null;
  const addressUrl = member.address ? buildGoogleMapsSearchUrl(member.address) : null;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <DemoSidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        {/* Demo banner */}
        <div className="mb-6 px-4 py-2.5 rounded-xl bg-gold-400/[0.06] border border-gold-400/10 flex items-center justify-between">
          <p className="text-xs text-white/50">
            Demo mode &mdash; <a href="/" className="text-gold-400 hover:text-gold-300 underline">Join</a>
            {" "}or{" "}
            <a href="/" className="text-gold-400 hover:text-gold-300 underline">Create</a>
            {" "}your own family for the full experience.
          </p>
          <span className="text-[10px] text-white/20 bg-white/5 px-2 py-0.5 rounded-lg">DEMO</span>
        </div>

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push("/demo")}
              className="flex items-center justify-center w-10 h-10 rounded-xl glass hover:bg-white/5 transition-colors text-white/40 hover:text-white/70">
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white/95">{member.first_name} {member.last_name}</h1>
              {member.display_name && (
                <p className="text-sm text-gold-300/80 mt-0.5">{member.display_name}</p>
              )}
              <p className="text-sm text-white/35 mt-0.5">
                {isViewer ? "Your profile" : `${geneticMatch.relationship} · ${geneticMatch.percentage}% blood match`}
              </p>
            </div>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-xs text-white/45">
            Demo profile is read-only
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <GlassCard glow={isViewer} className="xl:col-span-1 p-8">
            <div className="flex flex-col items-center">
              <GeneticMatchRing percentage={geneticMatch.percentage} size={160} strokeWidth={3}
                avatarUrl={member.avatar_url} initials={`${member.first_name[0]}${member.last_name[0]}`}
                showPercentage={!isViewer} label={isViewer ? "You" : geneticMatch.relationship} />
              <h2 className="mt-5 font-serif text-2xl font-bold text-white/95">{member.first_name} {member.last_name}</h2>
              {member.display_name && <p className="text-xs text-gold-300/85 mt-1">{member.display_name}</p>}
              <div className="mt-2 flex items-center gap-2">
                {member.role === "ADMIN" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-gold-400/10 text-gold-300 text-[10px] font-semibold uppercase">
                    <Crown size={10} /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-white/40 text-[10px] font-semibold uppercase">
                    <Shield size={10} /> Member
                  </span>
                )}
                {!member.is_alive && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/5 text-white/25 text-[10px] font-semibold uppercase">
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
                  { icon: User, label: "Gender", value: formatGenderLabel(member.gender) },
                  { icon: Briefcase, label: "Profession", value: member.profession },
                  { icon: PawPrint, label: "Pets", value: member.pets.length > 0 ? member.pets.join(", ") : null },
                  { icon: MapPin, label: "Location", value: member.location_city },
                  { icon: MapPin, label: "Secondary Home", value: member.secondary_location_city || null },
                  { icon: MapPin, label: "Address", value: member.address, href: addressUrl },
                  { icon: Calendar, label: "Date of Birth", value: member.date_of_birth
                    ? `${new Date(member.date_of_birth).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}${age !== null ? ` (${age})` : ""}` : null },
                  { icon: MapPin, label: "Place of Birth", value: member.place_of_birth },
                  {
                    icon: Calendar,
                    label: "Marriage / Anniversary",
                    value: marriageDate
                      ? new Date(marriageDate).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : null,
                  },
                ].map((f) => {
                  const Icon = f.icon;
                  return (
                    <div key={f.label} className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                      <Icon size={14} className="text-white/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/25 font-medium uppercase tracking-wider">{f.label}</p>
                        {f.href && f.value ? (
                          <a
                            href={f.href}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-0.5 block break-words text-sm text-gold-300 transition-colors hover:text-gold-200"
                          >
                            {f.value}
                          </a>
                        ) : (
                          <p className="mt-0.5 break-words text-sm text-white/70">{f.value || "Not set"}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5"><SocialDock links={member.social_links} /></div>

              <div className="mt-5 w-full">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs text-white/30 font-medium uppercase tracking-wider">Photo Gallery</h3>
                </div>
                {(member.gallery_photos || []).length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {resolvedGalleryPhotos.map((photo, idx) => (
                      <img
                        key={`${photo}-${idx}`}
                        src={photo}
                        alt=""
                        className="w-full h-20 rounded-lg object-cover border border-white/[0.08]"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="w-full rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-3 py-4 text-center text-xs text-white/38">
                    No additional photos yet.
                  </div>
                )}
              </div>
            </div>
          </GlassCard>

          <div className="xl:col-span-2 space-y-6">
            <ProfilePlacesCard profile={member} />

            <GlassCard className="p-6">
              <h3 className="font-serif text-lg font-semibold text-white/90 mb-4">Health Conditions</h3>
              <div className="space-y-3">
                {memberConditions.length > 0 ? memberConditions.map((uc) => {
                  const cond = MOCK_CONDITIONS.find((c) => c.id === uc.condition_id);
                  if (!cond) return null;
                  return <MedicalHistoryCard key={uc.id} userCondition={uc} condition={cond} isPrivate={!isViewer && !isImmediate} />;
                }) : <p className="text-sm text-white/30 py-4 text-center">No conditions recorded</p>}
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <h3 className="font-serif text-lg font-semibold text-white/90 mb-4">Family Connections</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {connections.sort((a, b) => b.match.percentage - a.match.percentage).map((item) => (
                  <motion.div key={item.profile.id} whileHover={{ y: -4 }}
                    onClick={() => router.push(`/demo/profile/${item.profile.id}`)}
                    className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-gold-400/20 transition-colors cursor-pointer">
                    <GeneticMatchRing percentage={item.match.percentage} size={64} strokeWidth={2}
                      avatarUrl={item.profile.avatar_url} initials={`${item.profile.first_name[0]}${item.profile.last_name[0]}`} />
                    <p className="mt-2 text-xs text-white/60 font-medium">{item.profile.first_name}</p>
                    <p className="text-[10px] text-white/30">{item.match.relationship}</p>
                  </motion.div>
                ))}
              </div>
            </GlassCard>
          </div>
        </div>
        <footer className="mt-10 border-t border-white/[0.08] pt-6">
          <SiteFooter />
        </footer>
      </main>
    </div>
  );
}
