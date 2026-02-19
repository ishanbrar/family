import { describe, expect, it } from "vitest";

import { createFamilyTreeLayout } from "../tree-layout";
import type { Profile, Relationship } from "../types";

const NOW = new Date().toISOString();

function profile(id: string, first: string, last: string, gender: Profile["gender"], displayName: string | null = null): Profile {
  return {
    id,
    first_name: first,
    last_name: last,
    display_name: displayName,
    gender,
    avatar_url: null,
    date_of_birth: null,
    place_of_birth: null,
    profession: null,
    location_city: null,
    location_lat: null,
    location_lng: null,
    pets: [],
    social_links: {},
    about_me: null,
    country_code: null,
    role: "MEMBER",
    is_alive: true,
    created_at: NOW,
    updated_at: NOW,
  };
}

function rel(id: string, user: string, relative: string, type: Relationship["type"]): Relationship {
  return { id, user_id: user, relative_id: relative, type, created_at: NOW };
}

describe("pedigree layout constraints", () => {
  it("keeps JJ adjacent to ME on maternal side with orthogonal pedigree edges", () => {
    const members: Profile[] = [
      profile("pgf", "Paternal", "Grandpa", "male"),
      profile("pgm", "Paternal", "Grandma", "female"),
      profile("mgf", "Maternal", "Grandpa", "male"),
      profile("mgm", "Maternal", "Grandma", "female"),
      profile("dad", "Dad", "Smith", "male"),
      profile("me", "Mom", "Smith", "female", "ME"),
      profile("jj", "Aunt", "Jones", "female", "JJ"),
      profile("jh", "AuntSpouse", "Jones", "male"),
      profile("ego", "Child", "Smith", "male"),
      profile("cousin", "Cousin", "Jones", "female"),
    ];

    const relationships: Relationship[] = [
      rel("r1", "pgf", "dad", "parent"),
      rel("r2", "pgm", "dad", "parent"),
      rel("r3", "mgf", "me", "parent"),
      rel("r4", "mgm", "me", "parent"),
      rel("r5", "mgf", "jj", "parent"),
      rel("r6", "mgm", "jj", "parent"),
      rel("r7", "dad", "me", "spouse"),
      rel("r8", "me", "ego", "parent"),
      rel("r9", "dad", "ego", "parent"),
      rel("r10", "jj", "jh", "spouse"),
      rel("r11", "jj", "cousin", "parent"),
      rel("r12", "jh", "cousin", "parent"),
    ];

    const tree = createFamilyTreeLayout(members, relationships, "ego");
    const byId = new Map(tree.nodes.map((n) => [n.profile.id, n]));
    const me = byId.get("me");
    const jj = byId.get("jj");
    expect(me).toBeTruthy();
    expect(jj).toBeTruthy();
    if (!me || !jj) return;

    expect(me.y).toBe(jj.y);
    expect(Math.abs(me.x - jj.x)).toBeLessThanOrEqual(520);
    expect(jj.x).toBeGreaterThan(tree.width * 0.58);

    const yByGeneration = new Map<number, number>();
    for (const node of tree.nodes) {
      const existing = yByGeneration.get(node.generation);
      if (existing == null) yByGeneration.set(node.generation, node.y);
      else expect(node.y).toBe(existing);
    }

    const segments: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
    for (const conn of tree.connections) {
      if (conn.type !== "spouse") continue;
      const a = byId.get(conn.from);
      const b = byId.get(conn.to);
      if (!a || !b) continue;
      segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
    }
    for (const sib of tree.sibships) {
      const parents = sib.parents.map((id) => byId.get(id)).filter(Boolean);
      const children = sib.children.map((id) => byId.get(id)).filter(Boolean);
      if (parents.length === 0 || children.length === 0) continue;
      const topY = Math.max(...parents.map((p) => p!.y));
      const bottomY = Math.min(...children.map((c) => c!.y));
      const midX =
        (Math.min(...parents.map((p) => p!.x)) +
          Math.max(...parents.map((p) => p!.x)) +
          Math.min(...children.map((c) => c!.x)) +
          Math.max(...children.map((c) => c!.x))) /
        4;
      const barY = (topY + bottomY) / 2;
      if (parents.length >= 2) {
        segments.push({
          x1: Math.min(...parents.map((p) => p!.x)),
          y1: topY,
          x2: Math.max(...parents.map((p) => p!.x)),
          y2: topY,
        });
      }
      for (const p of parents) {
        segments.push({ x1: p!.x, y1: p!.y + 40, x2: p!.x, y2: topY });
      }
      segments.push({ x1: midX, y1: topY, x2: midX, y2: barY });
      segments.push({
        x1: Math.min(...children.map((c) => c!.x)),
        y1: barY,
        x2: Math.max(...children.map((c) => c!.x)),
        y2: barY,
      });
      for (const c of children) {
        segments.push({ x1: c!.x, y1: barY, x2: c!.x, y2: c!.y - 40 });
      }
    }

    expect(segments.length).toBeGreaterThan(0);
    for (const s of segments) {
      expect(s.x1 === s.x2 || s.y1 === s.y2).toBe(true);
    }
  });
});
