"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Search } from "lucide-react";
import { cn } from "@/lib/cn";

interface AddressSuggestion {
  label: string;
  secondary: string | null;
}

interface PhotonFeatureProperties {
  name?: string;
  street?: string;
  housenumber?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
}

interface PhotonFeature {
  geometry?: {
    coordinates?: [number, number];
  };
  properties?: PhotonFeatureProperties;
}

interface PhotonResponse {
  features?: PhotonFeature[];
}

export interface AddressSelection {
  address: string;
  lat: number;
  lng: number;
}

interface AddressSearchProps {
  value: string;
  onChange: (address: string) => void;
  onSelect?: (selection: AddressSelection) => void;
  onBlur?: (currentValue: string) => void;
  placeholder?: string;
  className?: string;
}

function formatSuggestion(feature: PhotonFeature): (AddressSuggestion & { lat: number; lng: number }) | null {
  const properties = feature.properties;
  const coordinates = feature.geometry?.coordinates;
  if (!properties || !coordinates || coordinates.length < 2) return null;

  const primaryParts = [
    [properties.housenumber, properties.street].filter(Boolean).join(" ").trim(),
    properties.name,
    properties.city,
  ].filter(Boolean) as string[];

  const secondaryParts = [properties.state, properties.postcode, properties.country]
    .filter(Boolean) as string[];

  const label = primaryParts.join(", ").trim();
  if (!label) return null;

  return {
    label: secondaryParts.length > 0 ? `${label}, ${secondaryParts.join(", ")}` : label,
    secondary: secondaryParts.length > 0 ? secondaryParts.join(", ") : null,
    lat: coordinates[1],
    lng: coordinates[0],
  };
}

export function AddressSearch({
  value,
  onChange,
  onSelect,
  onBlur,
  placeholder = "Start typing an address...",
  className,
}: AddressSearchProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isFocused, setIsFocused] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const justSelectedRef = useRef(false);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!isFocused || trimmed.length < 3) {
      setResults([]);
      setIsOpen(false);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      try {
        setIsLoading(true);
        const response = await fetch(
          `https://photon.komoot.io/api/?limit=6&q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (!response.ok) throw new Error(`Address lookup failed (${response.status})`);
        const data = (await response.json()) as PhotonResponse;
        const nextResults = (data.features || [])
          .map(formatSuggestion)
          .filter((entry): entry is AddressSuggestion & { lat: number; lng: number } => Boolean(entry))
          .filter((entry, index, array) => array.findIndex((candidate) => candidate.label === entry.label) === index);
        setResults(nextResults);
        setIsOpen(nextResults.length > 0);
        setActiveIndex(-1);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setResults([]);
          setIsOpen(false);
        }
      } finally {
        setIsLoading(false);
      }
    }, 250);

    return () => {
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [isFocused, query]);

  const handleSelect = useCallback(
    (suggestion: AddressSuggestion & { lat: number; lng: number }) => {
      justSelectedRef.current = true;
      setQuery(suggestion.label);
      onChange(suggestion.label);
      onSelect?.({
        address: suggestion.label,
        lat: suggestion.lat,
        lng: suggestion.lng,
      });
      setResults([]);
      setIsOpen(false);
    },
    [onChange, onSelect]
  );

  const showSearchHint = useMemo(
    () => query.length > 0 && results.length === 0 && !isLoading,
    [isLoading, query.length, results.length]
  );

  return (
    <div className={cn("relative", className)}>
      <div className="relative">
        <Home size={14} className="absolute left-3 top-1/2 -translate-y-1/2 app-input-icon" />
        <input
          type="text"
          value={query}
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            onChange(nextValue);
          }}
          onFocus={() => {
            setIsFocused(true);
            if (results.length > 0) setIsOpen(true);
          }}
          onBlur={() => {
            const selected = justSelectedRef.current;
            justSelectedRef.current = false;
            setIsFocused(false);
            const currentValue = query;
            window.setTimeout(() => {
              setIsOpen(false);
              if (!selected && onBlur) onBlur(currentValue);
            }, 160);
          }}
          onKeyDown={(event) => {
            if (!isOpen) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActiveIndex((index) => Math.min(index + 1, results.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActiveIndex((index) => Math.max(index - 1, 0));
            } else if (event.key === "Enter" && activeIndex >= 0) {
              event.preventDefault();
              handleSelect(results[activeIndex]);
            } else if (event.key === "Escape") {
              setIsOpen(false);
            }
          }}
          placeholder={placeholder}
          className="w-full app-input rounded-xl pl-10 pr-10 py-2.5 text-sm outline-none transition-all duration-200"
        />
        {(isLoading || showSearchHint) && (
          <Search size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20" />
        )}
      </div>

      <AnimatePresence>
        {isOpen && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 top-full mt-1 left-0 right-0 rounded-xl overflow-hidden shadow-2xl app-popover"
          >
            {results.map((suggestion, index) => (
              <button
                key={`${suggestion.label}-${index}`}
                type="button"
                onClick={() => handleSelect(suggestion)}
                className={cn(
                  "w-full flex items-start gap-3 px-3 py-2.5 text-left transition-colors",
                  index === activeIndex ? "bg-gold-400/10 text-white/90" : "text-white/75 hover:bg-white/[0.04]"
                )}
              >
                <Home size={12} className="text-gold-400/50 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <p className="text-xs font-medium leading-relaxed">{suggestion.label}</p>
                  {suggestion.secondary && (
                    <p className="text-[10px] text-white/50 truncate">{suggestion.secondary}</p>
                  )}
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
