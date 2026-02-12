"use client";

// ══════════════════════════════════════════════════════════
// InteractiveGlobe – d3-geo Orthographic Globe
// Real country outlines, double-tap zoom, draggable
// rotation, highlighted member countries, pulsing dots.
// ══════════════════════════════════════════════════════════

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoContains,
  type GeoPermissibleObjects,
} from "d3-geo";
import { feature } from "topojson-client";
import { cn } from "@/lib/cn";
import type { Profile } from "@/lib/types";

interface InteractiveGlobeProps {
  members: Profile[];
  onMemberClick?: (member: Profile) => void;
  className?: string;
}

interface CountryFeature {
  type: "Feature";
  id: string;
  geometry: GeoPermissibleObjects;
  properties: { name: string };
}

const TOPO_URL =
  "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";
const ZOOM_LEVELS = [1, 1.6, 2.4];

export function InteractiveGlobe({
  members,
  onMemberClick,
  className,
}: InteractiveGlobeProps) {
  const baseSize = 300;
  const svgRef = useRef<SVGSVGElement>(null);
  const [rotation, setRotation] = useState<[number, number]>([-20, -15]);
  const [zoomIdx, setZoomIdx] = useState(0);
  const zoom = ZOOM_LEVELS[zoomIdx];
  const [isDragging, setIsDragging] = useState(false);
  const [hoveredMember, setHoveredMember] = useState<Profile | null>(null);
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const dragStart = useRef<{ x: number; y: number; rot: [number, number] }>({
    x: 0, y: 0, rot: [-20, -15],
  });
  const lastClickTime = useRef(0);
  const autoSpinRef = useRef<ReturnType<typeof setInterval>>(undefined);

  const locatedMembers = members.filter(
    (m) => m.location_lat != null && m.location_lng != null
  );

  // ── Load topology ─────────────────────────────
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
    return () => { cancelled = true; };
  }, []);

  // ── Auto-rotate ───────────────────────────────
  useEffect(() => {
    if (!isDragging) {
      autoSpinRef.current = setInterval(() => {
        setRotation(([lng, lat]) => [lng - 0.15, lat]);
      }, 50);
    }
    return () => { if (autoSpinRef.current) clearInterval(autoSpinRef.current); };
  }, [isDragging]);

  // ── Countries with family members ─────────────
  const memberCountryIds = useMemo(() => {
    const ids = new Set<string>();
    if (countries.length === 0) return ids;
    for (const member of locatedMembers) {
      for (const country of countries) {
        try {
          if (geoContains(country as unknown as GeoPermissibleObjects, [member.location_lng!, member.location_lat!])) {
            ids.add(country.id);
            break;
          }
        } catch { /* skip */ }
      }
    }
    return ids;
  }, [countries, locatedMembers]);

  // ── Projection (zoom-aware) ───────────────────
  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale((baseSize / 2 - 2) * zoom)
        .translate([baseSize / 2, baseSize / 2])
        .rotate(rotation)
        .clipAngle(90),
    [rotation, zoom, baseSize]
  );

  const pathGen = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule10(), []);

  // ── Double-click to zoom ──────────────────────
  const handleClick = useCallback(() => {
    const now = Date.now();
    if (now - lastClickTime.current < 350) {
      setZoomIdx((i) => (i + 1) % ZOOM_LEVELS.length);
    }
    lastClickTime.current = now;
  }, []);

  // ── Drag handlers ─────────────────────────────
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      dragStart.current = { x: e.clientX, y: e.clientY, rot: [...rotation] as [number, number] };
    },
    [rotation]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const speed = 0.35 / zoom;
      setRotation([
        dragStart.current.rot[0] + dx * speed,
        Math.max(-60, Math.min(60, dragStart.current.rot[1] - dy * speed)),
      ]);
    },
    [isDragging, zoom]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);

  // ── Project member positions ──────────────────
  const projectedMembers = useMemo(() => {
    return locatedMembers.map((m) => {
      const coords = projection([m.location_lng!, m.location_lat!]);
      const r = projection.rotate();
      const lngDiff = ((m.location_lng! + r[0] + 180) % 360) - 180;
      const latDiff = m.location_lat! + r[1];
      const visible = Math.sqrt(lngDiff * lngDiff + latDiff * latDiff) < 90;
      return {
        member: m,
        x: coords ? coords[0] : 0,
        y: coords ? coords[1] : 0,
        visible: visible && coords !== null,
      };
    });
  }, [locatedMembers, projection]);

  return (
    <div
      className={cn(
        "relative flex items-center justify-center select-none overflow-hidden rounded-2xl",
        isDragging ? "cursor-grabbing" : "cursor-grab",
        className
      )}
      style={{ width: baseSize, height: baseSize }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onClick={handleClick}
    >
      <svg
        ref={svgRef}
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

        <circle cx={baseSize / 2} cy={baseSize / 2} r={baseSize / 2 - 2}
          fill="#0d0d0d" stroke="rgba(255,255,255,0.06)" strokeWidth={1} />

        <g clipPath="url(#globeClip)">
          <path d={pathGen(graticule) || ""} fill="none" stroke="rgba(255,255,255,0.02)" strokeWidth={0.4} />

          {countries.map((country, idx) => {
            const d = pathGen(country as unknown as GeoPermissibleObjects);
            if (!d) return null;
            const hasMember = memberCountryIds.has(country.id);
            return (
              <path
                key={`c-${country.id ?? idx}`}
                d={d}
                fill={hasMember ? "rgba(212,165,116,0.18)" : "rgba(255,255,255,0.03)"}
                stroke={hasMember ? "rgba(212,165,116,0.4)" : "rgba(255,255,255,0.07)"}
                strokeWidth={hasMember ? 0.8 : 0.3}
                className="transition-colors duration-500"
              />
            );
          })}

          <circle cx={baseSize / 2} cy={baseSize / 2} r={baseSize / 2 - 2}
            fill="url(#globeShade)" pointerEvents="none" />
        </g>

        <circle cx={baseSize / 2} cy={baseSize / 2} r={baseSize / 2 - 1}
          fill="none" stroke="rgba(212,165,116,0.08)" strokeWidth={1} />
      </svg>

      {/* Member dots */}
      {projectedMembers.map(({ member, x, y, visible }) => {
        if (!visible) return null;
        const isHovered = hoveredMember?.id === member.id;
        return (
          <div key={member.id} className="absolute pointer-events-auto" style={{ left: x, top: y, zIndex: 10 }}>
            <div
              className="absolute w-7 h-7 -translate-x-1/2 -translate-y-1/2 rounded-full cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onMemberClick?.(member); }}
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
                boxShadow: isHovered ? "0 0 16px rgba(212,165,116,0.8)" : "0 0 8px rgba(212,165,116,0.5)",
                transform: `translate(-50%,-50%) scale(${isHovered ? 1.5 : 1})`,
              }}
            />
            <AnimatePresence>
              {isHovered && (
                <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  className="absolute left-5 top-1/2 -translate-y-1/2 z-50 rounded-xl px-3 py-2 whitespace-nowrap pointer-events-none"
                  style={{ background: "rgba(17,17,17,0.95)", border: "1px solid rgba(255,255,255,0.1)" }}
                >
                  <p className="text-xs font-medium text-white/90">{member.first_name} {member.last_name}</p>
                  <p className="text-[10px] text-white/40">{member.location_city}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Zoom indicator */}
      {zoomIdx > 0 && (
        <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-black/60 text-[9px] text-white/40 pointer-events-none">
          {zoom.toFixed(1)}x
        </div>
      )}

      {!isDragging && countries.length > 0 && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-white/15 pointer-events-none">
          drag to rotate · double-click to zoom
        </div>
      )}

      {countries.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-5 h-5 border border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
