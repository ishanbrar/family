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

  it("keeps spouses on the same row after birth-year refinement changes one partner", () => {
    const members: Profile[] = [
      {
        ...profile("viewer", "Viewer", "Person", "male"),
        role: "ADMIN",
        date_of_birth: "2002-01-01",
      },
      {
        ...profile("ian", "Ian", "Shields", "male"),
        date_of_birth: "1959-01-01",
      },
      profile("jasmine", "Jasmine", "Mann", "female"),
    ];

    const relationships: Relationship[] = [
      rel("r1", "viewer", "ian", "sibling"),
      rel("r2", "ian", "jasmine", "spouse"),
    ];

    const tree = createFamilyTreeLayout(members, relationships, "viewer");
    const byId = new Map(tree.nodes.map((n) => [n.profile.id, n]));
    const ian = byId.get("ian");
    const jasmine = byId.get("jasmine");

    expect(ian).toBeTruthy();
    expect(jasmine).toBeTruthy();
    if (!ian || !jasmine) return;

    expect(ian.generation).toBe(jasmine.generation);
    expect(ian.y).toBe(jasmine.y);
    expect(
      tree.connections.some(
        (conn) =>
          conn.type === "spouse" &&
          ((conn.from === "ian" && conn.to === "jasmine") ||
            (conn.from === "jasmine" && conn.to === "ian"))
      )
    ).toBe(true);
  });

  it("creates a sibling rail when siblings do not have parents in the tree", () => {
    const members: Profile[] = [
      profile("viewer", "Viewer", "Brar", "male"),
      profile("sibling", "Sibling", "Brar", "male"),
    ];
    const relationships: Relationship[] = [
      rel("r1", "viewer", "sibling", "sibling"),
    ];

    const tree = createFamilyTreeLayout(members, relationships, "viewer");

    expect(tree.sibships).toContainEqual({
      parents: [],
      children: ["viewer", "sibling"],
    });
  });

  it("keeps Brar-style spouse units adjacent with children under the correct couple", () => {
    const members: Profile[] = [
      { ...profile("kuldeep", "Kuldeep", "Brar", "male"), date_of_birth: "1934-01-01" },
      { ...profile("rajwant", "Rajwant", "Brar", "female"), date_of_birth: "1936-01-01" },
      { ...profile("sarup", "Sarup", "Singh", "male"), date_of_birth: "1935-01-01" },
      { ...profile("gill", "Grandmother", "Gill", "female"), date_of_birth: "1937-01-01" },
      { ...profile("rajdeep", "Rajdeep", "Brar", "male"), date_of_birth: "1961-01-01" },
      { ...profile("nikki", "Nikki", "Brar", "female"), date_of_birth: "1968-01-01" },
      { ...profile("ian", "Ian", "Shields", "male"), date_of_birth: "1959-01-01" },
      { ...profile("jasmine", "Jasmine", "Mann", "female"), date_of_birth: "1964-01-01" },
      { ...profile("ajeet", "Ajeet", "Mann", "male"), date_of_birth: "1971-01-01" },
      { ...profile("nita", "Nita", "Mann", "female"), date_of_birth: "1972-01-01" },
      { ...profile("sanjeet", "Sanjeet", "Brar", "male"), role: "ADMIN", date_of_birth: "2003-01-01" },
      { ...profile("ishan", "Ishan", "Brar", "male"), date_of_birth: "2004-01-01" },
      { ...profile("serena", "Serena", "Mann", "female"), date_of_birth: "2001-01-01" },
      { ...profile("kai", "Kai", "Mann", "male"), date_of_birth: "2005-01-01" },
      { ...profile("alena", "Alena", "Mann", "female"), date_of_birth: "2007-01-01" },
      { ...profile("narinder", "Narinder", "Toor", "male"), date_of_birth: "1965-01-01" },
      { ...profile("pammi", "Pammi", "Toor", "female"), date_of_birth: "1967-01-01" },
      { ...profile("pawan", "Pawan", "Sekhon", "male"), date_of_birth: "1968-01-01" },
      { ...profile("babli", "Babli", "Sekhon", "female"), date_of_birth: "1970-01-01" },
      { ...profile("deepi", "Deepi", "Toor", "male"), date_of_birth: "1995-01-01" },
      { ...profile("jashan", "Jashan", "Toor", "female"), date_of_birth: "1996-01-01" },
      { ...profile("jugnu", "Jugnu", "Ghuman", "female"), date_of_birth: "1997-01-01" },
      { ...profile("monu", "Monu", "Dhillon", "female"), date_of_birth: "1999-01-01" },
      { ...profile("yashvir", "Yashvir", "Sekhon", "male"), date_of_birth: "1998-01-01" },
      { ...profile("jasleen", "Jasleen", "Sekhon", "female"), date_of_birth: "2001-01-01" },
      { ...profile("harket", "Harket", "Ghuman", "male"), date_of_birth: "2020-01-01" },
      { ...profile("viraj", "Viraj", "Ghuman", "male"), date_of_birth: "2022-01-01" },
      { ...profile("veer", "Veer", "Dhillon", "male"), date_of_birth: "2023-01-01" },
    ];

    const relationships: Relationship[] = [
      rel("r1", "kuldeep", "rajdeep", "parent"),
      rel("r2", "rajwant", "rajdeep", "parent"),
      rel("r3", "sarup", "nikki", "parent"),
      rel("r4", "gill", "nikki", "parent"),
      rel("r5", "sarup", "ian", "parent"),
      rel("r6", "gill", "ian", "parent"),
      rel("r7", "sarup", "ajeet", "parent"),
      rel("r8", "gill", "ajeet", "parent"),
      rel("r9", "rajdeep", "nikki", "spouse"),
      rel("r10", "ian", "jasmine", "spouse"),
      rel("r11", "ajeet", "nita", "spouse"),
      rel("r12", "rajdeep", "sanjeet", "parent"),
      rel("r13", "nikki", "sanjeet", "parent"),
      rel("r14", "rajdeep", "ishan", "parent"),
      rel("r15", "nikki", "ishan", "parent"),
      rel("r16", "ajeet", "serena", "parent"),
      rel("r17", "nita", "serena", "parent"),
      rel("r18", "ajeet", "kai", "parent"),
      rel("r19", "nita", "kai", "parent"),
      rel("r20", "ajeet", "alena", "parent"),
      rel("r21", "nita", "alena", "parent"),
      rel("r22", "sarup", "pammi", "parent"),
      rel("r23", "gill", "pammi", "parent"),
      rel("r24", "sarup", "babli", "parent"),
      rel("r25", "gill", "babli", "parent"),
      rel("r26", "narinder", "pammi", "spouse"),
      rel("r27", "pawan", "babli", "spouse"),
      rel("r28", "pammi", "deepi", "parent"),
      rel("r29", "pammi", "jugnu", "parent"),
      rel("r30", "pammi", "monu", "parent"),
      rel("r31", "deepi", "jashan", "spouse"),
      rel("r32", "babli", "yashvir", "parent"),
      rel("r33", "babli", "jasleen", "parent"),
      rel("r34", "jugnu", "harket", "parent"),
      rel("r35", "jugnu", "viraj", "parent"),
      rel("r36", "monu", "veer", "parent"),
    ];

    const tree = createFamilyTreeLayout(members, relationships, "sanjeet");
    const byId = new Map(tree.nodes.map((n) => [n.profile.id, n]));
    const pair = (a: string, b: string) => {
      const first = byId.get(a);
      const second = byId.get(b);
      expect(first).toBeTruthy();
      expect(second).toBeTruthy();
      if (!first || !second) throw new Error(`Missing ${a}/${b}`);
      expect(first.y).toBe(second.y);
      expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(180);
      return { first, second, center: (first.x + second.x) / 2 };
    };

    const rajdeepNikki = pair("rajdeep", "nikki");
    const ianJasmine = pair("ian", "jasmine");
    const ajeetNita = pair("ajeet", "nita");
    pair("narinder", "pammi");
    pair("pawan", "babli");

    const ishan = byId.get("ishan")!;
    const sanjeet = byId.get("sanjeet")!;
    const brarChildCenter = (ishan.x + sanjeet.x) / 2;
    expect(Math.abs(brarChildCenter - rajdeepNikki.center)).toBeLessThanOrEqual(150);
    expect(
      ishan.x > Math.min(ianJasmine.first.x, ianJasmine.second.x) &&
        ishan.x < Math.max(ianJasmine.first.x, ianJasmine.second.x)
    ).toBe(false);

    const mannChildCenter =
      (byId.get("serena")!.x + byId.get("kai")!.x + byId.get("alena")!.x) / 3;
    expect(Math.abs(mannChildCenter - ajeetNita.center)).toBeLessThanOrEqual(230);

    const pammiChildren = ["deepi", "jugnu", "monu"].map((id) => byId.get(id)!.x);
    const babliChildren = ["yashvir", "jasleen"].map((id) => byId.get(id)!.x);
    expect(
      Math.max(...pammiChildren) < Math.min(...babliChildren) ||
        Math.max(...babliChildren) < Math.min(...pammiChildren)
    ).toBe(true);

    const jugnuChildren = ["harket", "viraj"].map((id) => byId.get(id)!.x);
    const veer = byId.get("veer")!;
    expect(
      veer.x > Math.min(...jugnuChildren) &&
        veer.x < Math.max(...jugnuChildren)
    ).toBe(false);

    expect(tree.sibships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          parents: expect.arrayContaining(["rajdeep", "nikki"]),
          children: expect.arrayContaining(["ishan", "sanjeet"]),
        }),
        expect.objectContaining({
          parents: expect.arrayContaining(["ajeet", "nita"]),
          children: expect.arrayContaining(["serena", "kai", "alena"]),
        }),
        expect.objectContaining({
          parents: expect.arrayContaining(["pammi"]),
          children: expect.arrayContaining(["deepi", "jugnu", "monu"]),
          railStyle: "stems",
        }),
        expect.objectContaining({
          parents: expect.arrayContaining(["babli"]),
          children: expect.arrayContaining(["yashvir", "jasleen"]),
          railStyle: "stems",
        }),
        expect.objectContaining({
          parents: expect.arrayContaining(["jugnu"]),
          children: expect.arrayContaining(["harket", "viraj"]),
          railStyle: "stems",
        }),
        expect.objectContaining({
          parents: expect.arrayContaining(["monu"]),
          children: expect.arrayContaining(["veer"]),
          railStyle: "stems",
        }),
      ])
    );
  });
});
