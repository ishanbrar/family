"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  resolveAppliedThemeMode,
  resolveInitialTheme,
  setThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "@/lib/theme";

export function ThemeToggle() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") return resolveAppliedThemeMode();
    return resolveInitialTheme();
  });

  useEffect(() => {
    const sync = () => setTheme(resolveAppliedThemeMode());
    window.addEventListener(THEME_CHANGE_EVENT, sync);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, sync);
  }, []);

  const nextTheme: ThemeMode = theme === "dark" ? "light" : "dark";

  const toggleTheme = () => {
    const updated = nextTheme;
    setThemeMode(updated);
    setTheme(updated);
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      suppressHydrationWarning
      className="fixed right-4 top-4 z-[100] glass rounded-xl px-3 py-2.5
        text-xs text-white/70 hover:text-gold-300 transition-colors
        flex items-center gap-2 shadow-lg"
    >
      {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      <span className="hidden sm:inline">{theme === "dark" ? "Light mode" : "Dark mode"}</span>
    </button>
  );
}
