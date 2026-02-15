"use client";

// ══════════════════════════════════════════════════════════
// CitySearch – Autocomplete City Selector
// Type-ahead search with glassmorphic dropdown.
// ══════════════════════════════════════════════════════════

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Search } from "lucide-react";
import { searchCities, type City } from "@/lib/cities";
import { cn } from "@/lib/cn";

interface CitySearchProps {
  value: string;
  onChange: (city: string) => void;
  placeholder?: string;
  className?: string;
}

export function CitySearch({
  value,
  onChange,
  placeholder = "Search a city...",
  className,
}: CitySearchProps) {
  const MAX_RESULTS = 14;
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<City[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    const matches = searchCities(text, MAX_RESULTS);
    setResults(matches);
    setIsOpen(matches.length > 0);
    setActiveIndex(-1);
  }, [MAX_RESULTS]);

  const handleSelect = useCallback(
    (city: City) => {
      setQuery(city.label);
      onChange(city.label);
      setIsOpen(false);
      setResults([]);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && activeIndex >= 0) {
        e.preventDefault();
        handleSelect(results[activeIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    },
    [isOpen, activeIndex, results, handleSelect]
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <MapPin
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 app-input-icon"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => {
            const matches = searchCities(query, MAX_RESULTS);
            setResults(matches);
            setIsOpen(matches.length > 0);
          }}
          onBlur={() => {
            // Delay to allow click on dropdown
            setTimeout(() => setIsOpen(false), 200);
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full app-input rounded-xl pl-10 pr-4 py-2.5 text-sm outline-none transition-all duration-200"
        />
        {query.length > 0 && results.length === 0 && (
          <Search
            size={12}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/10"
          />
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            ref={listRef}
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 left-0 right-0
              rounded-xl overflow-hidden shadow-2xl app-popover"
          >
            {results.map((city, i) => (
              <button
                key={`${city.name}-${city.country}-${i}`}
                onClick={() => handleSelect(city)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                  i === activeIndex
                    ? "bg-gold-400/10 text-white/90"
                    : "text-white/75 hover:bg-white/[0.04]"
                )}
              >
                <MapPin size={12} className="text-gold-400/50 shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{city.name}</p>
                  <p className="text-[10px] text-white/50 truncate">
                    {city.region ? `${city.region}, ` : ""}
                    {city.country}
                  </p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
