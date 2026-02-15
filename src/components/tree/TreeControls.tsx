"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, SlidersHorizontal, X } from "lucide-react";
import type { Profile } from "@/lib/types";

interface TreeControlsProps {
  members: Profile[];
  relatedByFilter: string | null;
  onRelatedByFilterChange: (memberId: string | null) => void;
  showPercentages: boolean;
  onShowPercentagesChange: (next: boolean) => void;
  showRelationLabels: boolean;
  onShowRelationLabelsChange: (next: boolean) => void;
  showLastNames: boolean;
  onShowLastNamesChange: (next: boolean) => void;
  showBirthYear?: boolean;
  onShowBirthYearChange?: (next: boolean) => void;
  showDeathYear?: boolean;
  onShowDeathYearChange?: (next: boolean) => void;
}

export function TreeControls({
  members,
  relatedByFilter,
  onRelatedByFilterChange,
  showPercentages,
  onShowPercentagesChange,
  showRelationLabels,
  onShowRelationLabelsChange,
  showLastNames,
  onShowLastNamesChange,
  showBirthYear = false,
  onShowBirthYearChange,
  showDeathYear = false,
  onShowDeathYearChange,
}: TreeControlsProps) {
  const [optionsOpen, setOptionsOpen] = useState(false);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!optionsOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!optionsRef.current) return;
      if (!optionsRef.current.contains(event.target as Node)) {
        setOptionsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOptionsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [optionsOpen]);

  const optionCount =
    Number(showPercentages) +
    Number(showRelationLabels) +
    Number(showLastNames) +
    Number(!!onShowBirthYearChange && showBirthYear) +
    Number(!!onShowDeathYearChange && showDeathYear);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter size={12} className="app-text-muted" />
        <select
          value={relatedByFilter || ""}
          onChange={(e) => onRelatedByFilterChange(e.target.value || null)}
          className="h-9 rounded-lg px-3 app-input text-xs outline-none transition-colors"
        >
          <option value="">Related By...</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {member.first_name} {member.last_name}
            </option>
          ))}
        </select>
        {relatedByFilter && (
          <button
            onClick={() => onRelatedByFilterChange(null)}
            className="w-7 h-7 rounded-lg bg-white/[0.05] border border-white/[0.08] app-text-muted hover:text-white/85"
            aria-label="Clear related by"
          >
            <X size={12} className="mx-auto" />
          </button>
        )}
      </div>

      <div className="relative" ref={optionsRef}>
        <button
          type="button"
          onClick={() => setOptionsOpen((prev) => !prev)}
          className="h-9 inline-flex items-center gap-1.5 rounded-lg px-3 border border-white/[0.12] bg-white/[0.03] text-xs app-text-secondary hover:app-text-primary hover:border-gold-400/28 hover:bg-gold-400/[0.08] transition-colors"
          aria-haspopup="menu"
          aria-expanded={optionsOpen}
        >
          <SlidersHorizontal size={12} />
          Display
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-md bg-white/[0.06] text-[10px] app-text-muted">
            {optionCount}
          </span>
          <ChevronDown size={12} className={optionsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>

        {optionsOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-52 rounded-xl app-popover border border-white/[0.12] p-2.5 shadow-2xl z-40"
          >
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer">
              <input
                type="checkbox"
                checked={showPercentages}
                onChange={(e) => onShowPercentagesChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400"
              />
              Show %
            </label>
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer">
              <input
                type="checkbox"
                checked={showRelationLabels}
                onChange={(e) => onShowRelationLabelsChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400"
              />
              Show relations
            </label>
            <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer">
              <input
                type="checkbox"
                checked={showLastNames}
                onChange={(e) => onShowLastNamesChange(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400"
              />
              Show last names
            </label>
            {onShowBirthYearChange && (
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showBirthYear}
                  onChange={(e) => onShowBirthYearChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400"
                />
                Show birth year
              </label>
            )}
            {onShowDeathYearChange && (
              <label className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer">
                <input
                  type="checkbox"
                  checked={showDeathYear}
                  onChange={(e) => onShowDeathYearChange(e.target.checked)}
                  className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 text-gold-400"
                />
                Show death year
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
