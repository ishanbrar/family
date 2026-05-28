import { describe, expect, it } from "vitest";
import royalDemoData from "../royal-demo-data.json";
import { createRoyalDemoTreeLayout } from "../royal-demo-layout";
import type { Profile, Relationship } from "../types";

function nodeByDisplayName(layout: ReturnType<typeof createRoyalDemoTreeLayout>, name: string) {
  const node = layout.nodes.find((item) => item.profile.display_name === name);
  if (!node) throw new Error(`Missing layout node for ${name}`);
  return node;
}

describe("createRoyalDemoTreeLayout", () => {
  it("keeps Windsor demo children grouped under their own parents", () => {
    const layout = createRoyalDemoTreeLayout(
      royalDemoData.profiles as Profile[],
      royalDemoData.relationships as Relationship[]
    );

    const charles = nodeByDisplayName(layout, "King Charles III");
    const diana = nodeByDisplayName(layout, "Diana, Princess of Wales");
    const harry = nodeByDisplayName(layout, "Prince Harry, Duke of Sussex");
    const meghan = nodeByDisplayName(layout, "Meghan, Duchess of Sussex");
    const archie = nodeByDisplayName(layout, "Prince Archie of Sussex");
    const lilibet = nodeByDisplayName(layout, "Princess Lilibet of Sussex");
    const mia = nodeByDisplayName(layout, "Mia Tindall");
    const lena = nodeByDisplayName(layout, "Lena Tindall");
    const lucas = nodeByDisplayName(layout, "Lucas Tindall");

    expect(diana.y).toBe(charles.y);
    expect(Math.abs(diana.x - charles.x)).toBeLessThanOrEqual(240);
    expect(harry.y).toBe(meghan.y);
    expect(archie.y).toBe(lilibet.y);
    expect(archie.x).toBeGreaterThanOrEqual(harry.x);
    expect(lilibet.x).toBeLessThanOrEqual(meghan.x);
    expect(lena.x).toBeGreaterThan(lilibet.x + 800);
    expect([mia.y, lena.y, lucas.y]).toEqual([archie.y, archie.y, archie.y]);
    expect(lena.x).toBeGreaterThan(mia.x);
    expect(lena.x).toBeLessThan(lucas.x);
  });
});
