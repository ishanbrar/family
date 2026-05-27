import { describe, expect, it } from "vitest";

import { calculateGeneticMatch } from "../genetic-match";
import type { Relationship } from "../types";

const NOW = "2026-05-27T00:00:00.000Z";

function rel(id: string, user: string, relative: string, type: Relationship["type"]): Relationship {
  return { id, user_id: user, relative_id: relative, type, created_at: NOW };
}

describe("genetic match relationship inheritance", () => {
  it("treats a parent's spouse as a parent and that spouse's parent as a grandparent", () => {
    const relationships: Relationship[] = [
      rel("r1", "father", "mother", "spouse"),
      rel("r2", "father", "viewer", "parent"),
      rel("r3", "grandfather", "mother", "parent"),
    ];

    expect(calculateGeneticMatch("viewer", "mother", relationships, "female").relationship).toBe("Mother");
    expect(calculateGeneticMatch("viewer", "grandfather", relationships, "male").relationship).toBe("Grandfather");
  });

  it("uses a plain-language label for a first cousin's spouse", () => {
    const relationships: Relationship[] = [
      rel("r1", "grandfather", "parent", "parent"),
      rel("r2", "grandfather", "aunt", "parent"),
      rel("r3", "parent", "viewer", "parent"),
      rel("r4", "aunt", "cousin", "parent"),
      rel("r5", "cousin", "cousin-spouse", "spouse"),
    ];

    expect(calculateGeneticMatch("viewer", "cousin-spouse", relationships, "male").relationship).toBe(
      "First Cousin's Spouse"
    );
  });
});
