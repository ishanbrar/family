"use client";

// ══════════════════════════════════════════════════════════
// useFamilyData – Main data hook
// Loads profiles, relationships, conditions from Supabase.
// Falls back to mock data if Supabase is not configured.
// ══════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getProfile,
  getFamily,
  getFamilyProfiles,
  getFamilyRelationships,
  getAllConditions,
  getUserConditions,
  regenerateFamilyInviteCode as dbRegenerateFamilyInviteCode,
  getFamilyInviteCodes as dbGetFamilyInviteCodes,
  createFamilyInviteCode as dbCreateFamilyInviteCode,
  updateFamilyInviteCode as dbUpdateFamilyInviteCode,
  deleteFamilyInviteCode as dbDeleteFamilyInviteCode,
  updateProfile as dbUpdateProfile,
  addRelationship as dbAddRelationship,
  addFamilyMember as dbAddFamilyMember,
  addUserCondition as dbAddUserCondition,
  type FamilyRecord,
  type InviteCodeRecord,
} from "@/lib/supabase/db";
import { uploadAvatar, deleteAvatar } from "@/lib/supabase/storage";
import { useFamilyStore } from "@/store/family-store";
import type { Profile, Relationship, MedicalCondition, UserCondition, RelationshipType } from "@/lib/types";
import { isConfigured as isSupabaseConfigured } from "@/lib/supabase/config";
import { disableDevSuperAdmin, isDevSuperAdminClient } from "@/lib/dev-auth";
import {
  MOCK_PROFILES,
  MOCK_RELATIONSHIPS,
  MOCK_CONDITIONS,
  MOCK_USER_CONDITIONS,
} from "@/lib/mock-data";

interface FamilyData {
  viewer: Profile | null;
  family: FamilyRecord | null;
  inviteCodes: InviteCodeRecord[];
  members: Profile[];
  relationships: Relationship[];
  conditions: MedicalCondition[];
  userConditions: UserCondition[];
  loading: boolean;
  isOnline: boolean; // true = Supabase, false = mock data
  // Actions
  updateProfile: (userId: string, updates: Partial<Profile>, avatarFile?: File) => Promise<void>;
  addMember: (
    member: Omit<Profile, "id" | "created_at" | "updated_at">,
    rel: { relativeId: string; type: RelationshipType },
    avatarFile?: File
  ) => Promise<void>;
  addCondition: (userId: string, conditionId: string) => Promise<void>;
  regenerateInviteCode: () => Promise<void>;
  createInviteCode: (customCode?: string, label?: string) => Promise<void>;
  updateInviteCode: (inviteCodeId: string, nextCode: string, label?: string) => Promise<void>;
  deleteInviteCode: (inviteCodeId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFamilyData(): FamilyData {
  const store = useFamilyStore();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [family, setFamily] = useState<FamilyRecord | null>(null);
  const [inviteCodes, setInviteCodes] = useState<InviteCodeRecord[]>([]);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [userConds, setUserConds] = useState<UserCondition[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const supabase = createClient();

  const makeLocalInviteCode = (familyName?: string) => {
    const tokens = (familyName || "Family")
      .trim()
      .toUpperCase()
      .split(/\s+/)
      .map((part) => part.replace(/[^A-Z]/g, ""))
      .filter(Boolean);
    let base = "";
    for (let i = tokens.length - 1; i >= 0; i -= 1) {
      if (tokens[i] !== "FAMILY") {
        base = tokens[i];
        break;
      }
    }
    if (!base) base = tokens[tokens.length - 1] || "";
    if (!base || base.length < 2) base = "FAMILY";
    base = base.slice(0, 24);
    const digits = `${Math.floor(Math.random() * 10000)}`.padStart(4, "0");
    return `${base}${digits}`;
  };

  const loadData = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured() || isDevSuperAdminClient()) {
      // ── Offline / Dev super-admin mode ──
      store.setViewer(MOCK_PROFILES[0]);
      store.setMembers(MOCK_PROFILES);
      store.setRelationships(MOCK_RELATIONSHIPS);
      setConditions(MOCK_CONDITIONS);
      setUserConds(MOCK_USER_CONDITIONS);
      setFamily({
        id: "mock-family",
        name: "Montague Family",
        invite_code: "MONTAGUE1234",
      });
      setInviteCodes([
        {
          id: "mock-invite-1",
          family_id: "mock-family",
          code: "MONTAGUE1234",
          label: "Primary",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ]);
      setIsOnline(false);
      setLoading(false);
      return;
    }

    try {
      // Get current auth user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        setFamilyId(null);
        store.setViewer(null);
        store.setMembers([]);
        store.setRelationships([]);
        setConditions([]);
        setUserConds([]);
        setFamily(null);
        setInviteCodes([]);
        setIsOnline(false);
        setLoading(false);
        return;
      }

      // Load viewer profile
      const viewerProfile = await getProfile(supabase, user.id);
      if (!viewerProfile) {
        setFamilyId(null);
        store.setViewer(null);
        store.setMembers([]);
        store.setRelationships([]);
        setConditions([]);
        setUserConds([]);
        setFamily(null);
        setInviteCodes([]);
        setIsOnline(false);
        setLoading(false);
        return;
      }

      store.setViewer(viewerProfile);
      setIsOnline(true);

      // Load family data
      if (viewerProfile.family_id) {
        setFamilyId(viewerProfile.family_id);

        const [profiles, rels, conds, codes] = await Promise.all([
          getFamilyProfiles(supabase, viewerProfile.family_id),
          getFamilyRelationships(supabase, viewerProfile.family_id),
          getAllConditions(supabase),
          dbGetFamilyInviteCodes(supabase, viewerProfile.family_id),
        ]);
        const fam = await getFamily(supabase, viewerProfile.family_id);

        store.setMembers(profiles);
        store.setRelationships(rels);
        setConditions(conds);
        setFamily(fam);
        setInviteCodes(codes);

        // Load user conditions for all family members
        const memberIds = profiles.map((p) => p.id);
        const uConds = await getUserConditions(supabase, memberIds);
        setUserConds(uConds);
      } else {
        // No family yet — just load conditions
        setFamilyId(null);
        const conds = await getAllConditions(supabase);
        setConditions(conds);
        store.setMembers([viewerProfile]);
        store.setRelationships([]);
        setFamily(null);
        setInviteCodes([]);
      }
    } catch (err) {
      setFamilyId(null);
      console.error("Error loading family data:", err);
      store.setViewer(null);
      store.setMembers([]);
      store.setRelationships([]);
      setConditions([]);
      setUserConds([]);
      setFamily(null);
      setInviteCodes([]);
      setIsOnline(false);
    }

    setLoading(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Actions ─────────────────────────────────────

  const updateProfile = useCallback(
    async (userId: string, updates: Partial<Profile>, avatarFile?: File) => {
      if (!isOnline) {
        // Mock mode — just update store
        if (userId === store.viewer?.id) {
          store.updateViewer(updates);
        } else {
          const updated = store.members.map((m) =>
            m.id === userId ? { ...m, ...updates, updated_at: new Date().toISOString() } : m
          );
          store.setMembers(updated);
        }

        if (avatarFile) {
          const localUrl = URL.createObjectURL(avatarFile);
          if (userId === store.viewer?.id) {
            store.updateViewer({ avatar_url: localUrl });
          }
        }
        return;
      }

      // Online mode
      let avatarUrl: string | undefined;
      if (avatarFile) {
        // Delete old avatar if it exists
        const currentProfile = store.members.find((m) => m.id === userId);
        if (currentProfile?.avatar_url) {
          await deleteAvatar(supabase, currentProfile.avatar_url);
        }
        const url = await uploadAvatar(supabase, userId, avatarFile);
        if (url) avatarUrl = url;
      }

      const finalUpdates: Partial<Profile> = { ...updates };
      if (avatarFile) {
        // Never persist a local blob URL; only store a real storage URL.
        delete finalUpdates.avatar_url;
      }
      if (avatarUrl) finalUpdates.avatar_url = avatarUrl;

      const updated = await dbUpdateProfile(supabase, userId, finalUpdates);
      if (updated) {
        if (userId === store.viewer?.id) {
          store.setViewer(updated);
        }
        store.setMembers(
          store.members.map((m) => (m.id === userId ? updated : m))
        );
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOnline, store.viewer, store.members]
  );

  const addMember = useCallback(
    async (
      memberData: Omit<Profile, "id" | "created_at" | "updated_at">,
      rel: { relativeId: string; type: RelationshipType },
      avatarFile?: File
    ) => {
      if (!isOnline) {
        // Mock mode
        const newId = `member-${Date.now()}`;
        const now = new Date().toISOString();
        const localAvatar = avatarFile ? URL.createObjectURL(avatarFile) : memberData.avatar_url;
        const newProfile: Profile = {
          ...memberData,
          avatar_url: localAvatar,
          id: newId,
          created_at: now,
          updated_at: now,
        };
        store.addMember(newProfile);
        store.addRelationship({
          id: `rel-${Date.now()}`, user_id: newId, relative_id: rel.relativeId,
          type: rel.type, created_at: now,
        });
        return;
      }

      // Online mode
      if (!familyId) return;

      const newProfile = await dbAddFamilyMember(supabase, {
        ...memberData,
        family_id: familyId,
      });

      if (newProfile) {
        let finalProfile = newProfile;

        if (avatarFile) {
          const avatarUrl = await uploadAvatar(supabase, newProfile.id, avatarFile);
          if (avatarUrl) {
            const updated = await dbUpdateProfile(supabase, newProfile.id, { avatar_url: avatarUrl });
            if (updated) finalProfile = updated;
          }
        }

        store.addMember(finalProfile);
        const newRel = await dbAddRelationship(
          supabase,
          finalProfile.id,
          rel.relativeId,
          rel.type
        );
        if (newRel) store.addRelationship(newRel);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOnline, familyId]
  );

  const addCondition = useCallback(
    async (userId: string, conditionId: string) => {
      if (!isOnline) {
        const condition = conditions.find((c) => c.id === conditionId);
        const newUC: UserCondition = {
          id: `uc-${Date.now()}`, user_id: userId, condition_id: conditionId,
          severity: "mild", age_of_onset: null, notes: null,
          diagnosed_at: new Date().toISOString(), created_at: new Date().toISOString(),
          condition,
        };
        setUserConds((prev) => [...prev, newUC]);
        return;
      }

      const newUC = await dbAddUserCondition(supabase, userId, conditionId);
      if (newUC) setUserConds((prev) => [...prev, newUC]);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isOnline, conditions]
  );

  const regenerateInviteCode = useCallback(async () => {
    if (!familyId && !family) return;
    if (!isOnline) {
      const code = makeLocalInviteCode(family?.name);
      const mockCode: InviteCodeRecord = {
        id: `mock-invite-${Date.now()}`,
        family_id: family?.id || "mock-family",
        code,
        label: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setInviteCodes((prev) => [mockCode, ...prev]);
      setFamily((prev) => (prev ? { ...prev, invite_code: code } : prev));
      return;
    }
    if (!familyId) return;
    const updated = await dbRegenerateFamilyInviteCode(supabase, familyId);
    if (updated) setFamily(updated);
    const nextCodes = await dbGetFamilyInviteCodes(supabase, familyId);
    setInviteCodes(nextCodes);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline, familyId, family]);

  const createInviteCode = useCallback(async (customCode?: string, label?: string) => {
    if (!familyId) return;
    if (!isOnline) {
      const code = customCode?.trim().toUpperCase() || makeLocalInviteCode(family?.name);
      const mockCode: InviteCodeRecord = {
        id: `mock-invite-${Date.now()}`,
        family_id: familyId,
        code,
        label: label?.trim() || null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
      setInviteCodes((prev) => [mockCode, ...prev]);
      setFamily((prev) => (prev ? { ...prev, invite_code: code } : prev));
      return;
    }

    const created = await dbCreateFamilyInviteCode(supabase, familyId, customCode, label);
    if (!created) return;
    const [fam, codes] = await Promise.all([
      getFamily(supabase, familyId),
      dbGetFamilyInviteCodes(supabase, familyId),
    ]);
    if (fam) setFamily(fam);
    setInviteCodes(codes);
  }, [isOnline, familyId, family, supabase]);

  const updateInviteCode = useCallback(async (inviteCodeId: string, nextCode: string, label?: string) => {
    if (!familyId) return;
    if (!isOnline) {
      const normalized = nextCode.trim().toUpperCase();
      setInviteCodes((prev) =>
        prev.map((code) =>
          code.id === inviteCodeId
            ? { ...code, code: normalized, label: label === undefined ? code.label : (label.trim() || null) }
            : code
        )
      );
      setFamily((prev) => (prev ? { ...prev, invite_code: normalized } : prev));
      return;
    }

    const updated = await dbUpdateFamilyInviteCode(supabase, inviteCodeId, nextCode, label);
    if (!updated) return;
    const [fam, codes] = await Promise.all([
      getFamily(supabase, familyId),
      dbGetFamilyInviteCodes(supabase, familyId),
    ]);
    if (fam) setFamily(fam);
    setInviteCodes(codes);
  }, [isOnline, familyId, supabase]);

  const deleteInviteCode = useCallback(async (inviteCodeId: string) => {
    if (!familyId) return;
    if (!isOnline) {
      setInviteCodes((prev) => prev.filter((code) => code.id !== inviteCodeId));
      return;
    }

    const ok = await dbDeleteFamilyInviteCode(supabase, inviteCodeId);
    if (!ok) return;
    const [fam, codes] = await Promise.all([
      getFamily(supabase, familyId),
      dbGetFamilyInviteCodes(supabase, familyId),
    ]);
    if (fam) setFamily(fam);
    setInviteCodes(codes);
  }, [isOnline, familyId, supabase]);

  const signOut = useCallback(async () => {
    if (isDevSuperAdminClient()) {
      disableDevSuperAdmin();
      window.location.href = "/login";
      return;
    }
    if (isOnline) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return {
    viewer: store.viewer,
    family,
    inviteCodes,
    members: store.members,
    relationships: store.relationships,
    conditions,
    userConditions: userConds,
    loading,
    isOnline,
    updateProfile,
    addMember,
    addCondition,
    regenerateInviteCode,
    createInviteCode,
    updateInviteCode,
    deleteInviteCode,
    signOut,
    refresh: loadData,
  };
}
