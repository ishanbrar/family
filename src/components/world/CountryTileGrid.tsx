"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";
import { LOCATION_SOURCE_META, LOCATION_SOURCE_ORDER } from "@/lib/location-source-meta";
import { groupWorldCountryByMember, type WorldCountrySummary } from "@/lib/world-locations";

interface CountryTileGridProps {
  countries: WorldCountrySummary[];
  selectedCode?: string | null;
  onSelect: (country: WorldCountrySummary) => void;
  className?: string;
}

export function CountryTileGrid({ countries, selectedCode, onSelect, className }: CountryTileGridProps) {
  const tileRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!selectedCode) return;
    tileRefs.current.get(selectedCode)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
  }, [selectedCode]);

  if (countries.length === 0) {
    return (
      <div className={cn("rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-8 text-center", className)}>
        <MapPin size={18} className="mx-auto mb-2 text-white/20" />
        <p className="text-sm text-white/45">Add birth towns, cities, or addresses to profiles to populate the world map.</p>
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3", className)}>
      {countries.map((country, index) => {
        const active = selectedCode === country.code;
        const memberGroups = groupWorldCountryByMember(country);
        const sourceSet = new Set(country.locations.map((location) => location.source));

        return (
          <motion.button
            key={country.code}
            ref={(node) => {
              if (node) tileRefs.current.set(country.code, node);
              else tileRefs.current.delete(country.code);
            }}
            type="button"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(country)}
            className={cn(
              "group rounded-2xl border px-4 py-4 text-left transition-all duration-200",
              active
                ? "border-gold-400/35 bg-gold-400/[0.08] shadow-[0_0_24px_rgba(212,175,55,0.08)]"
                : "border-white/[0.08] bg-white/[0.02] hover:border-gold-400/20 hover:bg-white/[0.04]"
            )}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl leading-none">{country.flag}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-serif text-base text-white/90">{country.name}</p>
                <p className="mt-1 text-[11px] text-white/38">
                  {memberGroups.length} member{memberGroups.length === 1 ? "" : "s"} · {country.locationCount} place
                  {country.locationCount === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {LOCATION_SOURCE_ORDER.filter((source) => sourceSet.has(source)).map((source) => {
                const meta = LOCATION_SOURCE_META[source];
                const Icon = meta.icon;
                return (
                  <span
                    key={source}
                    title={meta.label}
                    className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-white/55"
                  >
                    <Icon size={13} />
                  </span>
                );
              })}
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
