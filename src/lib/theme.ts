export type ThemeMode = "dark" | "light";
export type ThemePalette = "gold" | "blue" | "red" | "yellow";

export const THEME_STORAGE_KEY = "legacy:theme-mode";
export const THEME_PALETTE_STORAGE_KEY = "legacy:theme-palette";
export const THEME_CHANGE_EVENT = "legacy:theme-change";

const MODE_VALUES: ThemeMode[] = ["dark", "light"];
const PALETTE_VALUES: ThemePalette[] = ["gold", "blue", "red", "yellow"];

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && MODE_VALUES.includes(value as ThemeMode);
}

function isThemePalette(value: string | null): value is ThemePalette {
  return value !== null && PALETTE_VALUES.includes(value as ThemePalette);
}

export function resolveInitialTheme(): ThemeMode {
  if (typeof window === "undefined") return "dark";

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (isThemeMode(stored)) return stored;

  return window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

export function resolveInitialPalette(): ThemePalette {
  if (typeof window === "undefined") return "gold";

  const stored = window.localStorage.getItem(THEME_PALETTE_STORAGE_KEY);
  if (isThemePalette(stored)) return stored;

  return "gold";
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(mode);
}

export function applyThemePalette(palette: ThemePalette): void {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("theme-gold", "theme-blue", "theme-red", "theme-yellow");
  root.classList.add(`theme-${palette}`);
}

export function resolveAppliedThemeMode(): ThemeMode {
  if (typeof document !== "undefined" && document.documentElement.classList.contains("light")) {
    return "light";
  }
  return "dark";
}

export function resolveAppliedThemePalette(): ThemePalette {
  if (typeof document !== "undefined") {
    const root = document.documentElement;
    if (root.classList.contains("theme-blue")) return "blue";
    if (root.classList.contains("theme-red")) return "red";
    if (root.classList.contains("theme-yellow")) return "yellow";
  }
  return "gold";
}

function emitThemeChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

export function setThemeMode(mode: ThemeMode): void {
  applyTheme(mode);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  }
  emitThemeChange();
}

export function setThemePalette(palette: ThemePalette): void {
  applyThemePalette(palette);
  if (typeof window !== "undefined") {
    window.localStorage.setItem(THEME_PALETTE_STORAGE_KEY, palette);
  }
  emitThemeChange();
}
