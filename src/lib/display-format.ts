import type { Gender, Profile } from "./types";

function formatWord(word: string): string {
  if (!word) return "";
  if (word === word.toUpperCase() && word.length <= 3) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

export function formatDisplayText(value: string | null | undefined): string {
  const normalized = (value || "").trim();
  if (!normalized) return "";
  return normalized
    .split(/\s+/)
    .map(formatWord)
    .join(" ");
}

export function formatPersonName(firstName: string, lastName?: string | null): string {
  const parts = [formatDisplayText(firstName), formatDisplayText(lastName || "")]
    .filter(Boolean);
  return parts.join(" ");
}

export function formatFamilyTreeTitle(
  familyName: string | null | undefined,
  fallbackLastName?: string | null
): string {
  const normalized = formatDisplayText(familyName || fallbackLastName || "Family");
  if (/family tree$/i.test(normalized)) return normalized;
  if (/family$/i.test(normalized)) return `${normalized} Tree`;
  return `${normalized} Family Tree`;
}

function parseYear(value: string | null | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).getUTCFullYear();
}

export function calculateAggregateYearsLived(
  profiles: Profile[],
  referenceYear = new Date().getUTCFullYear()
): {
  totalYears: number;
  excludedCount: number;
} {
  let totalYears = 0;
  let excludedCount = 0;

  for (const profile of profiles) {
    const birthYear = parseYear(profile.date_of_birth);
    const deathYear = parseYear(profile.date_of_death);

    if (!birthYear) {
      excludedCount += 1;
      continue;
    }

    const finalYear = profile.is_alive ? referenceYear : deathYear;
    if (!finalYear || finalYear < birthYear) {
      excludedCount += 1;
      continue;
    }

    totalYears += finalYear - birthYear;
  }

  return { totalYears, excludedCount };
}

export function formatGenderLabel(gender: Gender | null | undefined): string | null {
  if (!gender) return null;
  return formatDisplayText(gender);
}
