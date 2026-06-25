import type { Profile, Relationship } from "./types";
import { inferAssumedRelationships } from "./relationship-inference";
import type { TreeLayout, TreeLayoutConnection, TreeLayoutSibship } from "./tree-layout";

type IdSetMap = Map<string, Set<string>>;

interface RelativeMaps {
  parentsByChild: IdSetMap;
  childrenByParent: IdSetMap;
  spousesByMember: IdSetMap;
}

interface FocusedScopeResult {
  memberIds: Set<string>;
  relationships: Relationship[];
}

const NODE_SPACING = 158;
const ROW_GAP = 250;
const SIDE_GAP = 238;
const TOP_PADDING = 110;
const SIDE_PADDING = 180;

function addToMap(map: IdSetMap, key: string, value: string) {
  if (!map.has(key)) map.set(key, new Set());
  map.get(key)!.add(value);
}

function buildRelativeMaps(relationships: Relationship[]): RelativeMaps {
  const parentsByChild: IdSetMap = new Map();
  const childrenByParent: IdSetMap = new Map();
  const spousesByMember: IdSetMap = new Map();

  for (const rel of relationships) {
    if (rel.type === "parent") {
      addToMap(parentsByChild, rel.relative_id, rel.user_id);
      addToMap(childrenByParent, rel.user_id, rel.relative_id);
    } else if (rel.type === "child") {
      addToMap(parentsByChild, rel.user_id, rel.relative_id);
      addToMap(childrenByParent, rel.relative_id, rel.user_id);
    } else if (rel.type === "spouse") {
      addToMap(spousesByMember, rel.user_id, rel.relative_id);
      addToMap(spousesByMember, rel.relative_id, rel.user_id);
    }
  }

  return { parentsByChild, childrenByParent, spousesByMember };
}

function collectAncestors(startId: string, parentsByChild: IdSetMap): Set<string> {
  const result = new Set<string>();
  const queue = [...(parentsByChild.get(startId) ?? new Set<string>())];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const parentId of parentsByChild.get(current) ?? []) queue.push(parentId);
  }
  return result;
}

function collectDescendants(startId: string, childrenByParent: IdSetMap): Set<string> {
  const result = new Set<string>();
  const queue = [...(childrenByParent.get(startId) ?? new Set<string>())];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    for (const childId of childrenByParent.get(current) ?? []) queue.push(childId);
  }
  return result;
}

function siblingsOf(memberId: string, parentsByChild: IdSetMap, childrenByParent: IdSetMap): Set<string> {
  const result = new Set<string>();
  for (const parentId of parentsByChild.get(memberId) ?? []) {
    for (const childId of childrenByParent.get(parentId) ?? []) {
      if (childId !== memberId) result.add(childId);
    }
  }
  return result;
}

function addSpouses(ids: Set<string>, spousesByMember: IdSetMap) {
  const seed = [...ids];
  for (const id of seed) {
    for (const spouseId of spousesByMember.get(id) ?? []) ids.add(spouseId);
  }
}

function buildPartnerGroupingMap(maps: RelativeMaps): IdSetMap {
  const partners: IdSetMap = new Map();

  for (const [memberId, spouseIds] of maps.spousesByMember.entries()) {
    for (const spouseId of spouseIds) addToMap(partners, memberId, spouseId);
  }

  for (const parentIds of maps.parentsByChild.values()) {
    const parents = [...parentIds];
    for (let i = 0; i < parents.length; i += 1) {
      for (let j = i + 1; j < parents.length; j += 1) {
        addToMap(partners, parents[i], parents[j]);
        addToMap(partners, parents[j], parents[i]);
      }
    }
  }

  return partners;
}

export function createFocusedFamilyScope(
  members: Profile[],
  relationships: Relationship[],
  povId: string
): FocusedScopeResult {
  const memberIdsInFamily = new Set(members.map((member) => member.id));
  const effectiveRelationships = inferAssumedRelationships(relationships).filter(
    (rel) => memberIdsInFamily.has(rel.user_id) && memberIdsInFamily.has(rel.relative_id)
  );
  const { parentsByChild, childrenByParent, spousesByMember } = buildRelativeMaps(effectiveRelationships);
  const included = new Set<string>([povId]);

  for (const id of collectAncestors(povId, parentsByChild)) included.add(id);
  for (const id of collectDescendants(povId, childrenByParent)) included.add(id);

  const povParents = parentsByChild.get(povId) ?? new Set<string>();
  const povSiblings = siblingsOf(povId, parentsByChild, childrenByParent);
  for (const id of povParents) included.add(id);
  for (const id of povSiblings) included.add(id);
  for (const siblingId of povSiblings) {
    for (const childId of childrenByParent.get(siblingId) ?? []) included.add(childId);
  }

  const auntsAndUncles = new Set<string>();
  for (const parentId of povParents) {
    for (const auntUncleId of siblingsOf(parentId, parentsByChild, childrenByParent)) {
      auntsAndUncles.add(auntUncleId);
      included.add(auntUncleId);
    }
  }

  const firstCousins = new Set<string>();
  for (const auntUncleId of auntsAndUncles) {
    for (const cousinId of childrenByParent.get(auntUncleId) ?? []) {
      firstCousins.add(cousinId);
      included.add(cousinId);
    }
  }

  for (const cousinId of firstCousins) {
    for (const cousinChildId of childrenByParent.get(cousinId) ?? []) included.add(cousinChildId);
  }

  addSpouses(included, spousesByMember);

  const filteredIds = new Set([...included].filter((id) => memberIdsInFamily.has(id)));
  const filteredRelationships = effectiveRelationships.filter(
    (rel) => filteredIds.has(rel.user_id) && filteredIds.has(rel.relative_id)
  );

  return { memberIds: filteredIds, relationships: filteredRelationships };
}

function birthYear(profile: Profile): number | null {
  if (!profile.date_of_birth) return null;
  const year = new Date(profile.date_of_birth).getFullYear();
  return Number.isFinite(year) ? year : null;
}

function assignFocusedGenerations(
  members: Profile[],
  povId: string,
  maps: RelativeMaps
): Map<string, number> {
  const memberIds = new Set(members.map((member) => member.id));
  const generation = new Map<string, number>([[povId, 0]]);
  const ancestorQueue = [...(maps.parentsByChild.get(povId) ?? [])].map((id) => ({ id, gen: -1 }));
  const descendantQueue = [...(maps.childrenByParent.get(povId) ?? [])].map((id) => ({ id, gen: 1 }));

  while (ancestorQueue.length > 0) {
    const { id, gen } = ancestorQueue.shift()!;
    if (!memberIds.has(id)) continue;
    const existing = generation.get(id);
    if (existing != null && existing <= gen) continue;
    generation.set(id, gen);
    for (const parentId of maps.parentsByChild.get(id) ?? []) {
      ancestorQueue.push({ id: parentId, gen: gen - 1 });
    }
  }

  while (descendantQueue.length > 0) {
    const { id, gen } = descendantQueue.shift()!;
    if (!memberIds.has(id)) continue;
    const existing = generation.get(id);
    if (existing != null && existing >= gen) continue;
    generation.set(id, gen);
    for (const childId of maps.childrenByParent.get(id) ?? []) {
      descendantQueue.push({ id: childId, gen: gen + 1 });
    }
  }

  for (const siblingId of siblingsOf(povId, maps.parentsByChild, maps.childrenByParent)) {
    if (memberIds.has(siblingId)) generation.set(siblingId, 0);
    for (const childId of maps.childrenByParent.get(siblingId) ?? []) {
      if (memberIds.has(childId)) generation.set(childId, 1);
    }
  }

  for (const parentId of maps.parentsByChild.get(povId) ?? []) {
    for (const auntUncleId of siblingsOf(parentId, maps.parentsByChild, maps.childrenByParent)) {
      if (!memberIds.has(auntUncleId)) continue;
      generation.set(auntUncleId, -1);
      for (const cousinId of maps.childrenByParent.get(auntUncleId) ?? []) {
        if (!memberIds.has(cousinId)) continue;
        generation.set(cousinId, 0);
        for (const cousinChildId of maps.childrenByParent.get(cousinId) ?? []) {
          if (memberIds.has(cousinChildId)) generation.set(cousinChildId, 1);
        }
      }
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const member of members) {
      if (generation.has(member.id)) continue;
      const spouseGens = [...(maps.spousesByMember.get(member.id) ?? [])]
        .map((id) => generation.get(id))
        .filter((gen): gen is number => gen != null);
      if (spouseGens.length === 0) continue;
      generation.set(member.id, spouseGens[0]);
      changed = true;
    }
  }

  for (const member of members) {
    if (generation.has(member.id)) continue;
    const parentGens = [...(maps.parentsByChild.get(member.id) ?? [])]
      .map((id) => generation.get(id))
      .filter((gen): gen is number => gen != null);
    if (parentGens.length > 0) {
      generation.set(member.id, Math.max(...parentGens) + 1);
      continue;
    }
    generation.set(member.id, 0);
  }

  return generation;
}

function buildSpouseUnits(rowMembers: Profile[], spousesByMember: IdSetMap): Profile[][] {
  const rowIds = new Set(rowMembers.map((member) => member.id));
  const byId = new Map(rowMembers.map((member) => [member.id, member]));
  const visited = new Set<string>();
  const units: Profile[][] = [];

  for (const member of rowMembers) {
    if (visited.has(member.id)) continue;
    const stack = [member.id];
    const unit: Profile[] = [];
    visited.add(member.id);

    while (stack.length > 0) {
      const current = stack.pop()!;
      const currentMember = byId.get(current);
      if (currentMember) unit.push(currentMember);
      for (const spouseId of spousesByMember.get(current) ?? []) {
        if (!rowIds.has(spouseId) || visited.has(spouseId)) continue;
        visited.add(spouseId);
        stack.push(spouseId);
      }
    }

    unit.sort((a, b) => {
      if (a.gender === "male" && b.gender === "female") return -1;
      if (a.gender === "female" && b.gender === "male") return 1;
      return (birthYear(a) ?? 9999) - (birthYear(b) ?? 9999) || a.id.localeCompare(b.id);
    });
    units.push(unit);
  }

  return units;
}

function unitWidth(unit: Profile[]): number {
  return Math.max(96, (unit.length - 1) * NODE_SPACING + 96);
}

function orderPartnerUnit(members: Profile[]): Profile[] {
  return [...members].sort((a, b) => {
    if (a.gender === "male" && b.gender === "female") return -1;
    if (a.gender === "female" && b.gender === "male") return 1;
    return (birthYear(a) ?? 9999) - (birthYear(b) ?? 9999) || a.id.localeCompare(b.id);
  });
}

function alignPovParents(
  povId: string,
  memberById: Map<string, Profile>,
  maps: RelativeMaps,
  positions: Map<string, { x: number; y: number }>
) {
  const povPosition = positions.get(povId);
  if (!povPosition) return;

  const parentIds = [...(maps.parentsByChild.get(povId) ?? [])]
    .filter((id) => positions.has(id));
  if (parentIds.length < 2) return;

  const parentY = positions.get(parentIds[0])?.y;
  if (parentY == null) return;
  const sameRowParentIds = parentIds.filter((id) => Math.abs((positions.get(id)?.y ?? parentY) - parentY) < 1);
  if (sameRowParentIds.length < 2) return;

  const orderedParents = orderPartnerUnit(
    sameRowParentIds
      .map((id) => memberById.get(id))
      .filter((member): member is Profile => !!member)
  );
  if (orderedParents.length < 2) return;

  const startX = povPosition.x - ((orderedParents.length - 1) * NODE_SPACING) / 2;
  orderedParents.forEach((member, index) => {
    positions.set(member.id, { x: startX + index * NODE_SPACING, y: parentY });
  });

  const parentSet = new Set(orderedParents.map((member) => member.id));
  const rowEntries = [...positions.entries()]
    .filter(([, pos]) => Math.abs(pos.y - parentY) < 1);
  const parentXs = orderedParents.map((member) => positions.get(member.id)!.x);
  const leftBoundary = Math.min(...parentXs) - NODE_SPACING;
  const rightBoundary = Math.max(...parentXs) + NODE_SPACING;

  rowEntries
    .filter(([id, pos]) => !parentSet.has(id) && pos.x < povPosition.x)
    .sort((a, b) => b[1].x - a[1].x)
    .reduce((nextX, [id, pos]) => {
      const x = Math.min(pos.x, nextX);
      positions.set(id, { x, y: pos.y });
      return x - NODE_SPACING;
    }, leftBoundary);

  rowEntries
    .filter(([id, pos]) => !parentSet.has(id) && pos.x >= povPosition.x)
    .sort((a, b) => a[1].x - b[1].x)
    .reduce((nextX, [id, pos]) => {
      const x = Math.max(pos.x, nextX);
      positions.set(id, { x, y: pos.y });
      return x + NODE_SPACING;
    }, rightBoundary);
}

function uniqueConnections(relationships: Relationship[], positionedIds: Set<string>): TreeLayoutConnection[] {
  const connections: TreeLayoutConnection[] = [];
  const seen = new Set<string>();

  for (const rel of relationships) {
    if (!positionedIds.has(rel.user_id) || !positionedIds.has(rel.relative_id)) continue;
    if (rel.type === "spouse") {
      const pair = [rel.user_id, rel.relative_id].sort();
      const key = `spouse:${pair[0]}:${pair[1]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      connections.push({ from: pair[0], to: pair[1], type: "spouse", marriageDate: rel.marriage_date ?? null });
    } else if (rel.type === "parent") {
      const key = `parent:${rel.user_id}:${rel.relative_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      connections.push({ from: rel.user_id, to: rel.relative_id, type: "parent" });
    } else if (rel.type === "child") {
      const key = `parent:${rel.relative_id}:${rel.user_id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      connections.push({ from: rel.relative_id, to: rel.user_id, type: "parent" });
    }
  }

  return connections;
}

function buildSibships(
  relationships: Relationship[],
  positionedIds: Set<string>
): TreeLayoutSibship[] {
  const { parentsByChild } = buildRelativeMaps(relationships);
  const childrenByParents = new Map<string, { parents: string[]; children: string[] }>();

  for (const [childId, parentIds] of parentsByChild.entries()) {
    if (!positionedIds.has(childId)) continue;
    const parents = [...parentIds].filter((id) => positionedIds.has(id)).sort();
    if (parents.length === 0) continue;
    const key = parents.join(",");
    if (!childrenByParents.has(key)) childrenByParents.set(key, { parents, children: [] });
    childrenByParents.get(key)!.children.push(childId);
  }

  return [...childrenByParents.values()]
    .filter((entry) => entry.children.length > 0)
    .map((entry) => ({
      parents: entry.parents,
      children: entry.children,
      railStyle: entry.parents.length === 1 ? "stems" : undefined,
    }));
}

export function createFocusedFamilyTreeLayout(
  members: Profile[],
  relationships: Relationship[],
  povId: string
): TreeLayout & { scopeMemberIds: Set<string> } {
  const memberById = new Map(members.map((member) => [member.id, member]));
  const scope = createFocusedFamilyScope(members, relationships, povId);
  const scopedMembers = [...scope.memberIds]
    .map((id) => memberById.get(id))
    .filter((member): member is Profile => !!member);

  if (scopedMembers.length === 0) {
    return { nodes: [], connections: [], sibships: [], width: 900, height: 620, scopeMemberIds: new Set() };
  }

  const maps = buildRelativeMaps(scope.relationships);
  const partnerGroupingByMember = buildPartnerGroupingMap(maps);
  const generation = assignFocusedGenerations(scopedMembers, povId, maps);
  const rows = new Map<number, Profile[]>();

  for (const member of scopedMembers) {
    const gen = generation.get(member.id) ?? 0;
    if (!rows.has(gen)) rows.set(gen, []);
    rows.get(gen)!.push(member);
  }

  const orderedRows = [...rows.keys()].sort((a, b) => a - b);
  const positions = new Map<string, { x: number; y: number }>();

  for (const gen of orderedRows) {
    const rowMembers = [...(rows.get(gen) ?? [])].sort((a, b) => {
      if (a.id === povId) return -1;
      if (b.id === povId) return 1;
      return (birthYear(a) ?? 9999) - (birthYear(b) ?? 9999) || a.id.localeCompare(b.id);
    });
    const units = buildSpouseUnits(rowMembers, partnerGroupingByMember);
    const unitTargets = units.map((unit) => {
      if (unit.some((member) => member.id === povId)) return { unit, target: 0 };
      const childAnchors = unit.flatMap((member) =>
        [...(maps.childrenByParent.get(member.id) ?? [])]
          .map((childId) => positions.get(childId)?.x)
          .filter((x): x is number => x != null)
      );
      if (childAnchors.length > 0) {
        return { unit, target: childAnchors.reduce((sum, x) => sum + x, 0) / childAnchors.length };
      }
      const parentAnchors = unit.flatMap((member) =>
        [...(maps.parentsByChild.get(member.id) ?? [])]
          .map((parentId) => positions.get(parentId)?.x)
          .filter((x): x is number => x != null)
      );
      if (parentAnchors.length > 0) {
        return { unit, target: parentAnchors.reduce((sum, x) => sum + x, 0) / parentAnchors.length };
      }
      return { unit, target: gen < 0 ? -SIDE_GAP : gen > 0 ? SIDE_GAP : 0 };
    });

    unitTargets.sort((a, b) => a.target - b.target);
    const placed: Array<{ unit: Profile[]; center: number; width: number }> = [];
    for (const item of unitTargets) {
      const width = unitWidth(item.unit);
      let center = item.target;
      for (const prev of placed) {
        const minCenter = prev.center + prev.width / 2 + SIDE_GAP + width / 2;
        if (center < minCenter) center = minCenter;
      }
      placed.push({ unit: item.unit, center, width });
    }

    const povPlaced = placed.find((item) => item.unit.some((member) => member.id === povId));
    const rowShift = povPlaced ? -povPlaced.center : -((placed[0]?.center ?? 0) + (placed.at(-1)?.center ?? 0)) / 2;
    const y = TOP_PADDING + (orderedRows.indexOf(gen)) * ROW_GAP;

    for (const item of placed) {
      const center = item.center + rowShift;
      const start = center - ((item.unit.length - 1) * NODE_SPACING) / 2;
      item.unit.forEach((member, index) => {
        positions.set(member.id, { x: start + index * NODE_SPACING, y });
      });
    }
  }

  alignPovParents(povId, memberById, maps, positions);

  const minX = Math.min(...positions.values().map((pos) => pos.x));
  const maxX = Math.max(...positions.values().map((pos) => pos.x));
  const xShift = SIDE_PADDING - minX;
  for (const [id, pos] of positions) positions.set(id, { x: pos.x + xShift, y: pos.y });

  const positionedIds = new Set(positions.keys());
  const nodes = scopedMembers.map((profile) => {
    const pos = positions.get(profile.id) ?? { x: SIDE_PADDING, y: TOP_PADDING };
    return {
      profile,
      x: pos.x,
      y: pos.y,
      generation: generation.get(profile.id) ?? 0,
    };
  });

  return {
    nodes,
    connections: uniqueConnections(scope.relationships, positionedIds),
    sibships: buildSibships(scope.relationships, positionedIds),
    width: Math.max(960, Math.ceil(maxX - minX + SIDE_PADDING * 2)),
    height: Math.max(620, orderedRows.length * ROW_GAP + TOP_PADDING + 130),
    scopeMemberIds: scope.memberIds,
  };
}
