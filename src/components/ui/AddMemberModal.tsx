"use client";

// ══════════════════════════════════════════════════════════
// AddMemberModal – Add New Family Member
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import {
  X,
  Camera,
  UserPlus,
  User,
  Briefcase,
  Calendar,
  FileText,
  GitBranch,
  PawPrint,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CitySearch } from "./CitySearch";
import type { Profile, RelationshipType, Gender } from "@/lib/types";
import { inferCountryCodeFromCity } from "@/lib/cities";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

interface AddMemberModalProps {
  existingMembers: Profile[];
  isOpen: boolean;
  onClose: () => void;
  onAdd: (
    member: Omit<Profile, "id" | "created_at" | "updated_at">,
    relationship: { relativeId: string; type: RelationshipType },
    avatarFile?: File
  ) => void;
}

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "parent", label: "Parent of" },
  { value: "child", label: "Child of" },
  { value: "sibling", label: "Sibling of" },
  { value: "spouse", label: "Spouse of" },
  { value: "grandparent", label: "Grandparent of" },
  { value: "grandchild", label: "Grandchild of" },
  { value: "maternal_aunt", label: "Maternal Aunt of" },
  { value: "paternal_aunt", label: "Paternal Aunt of" },
  { value: "maternal_uncle", label: "Maternal Uncle of" },
  { value: "paternal_uncle", label: "Paternal Uncle of" },
  { value: "niece_nephew", label: "Niece/Nephew of" },
  { value: "cousin", label: "Cousin of" },
  { value: "half_sibling", label: "Half-Sibling of" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

function normalizeName(first: string, last: string) {
  return `${first.trim().toLowerCase()}::${last.trim().toLowerCase()}`;
}

function normalizeCity(value: string | null | undefined) {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function AddMemberModal({
  existingMembers,
  isOpen,
  onClose,
  onAdd,
}: AddMemberModalProps) {
  const { dialogRef } = useAccessibleDialog({
    isOpen,
    onClose,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [profession, setProfession] = useState("");
  const [petsText, setPetsText] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [dob, setDob] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [isAlive, setIsAlive] = useState(true);
  const [relativeId, setRelativeId] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("child");
  const [allowDuplicateAdd, setAllowDuplicateAdd] = useState(false);

  const duplicateMatch = useMemo(() => {
    if (!firstName.trim() || !lastName.trim()) return null;
    const target = normalizeName(firstName, lastName);
    const sameNameMembers = existingMembers.filter(
      (m) => normalizeName(m.first_name, m.last_name) === target
    );
    if (sameNameMembers.length === 0) return null;

    const normalizedCity = normalizeCity(locationCity);
    const likely = sameNameMembers.find((m) => {
      if (dob && m.date_of_birth && dob === m.date_of_birth) return true;
      if (normalizedCity && normalizeCity(m.location_city) === normalizedCity) return true;
      return false;
    });

    return {
      member: likely || sameNameMembers[0],
      confidence: likely ? "high" : ("low" as "high" | "low"),
    };
  }, [firstName, lastName, dob, locationCity, existingMembers]);

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
    if (
      !firstName.trim() ||
      !lastName.trim() ||
      !gender ||
      !relativeId ||
      (!!duplicateMatch && !allowDuplicateAdd)
    ) {
      return;
    }
    const parsedPets = Array.from(
      new Set(
        petsText
          .split(/[\n,]/)
          .map((pet) => pet.trim())
          .filter(Boolean)
      )
    );

    onAdd(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        display_name: displayName.trim() || null,
        gender: gender || null,
        avatar_url: null,
        date_of_birth: dob ? String(dob).slice(0, 10) : null,
        place_of_birth: placeOfBirth || null,
        profession: profession || null,
        location_city: locationCity || null,
        location_lat: null,
        location_lng: null,
        pets: parsedPets,
        social_links: {},
        about_me: aboutMe || null,
        country_code: inferCountryCodeFromCity(locationCity),
        role: "MEMBER",
        is_alive: isAlive,
      },
      { relativeId, type: relType },
      avatarFile || undefined
    );

    // Reset
    setFirstName("");
    setLastName("");
    setDisplayName("");
    setGender("");
    setProfession("");
    setPetsText("");
    setLocationCity("");
    setDob("");
    setPlaceOfBirth("");
    setAboutMe("");
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    setAvatarPreview(null);
    setAvatarFile(null);
    setIsAlive(true);
    onClose();
  };

  const inputClass =
    "w-full app-input rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200";

  const selectClass =
    "w-full app-input rounded-xl px-4 py-2.5 text-sm outline-none transition-all duration-200 appearance-none cursor-pointer";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
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
            aria-labelledby="add-member-title"
            tabIndex={-1}
            className="fixed inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
              sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-full sm:max-w-lg sm:max-h-[85vh] z-50
              rounded-3xl overflow-hidden flex flex-col app-surface"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                  <UserPlus size={16} className="text-gold-400" />
                </div>
                <h2 id="add-member-title" className="font-serif text-lg font-semibold text-white/90">Add Family Member</h2>
              </div>
              <button onClick={onClose}
                aria-label="Close add member dialog"
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/60">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-5">
              {/* Photo */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div
                  className="relative w-16 h-16 rounded-full cursor-pointer group shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gold-400/10 flex items-center justify-center text-gold-400/40">
                      <User size={24} />
                    </div>
                  )}
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center
                    opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={16} className="text-white/80" />
                  </div>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }} />
                </div>
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input type="text" value={firstName} onChange={(e) => {
                    setFirstName(e.target.value);
                    setAllowDuplicateAdd(false);
                  }}
                    className={inputClass} placeholder="First name *" />
                  <input type="text" value={lastName} onChange={(e) => {
                    setLastName(e.target.value);
                    setAllowDuplicateAdd(false);
                  }}
                    className={inputClass} placeholder="Last name *" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className={inputClass}
                    placeholder="Display name / nickname"
                  />
                  <select value={gender} onChange={(e) => setGender(e.target.value as Gender | "")} className={selectClass} required>
                    <option value="" disabled>Select gender</option>
                    {GENDER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              {duplicateMatch && (
                <div className="rounded-xl border border-amber-400/20 bg-amber-400/[0.08] px-3 py-2 text-xs text-amber-200/90">
                  {duplicateMatch.confidence === "high"
                    ? "Likely duplicate found"
                    : "Potential duplicate found"}
                  : {duplicateMatch.member.first_name} {duplicateMatch.member.last_name}
                  {duplicateMatch.confidence === "high"
                    ? " (matching name plus city/date)."
                    : " (matching name only)."}
                  {!allowDuplicateAdd && (
                    <button
                      type="button"
                      onClick={() => setAllowDuplicateAdd(true)}
                      className="ml-2 underline underline-offset-2 hover:text-amber-100"
                    >
                      Add anyway
                    </button>
                  )}
                </div>
              )}

              {/* Relationship (REQUIRED) */}
              <div className="p-4 rounded-xl bg-gold-400/[0.04] border border-gold-400/10">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={14} className="text-gold-400/60" />
                  <span className="text-xs text-gold-300/80 font-medium">Relationship *</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/25 font-medium uppercase tracking-wider mb-1 block">
                      This person is...
                    </label>
                    <select value={relType} onChange={(e) => setRelType(e.target.value as RelationshipType)} className={selectClass}>
                      {RELATIONSHIP_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-white/25 font-medium uppercase tracking-wider mb-1 block">
                      Related to...
                    </label>
                    <select value={relativeId} onChange={(e) => setRelativeId(e.target.value)} className={selectClass}>
                      <option value="">Select member</option>
                      {existingMembers.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.first_name} {m.last_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <Briefcase size={10} /> Profession
                  </label>
                  <input type="text" value={profession} onChange={(e) => setProfession(e.target.value)}
                    className={inputClass} placeholder="e.g., Doctor" />
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
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">City</label>
                  <CitySearch
                    value={locationCity}
                    onChange={(next) => {
                      setLocationCity(next);
                      setAllowDuplicateAdd(false);
                    }}
                    placeholder="Search a city..."
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar size={10} /> Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      onChange={(e) => {
                        setDob(e.target.value);
                        setAllowDuplicateAdd(false);
                      }}
                      className={cn(inputClass, "appearance-none")}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">Place of Birth</label>
                    <CitySearch value={placeOfBirth} onChange={setPlaceOfBirth} placeholder="Birthplace..." />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <FileText size={10} /> About
                  </label>
                  <textarea value={aboutMe} onChange={(e) => setAboutMe(e.target.value)} rows={2}
                    className={cn(inputClass, "resize-none")} placeholder="A short bio..." />
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isAlive} onChange={(e) => setIsAlive(e.target.checked)}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 text-gold-400 focus:ring-gold-400/30" />
                  <span className="text-xs text-white/50">Living</span>
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-4 sm:px-6 py-4 border-t border-white/[0.06]">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim() || !gender || !relativeId || (!!duplicateMatch && !allowDuplicateAdd)}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium
                  hover:bg-gold-400/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <UserPlus size={14} />
                Add Member
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
