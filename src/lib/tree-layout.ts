import type { Profile, Relationship, RelationshipType } from "./types";

export interface TreeLayoutNode {
  profile: Profile;
  x: number;
  y: number;
}

export interface TreeLayoutConnection {
  from: string;
  to: string;
  type: "parent" | "spouse";
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  connections: TreeLayoutConnection[];
  width: number;
  height: number;
}

function invertRelationship(type: RelationshipType): RelationshipType {
  const inversions: Partial<Record<RelationshipType, RelationshipType>> = {
    parent: "child",
    child: "parent",
    grandparent: "grandchild",
    grandchild: "grandparent",
    aunt_uncle: "niece_nephew",
    maternal_aunt: "niece_nephew",
    paternal_aunt: "niece_nephew",
    maternal_uncle: "niece_nephew",
    paternal_uncle: "niece_nephew",
    niece_nephew: "aunt_uncle",
  };
  return inversions[type] || type;
}

function generationDelta(type: RelationshipType): number {
  if (type === "parent" || type === "grandparent") return 1;
  if (type === "child" || type === "grandchild") return -1;
  return 0;
}

export function createFamilyTreeLayout(
  members: Profile[],
  relationships: Relationship[],
  viewerId: string
): TreeLayout {
  if (members.length === 0) {
    return { nodes: [], connections: [], width: 800, height: 560 };
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const adjacency = new Map<string, { id: string; type: RelationshipType }[]>();

  for (const rel of relationships) {
    if (!adjacency.has(rel.user_id)) adjacency.set(rel.user_id, []);
    adjacency.get(rel.user_id)!.push({ id: rel.relative_id, type: rel.type });
    if (!adjacency.has(rel.relative_id)) adjacency.set(rel.relative_id, []);
    adjacency.get(rel.relative_id)!.push({
      id: rel.user_id,
      type: invertRelationship(rel.type),
    });
  }

  const generation = new Map<string, number>();
  generation.set(viewerId, 0);
  const queue = [viewerId];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const curGen = generation.get(current)!;
    const neighbors = adjacency.get(current) || [];
    for (const neighbor of neighbors) {
      if (!memberById.has(neighbor.id) || generation.has(neighbor.id)) continue;
      generation.set(neighbor.id, curGen + generationDelta(neighbor.type));
      queue.push(neighbor.id);
    }
  }

  // Keep all members visible even if disconnected from viewer.
  let disconnectedGen = (Math.max(...generation.values(), 0) || 0) + 1;
  for (const member of members) {
    if (!generation.has(member.id)) {
      generation.set(member.id, disconnectedGen);
      disconnectedGen++;
    }
  }

  const byGen = new Map<number, Profile[]>();
  for (const member of members) {
    const g = generation.get(member.id)!;
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g)!.push(member);
  }

  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);
  const maxCols = Math.max(...[...byGen.values()].map((arr) => arr.length), 1);
  const width = Math.max(800, maxCols * 180 + 160);
  const levelGap = 180;
  const nodeYStart = 90;
  const height = Math.max(560, sortedGens.length * levelGap + 120);

  const positions = new Map<string, { x: number; y: number }>();
  for (let row = 0; row < sortedGens.length; row++) {
    const g = sortedGens[row];
    const levelMembers = byGen.get(g)!;
    levelMembers.sort((a, b) =>
      `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`)
    );
    const count = levelMembers.length;
    const centerX = width / 2;
    const gap = count > 4 ? 140 : 170;
    for (let i = 0; i < count; i++) {
      const x = centerX + (i - (count - 1) / 2) * gap;
      const y = nodeYStart + row * levelGap;
      positions.set(levelMembers[i].id, { x, y });
    }
  }

  const nodes: TreeLayoutNode[] = members
    .map((profile) => {
      const pos = positions.get(profile.id);
      if (!pos) return null;
      return { profile, ...pos };
    })
    .filter((node): node is TreeLayoutNode => node !== null);

  const connectionSet = new Set<string>();
  const connections: TreeLayoutConnection[] = [];

  for (const rel of relationships) {
    if (!positions.has(rel.user_id) || !positions.has(rel.relative_id)) continue;

    if (rel.type === "spouse") {
      const pair = [rel.user_id, rel.relative_id].sort();
      const key = `spouse:${pair[0]}:${pair[1]}`;
      if (connectionSet.has(key)) continue;
      connectionSet.add(key);
      connections.push({ from: pair[0], to: pair[1], type: "spouse" });
      continue;
    }

    if (rel.type === "parent") {
      const key = `parent:${rel.user_id}:${rel.relative_id}`;
      if (connectionSet.has(key)) continue;
      connectionSet.add(key);
      connections.push({ from: rel.user_id, to: rel.relative_id, type: "parent" });
      continue;
    }

    if (rel.type === "child") {
      const key = `parent:${rel.relative_id}:${rel.user_id}`;
      if (connectionSet.has(key)) continue;
      connectionSet.add(key);
      connections.push({ from: rel.relative_id, to: rel.user_id, type: "parent" });
    }
  }

  return { nodes, connections, width, height };
}
