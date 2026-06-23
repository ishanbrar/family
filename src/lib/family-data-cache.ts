import type { AuditLog, Profile, Relationship } from "@/lib/types";
import type { FamilyRecord, InviteCodeRecord } from "@/lib/supabase/db";

export const FAMILY_DATA_STALE_TIME_MS = 45_000;

export function isFamilyDataCacheFresh(
  updatedAt: number,
  now: number = Date.now(),
  staleTimeMs: number = FAMILY_DATA_STALE_TIME_MS
): boolean {
  return now - updatedAt < staleTimeMs;
}

// ── On-device persistent cache ──────────────────────────────
// The whole family bundle is persisted to localStorage so the tree renders
// instantly on app open (stale-while-revalidate) instead of refetching every
// session. Sensitive medical/genetic data (conditions + per-member condition
// assignments) is intentionally NOT persisted to disk — only structure, names,
// relationships, and photo URLs. Bump PERSISTED_FAMILY_CACHE_VERSION whenever
// the persisted shape changes so stale-shaped blobs are discarded after deploy.

const PERSISTED_FAMILY_CACHE_VERSION = 1;
const FAMILY_CACHE_KEY_PREFIX = "legatree_family_cache:";
const FAMILY_CACHE_ACTIVE_KEY = "legatree_family_cache_active";

/** Non-sensitive subset of the family bundle that is safe to keep on-device. */
export interface PersistedFamilyData {
  viewer: Profile | null;
  family: FamilyRecord | null;
  inviteCodes: InviteCodeRecord[];
  auditLogs: AuditLog[];
  members: Profile[];
  relationships: Relationship[];
  isOnline: boolean;
  familyId: string | null;
  updatedAt: number;
}

interface PersistedFamilyEnvelope extends PersistedFamilyData {
  version: number;
  userKey: string;
}

function storageKey(userKey: string): string {
  return `${FAMILY_CACHE_KEY_PREFIX}${userKey}`;
}

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Read the most recently persisted family bundle for the active device user.
 * Returns null when nothing valid is stored (missing, wrong version, corrupt).
 */
export function loadPersistedFamilyData(): { userKey: string; data: PersistedFamilyData } | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const userKey = storage.getItem(FAMILY_CACHE_ACTIVE_KEY);
    if (!userKey) return null;
    const raw = storage.getItem(storageKey(userKey));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedFamilyEnvelope;
    if (
      !parsed ||
      parsed.version !== PERSISTED_FAMILY_CACHE_VERSION ||
      parsed.userKey !== userKey
    ) {
      storage.removeItem(storageKey(userKey));
      return null;
    }
    const { version: _version, userKey: _userKey, ...data } = parsed;
    void _version;
    void _userKey;
    return { userKey, data };
  } catch {
    return null;
  }
}

/** Persist the non-sensitive family bundle for a given device user. */
export function savePersistedFamilyData(userKey: string, data: PersistedFamilyData): void {
  const storage = getStorage();
  if (!storage || !userKey) return;
  try {
    const envelope: PersistedFamilyEnvelope = {
      ...data,
      version: PERSISTED_FAMILY_CACHE_VERSION,
      userKey,
    };
    storage.setItem(storageKey(userKey), JSON.stringify(envelope));
    storage.setItem(FAMILY_CACHE_ACTIVE_KEY, userKey);
  } catch {
    // Quota or serialization failures are non-fatal: the in-memory cache and
    // network fetch still work, we just lose cross-session persistence.
  }
}

/** Remove all persisted family bundles (e.g. on sign-out). */
export function clearPersistedFamilyData(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(FAMILY_CACHE_KEY_PREFIX)) keys.push(key);
    }
    keys.forEach((key) => storage.removeItem(key));
    storage.removeItem(FAMILY_CACHE_ACTIVE_KEY);
  } catch {
    // ignore
  }
}
