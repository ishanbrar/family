export const FAMILY_DATA_STALE_TIME_MS = 45_000;

export function isFamilyDataCacheFresh(
  updatedAt: number,
  now: number = Date.now(),
  staleTimeMs: number = FAMILY_DATA_STALE_TIME_MS
): boolean {
  return now - updatedAt < staleTimeMs;
}
