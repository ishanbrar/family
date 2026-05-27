"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Filter, RotateCcw, SlidersHorizontal, X } from "lucide-react";
import type { Profile } from "@/lib/types";
import { formatPersonName } from "@/lib/display-format";

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
  showCurrentCountryFlag?: boolean;
  onShowCurrentCountryFlagChange?: (next: boolean) => void;
  onResetView?: () => void;
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
  showCurrentCountryFlag = false,
  onShowCurrentCountryFlagChange,
  onResetView,
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
    Number(!!onShowBirthCountryFlagChange && showBirthCountryFlag) +
    Number(!!onShowCurrentCountryFlagChange && showCurrentCountryFlag);
  const controlClass =
    "app-control h-10 min-h-[44px] rounded-xl px-3.5 outline-none active:scale-[0.99]";

  return (
    <div className="flex items-center gap-2 flex-wrap font-sans">
      <div className="flex items-center gap-2">
        <Filter size={15} className="text-gold-300/80" />
        <select
          value={relatedByFilter || ""}
          onChange={(e) => onRelatedByFilterChange(e.target.value || null)}
          className={`${controlClass} min-w-[178px] appearance-none pr-9`}
        >
          <option value="">Related By...</option>
          {members.map((member) => (
            <option key={member.id} value={member.id}>
              {formatPersonName(member.first_name, member.last_name)}
            </option>
          ))}
        </select>
        {relatedByFilter && (
          <button
            onClick={() => onRelatedByFilterChange(null)}
            className="app-control app-icon-button flex items-center justify-center"
            aria-label="Clear related by"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="relative" ref={optionsRef}>
        <button
          type="button"
          onClick={() => setOptionsOpen((prev) => !prev)}
          className={`${controlClass} inline-flex items-center gap-2`}
          aria-haspopup="menu"
          aria-expanded={optionsOpen}
        >
          <SlidersHorizontal size={15} />
          Display
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-gold-400/16 text-xs text-gold-300/90">
            {optionCount}
          </span>
          <ChevronDown size={14} className={optionsOpen ? "rotate-180 transition-transform" : "transition-transform"} />
        </button>

        {optionsOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-2 w-64 sm:w-56 rounded-xl app-popover border border-white/[0.12] p-3 sm:p-2.5 shadow-2xl z-40"
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
            {onShowCurrentCountryFlagChange && (
              <label className="flex items-center gap-3 py-2.5 sm:py-1.5 px-2 rounded-lg text-sm sm:text-xs app-text-secondary hover:bg-white/[0.04] cursor-pointer min-h-[44px] sm:min-h-0">
                <input
                  type="checkbox"
                  checked={showCurrentCountryFlag}
                  onChange={(e) => onShowCurrentCountryFlagChange(e.target.checked)}
                  className="h-5 w-5 sm:h-3.5 sm:w-3.5 rounded border-white/20 bg-white/5 text-gold-400 flex-shrink-0"
                />
                Show current country flag
              </label>
            )}
          </div>
        )}
      </div>
      {onResetView && (
        <button
          type="button"
          onClick={onResetView}
          className={`${controlClass} inline-flex items-center gap-2`}
          title="Reset tree view"
        >
          <RotateCcw size={15} />
          Reset
        </button>
      )}
    </div>
  );
}
