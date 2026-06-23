import { describe, expect, it } from "vitest";

import {
  createLargeFamilyTreeLayout,
  shouldUseLargeFamilyMode,
  type LargeLayoutConnection,
  type LargeLayoutMember,
} from "../large-family-layout";

function member(id: string, x: number, y: number, generation: number, gender: "female" | "male" | null = null): LargeLayoutMember {
  return {
    profile: { id, gender },
    x,
    y,
    generation,
  };
}

describe("large family layout", () => {
  it("wraps oversized generation rows into a narrower canvas", () => {
    const members = [
      member("root", 4000, 90, 1),
      ...Array.from({ length: 27 }, (_, index) => member(`m-${index}`, index * 336 + 520, 360, 0)),
    ];

    const layout = createLargeFamilyTreeLayout(members, [], { maxLineWidth: 1500 });

    expect(shouldUseLargeFamilyMode({ members, canvasWidth: 9592, viewportWidth: 1280 })).toBe(true);
    expect(layout.maxRowCount).toBe(27);
    expect(layout.width).toBeLessThan(9592);
    expect(layout.height).toBeGreaterThan(560);
    expect(new Set(layout.members.filter((item) => item.generation === 0).map((item) => item.y)).size).toBeGreaterThan(1);
  });

  it("keeps same-row spouses adjacent while wrapping", () => {
    const members = [
      member("a", 0, 90, 0, "male"),
      member("b", 140, 90, 0, "female"),
      ...Array.from({ length: 16 }, (_, index) => member(`single-${index}`, 500 + index * 260, 90, 0)),
    ];
    const connections: LargeLayoutConnection[] = [
      { from: "a", to: "b", type: "spouse" },
    ];

    const layout = createLargeFamilyTreeLayout(members, connections, { maxLineWidth: 900 });
    const byId = new Map(layout.members.map((item) => [item.profile.id, item]));
    const a = byId.get("a")!;
    const b = byId.get("b")!;

    expect(a.y).toBe(b.y);
    expect(Math.abs(a.x - b.x)).toBe(148);
  });
});
