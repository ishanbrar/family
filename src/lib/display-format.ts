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

export function normalizePersonNameInput(value: string | null | undefined): string {
  return formatDisplayText(value);
}

export function formatPersonName(
  firstName: string,
  middleNameOrLastName?: string | null,
  lastName?: string | null,
  namePrefix?: string | null
): string {
  const middleName = lastName === undefined ? "" : middleNameOrLastName;
  const finalLastName = lastName === undefined ? middleNameOrLastName : lastName;
  const parts = [
    formatDisplayText(namePrefix || ""),
    formatDisplayText(firstName),
    formatDisplayText(middleName || ""),
    formatDisplayText(finalLastName || ""),
  ]
    .filter(Boolean);
  return parts.join(" ");
}

export function formatProfileName(
  profile: Pick<Profile, "first_name" | "last_name" | "middle_name" | "name_prefix">,
  options: { includeMiddle?: boolean; includePrefix?: boolean } = {}
): string {
  return formatPersonName(
    profile.first_name,
    options.includeMiddle ? profile.middle_name || "" : "",
    profile.last_name,
    options.includePrefix ? profile.name_prefix || "" : ""
  );
}

export function formatProfileFullName(
  profile: Pick<Profile, "first_name" | "last_name" | "middle_name" | "name_prefix">
): string {
  return formatProfileName(profile, { includeMiddle: true, includePrefix: true });
}

export function getProfileInitials(
  profile: Pick<Profile, "first_name" | "last_name">
): string {
  return `${profile.first_name?.[0] || ""}${profile.last_name?.[0] || ""}`.toUpperCase();
}

export function parseDateOnly(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

export function formatDateOnly(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", year: "numeric" }
): string | null {
  const date = parseDateOnly(value);
  if (!date) return null;
  return date.toLocaleDateString("en-US", options);
}

export function calculateAgeFromDateOnly(
  value: string | null | undefined,
  today = new Date()
): number | null {
  const birth = parseDateOnly(value);
  if (!birth) return null;

  let years = today.getFullYear() - birth.getFullYear();
  const monthOffset = today.getMonth() - birth.getMonth();
  if (monthOffset < 0 || (monthOffset === 0 && today.getDate() < birth.getDate())) {
    years -= 1;
  }
  return years;
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
