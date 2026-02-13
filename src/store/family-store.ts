// ══════════════════════════════════════════════════════════
// Legacy – Zustand Family Store
// Manages viewer perspective, graph state, and profile edits
// ══════════════════════════════════════════════════════════

import { create } from "zustand";
import type {
  Profile,
  Relationship,
  UserCondition,
  MedicalCondition,
  GeneticMatchResult,
} from "@/lib/types";
import { calculateGeneticMatch } from "@/lib/genetic-match";

interface FamilyState {
  // Viewer
  viewer: Profile | null;
  setViewer: (profile: Profile | null) => void;
  updateViewer: (updates: Partial<Profile>) => void;

  // Members
  members: Profile[];
  setMembers: (members: Profile[]) => void;

  // Relationships
  relationships: Relationship[];
  setRelationships: (relationships: Relationship[]) => void;

  // Selected member
  selectedMember: Profile | null;
  setSelectedMember: (member: Profile | null) => void;

  // "Related By" filter – which member to filter blood relatives for
  relatedByFilter: string | null;
  setRelatedByFilter: (memberId: string | null) => void;

  // Conditions
  conditions: MedicalCondition[];
  setConditions: (conditions: MedicalCondition[]) => void;

  userConditions: Map<string, UserCondition[]>;
  setUserConditions: (userId: string, conditions: UserCondition[]) => void;

  highlightedCondition: string | null;
  setHighlightedCondition: (conditionId: string | null) => void;

  // Computed
  getGeneticMatch: (targetId: string) => GeneticMatchResult;
  getMembersWithCondition: (conditionId: string) => string[];

  // Add new member + relationship
  addMember: (member: Profile) => void;
  addRelationship: (relationship: Relationship) => void;

  // Command palette
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  commandOpen: boolean;
  setCommandOpen: (open: boolean) => void;
}

export const useFamilyStore = create<FamilyState>((set, get) => ({
  viewer: null,
  setViewer: (profile) => set({ viewer: profile }),
  updateViewer: (updates) =>
    set((state) => {
      if (!state.viewer) return state;
      const updated = { ...state.viewer, ...updates, updated_at: new Date().toISOString() };
      // Also update the member in the members array
      const members = state.members.map((m) =>
        m.id === updated.id ? updated : m
      );
      return { viewer: updated, members };
    }),

  members: [],
  setMembers: (members) => set({ members }),

  relationships: [],
  setRelationships: (relationships) => set({ relationships }),

  selectedMember: null,
  setSelectedMember: (member) => set({ selectedMember: member }),

  relatedByFilter: null,
  setRelatedByFilter: (memberId) => set({ relatedByFilter: memberId }),

  conditions: [],
  setConditions: (conditions) => set({ conditions }),

  userConditions: new Map(),
  setUserConditions: (userId, conditions) =>
    set((state) => {
      const updated = new Map(state.userConditions);
      updated.set(userId, conditions);
      return { userConditions: updated };
    }),

  highlightedCondition: null,
  setHighlightedCondition: (conditionId) =>
    set({ highlightedCondition: conditionId }),

  getGeneticMatch: (targetId) => {
    const state = get();
    if (!state.viewer) {
      return { percentage: 0, relationship: "Unknown", path: [] };
    }
    return calculateGeneticMatch(state.viewer.id, targetId, state.relationships);
  },

  getMembersWithCondition: (conditionId) => {
    const state = get();
    const memberIds: string[] = [];
    for (const [userId, conditions] of state.userConditions) {
      if (conditions.some((c) => c.condition_id === conditionId)) {
        memberIds.push(userId);
      }
    }
    return memberIds;
  },

  addMember: (member) =>
    set((state) => ({ members: [...state.members, member] })),
  addRelationship: (relationship) =>
    set((state) => ({ relationships: [...state.relationships, relationship] })),

  searchQuery: "",
  setSearchQuery: (query) => set({ searchQuery: query }),

  commandOpen: false,
  setCommandOpen: (open) => set({ commandOpen: open }),
}));
