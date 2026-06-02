import type { Relationship } from "./types";

export function findSpouseRelationship(
  relationships: Relationship[],
  memberId: string
): Relationship | null {
  return (
    relationships.find(
      (rel) =>
        rel.type === "spouse" &&
        (rel.user_id === memberId || rel.relative_id === memberId)
    ) ?? null
  );
}

export function getSpouseId(relationship: Relationship, memberId: string): string {
  return relationship.user_id === memberId ? relationship.relative_id : relationship.user_id;
}

export function spousePairKey(memberA: string, memberB: string): string {
  return memberA < memberB ? `${memberA}:${memberB}` : `${memberB}:${memberA}`;
}

export function findSpouseRelationshipBetween(
  relationships: Relationship[],
  memberA: string,
  memberB: string
): Relationship | null {
  return (
    relationships.find(
      (rel) =>
        rel.type === "spouse" &&
        ((rel.user_id === memberA && rel.relative_id === memberB) ||
          (rel.user_id === memberB && rel.relative_id === memberA))
    ) ?? null
  );
}

export function listSpouseRelationshipsForMember(
  relationships: Relationship[],
  memberId: string
): Relationship[] {
  return relationships.filter(
    (rel) =>
      rel.type === "spouse" &&
      (rel.user_id === memberId || rel.relative_id === memberId)
  );
}

export function buildMarriageDateByPair(
  relationships: Relationship[]
): Map<string, string> {
  const map = new Map<string, string>();
  for (const rel of relationships) {
    if (rel.type !== "spouse" || !rel.marriage_date) continue;
    map.set(spousePairKey(rel.user_id, rel.relative_id), rel.marriage_date);
  }
  return map;
}

export function normalizeMarriageDate(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, 10);
}

export function changedSpouseSaveFields({
  spouseId,
  marriageDate,
  initialSpouseId,
  initialMarriageDate,
}: {
  spouseId: string | null | undefined;
  marriageDate: string | null | undefined;
  initialSpouseId: string | null | undefined;
  initialMarriageDate: string | null | undefined;
}): { spouseId?: string | null; marriageDate?: string | null } {
  const nextSpouseId = spouseId || null;
  const nextMarriageDate = normalizeMarriageDate(marriageDate);
  const previousSpouseId = initialSpouseId || null;
  const previousMarriageDate = normalizeMarriageDate(initialMarriageDate);

  if (nextSpouseId === previousSpouseId && nextMarriageDate === previousMarriageDate) {
    return {};
  }

  return {
    spouseId: nextSpouseId,
    marriageDate: nextMarriageDate,
  };
}
