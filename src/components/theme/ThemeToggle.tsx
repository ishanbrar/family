"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sun } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  resolveAppliedThemeMode,
  setThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "@/lib/theme";

type ThemeToggleProps = {
  /** `fixed` for app/auth pages; `inline` in marketing header (homepage only). */
  placement?: "fixed" | "inline";
};

export function ThemeToggle({ placement = "fixed" }: ThemeToggleProps) {
  const pathname = usePathname();

  // Keep first render deterministic for SSR/CSR hydration parity.
  const [theme, setTheme] = useState<ThemeMode>("light");

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

  const isInline = placement === "inline";

  if (placement === "fixed" && pathname === "/") {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      suppressHydrationWarning
      className={cn(
        "glass rounded-xl min-w-[44px] min-h-[44px] w-10 h-10",
        "text-white/70 hover:text-gold-300 active:scale-[0.97] transition-colors",
        "inline-flex items-center justify-center touch-target-44",
        isInline
          ? "shrink-0 shadow-md"
          : "fixed z-30 w-11 h-11 sm:w-10 sm:h-10 shadow-lg sm:min-w-0 sm:min-h-0"
      )}
      style={
        isInline
          ? undefined
          : {
              top: "max(env(safe-area-inset-top), 0.75rem)",
              right: "max(env(safe-area-inset-right), 0.75rem)",
            }
      }
    >
      <Sun size={16} />
    </button>
  );
}
