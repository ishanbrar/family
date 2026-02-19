"use client";

// ══════════════════════════════════════════════════════════
// FamilyTree – Interactive Family Tree Visualization
// SVG tree with spouse connections, genetic match rings,
// genetic threads, and "Related By" blood highlighting.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import type { Profile, GeneticMatchResult } from "@/lib/types";

export interface TreeMember {
  profile: Profile;
  match: GeneticMatchResult;
  x: number;
  y: number;
  generation?: number;
}

export interface TreeConnection {
  from: string;
  to: string;
  type: "parent" | "spouse" | "sibling" | "half_sibling";
}

export interface TreeSibship {
  parents: string[];
  children: string[];
}

interface FamilyTreeProps {
  members: TreeMember[];
  connections: TreeConnection[];
  sibships?: TreeSibship[];
  highlightedMembers?: Set<string>;
  dimNonHighlighted?: boolean;
  viewerId?: string;
  showPercentages?: boolean;
  showRelationLabels?: boolean;
  showLastNames?: boolean;
  showBirthYear?: boolean;
  showDeathYear?: boolean;
  onMemberClick?: (id: string) => void;
  onMemberHover?: (id: string | null) => void;
  onBackgroundClick?: () => void;
  showHoverCard?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  className?: string;
}

function getInitials(first: string, last: string): string {
  return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
}

function pointOnCircleToward(
  cx: number,
  cy: number,
  tx: number,
  ty: number,
  radius: number
): { x: number; y: number } {
  const dx = tx - cx;
  const dy = ty - cy;
  const dist = Math.hypot(dx, dy) || 1;
  return { x: cx + (dx / dist) * radius, y: cy + (dy / dist) * radius };
}

export function FamilyTree({
  members,
  connections,
  sibships = [],
  highlightedMembers,
  dimNonHighlighted = false,
  viewerId,
  showPercentages = true,
  showRelationLabels = true,
  showLastNames = false,
  showBirthYear = false,
  showDeathYear = false,
  onMemberClick,
  onMemberHover,
  onBackgroundClick,
  showHoverCard = false,
  canvasWidth = 800,
  canvasHeight = 560,
  className,
}: FamilyTreeProps) {
  const hasHighlight = dimNonHighlighted && highlightedMembers && highlightedMembers.size > 0;
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pinchStateRef = useRef<{ initialDistance: number; initialZoom: number } | null>(null);
  const zoomRef = useRef(zoom);
  const gestureBaseZoomRef = useRef<number | null>(null);

  const hoveredMember = useMemo(
    () => members.find((member) => member.profile.id === hoveredMemberId) || null,
    [members, hoveredMemberId]
  );
  const parentEdgesCoveredBySibships = useMemo(() => {
    const covered = new Set<string>();
    for (const sib of sibships) {
      for (const p of sib.parents) {
        for (const c of sib.children) covered.add(`${p}:${c}`);
      }
    }
    return covered;
  }, [sibships]);
  const spousePairsWithSharedChildren = useMemo(() => {
    const pairs = new Set<string>();
    for (const sib of sibships) {
      if (sib.parents.length < 2 || sib.children.length === 0) continue;
      for (let i = 0; i < sib.parents.length; i++) {
        for (let j = i + 1; j < sib.parents.length; j++) {
          const a = sib.parents[i];
          const b = sib.parents[j];
          const key = a < b ? `${a}:${b}` : `${b}:${a}`;
          pairs.add(key);
        }
      }
    }
    return pairs;
  }, [sibships]);

  const generationColorByValue = useMemo(() => {
    const palette = ["#8B5E3C", "#7C3AED", "#16A34A", "#2563EB"];
    const generations = [...new Set(members.map((m) => m.generation).filter((g): g is number => typeof g === "number"))]
      .sort((a, b) => b - a);
    const map = new Map<number, string>();
    generations.forEach((gen, idx) => {
      map.set(gen, palette[Math.min(idx, palette.length - 1)]);
    });
    return map;
  }, [members]);

  const MIN_ZOOM = 0.7;
  const MAX_ZOOM = 1.8;
  const ZOOM_STEP = 0.1;
  const zoomIn = () => setZoom((prev) => Math.min(MAX_ZOOM, Number((prev + ZOOM_STEP).toFixed(2))));
  const zoomOut = () => setZoom((prev) => Math.max(MIN_ZOOM, Number((prev - ZOOM_STEP).toFixed(2))));
  const resetZoom = () => setZoom(1);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const clampZoom = (value: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Number(value.toFixed(2))));

    const onWheel = (event: WheelEvent) => {
      // Trackpad pinch on desktop browsers emits wheel with ctrlKey/metaKey.
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.0025);
      const next = clampZoom(zoomRef.current * factor);
      zoomRef.current = next;
      setZoom(next);
    };

    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureBaseZoomRef.current = zoomRef.current;
    };

    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const gestureEvent = event as Event & { scale?: number };
      const scale = gestureEvent.scale ?? 1;
      const base = gestureBaseZoomRef.current ?? zoomRef.current;
      const next = clampZoom(base * scale);
      zoomRef.current = next;
      setZoom(next);
    };
    const onGestureEnd = () => {
      gestureBaseZoomRef.current = null;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("gesturestart", onGestureStart, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gesturechange", onGestureChange, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gestureend", onGestureEnd);

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
      el.removeEventListener("gestureend", onGestureEnd);
    };
  }, []);

  const touchDistance = (touches: { length: number; [index: number]: { clientX: number; clientY: number } }) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.hypot(dx, dy);
  };

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-auto", className)}
      onTouchStart={(event) => {
        if (event.touches.length === 2) {
          const initialDistance = touchDistance(event.touches);
          if (initialDistance > 0) {
            pinchStateRef.current = { initialDistance, initialZoom: zoom };
          }
        }
      }}
      onTouchMove={(event) => {
        if (event.touches.length !== 2 || !pinchStateRef.current) return;
        const currentDistance = touchDistance(event.touches);
        if (currentDistance <= 0) return;
        event.preventDefault();
        const scaleFactor = currentDistance / pinchStateRef.current.initialDistance;
        const nextZoom = Math.max(
          MIN_ZOOM,
          Math.min(MAX_ZOOM, Number((pinchStateRef.current.initialZoom * scaleFactor).toFixed(2)))
        );
        setZoom(nextZoom);
      }}
      onTouchEnd={(event) => {
        if (event.touches.length < 2) pinchStateRef.current = null;
      }}
      onTouchCancel={() => {
        pinchStateRef.current = null;
      }}
    >
      <div className="absolute right-2 top-2 z-30 flex items-center gap-1 rounded-lg border border-white/[0.12] bg-black/45 p-1 backdrop-blur">
        <button
          type="button"
          onClick={zoomOut}
          disabled={zoom <= MIN_ZOOM}
          className="h-7 w-7 rounded-md border border-white/[0.12] bg-white/[0.04] text-white/80 hover:bg-white/[0.09] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Zoom out family tree"
        >
          <Minus size={14} className="mx-auto" />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="h-7 min-w-14 rounded-md border border-white/[0.12] bg-white/[0.04] px-2 text-[11px] text-white/80 hover:bg-white/[0.09]"
          aria-label="Reset family tree zoom"
          title="Reset zoom"
        >
          <span className="inline-flex items-center gap-1">
            <RotateCcw size={11} />
            {Math.round(zoom * 100)}%
          </span>
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={zoom >= MAX_ZOOM}
          className="h-7 w-7 rounded-md border border-white/[0.12] bg-white/[0.04] text-white/80 hover:bg-white/[0.09] disabled:opacity-40 disabled:cursor-not-allowed"
          aria-label="Zoom in family tree"
        >
          <Plus size={14} className="mx-auto" />
        </button>
      </div>
      <div
        className="relative"
        style={{ minWidth: canvasWidth * zoom, minHeight: canvasHeight * zoom }}
      >
        <div
          className="relative origin-top-left"
          style={{
            width: canvasWidth,
            minHeight: canvasHeight,
            transform: `scale(${zoom})`,
            transformOrigin: "top left",
          }}
          onClick={() => {
            onBackgroundClick?.();
          }}
        >
        {/* ── SVG Connection Layer ─────────────────── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: canvasHeight }}>
          <defs>
            <linearGradient id="goldThread" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="var(--accent-300)" stopOpacity="0.72" />
              <stop offset="100%" stopColor="var(--accent-200)" stopOpacity="0.46" />
            </linearGradient>
            <linearGradient id="dimThread" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <linearGradient id="spouseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--accent-300)" stopOpacity="0.34" />
              <stop offset="50%" stopColor="var(--accent-300)" stopOpacity="0.48" />
              <stop offset="100%" stopColor="var(--accent-200)" stopOpacity="0.34" />
            </linearGradient>
            <linearGradient id="spouseGradDim" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.02)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Parent-child merged fluid connectors */}
          {sibships.map((sib, sibIdx) => {
            const parentNodes = sib.parents
              .map((id) => members.find((m) => m.profile.id === id))
              .filter(Boolean) as TreeMember[];
            const childNodes = sib.children
              .map((id) => members.find((m) => m.profile.id === id))
              .filter(Boolean) as TreeMember[];
            if (parentNodes.length === 0 || childNodes.length === 0) return null;

            const R = 44; // Keep connectors outside node circles
            const parentBottom = Math.max(...parentNodes.map((p) => p.y + R));
            const childTop = Math.min(...childNodes.map((c) => c.y - R));
            const avgParentX =
              parentNodes.reduce((sum, p) => sum + p.x, 0) / Math.max(parentNodes.length, 1);
            const avgChildX =
              childNodes.reduce((sum, c) => sum + c.x, 0) / Math.max(childNodes.length, 1);
            const unionX = avgParentX * 0.7 + avgChildX * 0.3;
            const rawUnionY = parentBottom + Math.max(24, (childTop - parentBottom) * 0.34);
            const unionY = Math.min(rawUnionY, childTop - 24);

            const allIds = [...sib.parents, ...sib.children];
            const bothHighlighted =
              hasHighlight && allIds.every((id) => highlightedMembers!.has(id));
            const isDimmed = hasHighlight && !bothHighlighted;
            const stroke = isDimmed ? "url(#dimThread)" : "url(#goldThread)";
            const strokeW = isDimmed ? 0.6 : 1;
            const curve = 26;
            const segments: string[] = [];

            // Parents -> one union point
            for (const p of parentNodes) {
              const start = pointOnCircleToward(p.x, p.y, unionX, unionY, R);
              const ctrlX = start.x + (unionX - start.x) * 0.45;
              const ctrlY = start.y + (unionY - start.y) * 0.22;
              segments.push(`M ${start.x} ${start.y} Q ${ctrlX} ${ctrlY}, ${unionX} ${unionY}`);
            }

            // Union point -> each child
            for (const c of childNodes) {
              const end = pointOnCircleToward(c.x, c.y, unionX, unionY, R);
              const childDir = c.x < unionX ? -1 : 1;
              const ctrlX = unionX + childDir * Math.min(curve, Math.abs(c.x - unionX) * 0.38);
              const ctrlY = unionY + (end.y - unionY) * 0.45;
              segments.push(`M ${unionX} ${unionY} Q ${ctrlX} ${ctrlY}, ${end.x} ${end.y}`);
            }
            const d = segments.join(" ");
            return (
              <motion.path
                key={`sibship-${sibIdx}`}
                d={d}
                fill="none"
                stroke={stroke}
                strokeWidth={strokeW}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter={bothHighlighted && !isDimmed ? "url(#glow)" : undefined}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 + sibIdx * 0.05 }}
              />
            );
          })}

          {connections.map((conn, i) => {
            const from = members.find((m) => m.profile.id === conn.from);
            const to = members.find((m) => m.profile.id === conn.to);
            if (!from || !to) return null;

            const bothHighlighted =
              hasHighlight &&
              highlightedMembers!.has(conn.from) &&
              highlightedMembers!.has(conn.to);
            const isDimmed = hasHighlight && !bothHighlighted;

            if (conn.type === "parent") {
              // Fallback line for parent-child pairs not covered by a sibship group.
              if (parentEdgesCoveredBySibships.has(`${conn.from}:${conn.to}`)) return null;
              const parent = from;
              const child = to;
              const R = 44;
              const start = pointOnCircleToward(parent.x, parent.y, child.x, child.y, R);
              const end = pointOnCircleToward(child.x, child.y, parent.x, parent.y, R);
              const sx = start.x;
              const sy = start.y;
              const ex = end.x;
              const ey = end.y;
              const ctrlX = Math.abs(ex - sx) < 10 ? sx + 14 : (sx + ex) / 2 + (ex - sx) * 0.18;
              const ctrlY = (sy + ey) / 2;
              return (
                <motion.path
                  key={`parent-${conn.from}-${conn.to}-${i}`}
                  d={`M ${sx} ${sy} Q ${ctrlX} ${ctrlY}, ${ex} ${ey}`}
                  fill="none"
                  stroke={isDimmed ? "url(#dimThread)" : "url(#goldThread)"}
                  strokeWidth={isDimmed ? 0.6 : 1}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.45, delay: 0.2 + i * 0.04 }}
                />
              );
            }

            if (conn.type === "spouse") {
              if (Math.abs(from.y - to.y) > 1) return null;
              const pairKey = conn.from < conn.to ? `${conn.from}:${conn.to}` : `${conn.to}:${conn.from}`;
              if (spousePairsWithSharedChildren.has(pairKey)) return null;
              const inset = 44;
              const left = from.x <= to.x ? from : to;
              const right = from.x <= to.x ? to : from;
              const startX = left.x + inset;
              const endX = right.x - inset;
              const y = (left.y + right.y) / 2;

              return (
                <g key={`spouse-${conn.from}-${conn.to}`}>
                  <motion.line
                    x1={startX} y1={y} x2={endX} y2={y}
                    stroke={isDimmed ? "rgba(212,165,116,0.2)" : "rgba(212,165,116,0.82)"}
                    strokeWidth={isDimmed ? 1.2 : 2}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.45, delay: 0.3 }}
                  />
                </g>
              );
            }

            if (conn.type === "sibling" || conn.type === "half_sibling") {
              return null;
            }

            return null;
          })}
        </svg>

        {/* ── Member Nodes ─────────────────────────── */}
        {members.map((member, i) => {
          const isHighlighted = highlightedMembers?.has(member.profile.id);
          const isDimmed = hasHighlight && !isHighlighted;
          const isViewerNode = viewerId === member.profile.id;
          const initials = getInitials(member.profile.first_name, member.profile.last_name);
          const birthYear = member.profile.date_of_birth
            ? new Date(member.profile.date_of_birth).getFullYear()
            : null;
          const deathValue = (member.profile as { date_of_death?: string | null }).date_of_death || null;
          const deathYear = deathValue ? new Date(deathValue).getFullYear() : null;

          return (
            <motion.div
              key={member.profile.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isDimmed ? 0.25 : 1,
                scale: isViewerNode ? 1.06 : 1,
              }}
              transition={{
                delay: 0.2 + i * 0.06,
                type: "spring",
                stiffness: 300,
                damping: 25,
              }}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer",
                isHighlighted && "z-10"
              )}
              style={{ left: member.x, top: member.y }}
              onMouseEnter={() => {
                setHoveredMemberId(member.profile.id);
                onMemberHover?.(member.profile.id);
              }}
              onMouseLeave={() => {
                setHoveredMemberId((current) =>
                  current === member.profile.id ? null : current
                );
                onMemberHover?.(null);
              }}
              onClick={(event) => {
                event.stopPropagation();
                onMemberClick?.(member.profile.id);
              }}
            >
              <div className="flex flex-col items-center">
                <GeneticMatchRing
                  percentage={member.match.percentage}
                  size={isViewerNode ? 86 : 80}
                  strokeWidth={2.5}
                  avatarUrl={member.profile.avatar_url}
                  initials={initials}
                  edgeColor={
                    typeof member.generation === "number"
                      ? generationColorByValue.get(member.generation)
                      : undefined
                  }
                  showPercentage={
                    showPercentages &&
                    member.match.percentage > 0 &&
                    member.match.relationship !== "Self"
                  }
                />
                {isViewerNode && (
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-gold-400/15 border border-gold-400/30 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-gold-300">
                    YOU
                  </span>
                )}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.3 : 1 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="mt-2 text-center"
                >
                  <p className={cn(
                    "text-xs",
                    isViewerNode
                      ? "font-semibold text-gold-300 text-glow-gold"
                      : isHighlighted
                        ? "font-medium text-gold-300 text-glow-gold"
                        : "font-medium text-white/70"
                  )}>
                    {showLastNames
                      ? `${member.profile.first_name} ${member.profile.last_name}`
                      : member.profile.first_name}
                  </p>
                  {showRelationLabels && (
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {member.match.relationship}
                    </p>
                  )}
                  {showBirthYear && (
                    <p className="text-[10px] text-white/35 mt-0.5">
                      {birthYear ? `b. ${birthYear}` : "Birth year unknown"}
                    </p>
                  )}
                  {showDeathYear && !member.profile.is_alive && (
                    <p className="text-[10px] text-white/35 mt-0.5">
                      {deathYear ? `d. ${deathYear}` : "d. --"}
                    </p>
                  )}
                  {!member.profile.is_alive && (
                    <p className="text-[9px] text-white/15 italic mt-0.5">In Memoriam</p>
                  )}
                </motion.div>
              </div>

              {/* Pulsing highlight ring */}
              {isHighlighted && hasHighlight && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0, 0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-[84px] h-[84px] -mt-[2px]
                    rounded-full border border-gold-400/35"
                />
              )}
            </motion.div>
          );
        })}

        {showHoverCard && hoveredMember && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            className="absolute z-20 pointer-events-none max-w-[260px] rounded-xl app-popover border border-white/[0.12] px-3 py-2"
            style={{
              left: Math.min(hoveredMember.x + 56, canvasWidth - 230),
              top: Math.max(12, hoveredMember.y - 38),
            }}
          >
            <p className="text-sm font-medium text-white/92">
              {hoveredMember.profile.first_name} {hoveredMember.profile.last_name}
            </p>
            <p className="text-[11px] text-gold-300/85 mt-0.5">{hoveredMember.match.relationship}</p>
            <p className="text-[11px] text-white/55 mt-1">
              {hoveredMember.profile.location_city || "Location not set"}
              {hoveredMember.profile.profession ? ` · ${hoveredMember.profile.profession}` : ""}
            </p>
            <p className="text-[11px] text-white/46 mt-0.5">
              Blood match: {Math.round(hoveredMember.match.percentage * 100) / 100}%
            </p>
          </motion.div>
        )}
        </div>
      </div>
    </div>
  );
}
