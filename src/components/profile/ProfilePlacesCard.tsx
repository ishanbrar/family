"use client";

import { useState } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { cn } from "@/lib/cn";
import { buildGoogleMapsEmbedUrl, buildGoogleMapsSearchUrl } from "@/lib/maps";
import {
  PROFILE_MAP_SOURCE_ACCENTS,
  getProfileMapLocations,
  resolveProfileMapLocation,
  type ProfileLocationSource,
} from "@/lib/profile-locations";
import type { Profile } from "@/lib/types";

interface ProfilePlacesCardProps {
  profile: Profile;
  activeSource?: ProfileLocationSource;
  onActiveSourceChange?: (source: ProfileLocationSource) => void | Promise<void>;
}

export function ProfilePlacesCard({
  profile,
  activeSource,
  onActiveSourceChange,
}: ProfilePlacesCardProps) {
  const locations = getProfileMapLocations(profile);
  const defaultSource = resolveProfileMapLocation(profile)?.source ?? locations[0]?.source ?? null;
  const [previewSource, setPreviewSource] = useState<ProfileLocationSource | null>(null);

  const selectedSource = activeSource ?? previewSource ?? defaultSource;
  const selectedPlace =
    locations.find((entry) => entry.source === selectedSource) ?? resolveProfileMapLocation(profile);

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

  const handleSelect = (source: ProfileLocationSource) => {
    if (activeSource === undefined) {
      setPreviewSource(source);
    }
    void onActiveSourceChange?.(source);
  };

  const embedQuery = selectedPlace?.query || "";
  const mapUrl = embedQuery ? buildGoogleMapsSearchUrl(embedQuery) : null;

  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-serif text-lg font-semibold text-white/90">Profile Map</h3>
          <p className="mt-1 text-xs text-white/38">
            Click a saved place below to preview it on the map.
          </p>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.08] bg-black/10">
        {embedQuery ? (
          <iframe
            title={`${profile.first_name} ${profile.last_name} profile map`}
            src={buildGoogleMapsEmbedUrl(embedQuery, {
              satellite: true,
              zoom: selectedPlace?.source === "address" ? 15 : 11,
            })}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="h-[320px] w-full"
          />
        ) : (
          <div className="flex h-[320px] items-center justify-center text-sm text-white/35">
            Select a saved location to preview it here.
          </div>
        )}
      </div>

      {mapUrl && embedQuery && (
        <div className="mt-4">
          <a
            href={mapUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-xs text-gold-300 transition-colors hover:bg-white/[0.06]"
          >
            <ExternalLink size={12} />
            Open in Google Maps
          </a>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {locations.map((point) => {
          const href = point.source === "address" ? buildGoogleMapsSearchUrl(point.query) : null;
          const selected = selectedSource === point.source;
          return (
            <div
              key={point.source}
              className={cn(
                "inline-flex max-w-full items-center gap-1 rounded-full pr-1.5",
                PROFILE_MAP_SOURCE_ACCENTS[point.source],
                selected && "location-chip-active ring-1 ring-current/25"
              )}
            >
              <button
                type="button"
                onClick={() => handleSelect(point.source)}
                className="inline-flex min-w-0 items-center gap-2 rounded-full px-3 py-1.5 text-left text-xs transition-opacity hover:opacity-90"
              >
                <MapPin size={12} className="shrink-0" />
                <span className="font-medium">{point.label}</span>
                <span className="truncate opacity-80">{point.query}</span>
              </button>
              {href && (
                <a
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-black/10"
                  aria-label={`Open ${point.query} in Google Maps`}
                  onClick={(event) => event.stopPropagation()}
                >
                  <ExternalLink size={12} />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </GlassCard>
  );
}
