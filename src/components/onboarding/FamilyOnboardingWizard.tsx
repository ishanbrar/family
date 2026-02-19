"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import {
  X,
  User,
  Users,
  MailPlus,
  ArrowRight,
  Check,
  Copy,
  RefreshCw,
} from "lucide-react";
import type { Profile, Relationship, RelationshipType, Gender } from "@/lib/types";
import { cn } from "@/lib/cn";
import { CitySearch } from "@/components/ui/CitySearch";
import { inferCountryCodeFromCity } from "@/lib/cities";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";

interface InviteFamilyLite {
  id: string;
  name: string;
  invite_code: string;
}

interface FamilyOnboardingWizardProps {
  viewer: Profile;
  members: Profile[];
  relationships: Relationship[];
  family: InviteFamilyLite | null;
  isOpen: boolean;
  mandatory?: boolean;
  onDismiss: () => void;
  onComplete: () => void;
  onRegenerateInviteCode?: () => Promise<void>;
  updateProfile: (userId: string, updates: Partial<Profile>) => Promise<void>;
  addMember: (
    member: Omit<Profile, "id" | "created_at" | "updated_at">,
    rel: { relativeId: string; type: RelationshipType }
  ) => Promise<void>;
}

const DIRECT_RELATION_TYPES: RelationshipType[] = [
  "parent",
  "child",
  "sibling",
  "spouse",
  "half_sibling",
];

const STEP_TWO_RELATIONS: { value: RelationshipType; label: string }[] = [
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "spouse", label: "Spouse" },
  { value: "half_sibling", label: "Half-Sibling" },
];

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

const RELATION_ACTIONS: {
  value: RelationshipType;
  label: string;
  topPct: number;
  leftPct: number;
}[] = [
  { value: "parent", label: "Parent", topPct: 16, leftPct: 50 },
  { value: "sibling", label: "Sibling", topPct: 49, leftPct: 26 },
  { value: "half_sibling", label: "Half-Sibling", topPct: 67, leftPct: 22 },
  { value: "spouse", label: "Spouse", topPct: 49, leftPct: 74 },
  { value: "child", label: "Child", topPct: 84, leftPct: 50 },
];

function relationLabel(type: RelationshipType): string {
  return STEP_TWO_RELATIONS.find((r) => r.value === type)?.label || type.replace("_", " ");
}

function emptyMemberDraft() {
  return {
    firstName: "",
    lastName: "",
    gender: "" as Gender | "",
    relation: "" as RelationshipType | "",
    city: "",
    dateOfBirth: "",
    profession: "",
  };
}

function normalizeName(first: string, last: string): string {
  return `${first.trim().toLowerCase()}::${last.trim().toLowerCase()}`;
}

function normalizeCity(value: string | null | undefined): string {
  return (value || "").trim().toLowerCase().replace(/\s+/g, " ");
}

function invertDirectRelation(type: RelationshipType): RelationshipType {
  if (type === "parent") return "child";
  if (type === "child") return "parent";
  return type;
}

export function FamilyOnboardingWizard({
  viewer,
  members,
  relationships,
  family,
  isOpen,
  mandatory = false,
  onDismiss,
  onComplete,
  onRegenerateInviteCode,
  updateProfile,
  addMember,
}: FamilyOnboardingWizardProps) {
  const { dialogRef } = useAccessibleDialog({
    isOpen,
    onClose: onDismiss,
    closeOnEscape: !mandatory,
  });
  const [step, setStep] = useState(1);

  const [selfProfile, setSelfProfile] = useState({
    firstName: viewer.first_name,
    lastName: viewer.last_name,
    gender: (viewer.gender || "") as Gender | "",
    dateOfBirth: viewer.date_of_birth || "",
    locationCity: viewer.location_city || "",
    placeOfBirth: viewer.place_of_birth || "",
    profession: viewer.profession || "",
    aboutMe: viewer.about_me || "",
  });

  const [stepTwoDraft, setStepTwoDraft] = useState(emptyMemberDraft());
  const [allowDuplicateStepTwo, setAllowDuplicateStepTwo] = useState(false);
  const [compactStepTwo, setCompactStepTwo] = useState(false);
  const [linksForged, setLinksForged] = useState(0);

  const [savingSelf, setSavingSelf] = useState(false);
  const [addingRelative, setAddingRelative] = useState(false);
  const [copyInviteDone, setCopyInviteDone] = useState(false);
  const [copyCodeDone, setCopyCodeDone] = useState(false);
  const [regeneratingCode, setRegeneratingCode] = useState(false);
  const [inviteStepDone, setInviteStepDone] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setStepError(null);
    setSavingSelf(false);
    setAddingRelative(false);
    setLinksForged(0);
    setCopyInviteDone(false);
    setCopyCodeDone(false);
    setInviteStepDone(false);
    setSelfProfile({
      firstName: viewer.first_name,
      lastName: viewer.last_name,
      gender: (viewer.gender || "") as Gender | "",
      dateOfBirth: viewer.date_of_birth || "",
      locationCity: viewer.location_city || "",
      placeOfBirth: viewer.place_of_birth || "",
      profession: viewer.profession || "",
      aboutMe: viewer.about_me || "",
    });
    setStepTwoDraft(emptyMemberDraft());
    setAllowDuplicateStepTwo(false);
    if (typeof window !== "undefined") {
      setCompactStepTwo(window.innerWidth < 900);
    }
  }, [isOpen, viewer]);

  const directRelativeIds = useMemo(() => {
    const ids = new Set<string>();

    for (const rel of relationships) {
      if (!DIRECT_RELATION_TYPES.includes(rel.type)) continue;
      if (rel.user_id === viewer.id) ids.add(rel.relative_id);
      if (rel.relative_id === viewer.id) ids.add(rel.user_id);
    }

    ids.delete(viewer.id);
    return [...ids];
  }, [relationships, viewer.id]);

  const directRelatives = useMemo(
    () => directRelativeIds.map((id) => members.find((m) => m.id === id)).filter((m): m is Profile => !!m),
    [directRelativeIds, members]
  );

  const coreRelativeCount = directRelatives.length;
  const coreGoalReached = coreRelativeCount >= 3;

  const directRelationById = useMemo(() => {
    const map = new Map<string, RelationshipType>();
    for (const memberId of directRelativeIds) {
      const direct = relationships.find(
        (rel) => rel.user_id === memberId && rel.relative_id === viewer.id && DIRECT_RELATION_TYPES.includes(rel.type)
      );
      if (direct) {
        map.set(memberId, direct.type);
        continue;
      }

      const inverse = relationships.find(
        (rel) => rel.user_id === viewer.id && rel.relative_id === memberId && DIRECT_RELATION_TYPES.includes(rel.type)
      );
      if (inverse) {
        map.set(memberId, invertDirectRelation(inverse.type));
      }
    }
    return map;
  }, [directRelativeIds, relationships, viewer.id]);

  const directRelativesByRelation = useMemo(() => {
    const grouped = new Map<RelationshipType, Profile[]>();
    for (const relation of DIRECT_RELATION_TYPES) {
      grouped.set(relation, []);
    }
    for (const member of directRelatives) {
      const relation = directRelationById.get(member.id) || "sibling";
      const bucket = grouped.get(relation) || [];
      bucket.push(member);
      grouped.set(relation, bucket);
    }
    return grouped;
  }, [directRelatives, directRelationById]);

  const duplicateInMembers = useMemo(() => {
    const target = normalizeName(stepTwoDraft.firstName, stepTwoDraft.lastName);
    if (!stepTwoDraft.firstName.trim() || !stepTwoDraft.lastName.trim()) return null;
    const sameNameMembers = members.filter((m) => normalizeName(m.first_name, m.last_name) === target);
    if (sameNameMembers.length === 0) return null;

    const draftCity = normalizeCity(stepTwoDraft.city);
    const likely = sameNameMembers.find((member) => {
      if (stepTwoDraft.dateOfBirth && member.date_of_birth === stepTwoDraft.dateOfBirth) return true;
      if (draftCity && normalizeCity(member.location_city) === draftCity) return true;
      return false;
    });

    return {
      member: likely || sameNameMembers[0],
      confidence: likely ? ("high" as const) : ("low" as const),
    };
  }, [stepTwoDraft.firstName, stepTwoDraft.lastName, stepTwoDraft.city, stepTwoDraft.dateOfBirth, members]);

  const inviteLink = useMemo(() => {
    if (!family || typeof window === "undefined") return "";
    const url = new URL("/signup", window.location.origin);
    url.searchParams.set("mode", "join");
    url.searchParams.set("code", family.invite_code);
    return url.toString();
  }, [family]);

  const inputClass =
    "w-full app-input rounded-xl px-3 py-2.5 text-sm outline-none transition-colors";

  const createMemberPayload = useMemo(
    () =>
      (draft: { firstName: string; lastName: string; gender: Gender | ""; city: string; dateOfBirth: string; profession: string }) => ({
        first_name: draft.firstName.trim(),
        last_name: draft.lastName.trim(),
        display_name: null,
        gender: draft.gender || null,
        avatar_url: null,
        date_of_birth: draft.dateOfBirth || null,
        place_of_birth: null,
        profession: draft.profession.trim() || null,
        location_city: draft.city.trim() || null,
        location_lat: null,
        location_lng: null,
        pets: [],
        social_links: {},
        about_me: null,
        country_code: inferCountryCodeFromCity(draft.city),
        role: "MEMBER" as const,
        is_alive: true,
      }),
    []
  );

  const safeDismiss = () => {
    if (mandatory) return;
    onDismiss();
  };

  const handleSaveSelf = async () => {
    if (!selfProfile.firstName.trim() || !selfProfile.lastName.trim()) {
      setStepError("Your first and last name are required.");
      return;
    }
    if (!selfProfile.gender) {
      setStepError("Please select gender.");
      return;
    }

    setSavingSelf(true);
    setStepError(null);

    try {
      await updateProfile(viewer.id, {
        first_name: selfProfile.firstName.trim(),
        last_name: selfProfile.lastName.trim(),
        gender: selfProfile.gender || null,
        date_of_birth: selfProfile.dateOfBirth || null,
        location_city: selfProfile.locationCity.trim() || null,
        country_code: inferCountryCodeFromCity(selfProfile.locationCity),
        place_of_birth: selfProfile.placeOfBirth.trim() || null,
        profession: selfProfile.profession.trim() || null,
        about_me: selfProfile.aboutMe.trim() || null,
      });
      setStep(2);
    } catch {
      setStepError("Could not save your profile. Please try again.");
    } finally {
      setSavingSelf(false);
    }
  };

  const handleSelectRelationAction = (relation: RelationshipType) => {
    setStepError(null);
    setStepTwoDraft((prev) => ({ ...prev, relation }));
  };

  const handleAddDirectRelative = async () => {
    if (!stepTwoDraft.firstName.trim() || !stepTwoDraft.lastName.trim()) {
      setStepError("Enter a first and last name.");
      return;
    }
    if (!stepTwoDraft.relation) {
      setStepError("Choose a connection around your node first.");
      return;
    }
    if (!stepTwoDraft.gender) {
      setStepError("Please select gender for this relative.");
      return;
    }
    if (duplicateInMembers && !allowDuplicateStepTwo) {
      setStepError("Possible duplicate found. Confirm 'Add anyway' if this is intentional.");
      return;
    }

    setAddingRelative(true);
    setStepError(null);

    const currentRelation = stepTwoDraft.relation as RelationshipType;

    try {
      await addMember(createMemberPayload(stepTwoDraft), {
        relativeId: viewer.id,
        type: currentRelation,
      });

      setLinksForged((v) => v + 1);
      setStepTwoDraft(emptyMemberDraft());
    } catch {
      setStepError("Could not add this family member. Please try again.");
    } finally {
      setAddingRelative(false);
    }
  };

  const copyText = async (text: string, type: "code" | "link") => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setInviteStepDone(true);
      if (type === "code") {
        setCopyCodeDone(true);
        setTimeout(() => setCopyCodeDone(false), 1400);
      } else {
        setCopyInviteDone(true);
        setTimeout(() => setCopyInviteDone(false), 1400);
      }
    } catch {
      // no-op
    }
  };

  const handleRegenerateCode = async () => {
    if (!onRegenerateInviteCode) return;
    setRegeneratingCode(true);
    await onRegenerateInviteCode();
    setRegeneratingCode(false);
  };

  const finishDisabled = mandatory && family ? !inviteStepDone : false;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] app-overlay backdrop-blur-sm"
            onClick={safeDismiss}
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 260, damping: 28 }}
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
            tabIndex={-1}
            className="fixed z-[71] inset-x-3 top-[calc(env(safe-area-inset-top)+0.75rem)] bottom-[calc(env(safe-area-inset-bottom)+0.75rem)]
              sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:w-[min(960px,94vw)] sm:max-h-[90vh] sm:-translate-x-1/2 sm:-translate-y-1/2
              rounded-3xl overflow-hidden app-surface flex flex-col"
          >
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/[0.06]">
              <div>
                <h2 id="onboarding-title" className="font-serif text-xl text-white/95">Build Your Family Network</h2>
                <p className="text-xs text-white/35 mt-0.5">
                  {mandatory
                    ? "Mandatory quick start: profile, 3 core relatives, invite 1 family member"
                    : "Quick start: profile, core relatives, invite a family member (all skippable)"}
                </p>
              </div>
              {!mandatory && (
                <button
                  onClick={safeDismiss}
                  className="w-9 h-9 rounded-xl text-white/35 hover:text-white/70 hover:bg-white/[0.04] transition-colors"
                  aria-label="Close"
                >
                  <X size={18} className="mx-auto" />
                </button>
              )}
            </div>

            <div className="px-4 sm:px-6 py-4 border-b border-white/[0.06]">
              <div className="grid grid-cols-3 gap-2">
                {[
                  { n: 1, label: "Your Profile", icon: User },
                  { n: 2, label: "Core Relatives", icon: Users },
                  { n: 3, label: "Invite 1 Member", icon: MailPlus },
                ].map((item) => {
                  const Icon = item.icon;
                  const active = step === item.n;
                  const done = step > item.n;
                  return (
                    <div
                      key={item.n}
                      className={cn(
                        "rounded-xl px-3 py-2 border transition-colors",
                        active && "bg-gold-400/10 border-gold-400/25",
                        !active && done && "bg-white/[0.02] border-white/[0.08]",
                        !active && !done && "bg-transparent border-white/[0.06]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-semibold",
                          active ? "bg-gold-400/20 text-gold-300" : "bg-white/[0.06] text-white/45"
                        )}>
                          {done ? <Check size={12} /> : item.n}
                        </div>
                        <Icon size={13} className={active ? "text-gold-300" : "text-white/35"} />
                        <span className={cn("text-xs", active ? "text-white/85" : "text-white/35")}>{item.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 sm:p-6 flex-1 min-h-0 overflow-y-auto">
              {step === 1 && (
                <div className="space-y-4">
                  <p className="text-sm text-white/55">
                    Step 1: confirm your own profile first so your family tree builds around the right root person.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      className={inputClass}
                      placeholder="First name"
                      value={selfProfile.firstName}
                      onChange={(e) => setSelfProfile((s) => ({ ...s, firstName: e.target.value }))}
                    />
                    <input
                      className={inputClass}
                      placeholder="Last name"
                      value={selfProfile.lastName}
                      onChange={(e) => setSelfProfile((s) => ({ ...s, lastName: e.target.value }))}
                    />
                    <select
                      className={inputClass}
                      value={selfProfile.gender}
                      onChange={(e) => setSelfProfile((s) => ({ ...s, gender: e.target.value as Gender | "" }))}
                    >
                      <option value="" disabled>Select gender</option>
                      {GENDER_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      className={inputClass}
                      value={selfProfile.dateOfBirth}
                      onChange={(e) => setSelfProfile((s) => ({ ...s, dateOfBirth: e.target.value }))}
                    />
                    <CitySearch
                      value={selfProfile.locationCity}
                      onChange={(next) => setSelfProfile((s) => ({ ...s, locationCity: next }))}
                      placeholder="Current city"
                    />
                    <CitySearch
                      value={selfProfile.placeOfBirth}
                      onChange={(next) => setSelfProfile((s) => ({ ...s, placeOfBirth: next }))}
                      placeholder="Place of birth"
                    />
                    <input
                      className={inputClass}
                      placeholder="Profession"
                      value={selfProfile.profession}
                      onChange={(e) => setSelfProfile((s) => ({ ...s, profession: e.target.value }))}
                    />
                  </div>
                  <textarea
                    rows={3}
                    className={cn(inputClass, "resize-none")}
                    placeholder="About you (optional)"
                    value={selfProfile.aboutMe}
                    onChange={(e) => setSelfProfile((s) => ({ ...s, aboutMe: e.target.value }))}
                  />
                </div>
              )}

              {step === 2 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-white/55">
                      {mandatory
                        ? "Step 2: add at least 3 core relatives connected directly to you."
                        : "Step 2: add core relatives connected directly to you (you can continue any time)."}
                    </p>
                    <span className={cn(
                      "text-xs px-2.5 py-1 rounded-lg",
                      coreGoalReached ? "bg-severity-mild/10 text-severity-mild" : "bg-white/[0.04] text-white/45"
                    )}>
                      {coreRelativeCount}/3 added
                    </span>
                  </div>

                  <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <p className="text-xs text-white/40">
                        {compactStepTwo
                          ? "Quick picker mode: tap a relation to add relatives fast on smaller screens."
                          : "Visual tree mode: parents above, siblings beside, children below."}
                      </p>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setCompactStepTwo((prev) => !prev)}
                          className="h-7 px-2.5 rounded-lg border border-white/[0.12] bg-white/[0.03] text-[11px] text-white/65 hover:text-white/88 hover:border-gold-400/24 transition-colors"
                        >
                          {compactStepTwo ? "Switch to Visual Tree" : "Switch to Quick Picker"}
                        </button>
                        <span className="inline-flex w-fit items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gold-400/[0.08] text-[11px] text-gold-300/85">
                          Links forged: {linksForged}
                        </span>
                      </div>
                    </div>

                    {compactStepTwo ? (
                      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {RELATION_ACTIONS.map((action) => {
                          const isSelected = stepTwoDraft.relation === action.value;
                          const slotRelatives = directRelativesByRelation.get(action.value) || [];
                          return (
                            <button
                              key={action.value}
                              type="button"
                              onClick={() => handleSelectRelationAction(action.value)}
                              className={cn(
                                "rounded-xl border px-3 py-2 text-left transition-colors",
                                isSelected
                                  ? "border-gold-400/35 bg-gold-400/15 text-gold-300"
                                  : "border-white/[0.12] bg-white/[0.04] text-white/78 hover:border-gold-400/25 hover:text-white/92"
                              )}
                            >
                              <p className="text-xs font-medium">Add {action.label}</p>
                              <p className="text-[10px] text-white/45 mt-1">
                                {slotRelatives.length} linked
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="relative mt-4 h-[360px] rounded-2xl border border-white/[0.08] bg-white/[0.03] overflow-hidden">
                        <div
                          className="absolute inset-0 opacity-60"
                          style={{ background: "radial-gradient(circle at center, rgba(212,165,116,0.14) 0%, transparent 72%)" }}
                        />

                        <svg className="absolute inset-0 h-full w-full pointer-events-none">
                          {RELATION_ACTIONS.map((action) => (
                            <line
                              key={`line-${action.value}`}
                              x1="50%"
                              y1="50%"
                              x2={`${action.leftPct}%`}
                              y2={`${action.topPct}%`}
                              stroke={action.value === "spouse" ? "rgba(212,165,116,0.46)" : "rgba(212,165,116,0.28)"}
                              strokeWidth="1"
                              strokeDasharray={action.value === "spouse" ? "5 4" : undefined}
                              strokeLinecap="round"
                            />
                          ))}
                        </svg>

                        {RELATION_ACTIONS.map((action) => {
                          const isSelected = stepTwoDraft.relation === action.value;
                          const slotRelatives = directRelativesByRelation.get(action.value) || [];
                          return (
                            <div
                              key={action.value}
                              className="absolute -translate-x-1/2 -translate-y-1/2 w-[170px] text-center"
                              style={{
                                left: `${action.leftPct}%`,
                                top: `${action.topPct}%`,
                              }}
                            >
                              <button
                                onClick={() => handleSelectRelationAction(action.value)}
                                className={cn(
                                  "rounded-xl border px-3 py-1.5 text-xs transition-colors",
                                  isSelected
                                    ? "border-gold-400/35 bg-gold-400/15 text-gold-300"
                                    : "border-white/[0.12] bg-white/[0.04] text-white/78 hover:border-gold-400/25 hover:text-white/92"
                                )}
                              >
                                Add {action.label}
                              </button>
                              {slotRelatives.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  {slotRelatives.slice(0, 2).map((member) => (
                                    <div
                                      key={member.id}
                                      className="mx-auto w-fit rounded-md border border-severity-mild/20 bg-white/[0.08] px-2 py-1"
                                    >
                                      <p className="text-[10px] text-white/85 leading-none">
                                        {member.first_name}
                                      </p>
                                      <p className="text-[9px] text-severity-mild/80 leading-none mt-1">
                                        {relationLabel(directRelationById.get(member.id) || "sibling")}
                                      </p>
                                    </div>
                                  ))}
                                  {slotRelatives.length > 2 && (
                                    <p className="text-[10px] text-white/40">+{slotRelatives.length - 2} more</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                          <div className="w-28 h-28 rounded-full border border-gold-400/35 bg-white/[0.06] flex flex-col items-center justify-center text-center shadow-[0_0_32px_rgba(212,165,116,0.2)]">
                            <p className="text-[10px] text-gold-300/85 uppercase tracking-wider">You</p>
                            <p className="text-xs text-white/90 font-medium leading-tight px-2">
                              {viewer.first_name} {viewer.last_name}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
                    {!stepTwoDraft.relation ? (
                      <div className="text-sm text-white/45">
                        Click one of the connection buttons around your node to start adding a relative.
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <p className="text-sm text-white/75">
                            Adding: <span className="text-gold-300">{relationLabel(stepTwoDraft.relation)}</span>
                          </p>
                          <span className="text-[11px] text-white/35">
                            Click another connection any time to switch
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            className={inputClass}
                            placeholder="First name"
                            value={stepTwoDraft.firstName}
                            onChange={(e) => {
                              setAllowDuplicateStepTwo(false);
                              setStepTwoDraft((s) => ({ ...s, firstName: e.target.value }));
                            }}
                          />
                          <input
                            className={inputClass}
                            placeholder="Last name"
                            value={stepTwoDraft.lastName}
                            onChange={(e) => {
                              setAllowDuplicateStepTwo(false);
                              setStepTwoDraft((s) => ({ ...s, lastName: e.target.value }));
                            }}
                          />
                          <select
                            className={inputClass}
                            value={stepTwoDraft.gender}
                            onChange={(e) =>
                              setStepTwoDraft((s) => ({ ...s, gender: e.target.value as Gender | "" }))
                            }
                          >
                            <option value="" disabled>Select gender</option>
                            {GENDER_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                          <CitySearch
                            value={stepTwoDraft.city}
                            onChange={(next) => {
                              setAllowDuplicateStepTwo(false);
                              setStepTwoDraft((s) => ({ ...s, city: next }));
                            }}
                            placeholder="City (optional)"
                          />
                          <input
                            type="date"
                            className={inputClass}
                            value={stepTwoDraft.dateOfBirth}
                            onChange={(e) => {
                              setAllowDuplicateStepTwo(false);
                              setStepTwoDraft((s) => ({ ...s, dateOfBirth: e.target.value }));
                            }}
                          />
                        </div>

                        {duplicateInMembers && (
                          <div className="mt-3 px-3 py-2 rounded-xl border border-amber-400/20 bg-amber-400/[0.08] text-xs text-amber-200/90">
                            {duplicateInMembers.confidence === "high" ? "Likely duplicate" : "Potential duplicate"}:
                            {" "}
                            {duplicateInMembers.member.first_name} {duplicateInMembers.member.last_name}
                            {!allowDuplicateStepTwo && (
                              <button
                                type="button"
                                onClick={() => setAllowDuplicateStepTwo(true)}
                                className="ml-2 underline underline-offset-2 hover:text-amber-100"
                              >
                                Add anyway
                              </button>
                            )}
                          </div>
                        )}

                        <button
                          onClick={handleAddDirectRelative}
                          disabled={addingRelative || (!!duplicateInMembers && !allowDuplicateStepTwo)}
                          className="mt-3 px-4 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 disabled:opacity-50 transition-colors"
                        >
                          {addingRelative ? "Adding..." : `Add ${relationLabel(stepTwoDraft.relation)}`}
                        </button>
                      </>
                    )}
                  </div>

                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                    <p className="text-xs text-white/35 mb-2">Core relatives currently in tree</p>
                    {directRelatives.length === 0 ? (
                      <p className="text-xs text-white/30">No direct relatives yet.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {directRelatives.map((m) => (
                          <span key={m.id} className="px-2 py-1 rounded-lg bg-white/[0.03] text-xs text-white/65">
                            {m.first_name} {m.last_name}
                            <span className="text-severity-mild/80"> · {relationLabel(directRelationById.get(m.id) || "sibling")}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep(3)}
                      disabled={mandatory ? !coreGoalReached : false}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 disabled:opacity-50 transition-colors"
                    >
                      {mandatory ? `Continue (${Math.min(coreRelativeCount, 3)}/3)` : "Continue to Invites"}
                      <ArrowRight size={14} />
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-4">
                  <p className="text-sm text-white/55">
                    Step 3: invite at least 1 family member so they can join your shared tree and collaborate.
                  </p>

                  {family ? (
                    <>
                      <div className="rounded-xl border border-gold-400/20 bg-gold-400/[0.06] p-3">
                        <p className="text-[11px] uppercase tracking-wider text-gold-300/75 mb-2">Family Invite Code</p>
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono tracking-[0.18em] text-white/95">{family.invite_code}</code>
                          <button
                            onClick={() => copyText(family.invite_code, "code")}
                            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-white/70 hover:text-white/95 hover:bg-white/[0.1] transition-colors"
                          >
                            {copyCodeDone ? <Check size={12} /> : <Copy size={12} />}
                            {copyCodeDone ? "Copied" : "Copy code"}
                          </button>
                        </div>
                      </div>

                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3">
                        <p className="text-[11px] uppercase tracking-wider text-white/35 mb-2">Invite Link</p>
                        <div className="flex items-center gap-2">
                          <div className="min-w-0 flex-1 text-xs text-white/60 truncate">{inviteLink}</div>
                          <button
                            onClick={() => copyText(inviteLink, "link")}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] text-xs text-white/70 hover:text-white/95 hover:bg-white/[0.1] transition-colors"
                          >
                            {copyInviteDone ? <Check size={12} /> : <Copy size={12} />}
                            {copyInviteDone ? "Copied" : "Copy link"}
                          </button>
                        </div>
                      </div>

                      <button
                        onClick={handleRegenerateCode}
                        disabled={regeneratingCode || !onRegenerateInviteCode}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs text-white/55 hover:text-white/80 hover:bg-white/[0.04] disabled:opacity-50 transition-colors"
                      >
                        <RefreshCw size={13} className={regeneratingCode ? "animate-spin" : ""} />
                        {regeneratingCode ? "Refreshing..." : "Generate new invite code"}
                      </button>

                      <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-white/40">
                        Invite sent? Copying the code or link marks this step complete.
                      </div>
                    </>
                  ) : (
                    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 text-xs text-white/40">
                      Family invite details are not available yet. Please refresh after family setup completes.
                    </div>
                  )}
                </div>
              )}

              {stepError && (
                <div className="mt-4 px-3 py-2 rounded-xl border border-red-400/20 bg-red-400/[0.06] text-xs text-red-300/90">
                  {stepError}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-t border-white/[0.06] bg-white/[0.02]">
              <button
                onClick={() => (step === 1 ? safeDismiss() : setStep((s) => Math.max(1, s - 1)))}
                className="px-4 py-2 rounded-xl text-sm text-white/45 hover:text-white/70 hover:bg-white/[0.04] transition-colors disabled:opacity-50"
                disabled={mandatory && step === 1}
              >
                {step === 1 ? (mandatory ? "Complete setup to continue" : "Skip for now") : "Back"}
              </button>

              <div className="flex items-center gap-2">
                {step === 1 && (
                  <button
                    onClick={handleSaveSelf}
                    disabled={savingSelf}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 disabled:opacity-50 transition-colors"
                  >
                    {savingSelf ? "Saving..." : "Save & Continue"}
                    <ArrowRight size={14} />
                  </button>
                )}

                {step === 2 && (
                  <button
                    onClick={() => setStep(3)}
                    disabled={mandatory ? !coreGoalReached : false}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 disabled:opacity-50 transition-colors"
                  >
                    {mandatory ? `Continue (${Math.min(coreRelativeCount, 3)}/3)` : "Continue"}
                    <ArrowRight size={14} />
                  </button>
                )}

                {step === 3 && (
                  <button
                    onClick={onComplete}
                    disabled={finishDisabled}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 disabled:opacity-50 transition-colors"
                  >
                    Finish Setup
                    <Check size={14} />
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
