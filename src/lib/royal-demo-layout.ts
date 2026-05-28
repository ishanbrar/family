import type { Profile, Relationship } from "./types";
import type { TreeLayout, TreeLayoutSibship } from "./tree-layout";

const FAMILY_X: Record<string, number> = {
  "Prince Philip, Duke of Edinburgh": 1800,
  "Queen Elizabeth II": 2000,

  "King Charles III": 500,
  "Diana, Princess of Wales": 700,
  "Captain Mark Phillips": 1350,
  "Anne, Princess Royal": 1550,
  "Vice Admiral Sir Timothy Laurence": 1750,
  "Prince Andrew, Duke of York": 2350,
  "Sarah, Duchess of York": 2550,
  "Prince Edward, Duke of Edinburgh": 3250,
  "Sophie, Duchess of Edinburgh": 3450,

  "William, Prince of Wales": 260,
  "Catherine, Princess of Wales": 460,
  "Prince Harry, Duke of Sussex": 760,
  "Meghan, Duchess of Sussex": 960,
  "Peter Phillips": 1220,
  "Autumn Phillips": 1420,
  "Zara Tindall": 1700,
  "Mike Tindall": 1900,
  "Princess Beatrice": 2220,
  "Edoardo Mapelli Mozzi": 2420,
  "Princess Eugenie": 2720,
  "Jack Brooksbank": 2920,
  "Lady Louise Windsor": 3200,
  "James, Earl of Wessex": 3500,

  "Prince George of Wales": 160,
  "Princess Charlotte of Wales": 360,
  "Prince Louis of Wales": 560,
  "Prince Archie of Sussex": 760,
  "Princess Lilibet of Sussex": 960,
  "Savannah Phillips": 1320,
  "Isla Phillips": 1520,
  "Mia Tindall": 1700,
  "Lena Tindall": 1900,
  "Lucas Tindall": 2100,
  "Sienna Mapelli Mozzi": 2320,
  "Athena Mapelli Mozzi": 2520,
  "August Brooksbank": 2820,
  "Ernest Brooksbank": 3020,
};

const FAMILY_Y: Record<string, number> = {
  "Prince Philip, Duke of Edinburgh": 110,
  "Queen Elizabeth II": 110,

  "King Charles III": 390,
  "Diana, Princess of Wales": 390,
  "Anne, Princess Royal": 390,
  "Captain Mark Phillips": 390,
  "Vice Admiral Sir Timothy Laurence": 390,
  "Prince Andrew, Duke of York": 390,
  "Sarah, Duchess of York": 390,
  "Prince Edward, Duke of Edinburgh": 390,
  "Sophie, Duchess of Edinburgh": 390,

  "William, Prince of Wales": 690,
  "Catherine, Princess of Wales": 690,
  "Prince Harry, Duke of Sussex": 690,
  "Meghan, Duchess of Sussex": 690,
  "Peter Phillips": 690,
  "Autumn Phillips": 690,
  "Zara Tindall": 690,
  "Mike Tindall": 690,
  "Princess Beatrice": 690,
  "Edoardo Mapelli Mozzi": 690,
  "Princess Eugenie": 690,
  "Jack Brooksbank": 690,
  "Lady Louise Windsor": 690,
  "James, Earl of Wessex": 690,

  "Prince George of Wales": 980,
  "Princess Charlotte of Wales": 980,
  "Prince Louis of Wales": 980,
  "Prince Archie of Sussex": 980,
  "Princess Lilibet of Sussex": 980,
  "Savannah Phillips": 980,
  "Isla Phillips": 980,
  "Mia Tindall": 980,
  "Lena Tindall": 980,
  "Lucas Tindall": 980,
  "Sienna Mapelli Mozzi": 980,
  "Athena Mapelli Mozzi": 980,
  "August Brooksbank": 980,
  "Ernest Brooksbank": 980,
};

const SIBSHIP_NAMES = [
  {
    parents: ["Prince Philip, Duke of Edinburgh", "Queen Elizabeth II"],
    children: [
      "King Charles III",
      "Anne, Princess Royal",
      "Prince Andrew, Duke of York",
      "Prince Edward, Duke of Edinburgh",
    ],
    railStyle: "none",
  },
  {
    parents: ["King Charles III", "Diana, Princess of Wales"],
    children: ["William, Prince of Wales", "Prince Harry, Duke of Sussex"],
  },
  {
    parents: ["William, Prince of Wales", "Catherine, Princess of Wales"],
    children: ["Prince George of Wales", "Princess Charlotte of Wales", "Prince Louis of Wales"],
  },
  {
    parents: ["Prince Harry, Duke of Sussex", "Meghan, Duchess of Sussex"],
    children: ["Prince Archie of Sussex", "Princess Lilibet of Sussex"],
  },
  {
    parents: ["Anne, Princess Royal", "Captain Mark Phillips"],
    children: ["Peter Phillips", "Zara Tindall"],
  },
  {
    parents: ["Peter Phillips", "Autumn Phillips"],
    children: ["Savannah Phillips", "Isla Phillips"],
  },
  {
    parents: ["Zara Tindall", "Mike Tindall"],
    children: ["Mia Tindall", "Lena Tindall", "Lucas Tindall"],
  },
  {
    parents: ["Prince Andrew, Duke of York", "Sarah, Duchess of York"],
    children: ["Princess Beatrice", "Princess Eugenie"],
  },
  {
    parents: ["Princess Beatrice", "Edoardo Mapelli Mozzi"],
    children: ["Sienna Mapelli Mozzi", "Athena Mapelli Mozzi"],
  },
  {
    parents: ["Princess Eugenie", "Jack Brooksbank"],
    children: ["August Brooksbank", "Ernest Brooksbank"],
  },
  {
    parents: ["Prince Edward, Duke of Edinburgh", "Sophie, Duchess of Edinburgh"],
    children: ["Lady Louise Windsor", "James, Earl of Wessex"],
  },
] as const;

function displayName(profile: Profile): string {
  return profile.display_name || `${profile.first_name} ${profile.last_name}`;
}

export function createRoyalDemoTreeLayout(
  members: Profile[],
  relationships: Relationship[]
): TreeLayout {
  const byName = new Map(members.map((member) => [displayName(member), member]));
  const byId = new Map(members.map((member) => [member.id, member]));

  const nodes = members.map((profile) => {
    const name = displayName(profile);
    return {
      profile,
      x: FAMILY_X[name] ?? 2500,
      y: FAMILY_Y[name] ?? 690,
      generation: profile.date_of_birth ? Math.floor(Number(profile.date_of_birth.slice(0, 4)) / 30) : 0,
    };
  });

  const positionedIds = new Set(nodes.map((node) => node.profile.id));
  const connections = relationships
    .filter((relationship) => positionedIds.has(relationship.user_id) && positionedIds.has(relationship.relative_id))
    .filter((relationship) => relationship.type === "parent" || relationship.type === "spouse")
    .map((relationship) => ({
      from: relationship.user_id,
      to: relationship.relative_id,
      type: relationship.type as "parent" | "spouse",
    }));

  const sibships: TreeLayoutSibship[] = SIBSHIP_NAMES.map((sibship) => ({
    parents: sibship.parents.map((name) => byName.get(name)?.id).filter((id): id is string => !!id),
    children: sibship.children.map((name) => byName.get(name)?.id).filter((id): id is string => !!id),
  })).filter((sibship) => sibship.parents.length > 0 && sibship.children.length > 0);

  const maxX = Math.max(...nodes.map((node) => node.x), 4800);
  const maxY = Math.max(...nodes.map((node) => node.y), 1080);
  return {
    nodes,
    connections: connections.filter((connection) => byId.has(connection.from) && byId.has(connection.to)),
    sibships,
    width: maxX + 420,
    height: maxY + 220,
  };
}
