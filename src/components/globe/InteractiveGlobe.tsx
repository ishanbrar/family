"use client";

// ══════════════════════════════════════════════════════════
// InteractiveGlobe – Globe + Flat Map Hybrid
// - Base: rotating orthographic globe
// - Double-click: opens flat map and keeps zooming in continuously
// - Reset control: returns to default globe view
// - Any pointer interaction pauses auto-rotation
// ══════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, useReducedMotion } from "framer-motion";
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
import { buildLocationTickerItems } from "@/lib/location-summary";
import { getProfileLocationPoints, type ProfileLocationPoint } from "@/lib/profile-locations";
import type { Profile } from "@/lib/types";
import { inferCountryCodeFromCity, getCityCoordinates } from "@/lib/cities";
import { countryName } from "@/lib/country-utils";

interface InteractiveGlobeProps {
  members: Profile[];
  onMemberClick?: (member: Profile) => void;
  onCountryClick?: (countryCode: string) => void;
  focusCountryCode?: string | null;
  focusSignal?: number;
  /** Globe diameter in pixels. Default 300. */
  size?: number;
  showTicker?: boolean;
  className?: string;
}

interface CountryFeature {
  type: "Feature";
  id: string;
  geometry: GeoPermissibleObjects;
  properties: { name: string };
}

interface ResolvedMemberLocation {
  key: string;
  member: Profile;
  city: string;
  point: ProfileLocationPoint;
  lat: number;
  lng: number;
  countryCode: string | null;
  countryId?: string;
}

const TOPO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const TOPO_LOCAL_URL = "/data/countries-110m.json";
const TOPO_CACHE_KEY = "legacy:world-topology:v1";
const BASE_ROTATION: [number, number] = [-20, -15];
const MAP_MIN_ZOOM = 1;
const MAP_OPEN_ZOOM = 1.3;
const MAP_FOCUS_ZOOM = 2.8;
const MAP_MAX_ZOOM = 8;
const MAP_ZOOM_STEP = 1.92;
const AUTO_ROTATE_STEP_DEGREES = 0.21;

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

/** Show only city name (e.g. "Dallas, TX, USA" → "Dallas"). */
function cityOnly(locationCity: string): string {
  return (locationCity || "").split(",")[0].trim() || locationCity.trim();
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
  onCountryClick,
  focusCountryCode,
  focusSignal,
  size = 420,
  showTicker = true,
  className,
}: InteractiveGlobeProps) {
  const baseSize = size;
  const frameWidth = `${baseSize}px`;
  const shouldReduceMotion = useReducedMotion();
  const [rotation, setRotation] = useState<[number, number]>(BASE_ROTATION);
  const [isFlatMap, setIsFlatMap] = useState(false);
  const [mapZoom, setMapZoom] = useState(MAP_MIN_ZOOM);
  const [mapPan, setMapPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<Profile | null>(null);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [autoRotate, setAutoRotate] = useState(true);
  const [loadingTopology, setLoadingTopology] = useState(true);
  const [mapLoadError, setMapLoadError] = useState<string | null>(null);

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

  const extractCountries = useCallback((topology: unknown): CountryFeature[] => {
    if (!topology || typeof topology !== "object") return [];
    const topoObject = topology as { objects?: { countries?: unknown } };
    if (!topoObject.objects?.countries) return [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const geo = feature(topology as any, topoObject.objects.countries as any) as any;
    if (!Array.isArray(geo?.features)) return [];
    return geo.features as CountryFeature[];
  }, []);

  const loadTopology = useCallback(
    async () => {
      setLoadingTopology(true);
      setMapLoadError(null);

      const trySources = [TOPO_LOCAL_URL, TOPO_URL];
      for (const source of trySources) {
        try {
          const response = await fetch(source);
          if (!response.ok) continue;
          const topology = await response.json();
          const features = extractCountries(topology);
          if (features.length === 0) continue;
          setCountries(features);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(TOPO_CACHE_KEY, JSON.stringify(topology));
          }
          setLoadingTopology(false);
          return;
        } catch {
          // Try next source.
        }
      }

      if (typeof window !== "undefined") {
        const cached = window.localStorage.getItem(TOPO_CACHE_KEY);
        if (cached) {
          try {
            const parsed = JSON.parse(cached);
            const features = extractCountries(parsed);
            if (features.length > 0) {
              setCountries(features);
              setLoadingTopology(false);
              return;
            }
          } catch {
            // Ignore malformed cache.
          }
        }
      }

      setCountries([]);
      setMapLoadError("Map data failed to load. Check your connection or retry.");
      setLoadingTopology(false);
    },
    [extractCountries]
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadTopology();
    }, 0);
    return () => {
      window.clearTimeout(timer);
    };
  }, [loadTopology]);

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
      for (const point of getProfileLocationPoints(member, { includeSecondary: true })) {
        const code = (point.countryCode || inferCountryCodeFromCity(point.city || "") || "")
          .toUpperCase()
          .trim();
        if (code) candidateCodes.add(code);
      }
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
      for (const point of getProfileLocationPoints(member, { includeSecondary: true })) {
        const countryCode =
          (point.countryCode || inferCountryCodeFromCity(point.city || "") || "").toUpperCase().trim() || null;

        if (point.lat != null && point.lng != null) {
          resolved.push({
            key: point.key,
            member,
            city: point.city,
            point,
            lat: point.lat,
            lng: point.lng,
            countryCode,
          });
          continue;
        }

        const cityCoords = point.city ? getCityCoordinates(point.city) : null;
        if (cityCoords) {
          const [lat, lng] = cityCoords;
          resolved.push({
            key: point.key,
            member,
            city: point.city,
            point,
            lat,
            lng,
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
          key: point.key,
          member,
          city: point.city,
          point,
          lat,
          lng,
          countryCode,
          countryId: country.id,
        });
      }
    }

    return resolved;
  }, [members, countryFeatureByCode]);

  useEffect(() => {
    if (!autoRotate || isFlatMap || isDragging) return;

    autoSpinRef.current = setInterval(() => {
      setRotation(([lng, lat]) => [lng - AUTO_ROTATE_STEP_DEGREES, lat]);
    }, 50);

    return () => {
      if (autoSpinRef.current) clearInterval(autoSpinRef.current);
    };
  }, [autoRotate, isFlatMap, isDragging]);

  const countryMembership = useMemo(() => {
    const memberCountryByLocationKey = new Map<string, string>();
    const memberCountryIds = new Set<string>();

    if (countries.length === 0) {
      return { memberCountryByLocationKey, memberCountryIds };
    }

    for (const member of locatedMembers) {
      if (member.countryId) {
        memberCountryByLocationKey.set(member.key, member.countryId);
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
            memberCountryByLocationKey.set(member.key, country.id);
            memberCountryIds.add(country.id);
            break;
          }
        } catch {
          // Skip malformed geometry
        }
      }
    }

    return { memberCountryByLocationKey, memberCountryIds };
  }, [countries, locatedMembers]);

  const countryCodeByFeatureId = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of locatedMembers) {
      if (!m.countryCode) continue;
      const fid = countryMembership.memberCountryByLocationKey.get(m.key);
      if (fid && !map.has(fid)) map.set(fid, m.countryCode);
    }
    return map;
  }, [locatedMembers, countryMembership]);

  const focusedCountryIds = useMemo(() => {
    const ids = new Set<string>();
    const code = focusCountryCode?.toUpperCase().trim();
    if (!code) return ids;

    for (const member of locatedMembers) {
      if (member.countryCode?.toUpperCase() !== code) continue;
      const countryId = countryMembership.memberCountryByLocationKey.get(member.key);
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
  }, [focusCountryCode, focusSignal, locatedMembers, baseSize]);

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
          key: m.key,
          member: m.member,
          city: m.city,
          x: coords[0],
          y: coords[1],
          visible,
        };
      })
      .filter((p): p is { key: string; member: Profile; city: string; x: number; y: number; visible: boolean } => p !== null);
  }, [locatedMembers, globeProjection]);

  const mapMembers = useMemo(() => {
    return locatedMembers
      .map((m) => {
        const coords = mapProjection([m.lng, m.lat]);
        if (!coords) return null;
        return {
          key: m.key,
          member: m.member,
          city: m.city,
          x: coords[0],
          y: coords[1],
          visible:
            coords[0] >= -20 &&
            coords[0] <= baseSize + 20 &&
            coords[1] >= -20 &&
            coords[1] <= baseSize + 20,
        };
      })
      .filter((p): p is { key: string; member: Profile; city: string; x: number; y: number; visible: boolean } => p !== null);
  }, [locatedMembers, mapProjection, baseSize]);

  const visibleMembers = isFlatMap ? mapMembers : globeMembers;

  const memberMarkers = useMemo(() => {
    const cityMap = new Map<string, { members: Profile[]; xs: number[]; ys: number[]; city: string }>();
    for (const { member, city, x, y, visible } of visibleMembers) {
      if (!visible) continue;
      const key = city.toLowerCase() || `_${member.id}`;
      const existing = cityMap.get(key);
      if (existing) {
        existing.members.push(member);
        existing.xs.push(x);
        existing.ys.push(y);
      } else {
        cityMap.set(key, { members: [member], xs: [x], ys: [y], city });
      }
    }
    return [...cityMap.values()].map((g) => ({
      members: g.members,
      x: g.xs.reduce((a, b) => a + b, 0) / g.xs.length,
      y: g.ys.reduce((a, b) => a + b, 0) / g.ys.length,
      city: g.city,
    }));
  }, [visibleMembers]);

  const locationTickerItems = useMemo(() => buildLocationTickerItems(members), [members]);
  const tickerLoopItems = useMemo(() => {
    if (locationTickerItems.length === 0) return [];
    const repeatCount = Math.max(2, Math.ceil(14 / locationTickerItems.length));
    return Array.from({ length: repeatCount }).flatMap(() => locationTickerItems);
  }, [locationTickerItems]);
  const tickerDuration = useMemo(
    () => `${Math.max(24, tickerLoopItems.length * 3.2)}s`,
    [tickerLoopItems.length]
  );
  const renderTickerPill = useCallback(
    (item: (typeof locationTickerItems)[number], key: string) => (
      <div
        key={key}
        className="shrink-0 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1.5 text-[11px] text-white/72"
      >
        <span className="mr-1.5 text-sm leading-none align-middle">{item.flag}</span>
        <span className="font-medium text-white/84">{item.city}</span>
        <span className="text-white/56"> — {item.memberNames.join(", ")}</span>
      </div>
    ),
    []
  );

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
    <div
      className={cn("relative flex min-w-0 max-w-full flex-col items-center overflow-hidden", className)}
      style={{ width: frameWidth, maxWidth: "100%" }}
    >
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
          className="overflow-hidden pointer-events-none"
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
                    style={hasMember ? { cursor: "pointer", pointerEvents: "auto" } : undefined}
                    onClick={hasMember ? (e) => {
                      e.stopPropagation();
                      const code = countryCodeByFeatureId.get(country.id);
                      if (code) onCountryClick?.(code);
                    } : undefined}
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
                  style={hasMember ? { cursor: "pointer", pointerEvents: "auto" } : undefined}
                  onClick={hasMember ? (e) => {
                    e.stopPropagation();
                    const code = countryCodeByFeatureId.get(country.id);
                    if (code) onCountryClick?.(code);
                  } : undefined}
                />
              );
            })}
          </motion.g>
        </svg>

        {memberMarkers.map((group) => {
          const isHovered = group.members.some((m) => hoveredMember?.id === m.id);
          const primary = group.members[0];

          return (
            <div
              key={group.city || primary.id}
              className="absolute"
              style={{ left: group.x, top: group.y, zIndex: isHovered ? 20 : 10 }}
            >
              <div
                className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onMemberClick?.(primary);
                }}
                onMouseEnter={() => setHoveredMember(primary)}
                onMouseLeave={() => setHoveredMember(null)}
              />
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                style={{
                  width: isHovered ? 7 : 5,
                  height: isHovered ? 7 : 5,
                  backgroundColor: isHovered ? "var(--map-marker-dot-hover)" : "var(--map-marker-dot)",
                  boxShadow: `0 0 ${isHovered ? 6 : 3}px ${isHovered ? "var(--map-marker-glow-hover)" : "var(--map-marker-glow)"}`,
                  transition: "all 0.2s ease",
                }}
              />
              {group.city && (
                <div
                  className="absolute pointer-events-none whitespace-nowrap"
                  style={{
                    left: 5,
                    top: "50%",
                    transform: "translateY(-50%)",
                    fontSize: 7,
                    fontWeight: 500,
                    letterSpacing: "0.01em",
                    color: isHovered ? "var(--map-marker-label-hover)" : "var(--map-marker-label)",
                    textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                    transition: "color 0.2s ease",
                  }}
                >
                  {cityOnly(group.city)}
                  {group.members.length > 1 ? ` (${group.members.length})` : ""}
                </div>
              )}
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute left-5 top-1/2 -translate-y-1/2 z-50 rounded-xl px-3 py-2 whitespace-nowrap pointer-events-none app-popover"
                  style={{ marginTop: group.city ? -14 : 0 }}
                >
                  {group.members.map((m) => (
                    <p key={m.id} className="text-xs font-medium text-white/90">
                      {m.first_name} {m.last_name}
                    </p>
                  ))}
                  {group.city && (
                    <p className="text-[10px] text-white/40 mt-0.5">{cityOnly(group.city)}</p>
                  )}
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

        {loadingTopology && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-5 h-5 border border-gold-400/35 border-t-gold-400 rounded-full animate-spin" />
          </div>
        )}
        {!loadingTopology && mapLoadError && (
          <div className="absolute inset-0 flex items-center justify-center p-4">
            <div className="max-w-[220px] rounded-xl app-popover border border-white/[0.14] px-3 py-2.5 text-center">
              <p className="text-[11px] app-text-secondary">{mapLoadError}</p>
              <button
                type="button"
                onClick={() => void loadTopology()}
                className="mt-2 h-7 px-2.5 rounded-lg bg-white/[0.05] border border-white/[0.12] text-[11px] app-text-primary hover:bg-white/[0.08] transition-colors"
              >
                Retry map load
              </button>
            </div>
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

      {showTicker && locationTickerItems.length > 0 && (
        <div className="mt-3 w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {shouldReduceMotion ? (
            <div className="max-w-full overflow-x-auto px-2 py-2">
              <div className="flex w-max min-w-full gap-2">
                {locationTickerItems.map((item) =>
                  renderTickerPill(item, `${item.countryCode}-${item.city}`)
                )}
              </div>
            </div>
          ) : (
            <div className="group relative max-w-full overflow-hidden px-2 py-2">
              <div
                className="globe-ticker-marquee group-hover:[animation-play-state:paused] group-focus-within:[animation-play-state:paused]"
                style={{
                  ["--ticker-duration" as string]: tickerDuration,
                  ["--ticker-gap" as string]: "0.5rem",
                }}
              >
                <div className="globe-ticker-group">
                  {tickerLoopItems.map((item, index) =>
                    renderTickerPill(item, `${item.countryCode}-${item.city}-a-${index}`)
                  )}
                </div>
                <div className="globe-ticker-group" aria-hidden="true">
                  {tickerLoopItems.map((item, index) =>
                    renderTickerPill(item, `${item.countryCode}-${item.city}-b-${index}`)
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
