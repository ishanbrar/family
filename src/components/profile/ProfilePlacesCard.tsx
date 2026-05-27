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
  canEdit?: boolean;
  onMapLocationSourceChange?: (source: ProfileLocationSource) => Promise<void> | void;
}

export function ProfilePlacesCard({ profile, canEdit = false, onMapLocationSourceChange }: ProfilePlacesCardProps) {
  const birthplace = profile.place_of_birth?.trim() || null;
  const locationChips = [
    { key: "birthplace", source: "birthplace" as const, city: birthplace },
    { key: "current_home", source: "current_home" as const, city: profile.location_city },
    { key: "secondary_home", source: "secondary_home" as const, city: profile.secondary_location_city || null },
  ].filter((entry): entry is { key: string; source: ProfileLocationSource; city: string } => Boolean(entry.city?.trim()));
  const availableSources = new Set(locationChips.map((entry) => entry.source));
  const preferredSource = profile.map_location_source || "current_home";
  const selectedPlace =
    locationChips.find((entry) => entry.source === preferredSource) ||
    locationChips.find((entry) => entry.source === "current_home") ||
    locationChips[0] ||
    null;

  if (!birthplace && locationChips.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="font-serif text-lg font-semibold text-white/90">Profile Map</h3>
        <p className="mt-4 text-sm text-white/35 text-center">No location details recorded yet.</p>
      </GlassCard>
    );
  }
  const embedQuery = selectedPlace?.city || "";
  const mapUrl = embedQuery ? buildGoogleMapsSearchUrl(embedQuery) : null;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-white/90">Profile Map</h3>
          <p className="mt-1 text-xs text-white/38">
            Satellite view centered on {selectedPlace ? SOURCE_LABELS[selectedPlace.source].toLowerCase() : "their selected place"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {(["current_home", "birthplace", "secondary_home"] as ProfileLocationSource[]).map((source) => {
            const disabled = !availableSources.has(source);
            const selected = selectedPlace?.source === source;
            return (
              <button
                key={source}
                type="button"
                disabled={disabled || selected || !canEdit || !onMapLocationSourceChange}
                onClick={() => void onMapLocationSourceChange?.(source)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  selected
                    ? SOURCE_ACCENTS[source]
                    : "border-white/[0.08] bg-white/[0.03] text-white/48 hover:bg-white/[0.06] hover:text-white/72"
                } disabled:cursor-default ${disabled ? "disabled:opacity-45" : ""}`}
                title={disabled ? "Add this location to enable it" : `Show ${SOURCE_LABELS[source].toLowerCase()} on the map`}
              >
                {SOURCE_LABELS[source]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15">
        {embedQuery ? (
          <iframe
            title={`${profile.first_name} ${profile.last_name} profile map`}
            src={buildGoogleMapsEmbedUrl(embedQuery, { satellite: true, zoom: 11 })}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[320px] w-full"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-white/35">
            No selected location recorded yet.
          </div>
        )}
      </div>

      {mapUrl && embedQuery && (
        <div className="mt-4">
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-gold-200 transition-colors hover:bg-white/[0.06]"
          >
            <ExternalLink size={12} />
            Open {embedQuery} in Google Maps
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
