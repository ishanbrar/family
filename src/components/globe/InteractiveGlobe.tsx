"use client";

// ══════════════════════════════════════════════════════════
// InteractiveGlobe – Globe + Flat Map Hybrid
// - Base: rotating orthographic globe
// - Double-click: opens flat map and keeps zooming in continuously
// - Reset control: returns to default globe view
// - Any pointer interaction pauses auto-rotation
// ══════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import {
  geoOrthographic,
  geoNaturalEarth1,
  geoPath,
  geoGraticule10,
  geoCentroid,
  geoContains,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import { Globe2 } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Profile } from "@/lib/types";
import { inferCountryCodeFromCity } from "@/lib/cities";
import { countryName } from "@/lib/country-utils";

interface InteractiveGlobeProps {
  members: Profile[];
  onMemberClick?: (member: Profile) => void;
  focusCountryCode?: string | null;
  focusSignal?: number;
  className?: string;
}

interface CountryFeature {
  type: "Feature";
  id: string;
  geometry: GeoPermissibleObjects;
  properties: { name: string };
}

interface ResolvedMemberLocation {
  member: Profile;
  lat: number;
  lng: number;
  countryCode: string | null;
  countryId?: string;
}

const TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const BASE_ROTATION: [number, number] = [-20, -15];
const MAP_MIN_ZOOM = 1;
const MAP_OPEN_ZOOM = 1.3;
const MAP_FOCUS_ZOOM = 2.8;
const MAP_MAX_ZOOM = 8;
const MAP_ZOOM_STEP = 1.92;

const COUNTRY_NAME_ALIASES: Record<string, string[]> = {
  USA: ["United States of America", "United States"],
  GBR: ["United Kingdom"],
  RUS: ["Russia", "Russian Federation"],
  KOR: ["South Korea", "Republic of Korea"],
  PRK: ["North Korea", "Democratic People's Republic of Korea"],
  CZE: ["Czech Republic", "Czechia"],
  VNM: ["Vietnam", "Viet Nam"],
  LAO: ["Laos", "Lao People's Democratic Republic"],
  IRN: ["Iran", "Iran (Islamic Republic of)"],
  BOL: ["Bolivia", "Bolivia (Plurinational State of)"],
  VEN: ["Venezuela", "Venezuela (Bolivarian Republic of)"],
  COD: ["DR Congo", "Democratic Republic of the Congo"],
  CIV: ["Ivory Coast", "Cote d'Ivoire"],
};

function normalizeCountryName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function centerPanForGeoPoint(baseSize: number, zoom: number, lng: number, lat: number) {
  const projection = geoNaturalEarth1()
    .scale((baseSize / 6.2) * zoom)
    .translate([baseSize / 2, baseSize / 2]);
  const point = projection([lng, lat]);
  if (!point) return { x: 0, y: 0 };
  return {
    x: baseSize / 2 - point[0],
    y: baseSize / 2 - point[1],
  };
}

export function InteractiveGlobe({
  members,
  onMemberClick,
  focusCountryCode,
  focusSignal,
  className,
}: InteractiveGlobeProps) {
  const baseSize = 300;
  const [rotation, setRotation] = useState<[number, number]>(BASE_ROTATION);
  const [isFlatMap, setIsFlatMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(MAP_MIN_ZOOM);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<Profile | null>(null);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);

  const dragStart = useRef<{
    x: number;
    y: number;
    rot: [number, number];
    pan: { x: number; y: number };
  }>({
    x: 0,
    y: 0,
    rot: BASE_ROTATION,
    pan: { x: 0, y: 0 },
  });

  const autoSpinRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    let cancelled = false;

    fetch(TOPO_URL)
      .then((r) => r.json())
      .then((topology) => {
        if (cancelled) return;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const geo = feature(topology, topology.objects.countries) as any;
        setCountries(geo.features as CountryFeature[]);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  const countryFeatureByCode = useMemo(() => {
    const mapping = new Map<string, CountryFeature>();
    if (countries.length === 0) return mapping;

    const byNormalizedName = new Map<string, CountryFeature>();
    countries.forEach((country) => {
      byNormalizedName.set(normalizeCountryName(country.properties.name), country);
    });

    const tryResolveByCode = (code: string): CountryFeature | null => {
      const names = [countryName(code), ...(COUNTRY_NAME_ALIASES[code] || [])]
        .filter(Boolean)
        .map((name) => normalizeCountryName(name));

      for (const normalizedName of names) {
        const exact = byNormalizedName.get(normalizedName);
        if (exact) return exact;
      }

      for (const normalizedName of names) {
        const partial = countries.find((country) => {
          const countryNorm = normalizeCountryName(country.properties.name);
          return countryNorm.includes(normalizedName) || normalizedName.includes(countryNorm);
        });
        if (partial) return partial;
      }

      return null;
    };

    const candidateCodes = new Set<string>();
    for (const member of members) {
      const code = (member.country_code || inferCountryCodeFromCity(member.location_city || "") || "")
        .toUpperCase()
        .trim();
      if (code) candidateCodes.add(code);
    }

    for (const code of candidateCodes) {
      const resolved = tryResolveByCode(code);
      if (resolved) mapping.set(code, resolved);
    }

    return mapping;
  }, [countries, members]);

  const locatedMembers = useMemo(() => {
    const resolved: ResolvedMemberLocation[] = [];

    for (const member of members) {
      const inferredCode = (member.country_code || inferCountryCodeFromCity(member.location_city || "") || "")
        .toUpperCase()
        .trim();
      const countryCode = inferredCode || null;

      if (member.location_lat != null && member.location_lng != null) {
        resolved.push({
          member,
          lat: member.location_lat,
          lng: member.location_lng,
          countryCode,
        });
        continue;
      }

      if (!countryCode) continue;
      const country = countryFeatureByCode.get(countryCode);
      if (!country) continue;
      const [lng, lat] = geoCentroid(country as unknown as GeoPermissibleObjects);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      resolved.push({
        member,
        lat,
        lng,
        countryCode,
        countryId: country.id,
      });
    }

    return resolved;
  }, [members, countryFeatureByCode]);

  useEffect(() => {
    if (!autoRotate || isFlatMap || isDragging) return;

    autoSpinRef.current = setInterval(() => {
      setRotation(([lng, lat]) => [lng - 0.15, lat]);
    }, 50);

    return () => {
      if (autoSpinRef.current) clearInterval(autoSpinRef.current);
    };
  }, [autoRotate, isFlatMap, isDragging]);

  const countryMembership = useMemo(() => {
    const memberCountryByMemberId = new Map<string, string>();
    const memberCountryIds = new Set<string>();

    if (countries.length === 0) {
      return { memberCountryByMemberId, memberCountryIds };
    }

    for (const member of locatedMembers) {
      if (member.countryId) {
        memberCountryByMemberId.set(member.member.id, member.countryId);
        memberCountryIds.add(member.countryId);
        continue;
      }
      for (const country of countries) {
        try {
          if (
            geoContains(country as unknown as GeoPermissibleObjects, [
              member.lng,
              member.lat,
            ])
          ) {
            memberCountryByMemberId.set(member.member.id, country.id);
            memberCountryIds.add(country.id);
            break;
          }
        } catch {
          // Skip malformed geometry
        }
      }
    }

    return { memberCountryByMemberId, memberCountryIds };
  }, [countries, locatedMembers]);

  const focusedCountryIds = useMemo(() => {
    const ids = new Set<string>();
    const code = focusCountryCode?.toUpperCase().trim();
    if (!code) return ids;

    for (const member of locatedMembers) {
      if (member.countryCode?.toUpperCase() !== code) continue;
      const countryId = countryMembership.memberCountryByMemberId.get(member.member.id);
      if (countryId) ids.add(countryId);
    }

    return ids;
  }, [focusCountryCode, locatedMembers, countryMembership]);

  useEffect(() => {
    const code = focusCountryCode?.toUpperCase().trim();
    if (!code) return;

    const targetMembers = locatedMembers.filter(
      (member) => member.countryCode?.toUpperCase() === code
    );

    if (targetMembers.length === 0) return;

    const avgLng =
      targetMembers.reduce((sum, member) => sum + member.lng, 0) /
      targetMembers.length;
    const avgLat =
      targetMembers.reduce((sum, member) => sum + member.lat, 0) /
      targetMembers.length;

    const centeredPan = centerPanForGeoPoint(baseSize, MAP_FOCUS_ZOOM, avgLng, avgLat);

    const frame = window.requestAnimationFrame(() => {
      setAutoRotate(false);
      setIsFlatMap(true);
      setMapZoom((prev) =>
        Math.min(MAP_MAX_ZOOM, Math.max(MAP_FOCUS_ZOOM, prev * 1.18))
      );
      setMapPan(centeredPan);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [focusCountryCode, focusSignal, locatedMembers]);

  const globeProjection = useMemo(
    () =>
      geoOrthographic()
        .scale(baseSize / 2 - 2)
        .translate([baseSize / 2, baseSize / 2])
        .rotate(rotation)
        .clipAngle(90),
    [baseSize, rotation]
  );

  const mapProjection = useMemo(
    () =>
      geoNaturalEarth1()
        .scale((baseSize / 6.2) * mapZoom)
        .translate([baseSize / 2 + mapPan.x, baseSize / 2 + mapPan.y]),
    [baseSize, mapZoom, mapPan]
  );

  const globePath = useMemo(() => geoPath(globeProjection), [globeProjection]);
  const mapPath = useMemo(() => geoPath(mapProjection), [mapProjection]);
  const graticule = useMemo(() => geoGraticule10(), []);

  const globeMembers = useMemo(() => {
    return locatedMembers
      .map((m) => {
        const coords = globeProjection([m.lng, m.lat]);
        if (!coords) return null;

        const r = globeProjection.rotate();
        const lngDiff = ((m.lng + r[0] + 180) % 360) - 180;
        const latDiff = m.lat + r[1];
        const visible = Math.sqrt(lngDiff * lngDiff + latDiff * latDiff) < 90;

        return {
          member: m.member,
          x: coords[0],
          y: coords[1],
          visible,
        };
      })
      .filter((p): p is { member: Profile; x: number; y: number; visible: boolean } => p !== null);
  }, [locatedMembers, globeProjection]);

  const mapMembers = useMemo(() => {
    return locatedMembers
      .map((m) => {
        const coords = mapProjection([m.lng, m.lat]);
        if (!coords) return null;
        return {
          member: m.member,
          x: coords[0],
          y: coords[1],
          visible:
            coords[0] >= -20 &&
            coords[0] <= baseSize + 20 &&
            coords[1] >= -20 &&
            coords[1] <= baseSize + 20,
        };
      })
      .filter((p): p is { member: Profile; x: number; y: number; visible: boolean } => p !== null);
  }, [locatedMembers, mapProjection, baseSize]);

  const visibleMembers = isFlatMap ? mapMembers : globeMembers;

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      setAutoRotate(false);
      setIsDragging(true);
      dragStart.current = {
        x: e.clientX,
        y: e.clientY,
        rot: [...rotation] as [number, number],
        pan: { ...mapPan },
      };
    },
    [rotation, mapPan]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;

      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      if (isFlatMap) {
        setMapPan({
          x: dragStart.current.pan.x + dx,
          y: dragStart.current.pan.y + dy,
        });
      } else {
        const speed = 0.35;
        setRotation([
          dragStart.current.rot[0] + dx * speed,
          Math.max(-60, Math.min(60, dragStart.current.rot[1] - dy * speed)),
        ]);
      }
    },
    [isDragging, isFlatMap]
  );

  const handlePointerUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    setAutoRotate(false);

    if (!isFlatMap) {
      setIsFlatMap(true);
      setMapZoom(MAP_OPEN_ZOOM);
      setMapPan({ x: 0, y: 0 });
      return;
    }

    setMapZoom((prev) => Math.min(MAP_MAX_ZOOM, prev * MAP_ZOOM_STEP));
  }, [isFlatMap]);

  const handleResetView = useCallback(() => {
    setIsFlatMap(false);
    setMapZoom(MAP_MIN_ZOOM);
    setMapPan({ x: 0, y: 0 });
    setRotation(BASE_ROTATION);
    setAutoRotate(true);
    setIsDragging(false);
  }, []);

  return (
    <div className={cn("relative flex flex-col items-center", className)}>
      <div
        className={cn(
          "relative flex items-center justify-center select-none overflow-hidden rounded-2xl touch-none",
          isDragging ? "cursor-grabbing" : "cursor-grab"
        )}
        style={{ width: baseSize, height: baseSize }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <svg
          width={baseSize}
          height={baseSize}
          viewBox={`0 0 ${baseSize} ${baseSize}`}
          className="overflow-hidden"
        >
          <defs>
            <radialGradient id="globeShade" cx="35%" cy="35%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.03)" />
              <stop offset="60%" stopColor="rgba(0,0,0,0.1)" />
              <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
            </radialGradient>
            <clipPath id="globeClip">
              <circle cx={baseSize / 2} cy={baseSize / 2} r={baseSize / 2 - 2} />
            </clipPath>
          </defs>

          <motion.g
            animate={{ opacity: isFlatMap ? 0 : 1, scale: isFlatMap ? 0.92 : 1 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 50%" }}
          >
            <circle
              cx={baseSize / 2}
              cy={baseSize / 2}
              r={baseSize / 2 - 2}
              fill="var(--map-globe-bg)"
              stroke="var(--map-globe-stroke)"
              strokeWidth={1}
            />

            <g clipPath="url(#globeClip)">
              <path
                d={globePath(graticule) || ""}
                fill="none"
                stroke="var(--map-graticule)"
                strokeWidth={0.4}
              />

              {countries.map((country, idx) => {
                const d = globePath(country as unknown as GeoPermissibleObjects);
                if (!d) return null;
                const hasMember = countryMembership.memberCountryIds.has(country.id);
                const isFocused = focusedCountryIds.has(country.id);
                return (
                  <path
                    key={`globe-c-${country.id ?? idx}`}
                    d={d}
                    fill={
                      isFocused
                        ? "var(--map-country-focus-fill)"
                        : hasMember
                          ? "var(--map-country-member-fill)"
                          : "var(--map-country-fill)"
                    }
                    stroke={
                      isFocused
                        ? "var(--map-country-focus-stroke)"
                        : hasMember
                          ? "var(--map-country-member-stroke)"
                          : "var(--map-country-stroke)"
                    }
                    strokeWidth={isFocused ? 1 : hasMember ? 0.8 : 0.3}
                  />
                );
              })}

              <circle
                cx={baseSize / 2}
                cy={baseSize / 2}
                r={baseSize / 2 - 2}
                fill="url(#globeShade)"
                pointerEvents="none"
              />
            </g>

            <circle
              cx={baseSize / 2}
              cy={baseSize / 2}
              r={baseSize / 2 - 1}
              fill="none"
              stroke="var(--map-country-member-stroke)"
              strokeWidth={1}
            />
          </motion.g>

          <motion.g
            animate={{ opacity: isFlatMap ? 1 : 0, scale: isFlatMap ? 1 : 1.06 }}
            transition={{ duration: 0.45, ease: "easeInOut" }}
            style={{ transformOrigin: "50% 50%" }}
          >
            <rect
              x={0}
              y={0}
              width={baseSize}
              height={baseSize}
              fill="var(--map-flat-bg)"
              stroke="var(--map-flat-border)"
              strokeWidth={1}
              rx={16}
            />

            <path
              d={mapPath(graticule) || ""}
              fill="none"
              stroke="var(--map-graticule)"
              strokeWidth={0.35}
            />

            {countries.map((country, idx) => {
              const d = mapPath(country as unknown as GeoPermissibleObjects);
              if (!d) return null;
              const hasMember = countryMembership.memberCountryIds.has(country.id);
              const isFocused = focusedCountryIds.has(country.id);
              return (
                <path
                  key={`map-c-${country.id ?? idx}`}
                  d={d}
                  fill={
                    isFocused
                      ? "var(--map-country-focus-fill)"
                      : hasMember
                        ? "var(--map-country-member-fill)"
                        : "var(--map-country-fill)"
                  }
                  stroke={
                    isFocused
                      ? "var(--map-country-focus-stroke)"
                      : hasMember
                        ? "var(--map-country-member-stroke)"
                        : "var(--map-country-stroke)"
                  }
                  strokeWidth={isFocused ? 1 : hasMember ? 0.7 : 0.35}
                />
              );
            })}
          </motion.g>
        </svg>

        {visibleMembers.map(({ member, x, y, visible }) => {
          if (!visible) return null;
          const isHovered = hoveredMember?.id === member.id;

          return (
            <div key={member.id} className="absolute pointer-events-auto" style={{ left: x, top: y, zIndex: 10 }}>
              <div
                className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onMemberClick?.(member);
                }}
                onMouseEnter={() => setHoveredMember(member)}
                onMouseLeave={() => setHoveredMember(null)}
              />
              <motion.div
                animate={{ scale: [1, 2.5], opacity: [0.5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-3 h-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-400/50"
              />
              <div
                className="absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 transition-transform duration-150"
                style={{
                  boxShadow: isHovered ? "0 0 16px rgba(212,165,116,0.78)" : "0 0 8px rgba(212,165,116,0.55)",
                  transform: `translate(-50%,-50%) scale(${isHovered ? 1.5 : 1})`,
                }}
              />
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-5 top-1/2 -translate-y-1/2 z-50 rounded-xl px-3 py-2 whitespace-nowrap pointer-events-none app-popover"
                >
                  <p className="text-xs font-medium text-white/90">
                    {member.first_name} {member.last_name}
                  </p>
                  <p className="text-[10px] text-white/40">{member.location_city}</p>
                </motion.div>
              )}
            </div>
          );
        })}

        {isFlatMap && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg app-popover text-[9px] text-white/45 pointer-events-none">
            map {mapZoom.toFixed(1)}x
          </div>
        )}

        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[9px] text-white/20 pointer-events-none text-center px-2">
          {isFlatMap ? "drag to pan · double-click to zoom in" : "drag to rotate · double-click to open map"}
        </div>

        {countries.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 border border-gold-400/35 border-t-gold-400 rounded-full animate-spin" />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleResetView}
        className="mt-2 inline-flex items-center justify-center w-8 h-8 rounded-full app-popover border border-white/[0.12]
          text-white/60 hover:text-white/85 hover:border-gold-400/28 transition-colors"
        title="Reset map view"
        aria-label="Reset map view"
      >
        <Globe2 size={14} />
      </button>
    </div>
  );
}
