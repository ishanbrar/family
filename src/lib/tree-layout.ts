import type { Profile, Relationship, RelationshipType } from "./types";
import { inferAssumedRelationships } from "./relationship-inference";

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
  marriageDate?: string | null;
}

/** A nuclear family unit: parents and their shared children (sibship). Used for bracket-style drawing. */
export interface TreeLayoutSibship {
  parents: string[];
  children: string[];
  railStyle?: "full" | "stems" | "rays" | "none";
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

export interface TreeLayoutOptions {
  /** When true, use the oldest ancestor as root for a classic top-down pedigree (e.g. for export). */
  preferAncestorRoot?: boolean;
}

function birthYear(profile: Profile): number | null {
  if (!profile.date_of_birth) return null;
  const y = new Date(profile.date_of_birth).getFullYear();
  return Number.isFinite(y) ? y : null;
}

export function createFamilyTreeLayout(
  members: Profile[],
  relationships: Relationship[],
  viewerId: string,
  options?: TreeLayoutOptions
): TreeLayout {
  if (members.length === 0) {
    return { nodes: [], connections: [], sibships: [], width: 800, height: 560 };
  }

  const memberById = new Map(members.map((m) => [m.id, m]));
  const effectiveRelationships = inferAssumedRelationships(relationships);
  const adjacency = new Map<string, { id: string; type: RelationshipType }[]>();

  for (const rel of effectiveRelationships) {
    if (!adjacency.has(rel.user_id)) adjacency.set(rel.user_id, []);
    adjacency.get(rel.user_id)!.push({ id: rel.relative_id, type: rel.type });
    if (!adjacency.has(rel.relative_id)) adjacency.set(rel.relative_id, []);
    adjacency.get(rel.relative_id)!.push({
      id: rel.user_id,
      type: invertRelationship(rel.type),
    });
  }

  const memberIds = members.map((m) => m.id);
  const undirectedAdj = new Map<string, Set<string>>();
  for (const id of memberIds) undirectedAdj.set(id, new Set());
  for (const rel of effectiveRelationships) {
    if (!memberById.has(rel.user_id) || !memberById.has(rel.relative_id)) continue;
    undirectedAdj.get(rel.user_id)!.add(rel.relative_id);
    undirectedAdj.get(rel.relative_id)!.add(rel.user_id);
  }

  const componentFrom = (startId: string): Set<string> => {
    const seen = new Set<string>();
    const queue = [startId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      if (seen.has(cur)) continue;
      seen.add(cur);
      const neighbors = undirectedAdj.get(cur);
      if (!neighbors) continue;
      for (const next of neighbors) {
        if (!seen.has(next)) queue.push(next);
      }
    }
    return seen;
  };

  // Build parentIdsByChild early for root selection and sibships
  const parentIdsByChild = new Map<string, Set<string>>();
  const addParentMapEntry = (parentId: string, childId: string) => {
    if (!parentIdsByChild.has(childId)) parentIdsByChild.set(childId, new Set());
    parentIdsByChild.get(childId)!.add(parentId);
  };
  for (const rel of effectiveRelationships) {
    if (rel.type === "parent") addParentMapEntry(rel.user_id, rel.relative_id);
    else if (rel.type === "child") addParentMapEntry(rel.relative_id, rel.user_id);
  }
  // Merge parent sets only when siblings plausibly share a parent (intersection) or one side has no parents yet.
  // Unions of disjoint parent sets (e.g. half-siblings on different sides) used to merge everyone into one
  // fake nuclear family and broke tree layout (wrong spouse bars / wrong branches).
  let changed = true;
  while (changed) {
    changed = false;
    for (const rel of effectiveRelationships) {
      if (rel.type !== "sibling" && rel.type !== "half_sibling") continue;
      const a = rel.user_id,
        b = rel.relative_id;
      const pa = parentIdsByChild.get(a) || new Set<string>();
      const pb = parentIdsByChild.get(b) || new Set<string>();
      const intersection = new Set([...pa].filter((id) => pb.has(id)));
      const canMerge =
        intersection.size > 0 || pa.size === 0 || pb.size === 0;
      if (!canMerge) continue;
      const union = new Set([...pa, ...pb]);
      if (union.size > pa.size) {
        parentIdsByChild.set(a, new Set(union));
        changed = true;
      }
      if (union.size > pb.size) {
        parentIdsByChild.set(b, new Set(union));
        changed = true;
      }
    }
  }

  // Family-wide canonical anchor: if an admin node exists, use it so all users
  // share the same geometry. Otherwise keep viewer-based fallback behavior.
  let layoutRootId = viewerId;
  const adminAnchor = [...members]
    .filter((m) => m.role === "ADMIN")
    .sort((a, b) => {
      if (a.created_at !== b.created_at) return a.created_at.localeCompare(b.created_at);
      return a.id.localeCompare(b.id);
    })[0];
  if (adminAnchor) {
    layoutRootId = adminAnchor.id;
  }

  // For export: use oldest ancestor as root for classic top-down pedigree
  if (options?.preferAncestorRoot) {
    const topmostAncestors = members.filter((m) => {
      const parentIds = parentIdsByChild.get(m.id);
      if (!parentIds || parentIds.size === 0) return true;
      const parentsInTree = [...parentIds].filter((pid) => memberById.has(pid));
      return parentsInTree.length === 0;
    });
    const inMainComponent = memberById.has(viewerId)
      ? componentFrom(viewerId)
      : componentFrom(members[0]?.id ?? "");
    const candidates = topmostAncestors.filter((m) => inMainComponent.size === 0 || inMainComponent.has(m.id));
    if (candidates.length > 0) {
      candidates.sort((a, b) => {
        const ay = birthYear(a) ?? 9999;
        const by = birthYear(b) ?? 9999;
        return ay - by; // oldest (lowest year) first
      });
      layoutRootId = candidates[0].id;
    }
  } else if (!adminAnchor && memberById.has(viewerId)) {
    const viewerComponent = componentFrom(viewerId);
    if (viewerComponent.size <= 1) {
      const visited = new Set<string>();
      let largest: Set<string> | null = null;
      for (const id of memberIds) {
        if (visited.has(id)) continue;
        const comp = componentFrom(id);
        comp.forEach((cid) => visited.add(cid));
        if (!largest || comp.size > largest.size) {
          largest = comp;
        }
      }
      if (largest && largest.size > 1) {
        const candidates = [...largest];
        candidates.sort((a, b) => {
          const aDegree = undirectedAdj.get(a)?.size || 0;
          const bDegree = undirectedAdj.get(b)?.size || 0;
          if (aDegree !== bDegree) return bDegree - aDegree;
          const aCreated = memberById.get(a)?.created_at || "";
          const bCreated = memberById.get(b)?.created_at || "";
          if (aCreated !== bCreated) return aCreated.localeCompare(bCreated);
          return a.localeCompare(b);
        });
        layoutRootId = candidates[0];
      }
    }
  }

  const generation = new Map<string, number>();
  generation.set(layoutRootId, 0);
  const queue = [layoutRootId];

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

  // Keep all members visible even if disconnected. Cluster by birth year into generations.
  const disconnectedMembers = members.filter((m) => !generation.has(m.id));
  if (disconnectedMembers.length > 0) {
    const maxGen = Math.max(...generation.values(), 0);
    // Assign generation by birth year: oldest at top (highest gen if parents-use-higher)
    const withYear = disconnectedMembers
      .map((m) => ({ id: m.id, year: birthYear(m) }))
      .sort((a, b) => (a.year ?? 9999) - (b.year ?? 9999));
    const BUCKET_YEARS = 30;
    let lastYear = -Infinity;
    let bucketGen = maxGen + 1;
    for (const { id, year } of withYear) {
      const y = year ?? 9999;
      if (y - lastYear > BUCKET_YEARS) {
        bucketGen++;
        lastYear = y;
      }
      generation.set(id, bucketGen);
    }
  }

  const byGen = new Map<number, Profile[]>();
  for (const member of members) {
    const g = generation.get(member.id)!;
    if (!byGen.has(g)) byGen.set(g, []);
    byGen.get(g)!.push(member);
  }

  const sortedGens = [...byGen.keys()].sort((a, b) => a - b);
  const levelGap = 272;
  const nodeYStart = 90;

  // Birth-year refinement: split generations that span >35 years (uncle/nephew wrongly same row)
  const GEN_SPLIT_YEAR_GAP = 35;
  const refinedGeneration = new Map<string, number>();
  for (const [id, gen] of generation) {
    refinedGeneration.set(id, gen);
  }
  for (const gen of sortedGens) {
    const rowMembers = byGen.get(gen) ?? [];
    const withYear = rowMembers
      .map((m) => ({ id: m.id, year: birthYear(m) }))
      .filter((x): x is { id: string; year: number } => x.year != null);
    if (withYear.length < 2) continue;
    const years = withYear.map((x) => x.year);
    const minY = Math.min(...years);
    const maxY = Math.max(...years);
    if (maxY - minY <= GEN_SPLIT_YEAR_GAP) continue;
    const midY = (minY + maxY) / 2;
    for (const { id, year } of withYear) {
      if (year < midY) {
        refinedGeneration.set(id, gen + 1); // older -> older generation
      }
    }
  }

  // Spouses must remain on the same generation row even when birth-year refinement
  // moves only one partner. Otherwise the spouse edge disappears because spouse
  // connectors render only for same-row couples.
  const spouseRefineAdj = new Map<string, Set<string>>();
  const addSpouseRefineLink = (a: string, b: string) => {
    if (!spouseRefineAdj.has(a)) spouseRefineAdj.set(a, new Set());
    spouseRefineAdj.get(a)!.add(b);
  };
  for (const rel of effectiveRelationships) {
    if (rel.type !== "spouse") continue;
    if (!memberById.has(rel.user_id) || !memberById.has(rel.relative_id)) continue;
    addSpouseRefineLink(rel.user_id, rel.relative_id);
    addSpouseRefineLink(rel.relative_id, rel.user_id);
  }
  const spouseVisited = new Set<string>();
  for (const member of members) {
    if (spouseVisited.has(member.id)) continue;
    const stack = [member.id];
    const component: string[] = [];
    spouseVisited.add(member.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      const neighbors = spouseRefineAdj.get(current);
      if (!neighbors) continue;
      for (const next of neighbors) {
        if (spouseVisited.has(next)) continue;
        spouseVisited.add(next);
        stack.push(next);
      }
    }
    if (component.length < 2) continue;
    const targetGen = Math.max(
      ...component.map((id) => refinedGeneration.get(id) ?? generation.get(id) ?? 0)
    );
    component.forEach((id) => {
      refinedGeneration.set(id, targetGen);
    });
  }

  // Rebuild byGen from refined generations
  const byGenRefined = new Map<number, Profile[]>();
  for (const member of members) {
    const g = refinedGeneration.get(member.id) ?? generation.get(member.id)!;
    if (!byGenRefined.has(g)) byGenRefined.set(g, []);
    byGenRefined.get(g)!.push(member);
  }
  const sortedGensRefined = [...byGenRefined.keys()].sort((a, b) => a - b);

  // Orientation guard: detect whether older generations are represented with lower or higher generation values.
  // We then choose row ordering so parents always render above children.
  const parentDeltas: number[] = [];
  for (const [childId, parentIds] of parentIdsByChild.entries()) {
    const childGen = refinedGeneration.get(childId);
    if (childGen == null) continue;
    for (const parentId of parentIds) {
      const parentGen = refinedGeneration.get(parentId);
      if (parentGen == null) continue;
      const d = parentGen - childGen;
      if (d !== 0) parentDeltas.push(d);
    }
  }
  const negativeCount = parentDeltas.filter((d) => d < 0).length;
  const positiveCount = parentDeltas.filter((d) => d > 0).length;
  const parentsUseLowerGenerationNumber = negativeCount >= positiveCount;
  const orderedRows = parentsUseLowerGenerationNumber
    ? [...sortedGensRefined].sort((a, b) => a - b)
    : [...sortedGensRefined].sort((a, b) => b - a);
  const maxCols = Math.max(...orderedRows.map((g) => byGenRefined.get(g)?.length || 0), 1);
  const width = Math.max(1480, maxCols * 336 + 520);
  const height = Math.max(560, orderedRows.length * levelGap + 120);

  const spouseAdj = new Map<string, Set<string>>();
  const addSpouseLink = (a: string, b: string) => {
    if (!spouseAdj.has(a)) spouseAdj.set(a, new Set());
    spouseAdj.get(a)!.add(b);
  };
  for (const rel of effectiveRelationships) {
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

  const viewerParentIds = parentIdsByChild.get(layoutRootId);
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
    const rowMembers = byGenRefined.get(gen) || [];
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
    const rowGap = 186 + row * 16;
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
      const unitSpacing = 148;
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
      const rowMembers = byGenRefined.get(gen) || [];
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
    const motherRow = rowIndexByGen.get(refinedGeneration.get(motherParent.id) ?? 0);
    if (motherRow != null) {
      const motherParents = parentIdsByChild.get(motherParent.id) || new Set<string>();
      const rowIds = (byGenRefined.get(orderedRows[motherRow]) || []).map((m) => m.id);
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
    const spacing = 184;
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
  for (const rel of effectiveRelationships) {
    if (rel.type !== "spouse") continue;
    const a = positions.get(rel.user_id);
    const b = positions.get(rel.relative_id);
    if (!a || !b) continue;
    if (Math.abs(a.y - b.y) > 1) continue;
    const dx = Math.abs(a.x - b.x);
  const minSpouseGap = 152;
    if (dx >= minSpouseGap) continue;
    const mid = (a.x + b.x) / 2;
    const leftId = a.x <= b.x ? rel.user_id : rel.relative_id;
    const rightId = a.x <= b.x ? rel.relative_id : rel.user_id;
    const y = a.y;
    positions.set(leftId, { x: mid - minSpouseGap / 2, y });
    positions.set(rightId, { x: mid + minSpouseGap / 2, y });
  }

  const ensureRowSpacing = (minGap: number) => {
    for (const gen of orderedRows) {
      const rowMembers = byGenRefined.get(gen) || [];
      const ordered = rowMembers
        .map((m) => ({ id: m.id, pos: positions.get(m.id) }))
        .filter((entry): entry is { id: string; pos: { x: number; y: number } } => !!entry.pos)
        .sort((a, b) => a.pos.x - b.pos.x);
      for (let i = 1; i < ordered.length; i++) {
        const prev = ordered[i - 1];
        const cur = ordered[i];
        if (cur.pos.x - prev.pos.x < minGap) {
          const nextX = prev.pos.x + minGap;
          positions.set(cur.id, { x: nextX, y: cur.pos.y });
          ordered[i].pos = { x: nextX, y: cur.pos.y };
        }
      }
    }
  };

  // 2) Ensure minimum horizontal gap across each generation row.
  ensureRowSpacing(156);

  // Keep parent couples visually paired over their shared child branch after
  // descendant anchoring and row spacing. Without this, a parent's sibling can
  // drift between spouses and make the tree read as the wrong couple.
  const restoreSharedChildSpousePairs = () => {
    const pairGap = 156;
    for (const rel of effectiveRelationships) {
      if (rel.type !== "spouse") continue;
      const a = positions.get(rel.user_id);
      const b = positions.get(rel.relative_id);
      if (!a || !b || Math.abs(a.y - b.y) > 1) continue;

      const aChildren = childIdsByParent.get(rel.user_id) ?? new Set<string>();
      const bChildren = childIdsByParent.get(rel.relative_id) ?? new Set<string>();
      const sharedChildXs = [...aChildren]
        .filter((childId) => bChildren.has(childId))
        .map((childId) => positions.get(childId)?.x)
        .filter((x): x is number => x != null);
      if (sharedChildXs.length === 0) continue;

      const center = sharedChildXs.reduce((sum, x) => sum + x, 0) / sharedChildXs.length;
      const first = memberById.get(rel.user_id);
      const second = memberById.get(rel.relative_id);
      const leftId =
        first?.gender === "female" && second?.gender === "male" ? rel.relative_id : rel.user_id;
      const rightId = leftId === rel.user_id ? rel.relative_id : rel.user_id;
      const leftX = center - pairGap / 2;
      const rightX = center + pairGap / 2;
      positions.set(leftId, { x: leftX, y: a.y });
      positions.set(rightId, { x: rightX, y: a.y });

      const buffer = 340;
      for (const [id, pos] of positions.entries()) {
        if (id === leftId || id === rightId || Math.abs(pos.y - a.y) > 1) continue;
        if (pos.x < leftX - buffer || pos.x > rightX + buffer) continue;
        const nextX = pos.x < center ? leftX - buffer : rightX + buffer;
        positions.set(id, { x: nextX, y: pos.y });
      }
    }
  };

  restoreSharedChildSpousePairs();
  ensureRowSpacing(196);
  restoreSharedChildSpousePairs();
  ensureRowSpacing(196);

  const nodes: TreeLayoutNode[] = members
    .map((profile) => {
      const pos = positions.get(profile.id);
      if (!pos) return null;
      return { profile, ...pos, generation: refinedGeneration.get(profile.id) ?? 0 };
    })
    .filter((node): node is TreeLayoutNode => node !== null);

  const connectionSet = new Set<string>();
  const connections: TreeLayoutConnection[] = [];

  for (const rel of effectiveRelationships) {
    if (!positions.has(rel.user_id) || !positions.has(rel.relative_id)) continue;

    if (rel.type === "spouse") {
      const pair = [rel.user_id, rel.relative_id].sort();
      const key = `spouse:${pair[0]}:${pair[1]}`;
      if (connectionSet.has(key)) continue;
      connectionSet.add(key);
      connections.push({
        from: pair[0],
        to: pair[1],
        type: "spouse",
        marriageDate: rel.marriage_date ?? null,
      });
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

  const siblingAdj = new Map<string, Set<string>>();
  const addSiblingLink = (a: string, b: string) => {
    if (!positions.has(a) || !positions.has(b)) return;
    if (!siblingAdj.has(a)) siblingAdj.set(a, new Set());
    if (!siblingAdj.has(b)) siblingAdj.set(b, new Set());
    siblingAdj.get(a)!.add(b);
    siblingAdj.get(b)!.add(a);
  };
  for (const rel of effectiveRelationships) {
    if (rel.type !== "sibling" && rel.type !== "half_sibling") continue;
    addSiblingLink(rel.user_id, rel.relative_id);
  }

  const childIdsAlreadyInSibship = new Set(sibships.flatMap((sib) => sib.children));
  const seenSiblingIds = new Set<string>();
  for (const member of members) {
    if (seenSiblingIds.has(member.id)) continue;
    const stack = [member.id];
    const component: string[] = [];
    seenSiblingIds.add(member.id);
    while (stack.length > 0) {
      const current = stack.pop()!;
      component.push(current);
      const siblings = siblingAdj.get(current);
      if (!siblings) continue;
      for (const siblingId of siblings) {
        if (seenSiblingIds.has(siblingId)) continue;
        seenSiblingIds.add(siblingId);
        stack.push(siblingId);
      }
    }
    const parentlessSiblingChildren = component
      .filter((id) => !childIdsAlreadyInSibship.has(id))
      .sort((a, b) => (positions.get(a)?.x ?? 0) - (positions.get(b)?.x ?? 0));
    if (parentlessSiblingChildren.length >= 2) {
      sibships.push({ parents: [], children: parentlessSiblingChildren });
    }
  }

  return { nodes, connections, sibships, width, height };
}
