"use client";

import { LegatreeTreeIcon } from "@/components/branding/LegatreeTreeIcon";
import { cn } from "@/lib/cn";

interface LegatreeLoaderProps {
  label?: string;
  fullScreen?: boolean;
  className?: string;
}

export function LegatreeLoader({
  label = "Loading...",
  fullScreen = false,
  className,
}: LegatreeLoaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 text-center",
        fullScreen && "min-h-screen bg-[color:var(--background)]",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl border border-white/[0.08] bg-white/[0.035] shadow-[0_20px_70px_rgba(0,0,0,0.12)]">
        <LegatreeTreeIcon
          size={72}
          alt=""
          className="legatree-loader-mark drop-shadow-[0_10px_28px_rgb(var(--accent-rgb)/0.22)]"
        />
      </div>
      {label ? <p className="text-xs font-medium app-text-muted">{label}</p> : null}
    </div>
  );
}
