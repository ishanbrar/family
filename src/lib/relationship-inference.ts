import type { Relationship, RelationshipType } from "./types";

export interface InferredRelationship {
  userId: string;
  relativeId: string;
  type: "parent" | "sibling";
}

function hasExactRelationship(
  relationships: Relationship[],
  userId: string,
  relativeId: string,
  type: RelationshipType
): boolean {
  return relationships.some(
    (rel) =>
      rel.user_id === userId &&
      rel.relative_id === relativeId &&
      rel.type === type
  );
}

function hasParentChildRelationship(
  relationships: Relationship[],
  parentId: string,
  childId: string
): boolean {
  return relationships.some(
    (rel) =>
      (rel.type === "parent" &&
        rel.user_id === parentId &&
        rel.relative_id === childId) ||
      (rel.type === "child" &&
        rel.user_id === childId &&
        rel.relative_id === parentId)
  );
}

function getParentIdsForMember(
  relationships: Relationship[],
  memberId: string
): Set<string> {
  const parentIds = new Set<string>();
  for (const rel of relationships) {
    if (rel.type === "parent" && rel.relative_id === memberId) {
      parentIds.add(rel.user_id);
    } else if (rel.type === "child" && rel.user_id === memberId) {
      parentIds.add(rel.relative_id);
    }
  }
  return parentIds;
}

function getChildrenForParent(
  relationships: Relationship[],
  parentId: string
): Set<string> {
  const children = new Set<string>();
  for (const rel of relationships) {
    if (rel.type === "parent" && rel.user_id === parentId) {
      children.add(rel.relative_id);
    } else if (rel.type === "child" && rel.relative_id === parentId) {
      children.add(rel.user_id);
    }
  }
  return children;
}

function getSpouseIds(
  relationships: Relationship[],
  memberId: string
): Set<string> {
  const spouses = new Set<string>();
  for (const rel of relationships) {
    if (rel.type !== "spouse") continue;
    if (rel.user_id === memberId) spouses.add(rel.relative_id);
    else if (rel.relative_id === memberId) spouses.add(rel.user_id);
  }
  return spouses;
}

function inferSpouseParentRelationships(
  relationships: Relationship[],
  parentId: string,
  childId: string
): InferredRelationship[] {
  const inferred: InferredRelationship[] = [];
  for (const spouseId of getSpouseIds(relationships, parentId)) {
    if (hasParentChildRelationship(relationships, spouseId, childId)) continue;
    if (inferred.some((r) => r.userId === spouseId && r.relativeId === childId)) continue;
    inferred.push({ userId: spouseId, relativeId: childId, type: "parent" });
  }
  return inferred;
}

function hasSiblingRelationship(
  relationships: Relationship[],
  aId: string,
  bId: string
): boolean {
  return relationships.some(
    (rel) =>
      (rel.type === "sibling" || rel.type === "half_sibling") &&
      ((rel.user_id === aId && rel.relative_id === bId) ||
        (rel.user_id === bId && rel.relative_id === aId))
  );
}

function getSharedChildren(
  relationships: Relationship[],
  parentId: string
): Set<string> {
  const children = new Set(getChildrenForParent(relationships, parentId));
  for (const spouseId of getSpouseIds(relationships, parentId)) {
    for (const childId of getChildrenForParent(relationships, spouseId)) {
      children.add(childId);
    }
  }
  return children;
}

function inferSiblingRelationshipsFromParentChild(
  relationships: Relationship[],
  parentId: string,
  childId: string
): InferredRelationship[] {
  const inferred: InferredRelationship[] = [];
  const siblings = getSharedChildren(relationships, parentId);
  for (const siblingId of siblings) {
    if (siblingId === childId) continue;
    if (hasSiblingRelationship(relationships, childId, siblingId)) continue;
    if (
      inferred.some(
        (r) =>
          (r.userId === childId && r.relativeId === siblingId) ||
          (r.userId === siblingId && r.relativeId === childId)
      )
    ) {
      continue;
    }
    inferred.push({ userId: childId, relativeId: siblingId, type: "sibling" });
  }
  return inferred;
}

function inferSiblingParentRelationships(
  relationships: Relationship[],
  memberAId: string,
  memberBId: string,
  type: RelationshipType
): InferredRelationship[] {
  if (type !== "sibling") return [];

  const parentsOfA = getParentIdsForMember(relationships, memberAId);
  const parentsOfB = getParentIdsForMember(relationships, memberBId);
  const inferred: InferredRelationship[] = [];

  const addInferred = (parentId: string, childId: string) => {
    if (hasParentChildRelationship(relationships, parentId, childId)) return;
    if (inferred.some((rel) => rel.userId === parentId && rel.relativeId === childId)) return;
    inferred.push({ userId: parentId, relativeId: childId, type: "parent" });
  };

  const allParents = new Set([...parentsOfA, ...parentsOfB]);
  for (const parentId of allParents) {
    addInferred(parentId, memberAId);
    addInferred(parentId, memberBId);
  }

  return inferred;
}

function appendInferred(
  relationships: Relationship[],
  inferred: InferredRelationship[]
): Relationship[] {
  return [
    ...relationships,
    ...inferred.map((rel, index) => ({
      id: `inferred-${index}`,
      user_id: rel.userId,
      relative_id: rel.relativeId,
      type: rel.type,
      created_at: "",
    })),
  ];
}

function inferredRelationshipId(rel: InferredRelationship, index: number): string {
  return `inferred:${rel.type}:${rel.userId}:${rel.relativeId}:${index}`;
}

function addAssumedRelationship(
  relationships: Relationship[],
  inferred: InferredRelationship[],
  userId: string,
  relativeId: string,
  type: InferredRelationship["type"]
): void {
  if (userId === relativeId) return;
  if (type === "parent" && hasParentChildRelationship(relationships, userId, relativeId)) return;
  if (type === "sibling" && hasSiblingRelationship(relationships, userId, relativeId)) return;
  if (
    inferred.some((rel) => {
      if (rel.type !== type) return false;
      if (type === "parent") return rel.userId === userId && rel.relativeId === relativeId;
      return (
        (rel.userId === userId && rel.relativeId === relativeId) ||
        (rel.userId === relativeId && rel.relativeId === userId)
      );
    })
  ) {
    return;
  }
  inferred.push({ userId, relativeId, type });
}

export function inferAssumedRelationships(relationships: Relationship[]): Relationship[] {
  let working = relationships;
  const allInferred: InferredRelationship[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    const inferredThisPass: InferredRelationship[] = [];

    for (const rel of working) {
      if (rel.type === "parent" || rel.type === "child") {
        const parentId = rel.type === "parent" ? rel.user_id : rel.relative_id;
        const childId = rel.type === "parent" ? rel.relative_id : rel.user_id;

        for (const spouseId of getSpouseIds(working, parentId)) {
          addAssumedRelationship(working, inferredThisPass, spouseId, childId, "parent");
        }

        for (const siblingId of getSharedChildren(working, parentId)) {
          addAssumedRelationship(working, inferredThisPass, childId, siblingId, "sibling");
        }
      }

      if (rel.type === "sibling") {
        const parentsOfA = getParentIdsForMember(working, rel.user_id);
        const parentsOfB = getParentIdsForMember(working, rel.relative_id);
        for (const parentId of parentsOfA) {
          addAssumedRelationship(working, inferredThisPass, parentId, rel.relative_id, "parent");
        }
        for (const parentId of parentsOfB) {
          addAssumedRelationship(working, inferredThisPass, parentId, rel.user_id, "parent");
        }
      }
    }

    if (inferredThisPass.length > 0) {
      changed = true;
      allInferred.push(...inferredThisPass);
      working = [
        ...working,
        ...inferredThisPass.map((rel, index) => ({
          id: inferredRelationshipId(rel, allInferred.length + index),
          user_id: rel.userId,
          relative_id: rel.relativeId,
          type: rel.type,
          created_at: "",
        })),
      ];
    }
  }

  return [
    ...relationships,
    ...allInferred.map((rel, index) => ({
      id: inferredRelationshipId(rel, index),
      user_id: rel.userId,
      relative_id: rel.relativeId,
      type: rel.type,
      created_at: "",
    })),
  ];
}

export function inferRelationshipsForNewLink(
  relationshipsWithDirectLink: Relationship[],
  fromMemberId: string,
  toMemberId: string,
  type: RelationshipType
): InferredRelationship[] {
  const inferred: InferredRelationship[] = [];
  let workingRelationships = relationshipsWithDirectLink;

  if (type === "parent" || type === "child") {
    const parentId = type === "parent" ? fromMemberId : toMemberId;
    const childId = type === "parent" ? toMemberId : fromMemberId;
    const spouseParents = inferSpouseParentRelationships(
      workingRelationships,
      parentId,
      childId
    );
    inferred.push(...spouseParents);
    workingRelationships = appendInferred(workingRelationships, spouseParents);

    const siblings = inferSiblingRelationshipsFromParentChild(
      workingRelationships,
      parentId,
      childId
    );
    inferred.push(...siblings);
    return inferred;
  }

  const siblingParents = inferSiblingParentRelationships(
    workingRelationships,
    fromMemberId,
    toMemberId,
    type
  );
  inferred.push(...siblingParents);
  return inferred;
}

export function relationshipExists(
  relationships: Relationship[],
  userId: string,
  relativeId: string,
  type: RelationshipType
): boolean {
  return hasExactRelationship(relationships, userId, relativeId, type);
}
