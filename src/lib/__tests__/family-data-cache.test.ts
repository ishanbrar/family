import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  FAMILY_DATA_STALE_TIME_MS,
  clearPersistedFamilyData,
  isFamilyDataCacheFresh,
  loadPersistedFamilyData,
  savePersistedFamilyData,
  type PersistedFamilyData,
} from "../family-data-cache";

describe("family data cache freshness", () => {
  it("keeps a fresh family bundle from refetching on route changes", () => {
    const now = 1_000_000;

    expect(isFamilyDataCacheFresh(now - FAMILY_DATA_STALE_TIME_MS + 1, now)).toBe(true);
  });

  it("marks the family bundle stale at the configured stale time", () => {
    const now = 1_000_000;

    expect(isFamilyDataCacheFresh(now - FAMILY_DATA_STALE_TIME_MS, now)).toBe(false);
  });
});

class MemoryStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
  raw(): Map<string, string> {
    return this.store;
  }
}

function sampleData(overrides: Partial<PersistedFamilyData> = {}): PersistedFamilyData {
  return {
    viewer: { id: "viewer-1", first_name: "Ada", last_name: "Lovelace" } as never,
    family: { id: "fam-1", name: "Lovelace", invite_code: "LOVE1234" } as never,
    inviteCodes: [],
    auditLogs: [],
    members: [{ id: "viewer-1", first_name: "Ada", last_name: "Lovelace" } as never],
    relationships: [],
    isOnline: true,
    familyId: "fam-1",
    updatedAt: 1_700_000_000_000,
    ...overrides,
  };
}

describe("persistent on-device family cache", () => {
  let storage: MemoryStorage;

  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as { window?: unknown }).window = { localStorage: storage };
  });

  afterEach(() => {
    delete (globalThis as { window?: unknown }).window;
  });

  it("round-trips a saved bundle for the active device user", () => {
    savePersistedFamilyData("viewer-1", sampleData());

    const loaded = loadPersistedFamilyData();
    expect(loaded?.userKey).toBe("viewer-1");
    expect(loaded?.data.familyId).toBe("fam-1");
    expect(loaded?.data.members).toHaveLength(1);
  });

  it("never persists medical or genetic fields (type-enforced subset)", () => {
    savePersistedFamilyData("viewer-1", sampleData());

    const raw = storage.getItem("legatree_family_cache:viewer-1") ?? "";
    expect(raw).not.toContain("userConditions");
    expect(raw).not.toContain("conditions");
  });

  it("returns null when there is no active user pointer", () => {
    expect(loadPersistedFamilyData()).toBeNull();
  });

  it("discards a bundle written under an older cache version", () => {
    storage.setItem("legatree_family_cache_active", "viewer-1");
    storage.setItem(
      "legatree_family_cache:viewer-1",
      JSON.stringify({ ...sampleData(), version: 0, userKey: "viewer-1" })
    );

    expect(loadPersistedFamilyData()).toBeNull();
    expect(storage.getItem("legatree_family_cache:viewer-1")).toBeNull();
  });

  it("clears every persisted bundle and the active pointer on sign-out", () => {
    savePersistedFamilyData("viewer-1", sampleData());
    savePersistedFamilyData("viewer-2", sampleData({ viewer: { id: "viewer-2" } as never }));

    clearPersistedFamilyData();

    expect(loadPersistedFamilyData()).toBeNull();
    expect(storage.raw().size).toBe(0);
  });
});
