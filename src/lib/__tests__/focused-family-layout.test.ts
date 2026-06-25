import { describe, expect, it } from "vitest";

import { createFocusedFamilyScope, createFocusedFamilyTreeLayout } from "../focused-family-layout";
import royalDemoData from "../royal-demo-data.json";
import type { Profile, Relationship, RelationshipType } from "../types";

function profile(id: string, gender: "female" | "male" | null = null): Profile {
  return {
    id,
    auth_user_id: null,
    name_prefix: null,
    first_name: id,
    middle_name: null,
    last_name: "Test",
    display_name: null,
    gender,
    avatar_url: null,
    date_of_birth: null,
    date_of_death: null,
    place_of_birth: null,
    profession: null,
    location_city: null,
    secondary_location_city: null,
    address: null,
    location_lat: null,
    location_lng: null,
    pets: [],
    social_links: {},
    about_me: null,
    country_code: null,
    gallery_photos: [],
    role: "MEMBER",
    is_alive: true,
    family_id: "family",
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}

let relIndex = 0;
function rel(userId: string, relativeId: string, type: RelationshipType): Relationship {
  relIndex += 1;
  return {
    id: `rel-${relIndex}`,
    user_id: userId,
    relative_id: relativeId,
    type,
    created_at: "2026-01-01T00:00:00.000Z",
  };
}

describe("focused family layout", () => {
  it("includes close relatives, first cousins plus kids, and spouses", () => {
    const members = [
      "pov",
      "dad",
      "mom",
      "grandpa",
      "grandma",
      "aunt",
      "aunt-spouse",
      "cousin",
      "cousin-spouse",
      "cousin-child",
      "sibling",
      "sibling-spouse",
      "niece",
      "spouse",
      "child",
      "grandchild",
      "unrelated",
    ].map((id) => profile(id));
    const relationships = [
      rel("dad", "pov", "parent"),
      rel("mom", "pov", "parent"),
      rel("grandpa", "dad", "parent"),
      rel("grandma", "dad", "parent"),
      rel("grandpa", "aunt", "parent"),
      rel("grandma", "aunt", "parent"),
      rel("aunt", "aunt-spouse", "spouse"),
      rel("aunt", "cousin", "parent"),
      rel("cousin", "cousin-spouse", "spouse"),
      rel("cousin", "cousin-child", "parent"),
      rel("dad", "sibling", "parent"),
      rel("sibling", "sibling-spouse", "spouse"),
      rel("sibling", "niece", "parent"),
      rel("pov", "spouse", "spouse"),
      rel("pov", "child", "parent"),
      rel("child", "grandchild", "parent"),
    ];

    const scope = createFocusedFamilyScope(members, relationships, "pov");

    expect(scope.memberIds).toEqual(
      new Set([
        "pov",
        "dad",
        "mom",
        "grandpa",
        "grandma",
        "aunt",
        "aunt-spouse",
        "cousin",
        "cousin-spouse",
        "cousin-child",
        "sibling",
        "sibling-spouse",
        "niece",
        "spouse",
        "child",
        "grandchild",
      ])
    );
    expect(scope.memberIds.has("unrelated")).toBe(false);
  });

  it("places ancestors above and descendants below the selected person", () => {
    const members = ["pov", "parent", "grandparent", "spouse", "child", "grandchild"].map((id) => profile(id));
    const relationships = [
      rel("grandparent", "parent", "parent"),
      rel("parent", "pov", "parent"),
      rel("pov", "spouse", "spouse"),
      rel("pov", "child", "parent"),
      rel("child", "grandchild", "parent"),
    ];

    const layout = createFocusedFamilyTreeLayout(members, relationships, "pov");
    const byId = new Map(layout.nodes.map((node) => [node.profile.id, node]));

    expect(byId.get("grandparent")!.y).toBeLessThan(byId.get("parent")!.y);
    expect(byId.get("parent")!.y).toBeLessThan(byId.get("pov")!.y);
    expect(byId.get("child")!.y).toBeGreaterThan(byId.get("pov")!.y);
    expect(byId.get("grandchild")!.y).toBeGreaterThan(byId.get("child")!.y);
    expect(byId.get("spouse")!.y).toBe(byId.get("pov")!.y);
  });

  it("keeps POV parents adjacent even when each parent is anchored to a different ancestor branch", () => {
    const members = [
      profile("pov"),
      profile("father", "male"),
      profile("mother", "female"),
      profile("paternal-grandfather", "male"),
      profile("paternal-grandmother", "female"),
      profile("maternal-grandfather", "male"),
      profile("maternal-grandmother", "female"),
      profile("paternal-uncle", "male"),
      profile("maternal-aunt", "female"),
    ];
    const relationships = [
      rel("father", "pov", "parent"),
      rel("mother", "pov", "parent"),
      rel("paternal-grandfather", "father", "parent"),
      rel("paternal-grandmother", "father", "parent"),
      rel("paternal-grandfather", "paternal-uncle", "parent"),
      rel("paternal-grandmother", "paternal-uncle", "parent"),
      rel("maternal-grandfather", "mother", "parent"),
      rel("maternal-grandmother", "mother", "parent"),
      rel("maternal-grandfather", "maternal-aunt", "parent"),
      rel("maternal-grandmother", "maternal-aunt", "parent"),
    ];

    const layout = createFocusedFamilyTreeLayout(members, relationships, "pov");
    const byId = new Map(layout.nodes.map((node) => [node.profile.id, node]));
    const father = byId.get("father")!;
    const mother = byId.get("mother")!;
    const pov = byId.get("pov")!;

    expect(father.y).toBe(mother.y);
    expect(Math.abs(father.x - mother.x)).toBeLessThanOrEqual(160);
    expect(Math.abs((father.x + mother.x) / 2 - pov.x)).toBeLessThanOrEqual(260);
  });

  it("centers the focused person's parents over the focused person after placing wider cousin rows", () => {
    const members = [
      profile("pov"),
      profile("father", "male"),
      profile("mother", "female"),
      profile("paternal-grandfather", "male"),
      profile("paternal-grandmother", "female"),
      profile("maternal-grandfather", "male"),
      profile("maternal-grandmother", "female"),
      profile("paternal-uncle", "male"),
      profile("maternal-aunt", "female"),
      profile("paternal-cousin"),
      profile("maternal-cousin-a"),
      profile("maternal-cousin-b"),
    ];
    const relationships = [
      rel("father", "pov", "parent"),
      rel("mother", "pov", "parent"),
      rel("paternal-grandfather", "father", "parent"),
      rel("paternal-grandmother", "father", "parent"),
      rel("paternal-grandfather", "paternal-uncle", "parent"),
      rel("paternal-grandmother", "paternal-uncle", "parent"),
      rel("paternal-uncle", "paternal-cousin", "parent"),
      rel("maternal-grandfather", "mother", "parent"),
      rel("maternal-grandmother", "mother", "parent"),
      rel("maternal-grandfather", "maternal-aunt", "parent"),
      rel("maternal-grandmother", "maternal-aunt", "parent"),
      rel("maternal-aunt", "maternal-cousin-a", "parent"),
      rel("maternal-aunt", "maternal-cousin-b", "parent"),
    ];

    const layout = createFocusedFamilyTreeLayout(members, relationships, "pov");
    const byId = new Map(layout.nodes.map((node) => [node.profile.id, node]));
    const father = byId.get("father")!;
    const mother = byId.get("mother")!;
    const pov = byId.get("pov")!;
    const povSibship = layout.sibships.find((sibship) => sibship.children.includes("pov"));

    expect(father.y).toBeLessThan(pov.y);
    expect(father.y).toBe(mother.y);
    expect(Math.abs(father.x - mother.x)).toBeLessThanOrEqual(160);
    expect(Math.abs((father.x + mother.x) / 2 - pov.x)).toBeLessThanOrEqual(1);
    expect(new Set(povSibship?.parents)).toEqual(new Set(["father", "mother"]));
  });

  it("keeps the Windsor close-family fixture readable when the focused scope is broad", () => {
    const members = royalDemoData.profiles as Profile[];
    const relationships = royalDemoData.relationships as Relationship[];
    const harry = members.find((member) => member.display_name === "Prince Harry, Duke of Sussex");
    expect(harry).toBeTruthy();

    const layout = createFocusedFamilyTreeLayout(members, relationships, harry!.id);
    const byDisplayName = new Map(layout.nodes.map((node) => [node.profile.display_name, node]));
    const harryNode = byDisplayName.get("Prince Harry, Duke of Sussex")!;
    const meghanNode = byDisplayName.get("Meghan, Duchess of Sussex")!;
    const charlesNode = byDisplayName.get("King Charles III")!;
    const archieNode = byDisplayName.get("Prince Archie of Sussex")!;
    const beatriceChild = byDisplayName.get("Sienna Mapelli Mozzi")!;

    expect(layout.nodes.length).toBe(members.length);
    expect(meghanNode.y).toBe(harryNode.y);
    expect(charlesNode.y).toBeLessThan(harryNode.y);
    expect(archieNode.y).toBeGreaterThan(harryNode.y);
    expect(beatriceChild.y).toBe(archieNode.y);

    const rows = new Map<number, typeof layout.nodes>();
    for (const node of layout.nodes) {
      if (!rows.has(node.y)) rows.set(node.y, []);
      rows.get(node.y)!.push(node);
    }
    for (const row of rows.values()) {
      const sorted = [...row].sort((a, b) => a.x - b.x);
      for (let index = 1; index < sorted.length; index += 1) {
        expect(sorted[index].x - sorted[index - 1].x).toBeGreaterThanOrEqual(150);
      }
    }
  });
});
