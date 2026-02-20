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
  showBirthCountryFlag?: boolean;
  onShowBirthCountryFlagChange?: (next: boolean) => void;
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
  showBirthCountryFlag = false,
  onShowBirthCountryFlagChange,
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
    Number(!!onShowDeathYearChange && showDeathYear) +
    Number(!!onShowBirthCountryFlagChange && showBirthCountryFlag);
  const controlClass =
    "h-11 min-h-[44px] sm:h-7 sm:min-h-0 touch-target-44 sm:min-w-0 rounded-lg sm:rounded-md px-3 sm:px-2 border border-gold-400/25 bg-gold-400/12 text-xs sm:text-[10px] font-medium text-gold-300 outline-none hover:bg-gold-400/18 active:scale-[0.98] transition-colors";

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-2">
        <Filter size={10} className="text-gold-300/80" />
        <select
          value={relatedByFilter || ""}
          onChange={(e) => onRelatedByFilterChange(e.target.value || null)}
          className={controlClass}
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
            className="w-11 h-11 sm:w-7 sm:h-7 touch-target-44 sm:min-h-0 sm:min-w-0 rounded-lg sm:rounded-md border border-gold-400/25 bg-gold-400/12 text-gold-300/75 hover:text-gold-300 hover:bg-gold-400/18 flex items-center justify-center"
            aria-label="Clear related by"
          >
            <X size={14} className="sm:w-2.5 sm:h-2.5" />
          </button>
        )}
      </div>

      <div className="relative" ref={optionsRef}>
        <button
          type="button"
          onClick={() => setOptionsOpen((prev) => !prev)}
          className={`${controlClass} inline-flex items-center gap-1.5`}
          aria-haspopup="menu"
          aria-expanded={optionsOpen}
        >
          <SlidersHorizontal size={10} />
          Display
          <span className="inline-flex items-center justify-center min-w-4 h-4 px-1 rounded-sm bg-gold-400/20 text-[9px] text-gold-300/90">
            {optionCount}
          </span>
          <ChevronDown size={10} className={optionsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>

        {optionsOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 sm:w-52 rounded-xl app-popover border border-white/[0.12] p-3 sm:p-2.5 shadow-2xl z-40"
          >
            <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
              <input
                type="checkbox"
                checked={showPercentages}
                onChange={(e) => onShowPercentagesChange(e.target.checked)}
                className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
              />
              Show %
            </label>
            <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
              <input
                type="checkbox"
                checked={showRelationLabels}
                onChange={(e) => onShowRelationLabelsChange(e.target.checked)}
                className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
              />
              Show relations
            </label>
            <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
              <input
                type="checkbox"
                checked={showLastNames}
                onChange={(e) => onShowLastNamesChange(e.target.checked)}
                className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
              />
              Show last names
            </label>
            {onShowBirthYearChange && (
              <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  checked={showBirthYear}
                  onChange={(e) => onShowBirthYearChange(e.target.checked)}
                  className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
                />
                Show birth year
              </label>
            )}
            {onShowDeathYearChange && (
              <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  checked={showDeathYear}
                  onChange={(e) => onShowDeathYearChange(e.target.checked)}
                  className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
                />
                Show death year
              </label>
            )}
            {onShowBirthCountryFlagChange && (
              <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  checked={showBirthCountryFlag}
                  onChange={(e) => onShowBirthCountryFlagChange(e.target.checked)}
                  className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
                />
                Show birth country flag
              </label>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
