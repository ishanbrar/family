"use client";

import { ExternalLink, MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { buildGoogleMapsEmbedUrl, buildGoogleMapsSearchUrl } from "@/lib/maps";
import {
  PROFILE_MAP_SOURCE_ACCENTS,
  PROFILE_MAP_SOURCE_LABELS,
  PROFILE_MAP_SOURCE_ORDER,
  getProfileMapLocations,
  resolveProfileMapLocation,
  type ProfileLocationSource,
} from "@/lib/profile-locations";
import type { Profile } from "@/lib/types";

interface ProfilePlacesCardProps {
  profile: Profile;
  canEdit?: boolean;
  onMapLocationSourceChange?: (source: ProfileLocationSource) => Promise<void> | void;
}

export function ProfilePlacesCard({ profile, canEdit = false, onMapLocationSourceChange }: ProfilePlacesCardProps) {
  const locations = getProfileMapLocations(profile);
  const availableSources = new Set(locations.map((entry) => entry.source));
  const selectedPlace = resolveProfileMapLocation(profile);

  if (locations.length === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="font-serif text-lg font-semibold text-white/90">Profile Map</h3>
        <p className="mt-4 text-sm text-white/35 text-center">
          Add a city, birthplace, or street address to show a location on the map.
        </p>
      </GlassCard>
    );
  }

  const embedQuery = selectedPlace?.query || "";
  const mapUrl = embedQuery ? buildGoogleMapsSearchUrl(embedQuery) : null;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-white/90">Profile Map</h3>
          <p className="mt-1 text-xs text-white/38">
            {canEdit
              ? "Choose which saved place appears on this map."
              : `Showing ${selectedPlace?.label.toLowerCase() || "their selected place"}.`}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PROFILE_MAP_SOURCE_ORDER.map((source) => {
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
                    ? PROFILE_MAP_SOURCE_ACCENTS[source]
                    : "border-white/[0.08] bg-white/[0.03] text-white/48 hover:bg-white/[0.06] hover:text-white/72"
                } disabled:cursor-default ${disabled ? "disabled:opacity-45" : ""}`}
                title={
                  disabled
                    ? "Add this location in Edit Profile to enable it"
                    : `Show ${PROFILE_MAP_SOURCE_LABELS[source].toLowerCase()} on the map`
                }
              >
                {PROFILE_MAP_SOURCE_LABELS[source]}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/15">
        {embedQuery ? (
          <iframe
            title={`${profile.first_name} ${profile.last_name} profile map`}
            src={buildGoogleMapsEmbedUrl(embedQuery, { satellite: true, zoom: selectedPlace?.source === "address" ? 15 : 11 })}
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
            Open in Google Maps
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {locations.map((point) => {
          const href = buildGoogleMapsSearchUrl(point.query);
          return (
            <a
              key={point.source}
              href={href}
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs transition-colors hover:brightness-110 ${PROFILE_MAP_SOURCE_ACCENTS[point.source]}`}
            >
              <MapPin size={12} />
              <span className="font-medium">{point.label}</span>
              <span className="text-white/80">{point.query}</span>
            </a>
          );
        })}
      </div>
    </GlassCard>
  );
}
