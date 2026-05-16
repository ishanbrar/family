import { describe, expect, it } from "vitest";
import {
  FAMILY_DATA_STALE_TIME_MS,
  isFamilyDataCacheFresh,
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
