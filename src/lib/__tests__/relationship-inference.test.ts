import { describe, expect, it } from "vitest";

import { inferRelationshipsForNewLink } from "../relationship-inference";
import type { Relationship } from "../types";

function rel(
  userId: string,
  relativeId: string,
  type: Relationship["type"]
): Relationship {
  return {
    id: `${userId}-${relativeId}-${type}`,
    user_id: userId,
    relative_id: relativeId,
    type,
    created_at: "2026-05-25T00:00:00.000Z",
  };
}

describe("relationship inference", () => {
  it("infers a spouse as co-parent when a parent-child link is added", () => {
    const relationships = [
      rel("alex", "emily", "spouse"),
      rel("alex", "child", "parent"),
    ];

    expect(
      inferRelationshipsForNewLink(relationships, "alex", "child", "parent")
    ).toEqual([
      { userId: "emily", relativeId: "child", type: "parent" },
    ]);
  });

  it("infers sibling links through shared parents after adding a child", () => {
    const relationships = [
      rel("alex", "existing-child", "parent"),
      rel("alex", "new-child", "parent"),
    ];

    expect(
      inferRelationshipsForNewLink(relationships, "alex", "new-child", "parent")
    ).toEqual([
      { userId: "new-child", relativeId: "existing-child", type: "sibling" },
    ]);
  });

  it("does not treat children of a sibling as siblings of the newly linked sibling", () => {
    const relationships = [
      rel("parent", "alex", "parent"),
      rel("sibling", "niece", "parent"),
      rel("alex", "sibling", "sibling"),
    ];

    expect(
      inferRelationshipsForNewLink(relationships, "alex", "sibling", "sibling")
    ).toEqual([
      { userId: "parent", relativeId: "sibling", type: "parent" },
    ]);
  });
});
