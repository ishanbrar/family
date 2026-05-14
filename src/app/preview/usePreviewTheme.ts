"use client";

import { resolveAppliedThemeMode, type ThemeMode } from "@/lib/theme";

export function usePreviewTheme(): ThemeMode {
  return resolveAppliedThemeMode();
}
