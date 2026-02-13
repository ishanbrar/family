import type { Profile } from "./types";

export interface GenerationNode {
  profile: Profile;
  y: number;
}

export interface GenerationFact {
  index: number;
  memberCount: number;
  oldest: Profile | null;
  youngest: Profile | null;
}

export interface TreeGenerationAnalytics {
  totalGenerations: number;
  generations: GenerationFact[];
}

function parseDate(value: string | null): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}

export function createGenerationAnalytics(nodes: GenerationNode[]): TreeGenerationAnalytics {
  if (nodes.length === 0) {
    return { totalGenerations: 0, generations: [] };
  }

  const byRow = new Map<number, Profile[]>();
  for (const node of nodes) {
    if (!byRow.has(node.y)) byRow.set(node.y, []);
    byRow.get(node.y)!.push(node.profile);
  }

  const sortedRows = [...byRow.entries()].sort((a, b) => a[0] - b[0]);
  const generations: GenerationFact[] = sortedRows.map(([, rowMembers], idx) => {
    const datedMembers = rowMembers
      .map((member) => ({ member, dob: parseDate(member.date_of_birth) }))
      .filter((entry): entry is { member: Profile; dob: number } => entry.dob !== null)
      .sort((a, b) => a.dob - b.dob);

    return {
      index: idx + 1,
      memberCount: rowMembers.length,
      oldest: datedMembers[0]?.member ?? null,
      youngest: datedMembers[datedMembers.length - 1]?.member ?? null,
    };
  });

  return {
    totalGenerations: generations.length,
    generations,
  };
}
