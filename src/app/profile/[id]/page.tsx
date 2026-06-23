"use client";

// ══════════════════════════════════════════════════════════
// Profile/[id] – View Any Family Member's Profile
// Uses useFamilyData for DB-backed or mock data.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useEffect, useRef, useState, use } from "react";
import Link from "next/link";
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
  ImagePlus,
  GitBranch,
} from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { GlassCard } from "@/components/ui/GlassCard";
import { LegatreeLoader } from "@/components/ui/LegatreeLoader";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import { SocialDock } from "@/components/ui/SocialDock";
import { MedicalHistoryCard } from "@/components/ui/MedicalHistoryCard";
import { EditProfileModal } from "@/components/ui/EditProfileModal";
import { ProfilePlacesCard } from "@/components/profile/ProfilePlacesCard";
import { useFamilyData } from "@/hooks/use-family-data";
import { useResolvedGalleryPhotos } from "@/hooks/use-resolved-gallery-photos";
import { calculateGeneticMatch } from "@/lib/genetic-match";
import {
  calculateAgeFromDateOnly,
  formatDateOnly,
  formatDisplayText,
  formatGenderLabel,
  formatProfileFullName,
  getProfileInitials,
} from "@/lib/display-format";
import { googleMapsHrefFor } from "@/lib/maps";
import {
  getProfileMapLocations,
  resolveProfileMapLocation,
  type ProfileLocationSource,
} from "@/lib/profile-locations";
import type { Profile } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

export default function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const {
    viewer,
    family,
    members,
    relationships,
    conditions,
    userConditions,
    loading,
    updateProfile,
    setSpouseForMember,
  } = useFamilyData();

  const [editOpen, setEditOpen] = useState(false);
  const [activeMapSource, setActiveMapSource] = useState<ProfileLocationSource | null>(null);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const [galleryUploadError, setGalleryUploadError] = useState<string | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadAuthEmail = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (cancelled) return;
      setAccountEmail(data.user?.email || null);
    };
    loadAuthEmail();
    return () => {
      cancelled = true;
    };
  }, []);

  const member = members.find((m) => m.id === id);
  const resolvedGalleryPhotos = useResolvedGalleryPhotos(member?.gallery_photos || []);

  useEffect(() => {
    setActiveMapSource(null);
  }, [id]);

  if (loading) {
    return <LegatreeLoader fullScreen label="Loading profile..." />;
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
    : calculateGeneticMatch(viewer.id, member.id, relationships, member.gender, family?.relation_language, members);

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

  const age = calculateAgeFromDateOnly(member.date_of_birth);

  const connections = members.filter((p) => p.id !== member.id).map((p) => ({
    profile: p,
    match: calculateGeneticMatch(member.id, p.id, relationships, p.gender, family?.relation_language, members),
  }));

  const spouseRelation = relationships.find(
    (rel) =>
      rel.type === "spouse" &&
      ((rel.user_id === member.id && rel.relative_id !== member.id) ||
        (rel.relative_id === member.id && rel.user_id !== member.id))
  );
  const spouseId = spouseRelation
    ? spouseRelation.user_id === member.id
      ? spouseRelation.relative_id
      : spouseRelation.user_id
    : null;
  const spouse = spouseId ? members.find((entry) => entry.id === spouseId) : null;
  const marriageDate = spouseRelation?.marriage_date || null;
  const savedLocations = getProfileMapLocations(member);
  const resolvedMapSource =
    activeMapSource ??
    resolveProfileMapLocation(member)?.source ??
    savedLocations[0]?.source ??
    null;
  const addressUrl = googleMapsHrefFor(member.address);
  const websiteUrl =
    typeof member.social_links?.website === "string" && member.social_links.website.trim()
      ? (/^[a-z][a-z0-9+.-]*:\/\//i.test(member.social_links.website.trim())
          ? member.social_links.website.trim()
          : `https://${member.social_links.website.trim()}`)
      : null;

  const handleSave = async (
    updates: Partial<Profile> & {
      avatarFile?: File;
      galleryFiles?: File[];
      spouseId?: string | null;
      marriageDate?: string | null;
    }
  ) => {
    const { avatarFile, galleryFiles, spouseId: nextSpouseId, marriageDate: nextMarriageDate, ...profileUpdates } =
      updates;
    await updateProfile(member.id, profileUpdates, avatarFile, galleryFiles);
    if (nextSpouseId !== undefined || nextMarriageDate !== undefined) {
      await setSpouseForMember(
        member.id,
        nextSpouseId ?? null,
        nextMarriageDate ?? null
      );
    }
  };

  const handleGalleryUpload = async (files: FileList | null) => {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (galleryInputRef.current) galleryInputRef.current.value = "";
    if (selected.length === 0) {
      setGalleryUploadError("Choose one or more image files.");
      return;
    }

    setGalleryUploading(true);
    setGalleryUploadError(null);
    try {
      await updateProfile(member.id, {}, undefined, selected);
    } catch (err) {
      setGalleryUploadError(err instanceof Error ? err.message : "Could not upload photos. Please try again.");
    } finally {
      setGalleryUploading(false);
    }
  };

  const handleActiveMapSourceChange = async (source: ProfileLocationSource) => {
    setActiveMapSource(source);
    if (canEdit) {
      await updateProfile(member.id, { map_location_source: source });
    }
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />

      <EditProfileModal
        key={`${member.id}-${editOpen ? "open" : "closed"}-${member.updated_at}-${spouseId || "none"}-${marriageDate || "none"}`}
        profile={member}
        familyMembers={members}
        initialSpouseId={spouseId}
        initialMarriageDate={marriageDate}
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
                {formatProfileFullName(member)}
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
          <div className="flex flex-wrap items-center gap-2 self-start">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push(`/tree?view=close&person=${encodeURIComponent(member.id)}`)}
              className="flex items-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.035] px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90"
            >
              <GitBranch size={14} />
              View Their Tree
            </motion.button>
            {canEdit && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setEditOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/10 text-gold-300 text-sm font-medium hover:bg-gold-400/15 transition-colors">
                <Edit3 size={14} />
                {isViewer ? "Edit Profile" : "Edit (Admin)"}
              </motion.button>
            )}
          </div>
        </motion.div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <GlassCard glow={isViewer} className="xl:col-span-1 p-5 sm:p-8">
            <div className="flex flex-col items-center">
              <GeneticMatchRing percentage={geneticMatch.percentage} size={160} strokeWidth={3}
                avatarUrl={member.avatar_url}
                initials={getProfileInitials(member)}
                showPercentage={!isViewer} label={isViewer ? "You" : geneticMatch.relationship} />

              <h2 className="mt-5 font-serif text-2xl font-bold text-white/95">
                {formatProfileFullName(member)}
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

              <div className="mt-4 w-full">
                <SocialDock links={member.social_links} />
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
                  ...(isViewer ? [{ icon: User, label: "Account Email", value: accountEmail }] : []),
                  {
                    icon: User,
                    label: "Gender",
                    value: formatGenderLabel(member.gender),
                  },
                  { icon: Briefcase, label: "Profession", value: member.profession },
                  { icon: PawPrint, label: "Pets", value: member.pets.length > 0 ? member.pets.join(", ") : null },
                  ...(member.location_city
                    ? [{
                        icon: MapPin,
                        label: "Location",
                        value: member.location_city,
                        mapSource: "current_home" as ProfileLocationSource,
                        href: googleMapsHrefFor(member.location_city),
                      }]
                    : []),
                  ...(member.secondary_location_city
                    ? [{
                        icon: MapPin,
                        label: "Secondary Home",
                        value: member.secondary_location_city,
                        mapSource: "secondary_home" as ProfileLocationSource,
                        href: googleMapsHrefFor(member.secondary_location_city),
                      }]
                    : []),
                  ...(member.address
                    ? [{
                        icon: MapPin,
                        label: "Address",
                        value: member.address,
                        mapSource: "address" as ProfileLocationSource,
                        href: addressUrl,
                      }]
                    : []),
                  { icon: User, label: "Website", value: member.social_links?.website || null, href: websiteUrl },
                  {
                    icon: Calendar, label: "Date of Birth",
                    value: member.date_of_birth
                      ? `${formatDateOnly(member.date_of_birth) ?? "Not set"}${age !== null ? ` (${age})` : ""}`
                      : null,
                  },
                  ...(member.place_of_birth
                    ? [{
                        icon: MapPin,
                        label: "Place of Birth",
                        value: member.place_of_birth,
                        mapSource: "birthplace" as ProfileLocationSource,
                        href: googleMapsHrefFor(member.place_of_birth),
                      }]
                    : []),
                ].map((field) => {
                  const Icon = field.icon;
                  const isMapLocation = "mapSource" in field && field.mapSource;
                  return (
                    <div key={field.label} className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                      <Icon size={14} className="text-white/20 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-white/25 font-medium uppercase tracking-wider">{field.label}</p>
                        {field.value ? (
                          isMapLocation ? (
                            <div className="mt-0.5 flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => void handleActiveMapSourceChange(field.mapSource!)}
                                className={`break-words text-left text-sm transition-colors ${
                                  resolvedMapSource === field.mapSource
                                    ? "text-gold-300"
                                    : "text-white/70 hover:text-gold-200"
                                }`}
                              >
                                {field.value}
                              </button>
                              {field.href && (
                                <a
                                  href={field.href}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[11px] text-white/40 transition-colors hover:text-gold-300"
                                >
                                  Maps
                                </a>
                              )}
                            </div>
                          ) : field.href ? (
                            <a
                              href={field.href}
                              target="_blank"
                              rel="noreferrer"
                              className="mt-0.5 block break-words text-sm text-gold-300 transition-colors hover:text-gold-200"
                            >
                              {field.value}
                            </a>
                          ) : (
                            <p className="mt-0.5 break-words text-sm text-white/70">{field.value}</p>
                          )
                        ) : (
                          <p className="mt-0.5 break-words text-sm text-white/70">Not set</p>
                        )}
                      </div>
                    </div>
                  );
                })}

                <div className="flex items-center gap-3 py-2 border-b border-white/[0.04]">
                  <Calendar size={14} className="text-white/20 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/25 font-medium uppercase tracking-wider">
                      Marriage / Anniversary
                    </p>
                    {marriageDate || spouse ? (
                      <p className="mt-0.5 break-words text-sm text-white/70">
                        {marriageDate ? formatDateOnly(marriageDate) : "Date not set"}
                        {spouse && (
                          <>
                            {" · Married to "}
                            <Link
                              href={`/profile/${spouse.id}`}
                              className="text-gold-300 transition-colors hover:text-gold-200"
                            >
                              {formatProfileFullName(spouse)}
                            </Link>
                          </>
                        )}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-white/70">Not set</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 w-full">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <h3 className="text-xs text-white/30 font-medium uppercase tracking-wider">Photo Gallery</h3>
                  {canEdit && (
                    <>
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        disabled={galleryUploading}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.03] px-2.5 text-xs font-medium text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white/90 disabled:cursor-not-allowed disabled:opacity-55"
                      >
                        {galleryUploading ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <ImagePlus size={12} />
                        )}
                        <span>{galleryUploading ? "Uploading" : "Add"}</span>
                      </button>
                      <input
                        ref={galleryInputRef}
                        type="file"
                        accept="image/*"
                        multiple
                        className="hidden"
                        onChange={(e) => void handleGalleryUpload(e.target.files)}
                      />
                    </>
                  )}
                </div>
                {galleryUploadError && (
                  <p className="mb-2 rounded-lg border border-red-400/10 bg-red-400/[0.06] px-3 py-2 text-xs text-red-300/85">
                    {galleryUploadError}
                  </p>
                )}
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
                  <button
                    type="button"
                    disabled={!canEdit || galleryUploading}
                    onClick={() => galleryInputRef.current?.click()}
                    className="w-full rounded-xl border border-dashed border-white/[0.12] bg-white/[0.02] px-3 py-4 text-center text-xs text-white/38 transition-colors enabled:hover:border-gold-400/25 enabled:hover:text-white/60 disabled:cursor-default"
                  >
                    {canEdit ? "Add photos from your camera or photo library." : "No additional photos yet."}
                  </button>
                )}
              </div>
            </div>
          </GlassCard>

          <div className="xl:col-span-2 space-y-6">
            <ProfilePlacesCard
              key={member.id}
              profile={member}
              activeSource={resolvedMapSource ?? undefined}
              onActiveSourceChange={handleActiveMapSourceChange}
            />

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
                  .sort((a, b) => b.match.percentage - a.match.percentage)
                  .map((item) => (
                    <motion.div key={item.profile.id} whileHover={{ y: -4 }}
                      onClick={() => router.push(`/profile/${item.profile.id}`)}
                      className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] hover:border-gold-400/20 transition-colors cursor-pointer">
                      <GeneticMatchRing percentage={item.match.percentage} size={64} strokeWidth={2}
                        avatarUrl={item.profile.avatar_url}
                        initials={getProfileInitials(item.profile)} />
                      <p className="mt-2 text-xs text-white/60 font-medium">{formatDisplayText(item.profile.first_name)}</p>
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
