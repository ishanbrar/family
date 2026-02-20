"use client";

import { useEffect, useState } from "react";
import { Sun } from "lucide-react";
import {
  resolveAppliedThemeMode,
  setThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "@/lib/theme";

export function ThemeToggle() {
  // Keep first render deterministic for SSR/CSR hydration parity.
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const sync = () => setTheme(resolveAppliedThemeMode());
    sync();
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
      className="fixed right-4 top-4 z-30 glass rounded-xl w-11 h-11 sm:w-10 sm:h-10 min-w-[44px] min-h-[44px]
        text-white/70 hover:text-gold-300 active:scale-[0.97] transition-colors
        inline-flex items-center justify-center shadow-lg touch-target-44 sm:min-w-0 sm:min-h-0"
      style={{
        top: "max(env(safe-area-inset-top), 0.75rem)",
        right: "max(env(safe-area-inset-right), 0.75rem)",
      }}
    >
      <Sun size={16} />
    </button>
  );
}
