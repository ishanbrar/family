"use client";

import { useState } from "react";

import royalDemoData from "./royal-demo-data.json";
import {
  MOCK_CONDITIONS,
  MOCK_PROFILES,
  MOCK_RELATIONSHIPS,
  MOCK_USER_CONDITIONS,
} from "./mock-data";
import type { MedicalCondition, Profile, Relationship, UserCondition } from "./types";

export type DemoFamilyKey = "montague" | "windsor";

export interface DemoFamilyData {
  key: DemoFamilyKey;
  label: string;
  shortLabel: string;
  treeTitle: string;
  exportFamilyName: string;
  description: string;
  profiles: Profile[];
  relationships: Relationship[];
  conditions: MedicalCondition[];
  userConditions: UserCondition[];
}

export const DEMO_FAMILY_STORAGE_KEY = "legatree_demo_family";

const royalProfiles = [...(royalDemoData.profiles as Profile[])].sort((a, b) => {
  if (a.display_name === "Prince Harry, Duke of Sussex") return -1;
  if (b.display_name === "Prince Harry, Duke of Sussex") return 1;
  return 0;
});
const royalRelationships = royalDemoData.relationships as Relationship[];

export const DEMO_FAMILY_OPTIONS: Array<Pick<DemoFamilyData, "key" | "label" | "description">> = [
  {
    key: "montague",
    label: "Montague Family",
    description: "A fictional multi-generation family with health records, pets, galleries, and global movement.",
  },
  {
    key: "windsor",
    label: "Royal Family (Windsor)",
    description: "A public-figure example family built around Prince Harry, Diana, Charles, and the wider Windsors.",
  },
];

export function resolveDemoFamilyKey(value: string | null | undefined): DemoFamilyKey | null {
  if (value === "windsor" || value === "royal") return "windsor";
  if (value === "montague") return "montague";
  return null;
}

export function getDemoFamilyData(key: DemoFamilyKey): DemoFamilyData {
  if (key === "windsor") {
    return {
      key: "windsor",
      label: "Royal Family (Windsor)",
      shortLabel: "Windsor",
      treeTitle: "The Windsor Royal Family Tree",
      exportFamilyName: "Royal Family (Windsor)",
      description: "A public-figure example family centered on Prince Harry as the signed-in demo user.",
      profiles: royalProfiles,
      relationships: royalRelationships,
      conditions: MOCK_CONDITIONS,
      userConditions: [],
    };
  }

  return {
    key: "montague",
    label: "Montague Family",
    shortLabel: "Montague",
    treeTitle: "The Montague Family Tree",
    exportFamilyName: "Montague Family",
    description: "A fictional multi-generation sample family with rich health and location data.",
    profiles: MOCK_PROFILES,
    relationships: MOCK_RELATIONSHIPS,
    conditions: MOCK_CONDITIONS,
    userConditions: MOCK_USER_CONDITIONS,
  };
}

export function setStoredDemoFamily(key: DemoFamilyKey): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_FAMILY_STORAGE_KEY, key);
}

function getInitialDemoFamilyKey(): DemoFamilyKey {
  if (typeof window === "undefined") return "montague";

  const requested = resolveDemoFamilyKey(new URLSearchParams(window.location.search).get("family"));
  if (requested) {
    setStoredDemoFamily(requested);
    return requested;
  }

  return resolveDemoFamilyKey(window.localStorage.getItem(DEMO_FAMILY_STORAGE_KEY)) ?? "montague";
}

export function useSelectedDemoFamily(): DemoFamilyData {
  const [key] = useState<DemoFamilyKey>(() => getInitialDemoFamilyKey());

  return getDemoFamilyData(key);
}
