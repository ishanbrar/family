import { formatDateOnly, formatPersonName, parseDateOnly } from "./display-format";
import type { Profile, Relationship } from "./types";

export type MilestoneKind = "birthday" | "anniversary" | "memorial";

export interface FamilyMilestone {
  id: string;
  kind: MilestoneKind;
  title: string;
  detail: string;
  dateLabel: string;
  daysFromToday: number;
  memberIds: string[];
}

export interface FamilyMilestonesResult {
  today: FamilyMilestone[];
  recentlyPassed: FamilyMilestone[];
  upcoming: FamilyMilestone[];
  hasTodayAlert: boolean;
  totalCount: number;
}

export interface BuildFamilyMilestonesOptions {
  today?: Date;
  recentDays?: number;
  upcomingDays?: number;
}

const DEFAULT_RECENT_DAYS = 30;
const DEFAULT_UPCOMING_DAYS = 60;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function diffDays(target: Date, reference: Date): number {
  const msPerDay = 86_400_000;
  return Math.round((startOfDay(target).getTime() - startOfDay(reference).getTime()) / msPerDay);
}

function getMonthDayDelta(month: number, day: number, reference: Date): number | null {
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;

  const ref = startOfDay(reference);
  const target = new Date(ref.getFullYear(), month, day);
  if (Number.isNaN(target.getTime())) return null;

  let delta = diffDays(target, ref);
  if (delta > 183) delta -= 365;
  if (delta < -183) delta += 365;
  return delta;
}

function yearsSince(month: number, day: number, year: number, reference: Date): number {
  let years = reference.getFullYear() - year;
  const monthOffset = reference.getMonth() - month;
  if (monthOffset < 0 || (monthOffset === 0 && reference.getDate() < day)) {
    years -= 1;
  }
  return Math.max(0, years);
}

function turningAge(dateOfBirth: string, reference: Date): number | null {
  const birth = parseDateOnly(dateOfBirth);
  if (!birth) return null;
  return yearsSince(birth.getMonth(), birth.getDate(), birth.getFullYear(), reference) + 1;
}

function occurrenceDateLabel(month: number, day: number, reference: Date): string {
  const refYear = reference.getFullYear();
  let targetYear = refYear;
  const delta = getMonthDayDelta(month, day, reference);
  if (delta != null && delta < -183) targetYear += 1;
  if (delta != null && delta > 183) targetYear -= 1;

  const formatted = formatDateOnly(
    `${targetYear}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
    { month: "short", day: "numeric" }
  );
  return formatted || `${month + 1}/${day}`;
}

function categorizeMilestone(
  milestone: FamilyMilestone,
  todayItems: FamilyMilestone[],
  recentItems: FamilyMilestone[],
  upcomingItems: FamilyMilestone[],
  recentDays: number,
  upcomingDays: number
) {
  if (milestone.daysFromToday === 0) {
    todayItems.push(milestone);
    return;
  }
  if (milestone.daysFromToday >= -recentDays && milestone.daysFromToday < 0) {
    recentItems.push(milestone);
    return;
  }
  if (milestone.daysFromToday > 0 && milestone.daysFromToday <= upcomingDays) {
    upcomingItems.push(milestone);
  }
}

export function buildFamilyMilestones(
  members: Profile[],
  relationships: Relationship[],
  options: BuildFamilyMilestonesOptions = {}
): FamilyMilestonesResult {
  const today = startOfDay(options.today ?? new Date());
  const recentDays = options.recentDays ?? DEFAULT_RECENT_DAYS;
  const upcomingDays = options.upcomingDays ?? DEFAULT_UPCOMING_DAYS;

  const memberById = new Map(members.map((member) => [member.id, member]));
  const todayItems: FamilyMilestone[] = [];
  const recentItems: FamilyMilestone[] = [];
  const upcomingItems: FamilyMilestone[] = [];
  const seenPairs = new Set<string>();

  for (const member of members) {
    if (member.date_of_birth) {
      const birth = parseDateOnly(member.date_of_birth);
      if (birth) {
        const delta = getMonthDayDelta(birth.getMonth(), birth.getDate(), today);
        if (delta != null) {
          const age = turningAge(member.date_of_birth, today);
          categorizeMilestone(
            {
              id: `birthday:${member.id}`,
              kind: "birthday",
              title: formatPersonName(member.first_name, member.last_name),
              detail: age != null ? `Turning ${age}` : "Birthday",
              dateLabel: occurrenceDateLabel(birth.getMonth(), birth.getDate(), today),
              daysFromToday: delta,
              memberIds: [member.id],
            },
            todayItems,
            recentItems,
            upcomingItems,
            recentDays,
            upcomingDays
          );
        }
      }
    }

    if (member.date_of_death) {
      const death = parseDateOnly(member.date_of_death);
      if (death) {
        const delta = getMonthDayDelta(death.getMonth(), death.getDate(), today);
        if (delta != null) {
          const years = yearsSince(death.getMonth(), death.getDate(), death.getFullYear(), today);
          categorizeMilestone(
            {
              id: `memorial:${member.id}`,
              kind: "memorial",
              title: formatPersonName(member.first_name, member.last_name),
              detail: years > 0 ? `${years} year${years === 1 ? "" : "s"} remembered` : "Remembrance",
              dateLabel: occurrenceDateLabel(death.getMonth(), death.getDate(), today),
              daysFromToday: delta,
              memberIds: [member.id],
            },
            todayItems,
            recentItems,
            upcomingItems,
            recentDays,
            upcomingDays
          );
        }
      }
    }
  }

  for (const relationship of relationships) {
    if (relationship.type !== "spouse" || !relationship.marriage_date) continue;

    const pairKey = [relationship.user_id, relationship.relative_id].sort().join("::");
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);

    const partnerA = memberById.get(relationship.user_id);
    const partnerB = memberById.get(relationship.relative_id);
    if (!partnerA || !partnerB) continue;

    const marriage = parseDateOnly(relationship.marriage_date);
    if (!marriage) continue;

    const delta = getMonthDayDelta(marriage.getMonth(), marriage.getDate(), today);
    if (delta == null) continue;

    const years = yearsSince(marriage.getMonth(), marriage.getDate(), marriage.getFullYear(), today);
    categorizeMilestone(
      {
        id: `anniversary:${pairKey}`,
        kind: "anniversary",
        title: `${formatPersonName(partnerA.first_name, partnerA.last_name)} & ${formatPersonName(partnerB.first_name, partnerB.last_name)}`,
        detail: years > 0 ? `${years} year${years === 1 ? "" : "s"} together` : "Anniversary",
        dateLabel: occurrenceDateLabel(marriage.getMonth(), marriage.getDate(), today),
        daysFromToday: delta,
        memberIds: [partnerA.id, partnerB.id],
      },
      todayItems,
      recentItems,
      upcomingItems,
      recentDays,
      upcomingDays
    );
  }

  todayItems.sort((a, b) => a.title.localeCompare(b.title));
  recentItems.sort((a, b) => b.daysFromToday - a.daysFromToday);
  upcomingItems.sort((a, b) => a.daysFromToday - b.daysFromToday);

  const totalCount = todayItems.length + recentItems.length + upcomingItems.length;

  return {
    today: todayItems,
    recentlyPassed: recentItems,
    upcoming: upcomingItems,
    hasTodayAlert: todayItems.length > 0,
    totalCount,
  };
}
