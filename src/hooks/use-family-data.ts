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
  getFamilyProfiles,
  getFamilyRelationships,
  getAllConditions,
  getUserConditions,
  updateProfile as dbUpdateProfile,
  addRelationship as dbAddRelationship,
  addFamilyMember as dbAddFamilyMember,
  addUserCondition as dbAddUserCondition,
} from "@/lib/supabase/db";
import { uploadAvatar, deleteAvatar } from "@/lib/supabase/storage";
import { useFamilyStore } from "@/store/family-store";
import type { Profile, Relationship, MedicalCondition, UserCondition, RelationshipType } from "@/lib/types";
import { isConfigured as isSupabaseConfigured } from "@/lib/supabase/config";
import {
  MOCK_PROFILES,
  MOCK_RELATIONSHIPS,
  MOCK_CONDITIONS,
  MOCK_USER_CONDITIONS,
} from "@/lib/mock-data";

interface FamilyData {
  viewer: Profile | null;
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
    rel: { relativeId: string; type: RelationshipType }
  ) => Promise<void>;
  addCondition: (userId: string, conditionId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useFamilyData(): FamilyData {
  const store = useFamilyStore();
  const [loading, setLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [conditions, setConditions] = useState<MedicalCondition[]>([]);
  const [userConds, setUserConds] = useState<UserCondition[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);

  const supabase = createClient();

  const loadData = useCallback(async () => {
    setLoading(true);

    if (!isSupabaseConfigured()) {
      // ── Offline / Mock mode ──
      store.setViewer(MOCK_PROFILES[0]);
      store.setMembers(MOCK_PROFILES);
      store.setRelationships(MOCK_RELATIONSHIPS);
      setConditions(MOCK_CONDITIONS);
      setUserConds(MOCK_USER_CONDITIONS);
      setIsOnline(false);
      setLoading(false);
      return;
    }

    try {
      // Get current auth user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in — will be redirected by middleware
        setLoading(false);
        return;
      }

      // Load viewer profile
      const viewerProfile = await getProfile(supabase, user.id);
      if (!viewerProfile) {
        setLoading(false);
        return;
      }

      store.setViewer(viewerProfile);
      setIsOnline(true);

      // Load family data
      if (viewerProfile.family_id) {
        setFamilyId(viewerProfile.family_id);

        const [profiles, rels, conds] = await Promise.all([
          getFamilyProfiles(supabase, viewerProfile.family_id),
          getFamilyRelationships(supabase, viewerProfile.family_id),
          getAllConditions(supabase),
        ]);

        store.setMembers(profiles);
        store.setRelationships(rels);
        setConditions(conds);

        // Load user conditions for all family members
        const memberIds = profiles.map((p) => p.id);
        const uConds = await getUserConditions(supabase, memberIds);
        setUserConds(uConds);
      } else {
        // No family yet — just load conditions
        const conds = await getAllConditions(supabase);
        setConditions(conds);
        store.setMembers([viewerProfile]);
        store.setRelationships([]);
      }
    } catch (err) {
      console.error("Error loading family data:", err);
      // Fall back to mock
      store.setViewer(MOCK_PROFILES[0]);
      store.setMembers(MOCK_PROFILES);
      store.setRelationships(MOCK_RELATIONSHIPS);
      setConditions(MOCK_CONDITIONS);
      setUserConds(MOCK_USER_CONDITIONS);
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

      const finalUpdates = { ...updates };
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
      rel: { relativeId: string; type: RelationshipType }
    ) => {
      if (!isOnline) {
        // Mock mode
        const newId = `member-${Date.now()}`;
        const now = new Date().toISOString();
        const newProfile: Profile = { ...memberData, id: newId, created_at: now, updated_at: now };
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
        store.addMember(newProfile);
        const newRel = await dbAddRelationship(
          supabase, newProfile.id, rel.relativeId, rel.type
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

  const signOut = useCallback(async () => {
    if (isOnline) {
      await supabase.auth.signOut();
    }
    window.location.href = "/login";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  return {
    viewer: store.viewer,
    members: store.members.length > 0 ? store.members : MOCK_PROFILES,
    relationships: store.relationships.length > 0 ? store.relationships : MOCK_RELATIONSHIPS,
    conditions: conditions.length > 0 ? conditions : MOCK_CONDITIONS,
    userConditions: userConds.length > 0 ? userConds : MOCK_USER_CONDITIONS,
    loading,
    isOnline,
    updateProfile,
    addMember,
    addCondition,
    signOut,
    refresh: loadData,
  };
}
