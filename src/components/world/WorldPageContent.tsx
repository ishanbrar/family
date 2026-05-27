"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Globe2 } from "lucide-react";
import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { GlassCard } from "@/components/ui/GlassCard";
import { CountryLocationModal } from "@/components/world/CountryLocationModal";
import { CountryTileGrid } from "@/components/world/CountryTileGrid";
import { FarAndWideSection } from "@/components/world/FarAndWideSection";
import type { Profile } from "@/lib/types";
import {
  buildFarAndWideRows,
  buildWorldCountrySummaries,
  type WorldCountrySummary,
} from "@/lib/world-locations";

interface WorldPageContentProps {
  members: Profile[];
  profileBasePath: string;
}

export function WorldPageContent({ members, profileBasePath }: WorldPageContentProps) {
  const router = useRouter();
  const globeHostRef = useRef<HTMLDivElement | null>(null);
  const [globeSize, setGlobeSize] = useState(360);
  const [selectedCountry, setSelectedCountry] = useState<WorldCountrySummary | null>(null);
  const [countryModalOpen, setCountryModalOpen] = useState(false);

  const countrySummaries = useMemo(() => buildWorldCountrySummaries(members), [members]);
  const farAndWideRows = useMemo(() => buildFarAndWideRows(members), [members]);

  useEffect(() => {
    const host = globeHostRef.current;
    if (!host) return;

    const updateSize = () => {
      const width = Math.floor(host.getBoundingClientRect().width);
      if (width <= 0) return;
      setGlobeSize(Math.max(280, Math.min(460, width)));
    };

    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(updateSize);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  const handleCountrySelect = useCallback((country: WorldCountrySummary) => {
    setSelectedCountry(country);
    setCountryModalOpen(true);
  }, []);

  const handleGlobeCountryClick = useCallback(
    (code: string) => {
      const country = countrySummaries.find((entry) => entry.code === code.toUpperCase());
      if (country) handleCountrySelect(country);
    },
    [countrySummaries, handleCountrySelect]
  );

  const navigateToProfile = useCallback(
    (memberId: string) => router.push(`${profileBasePath}/${memberId}`),
    [profileBasePath, router]
  );

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"
      >
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-gold-400/20 bg-gold-400/[0.08] px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-gold-300">
            <Globe2 size={12} />
            Your Tree
          </div>
          <h1 className="font-serif text-3xl font-bold text-white/95">World</h1>
          <p className="mt-1 max-w-2xl text-sm text-white/40">
            Explore where your family lives, was born, and keeps a second home. Click a country to see every saved place on the map.
          </p>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-2 text-right">
          <p className="text-[10px] uppercase tracking-wider text-white/35">Countries represented</p>
          <p className="font-serif text-2xl text-gold-300">{countrySummaries.length}</p>
        </div>
      </motion.div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,420px)]">
        <GlassCard className="p-4 sm:p-5 xl:p-6">
          <div className="mb-4">
            <h2 className="font-serif text-lg text-white/92">Family Globe</h2>
            <p className="text-xs text-white/35">Spin the globe, then click a highlighted country to open its places.</p>
          </div>
          <div ref={globeHostRef} className="flex min-w-0 max-w-full flex-col items-center overflow-hidden">
            <InteractiveGlobe
              members={members}
              size={globeSize}
              onMemberClick={(member) => navigateToProfile(member.id)}
              onCountryClick={handleGlobeCountryClick}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-4 sm:p-5">
          <div className="mb-4">
            <h2 className="font-serif text-lg text-white/92">Countries</h2>
            <p className="text-xs text-white/35">Tiles appear for every country tied to a birth town, city, or address.</p>
          </div>
          <CountryTileGrid
            countries={countrySummaries}
            selectedCode={selectedCountry?.code}
            onSelect={handleCountrySelect}
          />
        </GlassCard>
      </div>

      <div className="mt-6">
        <FarAndWideSection rows={farAndWideRows} />
      </div>

      <CountryLocationModal
        country={selectedCountry}
        isOpen={countryModalOpen}
        onClose={() => setCountryModalOpen(false)}
        onProfileClick={navigateToProfile}
      />
    </>
  );
}
