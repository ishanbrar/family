"use client";

import { useEffect, useMemo, useState } from "react";
import { geoAlbersUsa, geoMercator, geoPath } from "d3-geo";
import { cn } from "@/lib/cn";
import { getCityCoordinates } from "@/lib/cities";
import { countryName } from "@/lib/country-utils";
import { isPointInCountryMapTerritory } from "@/lib/country-map-geometry";
import {
  loadWorldTopology,
  resolveCountryMapFeatureByCode,
  type WorldCountryFeature,
} from "@/lib/world-topology";
import type { WorldCountryPin } from "@/lib/world-locations";
import type { ProfileMapLocationSource } from "@/lib/types";

const PIN_COLORS: Record<ProfileMapLocationSource, string> = {
  birthplace: "var(--location-birthplace-fg)",
  current_home: "var(--location-current-fg)",
  secondary_home: "var(--location-secondary-fg)",
  address: "var(--location-address-fg)",
};

const PIN_OFFSETS: Record<ProfileMapLocationSource, [number, number]> = {
  birthplace: [-8, -8],
  current_home: [8, -8],
  secondary_home: [-8, 8],
  address: [8, 8],
};

interface ResolvedPin extends WorldCountryPin {
  lat: number;
  lng: number;
}

interface CountryLocationMapProps {
  countryCode: string;
  pins: WorldCountryPin[];
  className?: string;
}

function resolvePinCoordinates(pin: WorldCountryPin): ResolvedPin | null {
  if (pin.lat != null && pin.lng != null) {
    return { ...pin, lat: pin.lat, lng: pin.lng };
  }

  const cityCoords = pin.city ? getCityCoordinates(pin.city) : null;
  if (cityCoords) {
    return { ...pin, lat: cityCoords[0], lng: cityCoords[1] };
  }

  return null;
}

export function CountryLocationMap({ countryCode, pins, className }: CountryLocationMapProps) {
  const [countries, setCountries] = useState<WorldCountryFeature[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredPinId, setHoveredPinId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void loadWorldTopology().then((features) => {
        if (cancelled) return;
        setCountries(features);
        setLoading(false);
      });
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  const countryFeature = useMemo(
    () => resolveCountryMapFeatureByCode(countries, countryCode),
    [countries, countryCode]
  );

  const mapData = useMemo(() => {
    const width = 960;
    const height = 560;
    const padding = 20;
    const normalizedCode = countryCode.toUpperCase();

    const resolved = pins
      .map(resolvePinCoordinates)
      .filter((pin): pin is ResolvedPin => pin !== null)
      .filter((pin) => isPointInCountryMapTerritory(pin.lng, pin.lat, normalizedCode, countryFeature));

    if (!countryFeature) {
      return {
        width,
        height,
        pathD: "",
        projectedPins: [] as Array<{ pin: ResolvedPin; x: number; y: number }>,
      };
    }

    const projection =
      normalizedCode === "USA"
        ? geoAlbersUsa().fitExtent(
            [
              [padding, padding],
              [width - padding, height - padding],
            ],
            countryFeature as unknown as GeoJSON.Feature
          )
        : geoMercator().fitExtent(
            [
              [padding, padding],
              [width - padding, height - padding],
            ],
            countryFeature as unknown as GeoJSON.Feature
          );
    const pathGenerator = geoPath(projection);
    const pathD = pathGenerator(countryFeature as unknown as GeoJSON.Feature) || "";

    const projectedPins = resolved
      .map((pin) => {
        const point = projection([pin.lng, pin.lat]);
        if (!point) return null;
        const [offsetX, offsetY] = PIN_OFFSETS[pin.source] || [0, 0];
        return { pin, x: point[0] + offsetX, y: point[1] + offsetY };
      })
      .filter((entry): entry is { pin: ResolvedPin; x: number; y: number } => entry !== null);

    return { width, height, pathD, projectedPins };
  }, [countryFeature, countryCode, pins]);

  const visibleHoveredPinId = mapData.projectedPins.some((entry) => entry.pin.id === hoveredPinId)
    ? hoveredPinId
    : null;
  const hoveredPin = visibleHoveredPinId
    ? mapData.projectedPins.find((entry) => entry.pin.id === visibleHoveredPinId) ?? null
    : null;

  if (loading) {
    return (
      <div className={cn("country-map-shell flex h-[360px] items-center justify-center rounded-2xl border", className)}>
        <p className="text-sm text-white/35">Loading map…</p>
      </div>
    );
  }

  return (
    <div
      className={cn("country-map-shell relative overflow-hidden rounded-2xl border", className)}
      style={{ aspectRatio: `${mapData.width} / ${mapData.height}` }}
    >
      <svg
        viewBox={`0 0 ${mapData.width} ${mapData.height}`}
        className="h-full w-full"
        role="img"
        aria-label={`Map of ${countryName(countryCode)} with family locations`}
      >
        <rect width={mapData.width} height={mapData.height} fill="var(--country-map-bg)" />

        {mapData.pathD && (
          <>
            <path
              d={mapData.pathD}
              fill="var(--country-map-glow)"
              stroke="none"
              transform="translate(0, 2)"
              opacity={0.85}
            />
            <path
              d={mapData.pathD}
              fill="var(--country-map-fill)"
              stroke="var(--country-map-stroke)"
              strokeWidth={1.4}
              strokeLinejoin="round"
            />
          </>
        )}

        {mapData.projectedPins.map(({ pin, x, y }) => {
          const color = PIN_COLORS[pin.source] || PIN_COLORS.birthplace;
          const active = visibleHoveredPinId === pin.id;
          const radius = active ? 11 : 8.5;

          return (
            <g
              key={pin.id}
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPinId(pin.id)}
              onMouseLeave={() => setHoveredPinId((current) => (current === pin.id ? null : current))}
              onFocus={() => setHoveredPinId(pin.id)}
              onBlur={() => setHoveredPinId((current) => (current === pin.id ? null : current))}
              tabIndex={0}
              role="button"
              aria-label={`${pin.memberName}, ${pin.sourceLabel}: ${pin.city}`}
            >
              <circle cx={x} cy={y} r={active ? 18 : 14} fill={color} opacity={0.18} />
              <circle
                cx={x}
                cy={y}
                r={radius}
                fill={color}
                stroke="rgba(255,255,255,0.92)"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {hoveredPin && (
        <div
          className="country-map-tooltip pointer-events-none absolute z-20 max-w-[260px] rounded-xl border px-3.5 py-2.5 shadow-2xl backdrop-blur-md"
          style={{
            left: `${Math.min(Math.max((hoveredPin.x / mapData.width) * 100, 10), 68)}%`,
            top: `${Math.min(Math.max((hoveredPin.y / mapData.height) * 100, 8), 56)}%`,
          }}
        >
          <p className="text-sm font-medium">{hoveredPin.pin.memberName}</p>
          <p className="mt-0.5 text-[11px] uppercase tracking-wider opacity-55">{hoveredPin.pin.sourceLabel}</p>
          <p className="mt-1 break-words text-xs opacity-75">{hoveredPin.pin.city}</p>
        </div>
      )}
    </div>
  );
}
