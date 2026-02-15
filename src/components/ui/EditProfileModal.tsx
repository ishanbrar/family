"use client";

// ══════════════════════════════════════════════════════════
// EditProfileModal – Profile Editing with Photo Upload,
// City search, About Me, and social links.
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect } from "react";
import {
  X,
  Camera,
  Save,
  Instagram,
  Linkedin,
  Facebook,
  Phone,
  Briefcase,
  Calendar,
  User,
  FileText,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CitySearch } from "./CitySearch";
import type { Profile, SocialLinks, Gender } from "@/lib/types";
import { inferCountryCodeFromCity } from "@/lib/cities";

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

interface EditProfileModalProps {
  profile: Profile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: Partial<Profile> & { avatarFile?: File }) => void;
}

export function EditProfileModal({
  profile,
  isOpen,
  onClose,
  onSave,
}: EditProfileModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [firstName, setFirstName] = useState(profile.first_name);
  const [lastName, setLastName] = useState(profile.last_name);
  const [displayName, setDisplayName] = useState(profile.display_name || "");
  const [gender, setGender] = useState<Gender | "">(profile.gender || "");
  const [profession, setProfession] = useState(profile.profession || "");
  const [locationCity, setLocationCity] = useState(profile.location_city || "");
  const [petsText, setPetsText] = useState((profile.pets || []).join(", "));
  const [dob, setDob] = useState(profile.date_of_birth || "");
  const [placeOfBirth, setPlaceOfBirth] = useState(profile.place_of_birth || "");
  const [aboutMe, setAboutMe] = useState(profile.about_me || "");
  const [social, setSocial] = useState<SocialLinks>({
    instagram: profile.social_links?.instagram || "",
    linkedin: profile.social_links?.linkedin || "",
    facebook: profile.social_links?.facebook || "",
    phone_number: profile.social_links?.phone_number || "",
  });
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setAvatarFile(file);
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    const url = URL.createObjectURL(file);
    avatarObjectUrlRef.current = url;
    setAvatarPreview(url);
  }, []);

  useEffect(() => {
    return () => {
      if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    };
  }, []);

  const handleSubmit = () => {
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
    if (social.phone_number) cleanSocial.phone_number = social.phone_number;

    onSave({
      first_name: firstName,
      last_name: lastName,
      display_name: displayName.trim() || null,
      gender: gender || null,
      profession: profession || null,
      location_city: locationCity || null,
      pets: parsedPets,
      date_of_birth: dob || null,
      place_of_birth: placeOfBirth || null,
      about_me: aboutMe || null,
      country_code: inferCountryCodeFromCity(locationCity),
      social_links: cleanSocial,
      avatar_url: avatarPreview,
      ...(avatarFile ? { avatarFile } : {}),
    });
    onClose();
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.12] rounded-xl px-4 py-2.5 text-sm text-white/92 placeholder:text-white/40 outline-none focus:border-gold-400/30 focus:bg-white/[0.06] transition-all duration-200";

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
            className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
              sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-full sm:max-w-lg sm:max-h-[85vh] z-50
              glass-elevated rounded-3xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06]">
              <h2 className="font-serif text-lg font-semibold text-white/90">
                Edit Profile
              </h2>
              <button
                onClick={onClose}
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

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">First Name</label>
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar size={10} /> Date of Birth
                    </label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={cn(inputClass, "appearance-none")} />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">
                      Place of Birth
                    </label>
                    <CitySearch value={placeOfBirth} onChange={setPlaceOfBirth} placeholder="Search birthplace..." />
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
            <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-white/[0.06]">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim() || !gender}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 transition-colors"
              >
                <Save size={14} />
                Save Changes
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
