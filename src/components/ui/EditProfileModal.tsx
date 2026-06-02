"use client";

// ══════════════════════════════════════════════════════════
// EditProfileModal – Profile Editing with Photo Upload,
// City search, About Me, and social links.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  X,
  Camera,
  ImagePlus,
  Save,
  Instagram,
  Linkedin,
  Facebook,
  Phone,
  Globe,
  Briefcase,
  Calendar,
  User,
  FileText,
  PawPrint,
  Heart,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { formatPersonName } from "@/lib/display-format";
import { CitySearch } from "./CitySearch";
import { AddressSearch } from "./AddressSearch";
import { ManualDateInput } from "./ManualDateInput";
import type { Profile, ProfileMapLocationSource, SocialLinks, Gender } from "@/lib/types";
import { PROFILE_MAP_SOURCE_LABELS } from "@/lib/profile-locations";
import { inferCountryCodeFromCity } from "@/lib/cities";
import { changedSpouseSaveFields } from "@/lib/spouse-relationship";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import { useResolvedGalleryPhotos } from "@/hooks/use-resolved-gallery-photos";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

interface EditProfileModalProps {
  profile: Profile;
  familyMembers?: Profile[];
  initialSpouseId?: string | null;
  initialMarriageDate?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    updated: Partial<Profile> & {
      avatarFile?: File;
      galleryFiles?: File[];
      spouseId?: string | null;
      marriageDate?: string | null;
    }
  ) => Promise<void> | void;
}

export function EditProfileModal({
  profile,
  familyMembers = [],
  initialSpouseId = null,
  initialMarriageDate = null,
  isOpen,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const { dialogRef } = useAccessibleDialog({
    isOpen,
    onClose,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const galleryObjectUrlsRef = useRef<string[]>([]);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>(profile.gallery_photos || []);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [namePrefix, setNamePrefix] = useState(profile.name_prefix || "");
  const [firstName, setFirstName] = useState(profile.first_name);
  const [middleName, setMiddleName] = useState(profile.middle_name || "");
  const [lastName, setLastName] = useState(profile.last_name);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [gender, setGender] = useState<Gender | "">(profile.gender || "");
  const [profession, setProfession] = useState(profile.profession || "");
  const [locationCity, setLocationCity] = useState(profile.location_city || "");
  const [secondaryLocationCity, setSecondaryLocationCity] = useState(profile.secondary_location_city || "");
  const [address, setAddress] = useState(profile.address || "");
  const [locationLat, setLocationLat] = useState<number | null>(profile.location_lat ?? null);
  const [locationLng, setLocationLng] = useState<number | null>(profile.location_lng ?? null);
  const [mapLocationSource, setMapLocationSource] = useState<ProfileMapLocationSource>(
    profile.map_location_source || "current_home"
  );
  const [petsText, setPetsText] = useState((profile.pets || []).join(", "));
  const [dob, setDob] = useState(profile.date_of_birth || "");
  const [placeOfBirth, setPlaceOfBirth] = useState(profile.place_of_birth || "");
  const [spouseId, setSpouseId] = useState(initialSpouseId || "");
  const [marriageDate, setMarriageDate] = useState(initialMarriageDate || "");
  const [aboutMe, setAboutMe] = useState(profile.about_me || "");
  const [social, setSocial] = useState<SocialLinks>({
    instagram: profile.social_links?.instagram || "",
    linkedin: profile.social_links?.linkedin || "",
    facebook: profile.social_links?.facebook || "",
    website: profile.social_links?.website || "",
    phone_number: profile.social_links?.phone_number || "",
  });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const resolvedGalleryPhotos = useResolvedGalleryPhotos(galleryPhotos);

  useEffect(() => {
    if (!isOpen) return;
    setAvatarPreview(profile.avatar_url);
    setAvatarFile(null);
    setGalleryPhotos(profile.gallery_photos || []);
    setGalleryFiles([]);
    setNamePrefix(profile.name_prefix || "");
    setFirstName(profile.first_name);
    setMiddleName(profile.middle_name || "");
    setLastName(profile.last_name);
    setDisplayName(profile.display_name || "");
    setGender(profile.gender || "");
    setProfession(profile.profession || "");
    setLocationCity(profile.location_city || "");
    setSecondaryLocationCity(profile.secondary_location_city || "");
    setAddress(profile.address || "");
    setLocationLat(profile.location_lat ?? null);
    setLocationLng(profile.location_lng ?? null);
    setMapLocationSource(profile.map_location_source || "current_home");
    setPetsText((profile.pets || []).join(", "));
    setDob(profile.date_of_birth || "");
    setPlaceOfBirth(profile.place_of_birth || "");
    setSpouseId(initialSpouseId || "");
    setMarriageDate(initialMarriageDate || "");
    setAboutMe(profile.about_me || "");
    setSocial({
      instagram: profile.social_links?.instagram || "",
      linkedin: profile.social_links?.linkedin || "",
      facebook: profile.social_links?.facebook || "",
      website: profile.social_links?.website || "",
      phone_number: profile.social_links?.phone_number || "",
    });
    setSaving(false);
    setSaveError(null);
  }, [isOpen, profile, initialSpouseId, initialMarriageDate]);

  const spouseOptions = useMemo(
    () =>
      familyMembers
        .filter((member) => member.id !== profile.id)
        .sort((a, b) =>
          formatPersonName(a.first_name, a.middle_name || "", a.last_name, a.name_prefix || "")
            .localeCompare(formatPersonName(b.first_name, b.middle_name || "", b.last_name, b.name_prefix || ""))
        ),
    [familyMembers, profile.id]
  );

  const mapSourceOptions = useMemo(() => {
    const options: ProfileMapLocationSource[] = [];
    if (locationCity.trim()) options.push("current_home");
    if (placeOfBirth.trim()) options.push("birthplace");
    if (secondaryLocationCity.trim()) options.push("secondary_home");
    if (address.trim()) options.push("address");
    return options;
  }, [address, locationCity, placeOfBirth, secondaryLocationCity]);

  useEffect(() => {
    if (mapSourceOptions.length === 0) return;
    if (!mapSourceOptions.includes(mapLocationSource)) {
      setMapLocationSource(mapSourceOptions[0]);
    }
  }, [mapLocationSource, mapSourceOptions]);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setAvatarFile(file);
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    avatarObjectUrlRef.current = url;
    setAvatarPreview(url);
  }, []);

  const handleGalleryFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    const accepted: File[] = [];
    const previews: string[] = [];
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;
      accepted.push(file);
      const previewUrl = URL.createObjectURL(file);
      previews.push(previewUrl);
      galleryObjectUrlsRef.current.push(previewUrl);
    }
    if (accepted.length === 0) return;
    setGalleryFiles((prev) => [...prev, ...accepted]);
    setGalleryPhotos((prev) => [...prev, ...previews]);
  }, []);

  useEffect(() => {
    const galleryObjectUrls = galleryObjectUrlsRef.current;
    return () => {
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
      galleryObjectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleSubmit = async () => {
    if (saving) return;
    const parsedPets = Array.from(
      new Set(
        petsText
          .split(/[\n,]/)
          .map((pet) => pet.trim())
          .filter(Boolean)
      )
    );

    const cleanSocial: SocialLinks = {};
    if (social.instagram) cleanSocial.instagram = social.instagram;
    if (social.linkedin) cleanSocial.linkedin = social.linkedin;
    if (social.facebook) cleanSocial.facebook = social.facebook;
    if (social.website) cleanSocial.website = social.website;
    if (social.phone_number) cleanSocial.phone_number = social.phone_number;

    const spouseFields = changedSpouseSaveFields({
      spouseId,
      marriageDate,
      initialSpouseId,
      initialMarriageDate,
    });

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name_prefix: namePrefix.trim() || null,
        first_name: firstName.trim(),
        middle_name: middleName.trim() || null,
        last_name: lastName.trim(),
        display_name: displayName.trim() || null,
        gender: gender || null,
        profession: profession.trim() || null,
        location_city: locationCity.trim() || null,
        secondary_location_city: secondaryLocationCity.trim() || null,
        address: address.trim() || null,
        location_lat: locationLat,
        location_lng: locationLng,
        map_location_source: mapSourceOptions.includes(mapLocationSource)
          ? mapLocationSource
          : mapSourceOptions[0] || "current_home",
        pets: parsedPets,
        date_of_birth: dob ? String(dob).slice(0, 10) : null,
        place_of_birth: placeOfBirth.trim() || null,
        about_me: aboutMe.trim() || null,
        country_code: inferCountryCodeFromCity(locationCity),
        social_links: cleanSocial,
        avatar_url: avatarPreview,
        gallery_photos: galleryPhotos.filter((photo) => !/^blob:|^data:/i.test(photo)),
        ...(avatarFile ? { avatarFile } : {}),
        ...(galleryFiles.length > 0 ? { galleryFiles } : {}),
        ...spouseFields,
      });
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full app-input rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 app-overlay backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            tabIndex={-1}
            className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
              sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-full sm:max-w-lg sm:max-h-[85vh] z-50
              glass-elevated rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06]">
              <h2 id="edit-profile-title" className="font-serif text-lg font-semibold text-white/90">
                Edit Profile
              </h2>
              <button
                onClick={onClose}
                aria-label="Close edit profile dialog"
                className="flex items-center justify-center w-8 h-8 rounded-lg
                  hover:bg-white/5 transition-colors text-white/30 hover:text-white/60"
              >
                <X size={18} />
              </button>
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-6">
              {/* Photo Upload */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "relative w-32 h-32 rounded-full cursor-pointer group transition-all duration-200",
                    isDraggingFile && "ring-2 ring-gold-400/50 scale-105"
                  )}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleFileSelect(file);
                  }}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400/40">
                      <User size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center
                    justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Camera size={20} className="text-white/80 mb-1" />
                    <span className="text-[10px] text-white/60 font-medium">Change Photo</span>
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                </div>
                <p className="text-[10px] text-white/20 mt-2">Click or drag a photo</p>
              </div>

              {/* Gallery Photos */}
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider">
                    Profile gallery
                  </label>
                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="h-8 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] text-xs text-white/70 hover:text-white/90 hover:bg-white/[0.06] transition-colors inline-flex items-center gap-1.5"
                  >
                    <ImagePlus size={12} />
                    Add photos
                  </button>
                  <input
                    ref={galleryInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleGalleryFiles(e.target.files)}
                  />
                </div>
                {galleryPhotos.length > 0 ? (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                    {galleryPhotos.map((url, idx) => (
                      <div key={`${url}-${idx}`} className="relative">
                        <img
                          src={resolvedGalleryPhotos[idx] || url}
                          alt=""
                          className="h-16 w-full rounded-lg object-cover border border-white/[0.08]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setGalleryPhotos((prev) => prev.filter((_, i) => i !== idx));
                            if (/^blob:/i.test(url)) {
                              const blobIndex =
                                galleryPhotos
                                  .slice(0, idx + 1)
                                  .filter((photo) => /^blob:/i.test(photo)).length - 1;
                              setGalleryFiles((prev) => prev.filter((_, i) => i !== blobIndex));
                              URL.revokeObjectURL(url);
                            }
                          }}
                          className="absolute top-1 right-1 h-5 w-5 rounded-md bg-black/55 text-white/80 hover:bg-black/75 flex items-center justify-center"
                          aria-label="Remove photo"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-white/35">No gallery photos yet.</p>
                )}
              </div>

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">Prefix / Honorific</label>
                  <input type="text" value={namePrefix} onChange={(e) => setNamePrefix(e.target.value)} className={inputClass} placeholder="e.g., Dr." />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">Middle Name</label>
                  <input type="text" value={middleName} onChange={(e) => setMiddleName(e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">Last Name</label>
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">Display Name / Nickname</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., Alex"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender | "")}
                    className={cn(inputClass, "px-4")}
                    required
                  >
                    <option value="" disabled>Select gender</option>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* About Me */}
              <div>
                <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                  <FileText size={10} /> About Me
                </label>
                <textarea
                  value={aboutMe}
                  onChange={(e) => setAboutMe(e.target.value)}
                  rows={3}
                  className={cn(inputClass, "resize-none")}
                  placeholder="Tell your family something about yourself..."
                />
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Briefcase size={10} /> Profession
                  </label>
                  <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)} className={inputClass} placeholder="e.g., Software Engineer" />
                </div>

                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <PawPrint size={10} /> Pets
                  </label>
                  <input
                    type="text"
                    value={petsText}
                    onChange={(e) => setPetsText(e.target.value)}
                    className={inputClass}
                    placeholder="e.g., Luna, Bruno"
                  />
                  <p className="mt-1 text-[10px] text-white/25">Separate multiple pets with commas.</p>
                </div>

                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">
                    City
                  </label>
                  <CitySearch value={locationCity} onChange={setLocationCity} placeholder="Search a city..." />
                </div>

                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">
                    Secondary Home
                  </label>
                  <CitySearch
                    value={secondaryLocationCity}
                    onChange={setSecondaryLocationCity}
                    placeholder="Add a second home city..."
                  />
                </div>

                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">
                    Street Address
                  </label>
                  <AddressSearch
                    value={address}
                    onChange={(nextAddress) => {
                      setAddress(nextAddress);
                      if (!nextAddress.trim()) {
                        setLocationLat(null);
                        setLocationLng(null);
                      }
                    }}
                    onSelect={(selection) => {
                      setAddress(selection.address);
                      setLocationLat(selection.lat);
                      setLocationLng(selection.lng);
                      setMapLocationSource("address");
                    }}
                    placeholder="Start typing your address..."
                  />
                  <p className="mt-1 text-[10px] text-white/25">
                    Use the address lookup, then choose which saved place appears on your profile map below.
                  </p>
                </div>

                {mapSourceOptions.length > 0 && (
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">
                      Profile Map Location
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {mapSourceOptions.map((source) => (
                        <button
                          key={source}
                          type="button"
                          onClick={() => setMapLocationSource(source)}
                          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                            mapLocationSource === source
                              ? "border-gold-400/30 bg-gold-400/12 text-gold-200"
                              : "border-white/[0.08] bg-white/[0.03] text-white/55 hover:bg-white/[0.06] hover:text-white/75"
                          }`}
                        >
                          {PROFILE_MAP_SOURCE_LABELS[source]}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar size={10} /> Date of Birth
                    </label>
                    <ManualDateInput
                      value={dob}
                      onChange={setDob}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">
                      Place of Birth
                    </label>
                    <CitySearch value={placeOfBirth} onChange={setPlaceOfBirth} placeholder="Search birthplace..." />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Heart size={10} /> Spouse
                    </label>
                    <select
                      value={spouseId}
                      onChange={(e) => setSpouseId(e.target.value)}
                      className={cn(inputClass, "px-4")}
                    >
                      <option value="">No spouse selected</option>
                      {spouseOptions.map((member) => (
                        <option key={member.id} value={member.id}>
                          {formatPersonName(member.first_name, member.middle_name || "", member.last_name, member.name_prefix || "")}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Heart size={10} /> Anniversary
                    </label>
                    <ManualDateInput
                      value={marriageDate}
                      onChange={setMarriageDate}
                      className={inputClass}
                      disabled={!spouseId}
                    />
                  </div>
                </div>
              </div>

              {/* Social Links */}
              <div>
                <h3 className="text-xs text-white/50 font-medium mb-3">Social Links</h3>
                <div className="space-y-3">
                  {([
                    { key: "instagram" as const, icon: Instagram, placeholder: "username" },
                    { key: "linkedin" as const, icon: Linkedin, placeholder: "username" },
                    { key: "facebook" as const, icon: Facebook, placeholder: "username" },
                    { key: "website" as const, icon: Globe, placeholder: "https://example.com" },
                    { key: "phone_number" as const, icon: Phone, placeholder: "+1 234 567 8900" },
                  ]).map((field) => {
                    const Icon = field.icon;
                    return (
                      <div key={field.key} className="relative">
                        <Icon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" />
                        <input
                          type="text"
                          value={social[field.key] || ""}
                          onChange={(e) => setSocial((prev) => ({ ...prev, [field.key]: e.target.value }))}
                          className={cn(inputClass, "pl-10")}
                          placeholder={field.placeholder}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-white/[0.06]">
              {saveError && (
                <p className="sm:mr-auto text-sm text-red-300/90" role="alert">
                  {saveError}
                </p>
              )}
              <button onClick={onClose} disabled={saving} className="min-h-[44px] px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 active:scale-[0.98] transition-colors flex items-center justify-center disabled:opacity-60">
                Cancel
              </button>
              <motion.button
                whileHover={saving ? undefined : { scale: 1.02 }}
                whileTap={saving ? undefined : { scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim() || !gender || saving}
                className="flex items-center justify-center gap-2 min-h-[44px] px-5 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 active:scale-[0.98] transition-colors"
              >
                {saving ? <span className="w-3.5 h-3.5 rounded-full border border-gold-300/40 border-t-gold-300 animate-spin" /> : <Save size={14} />}
                {saving ? "Saving..." : "Save Changes"}
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
