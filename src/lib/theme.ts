export type ThemeMode = "dark" | "light";
export type ThemePalette = "gold" | "blue" | "red" | "yellow";

export const THEME_STORAGE_KEY = "legatree:theme-mode";
export const THEME_EXPLICIT_KEY = "legatree:theme-explicit";
export const THEME_PALETTE_STORAGE_KEY = "legatree:theme-palette";
export const THEME_CHANGE_EVENT = "legatree:theme-change";

const MODE_VALUES: ThemeMode[] = ["dark", "light"];
const PALETTE_VALUES: ThemePalette[] = ["gold", "blue", "red", "yellow"];

function isThemeMode(value: string | null): value is ThemeMode {
  return value !== null && MODE_VALUES.includes(value as ThemeMode);
}

function isThemePalette(value: string | null): value is ThemePalette {
  return value !== null && PALETTE_VALUES.includes(value as ThemePalette);
}

export function resolveThemeModeFromStorage(
  stored: string | null,
  explicit: boolean
): ThemeMode {
  if (explicit && isThemeMode(stored)) return stored;
  return "light";
}

function resolveStoredThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "light";

  const explicit = window.localStorage.getItem(THEME_EXPLICIT_KEY) === "1";
  const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
  return resolveThemeModeFromStorage(stored, explicit);
}

export function resolveInitialTheme(): ThemeMode {
  return resolveStoredThemeMode();
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
  root.style.colorScheme = mode;
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
    window.localStorage.setItem(THEME_EXPLICIT_KEY, "1");
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
