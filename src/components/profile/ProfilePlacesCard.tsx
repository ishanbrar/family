"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { buildGoogleMapsEmbedUrl, buildGoogleMapsSearchUrl } from "@/lib/maps";
import { type ProfileLocationSource } from "@/lib/profile-locations";
import type { Profile } from "@/lib/types";

const SOURCE_LABELS: Record<ProfileLocationSource, string> = {
  birthplace: "Born in",
  current_home: "Lives in",
  secondary_home: "Second home",
};

const SOURCE_ACCENTS: Record<ProfileLocationSource, string> = {
  birthplace: "bg-gold-400/18 text-gold-200 border-gold-400/25",
  current_home: "bg-emerald-400/12 text-emerald-200 border-emerald-400/20",
  secondary_home: "bg-sky-400/12 text-sky-200 border-sky-400/20",
};

interface ProfilePlacesCardProps {
  profile: Profile;
}

export function ProfilePlacesCard({ profile }: ProfilePlacesCardProps) {
  const birthplace = profile.place_of_birth?.trim() || null;
  const locationChips = [
    { key: "birthplace", source: "birthplace" as const, city: birthplace },
    { key: "current_home", source: "current_home" as const, city: profile.location_city },
    { key: "secondary_home", source: "secondary_home" as const, city: profile.secondary_location_city || null },
  ].filter((entry): entry is { key: string; source: ProfileLocationSource; city: string } => Boolean(entry.city?.trim()));

  if (!birthplace && locationChips.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="font-serif text-lg font-semibold text-white/90">Birthplace Map</h3>
        <p className="mt-4 text-sm text-white/35 text-center">No location details recorded yet.</p>
      </GlassCard>
    );
  }
  const embedQuery = birthplace || profile.location_city || profile.secondary_location_city || "";
  const birthplaceUrl = birthplace ? buildGoogleMapsSearchUrl(birthplace) : null;

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-serif text-lg font-semibold text-white/90">Birthplace Map</h3>
          <p className="mt-1 text-xs text-white/38">
            Satellite view centered on where this person was born.
          </p>
        </div>
        <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/45">
          {locationChips.length} place{locationChips.length === 1 ? "" : "s"}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15">
        {embedQuery ? (
          <iframe
            title={`${profile.first_name} ${profile.last_name} birthplace map`}
            src={buildGoogleMapsEmbedUrl(embedQuery, { satellite: true, zoom: 11 })}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[320px] w-full"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-white/35">
            No birth city recorded yet.
          </div>
        )}
      </div>

      {birthplaceUrl && birthplace && (
        <div className="mt-4">
          <a
            href={birthplaceUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-gold-200 transition-colors hover:bg-white/[0.06]"
          >
            <ExternalLink size={12} />
            Open {birthplace} in Google Maps
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {locationChips.map((point) => (
          <div
            key={point.key}
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${SOURCE_ACCENTS[point.source]}`}
          >
            <MapPin size={12} />
            <span className="font-medium">{SOURCE_LABELS[point.source]}</span>
            <span className="text-white/80">{point.city}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
