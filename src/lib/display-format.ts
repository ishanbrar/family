import type { Gender } from "./types";

export function formatGenderLabel(gender: Gender | null | undefined): string | null {
  if (!gender) return null;
  return gender.charAt(0).toUpperCase() + gender.slice(1);
}
