"use client";

// ══════════════════════════════════════════════════════════
// AddMemberModal – Add New Family Member
// ══════════════════════════════════════════════════════════

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback } from "react";
import {
  X,
  Camera,
  UserPlus,
  User,
  Briefcase,
  Calendar,
  FileText,
  GitBranch,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { CitySearch } from "./CitySearch";
import type { Profile, RelationshipType } from "@/lib/types";

interface AddMemberModalProps {
  existingMembers: Profile[];
  isOpen: boolean;
  onClose: () => void;
  onAdd: (member: Omit<Profile, "id" | "created_at" | "updated_at">, relationship: { relativeId: string; type: RelationshipType }) => void;
}

const RELATIONSHIP_OPTIONS: { value: RelationshipType; label: string }[] = [
  { value: "parent", label: "Parent of" },
  { value: "child", label: "Child of" },
  { value: "sibling", label: "Sibling of" },
  { value: "spouse", label: "Spouse of" },
  { value: "grandparent", label: "Grandparent of" },
  { value: "grandchild", label: "Grandchild of" },
  { value: "aunt_uncle", label: "Aunt/Uncle of" },
  { value: "niece_nephew", label: "Niece/Nephew of" },
  { value: "cousin", label: "Cousin of" },
  { value: "half_sibling", label: "Half-Sibling of" },
];

export function AddMemberModal({
  existingMembers,
  isOpen,
  onClose,
  onAdd,
}: AddMemberModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [profession, setProfession] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [dob, setDob] = useState("");
  const [placeOfBirth, setPlaceOfBirth] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [isAlive, setIsAlive] = useState(true);
  const [relativeId, setRelativeId] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("child");

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setAvatarPreview(URL.createObjectURL(file));
  }, []);

  const handleSubmit = () => {
    if (!firstName.trim() || !lastName.trim() || !relativeId) return;

    onAdd(
      {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        avatar_url: avatarPreview,
        date_of_birth: dob || null,
        place_of_birth: placeOfBirth || null,
        profession: profession || null,
        location_city: locationCity || null,
        location_lat: null,
        location_lng: null,
        social_links: {},
        about_me: aboutMe || null,
        country_code: null,
        role: "MEMBER",
        is_alive: isAlive,
      },
      { relativeId, type: relType }
    );

    // Reset
    setFirstName("");
    setLastName("");
    setProfession("");
    setLocationCity("");
    setDob("");
    setPlaceOfBirth("");
    setAboutMe("");
    setAvatarPreview(null);
    setIsAlive(true);
    onClose();
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/90 placeholder:text-white/20 outline-none focus:border-gold-400/30 focus:bg-white/[0.06] transition-all duration-200";

  const selectClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-2.5 text-sm text-white/60 outline-none focus:border-gold-400/30 transition-all duration-200 appearance-none cursor-pointer";

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 30 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed inset-4 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2
              sm:w-full sm:max-w-lg sm:max-h-[85vh] z-50
              rounded-3xl overflow-hidden flex flex-col"
            style={{ background: "rgba(17,17,17,0.97)", border: "1px solid rgba(255,255,255,0.08)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold-400/10 flex items-center justify-center">
                  <UserPlus size={16} className="text-gold-400" />
                </div>
                <h2 className="font-serif text-lg font-semibold text-white/90">Add Family Member</h2>
              </div>
              <button onClick={onClose}
                className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/5 transition-colors text-white/30 hover:text-white/60">
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Photo */}
              <div className="flex items-center gap-4">
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
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                    className={inputClass} placeholder="First name *" />
                  <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                    className={inputClass} placeholder="Last name *" />
                </div>
              </div>

              {/* Relationship (REQUIRED) */}
              <div className="p-4 rounded-xl bg-gold-400/[0.04] border border-gold-400/10">
                <div className="flex items-center gap-2 mb-3">
                  <GitBranch size={14} className="text-gold-400/60" />
                  <span className="text-xs text-gold-300/80 font-medium">Relationship *</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 block">City</label>
                  <CitySearch value={locationCity} onChange={setLocationCity} placeholder="Search a city..." />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                      <Calendar size={10} /> Date of Birth
                    </label>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={cn(inputClass, "appearance-none")} />
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
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.06]">
              <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-white/40 hover:text-white/60 hover:bg-white/5 transition-colors">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                disabled={!firstName.trim() || !lastName.trim() || !relativeId}
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
