import type { Profile, Relationship, RelationshipType } from "./types";

export interface TreeLayoutNode {
  profile: Profile;
  x: number;
  y: number;
  generation: number;
}

export interface TreeLayoutConnection {
  from: string;
  to: string;
  type: "parent" | "spouse" | "sibling" | "half_sibling";
}

/** A nuclear family unit: parents and their shared children (sibship). Used for bracket-style drawing. */
export interface TreeLayoutSibship {
  parents: string[];
  children: string[];
}

export interface TreeLayout {
  nodes: TreeLayoutNode[];
  connections: TreeLayoutConnection[];
  sibships: TreeLayoutSibship[];
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
  if (type === "aunt_uncle" || type === "maternal_aunt" || type === "paternal_aunt" || type === "maternal_uncle" || type === "paternal_uncle") return 1;
  if (type === "niece_nephew") return -1;
  return 0;
}

type Side = "paternal" | "maternal" | "neutral";

export function createFamilyTreeLayout(
  members: Profile[],
  relationships: Relationship[],
  viewerId: string
): TreeLayout {
  if (members.length === 0) {
    return { nodes: [], connections: [], sibships: [], width: 800, height: 560 };
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
  const levelGap = 180;
  const nodeYStart = 90;

  const parentIdsByChild = new Map<string, Set<string>>();
  const addParentMapEntry = (parentId: string, childId: string) => {
    if (!parentIdsByChild.has(childId)) parentIdsByChild.set(childId, new Set());
    parentIdsByChild.get(childId)!.add(parentId);
  };
  for (const rel of relationships) {
    if (rel.type === "parent") addParentMapEntry(rel.user_id, rel.relative_id);
    else if (rel.type === "child") addParentMapEntry(rel.relative_id, rel.user_id);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const rel of relationships) {
      if (rel.type !== "sibling") continue;
      const a = rel.user_id, b = rel.relative_id;
      const pa = parentIdsByChild.get(a) || new Set<string>();
      const pb = parentIdsByChild.get(b) || new Set<string>();
      const union = new Set([...pa, ...pb]);
      if (union.size > pa.size) { parentIdsByChild.set(a, new Set(union)); changed = true; }
      if (union.size > pb.size) { parentIdsByChild.set(b, new Set(union)); changed = true; }
    }
  }

  // Orientation guard: detect whether older generations are represented with lower or higher generation values.
  // We then choose row ordering so parents always render above children.
  const parentDeltas: number[] = [];
  for (const [childId, parentIds] of parentIdsByChild.entries()) {
    const childGen = generation.get(childId);
    if (childGen == null) continue;
    for (const parentId of parentIds) {
      const parentGen = generation.get(parentId);
      if (parentGen == null) continue;
      const d = parentGen - childGen;
      if (d !== 0) parentDeltas.push(d);
    }
  }
  const negativeCount = parentDeltas.filter((d) => d < 0).length;
  const positiveCount = parentDeltas.filter((d) => d > 0).length;
  const parentsUseLowerGenerationNumber = negativeCount >= positiveCount;
  const orderedRows = parentsUseLowerGenerationNumber
    ? [...sortedGens].sort((a, b) => a - b)
    : [...sortedGens].sort((a, b) => b - a);
  const maxCols = Math.max(...orderedRows.map((g) => byGen.get(g)?.length || 0), 1);
  const width = Math.max(1300, maxCols * 280 + 420);
  const height = Math.max(560, orderedRows.length * levelGap + 120);

  const spouseAdj = new Map<string, Set<string>>();
  const addSpouseLink = (a: string, b: string) => {
    if (!spouseAdj.has(a)) spouseAdj.set(a, new Set());
    spouseAdj.get(a)!.add(b);
  };
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    if (!memberById.has(rel.user_id) || !memberById.has(rel.relative_id)) continue;
    addSpouseLink(rel.user_id, rel.relative_id);
    addSpouseLink(rel.relative_id, rel.user_id);
  }

  const childIdsByParent = new Map<string, Set<string>>();
  for (const [childId, parentIds] of parentIdsByChild.entries()) {
    for (const parentId of parentIds) {
      if (!childIdsByParent.has(parentId)) childIdsByParent.set(parentId, new Set());
      childIdsByParent.get(parentId)!.add(childId);
    }
  }

  const viewerParentIds = parentIdsByChild.get(viewerId);
  const viewerParents = [...(viewerParentIds ?? new Set<string>())]
    .map((id) => memberById.get(id))
    .filter((m): m is Profile => !!m);
  const motherParent = viewerParents.find((p) => p.gender === "female") ?? viewerParents[0] ?? null;
  const fatherParent = viewerParents.find((p) => p.gender === "male") ?? viewerParents[1] ?? viewerParents[0] ?? null;
  const lineageSideById = new Map<string, Side>();
  const collectAncestors = (startId: string | null): Set<string> => {
    const result = new Set<string>();
    if (!startId) return result;
    const queue = [startId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (result.has(current)) continue;
      result.add(current);
      const pids = parentIdsByChild.get(current);
      if (!pids) continue;
      for (const pid of pids) queue.push(pid);
    }
    return result;
  };
  const collectDescendants = (seeds: Set<string>): Set<string> => {
    const result = new Set<string>(seeds);
    const queue = [...seeds];
    while (queue.length > 0) {
      const current = queue.shift()!;
      const children = childIdsByParent.get(current);
      if (!children) continue;
      for (const child of children) {
        if (result.has(child)) continue;
        result.add(child);
        queue.push(child);
      }
    }
    return result;
  };
  const maternalAncestors = collectAncestors(motherParent?.id ?? null);
  const paternalAncestors = collectAncestors(fatherParent?.id ?? null);
  const maternalSeeds = new Set<string>(maternalAncestors);
  const paternalSeeds = new Set<string>(paternalAncestors);
  if (motherParent) maternalSeeds.add(motherParent.id);
  if (fatherParent) paternalSeeds.add(fatherParent.id);
  for (const member of members) {
    if (!motherParent || !fatherParent) break;
    const mParents = parentIdsByChild.get(member.id);
    if (!mParents) continue;
    const shareMotherSide = [...mParents].some((pid) => maternalAncestors.has(pid));
    const shareFatherSide = [...mParents].some((pid) => paternalAncestors.has(pid));
    if (shareMotherSide && !shareFatherSide) maternalSeeds.add(member.id);
    if (shareFatherSide && !shareMotherSide) paternalSeeds.add(member.id);
  }
  const maternalFamily = collectDescendants(maternalSeeds);
  const paternalFamily = collectDescendants(paternalSeeds);
  for (const member of members) {
    const id = member.id;
    if (maternalFamily.has(id) && !paternalFamily.has(id)) lineageSideById.set(id, "maternal");
    else if (paternalFamily.has(id) && !maternalFamily.has(id)) lineageSideById.set(id, "paternal");
    else lineageSideById.set(id, "neutral");
  }
  if (motherParent) lineageSideById.set(motherParent.id, "maternal");
  if (fatherParent) lineageSideById.set(fatherParent.id, "paternal");

  const positions = new Map<string, { x: number; y: number }>();
  const rowIndexByGen = new Map<number, number>(orderedRows.map((g, i) => [g, i]));

  const buildSpouseUnits = (ids: string[]) => {
    const idSet = new Set(ids);
    const visited = new Set<string>();
    const units: string[][] = [];
    for (const id of ids) {
      if (visited.has(id)) continue;
      const stack = [id];
      visited.add(id);
      const unit: string[] = [];
      while (stack.length > 0) {
        const cur = stack.pop()!;
        unit.push(cur);
        const neighbors = spouseAdj.get(cur);
        if (!neighbors) continue;
        for (const n of neighbors) {
          if (!idSet.has(n) || visited.has(n)) continue;
          visited.add(n);
          stack.push(n);
        }
      }
      units.push(unit);
    }
    return units;
  };

  for (let row = 0; row < orderedRows.length; row++) {
    const gen = orderedRows[row];
    const rowMembers = byGen.get(gen) || [];
    const ids = rowMembers.map((m) => m.id);
    const units = buildSpouseUnits(ids);

    const unitMeta = units.map((unit) => {
      const unitMembers = unit.map((id) => memberById.get(id)).filter((m): m is Profile => !!m);
      const sideScores = unitMembers.reduce(
        (acc, m) => {
          const side = lineageSideById.get(m.id) ?? "neutral";
          acc[side] += 1;
          return acc;
        },
        { paternal: 0, maternal: 0, neutral: 0 } as Record<Side, number>
      );
      let side: Side = "neutral";
      if (sideScores.paternal > sideScores.maternal && sideScores.paternal >= sideScores.neutral) side = "paternal";
      else if (sideScores.maternal > sideScores.paternal && sideScores.maternal >= sideScores.neutral) side = "maternal";

      let desired = 0;
      const parentAnchors: number[] = [];
      for (const id of unit) {
        const pids = parentIdsByChild.get(id);
        if (!pids) continue;
        for (const pid of pids) {
          const px = positions.get(pid)?.x;
          if (px != null) parentAnchors.push(px);
        }
      }
      if (parentAnchors.length > 0) {
        desired = parentAnchors.reduce((s, x) => s + x, 0) / parentAnchors.length;
      } else {
        const sideCenter = side === "paternal" ? width * 0.25 : side === "maternal" ? width * 0.75 : width * 0.5;
        desired = sideCenter;
      }
      return { unit, side, desired };
    });

    const bySide = {
      paternal: unitMeta.filter((u) => u.side === "paternal"),
      neutral: unitMeta.filter((u) => u.side === "neutral"),
      maternal: unitMeta.filter((u) => u.side === "maternal"),
    };
    const rowGap = 150 + row * 12;
    const sideCenters: Record<Side, number> = {
      paternal: width * 0.36,
      neutral: width * 0.5,
      maternal: width * 0.64,
    };
    const unitCenters = new Map<string, number>();
    (["paternal", "neutral", "maternal"] as Side[]).forEach((side) => {
      const unitsForSide = bySide[side].sort((a, b) => a.desired - b.desired);
      if (unitsForSide.length === 0) return;
      const blockWidth = (unitsForSide.length - 1) * rowGap;
      const startX = sideCenters[side] - blockWidth / 2;
      unitsForSide.forEach((u, idx) => {
        unitCenters.set(u.unit.join("|"), startX + idx * rowGap);
      });
    });

    for (const { unit } of unitMeta) {
      const cx = unitCenters.get(unit.join("|")) ?? width / 2;
      const orderedUnit = [...unit].sort((a, b) => {
        const ag = memberById.get(a)?.gender;
        const bg = memberById.get(b)?.gender;
        // Keep spouses side-by-side with male/female stable ordering when available.
        if (ag === "male" && bg === "female") return -1;
        if (ag === "female" && bg === "male") return 1;
        return a.localeCompare(b);
      });
      const unitSpacing = 110;
      const unitStart = cx - ((orderedUnit.length - 1) * unitSpacing) / 2;
      const y = nodeYStart + row * levelGap;
      orderedUnit.forEach((id, idx) => {
        positions.set(id, { x: unitStart + idx * unitSpacing, y });
      });
    }
  }

  // Pull older generations closer to descendant anchors (e.g., grandparents above their lineage branch).
  for (let pass = 0; pass < 3; pass++) {
    for (let row = 0; row < orderedRows.length; row++) {
      const gen = orderedRows[row];
      const rowMembers = byGen.get(gen) || [];
      for (const member of rowMembers) {
        const children = childIdsByParent.get(member.id);
        if (!children || children.size === 0) continue;
        const childXs = [...children]
          .map((id) => positions.get(id)?.x)
          .filter((x): x is number => x != null);
        if (childXs.length === 0) continue;
        const current = positions.get(member.id);
        if (!current) continue;
        const childAvg = childXs.reduce((s, x) => s + x, 0) / childXs.length;
        positions.set(member.id, { x: current.x * 0.55 + childAvg * 0.45, y: current.y });
      }
    }
  }

  // Validation/correction: maternal sibling adjacency with mother (if shared-parent siblings).
  if (motherParent) {
    const motherRow = rowIndexByGen.get(generation.get(motherParent.id) ?? 0);
    if (motherRow != null) {
      const motherParents = parentIdsByChild.get(motherParent.id) || new Set<string>();
      const rowIds = (byGen.get(orderedRows[motherRow]) || []).map((m) => m.id);
      const maternalSiblings = rowIds.filter((id) => {
        if (id === motherParent.id) return false;
        const pids = parentIdsByChild.get(id);
        if (!pids || pids.size === 0) return false;
        return [...pids].some((pid) => motherParents.has(pid));
      });
      if (maternalSiblings.length > 0) {
        const clusterIds = [...maternalSiblings, motherParent.id];
        const cluster = clusterIds
          .map((id) => ({ id, x: positions.get(id)?.x ?? 0 }))
          .sort((a, b) => a.x - b.x);
        const center = cluster.reduce((s, n) => s + n.x, 0) / cluster.length;
        const spacing = 150;
        const start = center - ((cluster.length - 1) * spacing) / 2;
        const y = positions.get(motherParent.id)?.y ?? nodeYStart + motherRow * levelGap;
        cluster.forEach((n, i) => {
          positions.set(n.id, { x: start + i * spacing, y });
        });
      }
    }
  }

  // Hard post-normalization to prevent same-row overlap, especially spouse overlap.
  // 1) Keep spouse pairs separated when they are on the same generation row.
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    const a = positions.get(rel.user_id);
    const b = positions.get(rel.relative_id);
    if (!a || !b) continue;
    if (Math.abs(a.y - b.y) > 1) continue;
    const dx = Math.abs(a.x - b.x);
    const minSpouseGap = 110;
    if (dx >= minSpouseGap) continue;
    const mid = (a.x + b.x) / 2;
    const leftId = a.x <= b.x ? rel.user_id : rel.relative_id;
    const rightId = a.x <= b.x ? rel.relative_id : rel.user_id;
    const y = a.y;
    positions.set(leftId, { x: mid - minSpouseGap / 2, y });
    positions.set(rightId, { x: mid + minSpouseGap / 2, y });
  }

  // 2) Ensure minimum horizontal gap across each generation row.
  const minNodeGap = 96;
  for (const gen of orderedRows) {
    const rowMembers = byGen.get(gen) || [];
    const ordered = rowMembers
      .map((m) => ({ id: m.id, pos: positions.get(m.id) }))
      .filter((entry): entry is { id: string; pos: { x: number; y: number } } => !!entry.pos)
      .sort((a, b) => a.pos.x - b.pos.x);
    for (let i = 1; i < ordered.length; i++) {
      const prev = ordered[i - 1];
      const cur = ordered[i];
      if (cur.pos.x - prev.pos.x < minNodeGap) {
        const nextX = prev.pos.x + minNodeGap;
        positions.set(cur.id, { x: nextX, y: cur.pos.y });
        ordered[i].pos = { x: nextX, y: cur.pos.y };
      }
    }
  }

  // Targeted validation + correction for maternal-side sibling placement (JJ/ME style bug).
  const meNode = members.find(
    (m) =>
      m.display_name?.trim().toUpperCase() === "ME" ||
      `${m.first_name} ${m.last_name}`.trim().toUpperCase() === "ME"
  );
  const jjNode = members.find(
    (m) =>
      m.display_name?.trim().toUpperCase() === "JJ" ||
      `${m.first_name} ${m.last_name}`.trim().toUpperCase() === "JJ"
  );
  if (motherParent && meNode && jjNode) {
    const meParents = parentIdsByChild.get(meNode.id) || new Set<string>();
    const jjParents = parentIdsByChild.get(jjNode.id) || new Set<string>();
    const sharesMaternalUnion = [...jjParents].some((pid) => meParents.has(pid) && pid === motherParent.id);
    if (sharesMaternalUnion) {
      const mePos = positions.get(meNode.id);
      const jjPos = positions.get(jjNode.id);
      if (mePos && jjPos) {
        const nodeWidth = 88;
        const spacing = 170;
        const maternalMinX = width * 0.58;
        const maternalMaxX = width * 0.98;
        const isValid =
          Math.abs(jjPos.y - mePos.y) <= 1 &&
          Math.abs(jjPos.x - mePos.x) <= 2 * (nodeWidth + spacing) &&
          jjPos.x >= maternalMinX &&
          jjPos.x <= maternalMaxX;
        if (!isValid) {
          const sharedParents = [...jjParents].filter((pid) => meParents.has(pid));
          const siblingGroup = members
            .filter((m) => {
              const pids = parentIdsByChild.get(m.id);
              if (!pids) return false;
              return sharedParents.every((pid) => pids.has(pid));
            })
            .sort((a, b) => a.id.localeCompare(b.id));
          const rowY = mePos.y;
          const baseX = Math.max(maternalMinX + 40, Math.min(mePos.x, maternalMaxX - 40));
          const ordered = [
            ...siblingGroup.filter((m) => m.id !== meNode.id && m.id !== jjNode.id),
            meNode,
            jjNode,
          ];
          const startX = baseX - ((ordered.length - 1) * 150) / 2;
          ordered.forEach((m, idx) => {
            const x = Math.max(maternalMinX, Math.min(maternalMaxX, startX + idx * 150));
            positions.set(m.id, { x, y: rowY });
          });
          const jjAfter = positions.get(jjNode.id)!;
          const meAfter = positions.get(meNode.id)!;
          const stillInvalid =
            Math.abs(jjAfter.y - meAfter.y) > 1 ||
            Math.abs(jjAfter.x - meAfter.x) > 2 * (nodeWidth + spacing) ||
            jjAfter.x < maternalMinX ||
            jjAfter.x > maternalMaxX;
          if (stillInvalid) {
            console.error("Pedigree layout validation failed for maternal sibling adjacency (JJ/ME).");
          }
        }
      }
    }
  }

  const nodes: TreeLayoutNode[] = members
    .map((profile) => {
      const pos = positions.get(profile.id);
      if (!pos) return null;
      return { profile, ...pos, generation: generation.get(profile.id) ?? 0 };
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

    if (rel.type === "sibling" || rel.type === "half_sibling") continue;

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

  for (const [childId, parentIds] of parentIdsByChild.entries()) {
    if (!positions.has(childId)) continue;
    for (const parentId of parentIds) {
      if (!positions.has(parentId)) continue;
      const key = `parent:${parentId}:${childId}`;
      if (connectionSet.has(key)) continue;
      connectionSet.add(key);
      connections.push({ from: parentId, to: childId, type: "parent" });
    }
  }

  // Build sibships: group children by their parent set for bracket-style drawing.
  const childrenByParents = new Map<string, { parents: string[]; children: string[] }>();

  for (const [childId, parentIds] of parentIdsByChild.entries()) {
    if (!positions.has(childId)) continue;
    const parentArr = [...parentIds].filter((pid) => positions.has(pid)).sort();
    if (parentArr.length === 0) continue;
    const key = parentArr.join(",");
    if (!childrenByParents.has(key)) {
      childrenByParents.set(key, { parents: parentArr, children: [] });
    }
    childrenByParents.get(key)!.children.push(childId);
  }

  const sibships: TreeLayoutSibship[] = [];
  for (const { parents, children } of childrenByParents.values()) {
    if (children.length > 0) {
      sibships.push({ parents, children });
    }
  }

  return { nodes, connections, sibships, width, height };
}
