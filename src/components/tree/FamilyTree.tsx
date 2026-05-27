"use client";

// ══════════════════════════════════════════════════════════
// FamilyTree – Interactive Family Tree Visualization
// SVG tree with spouse connections, genetic match rings,
// genetic threads, and "Related By" blood highlighting.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Maximize2, Minus, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import type { Profile, GeneticMatchResult } from "@/lib/types";
import { countryFlag } from "@/lib/country-utils";
import { inferCountryCodeFromCity } from "@/lib/cities";
import { formatDisplayText, formatPersonName, parseDateOnly } from "@/lib/display-format";
import { shouldZoomTreeOnWheel } from "@/lib/tree-interaction";

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
  showBirthCountryFlag?: boolean;
  showCurrentCountryFlag?: boolean;
  onMemberClick?: (id: string) => void;
  onMemberHover?: (id: string | null) => void;
  onBackgroundClick?: () => void;
  viewResetSignal?: number;
  showHoverCard?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  className?: string;
}

function getInitials(first: string, last: string): string {
  return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
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
  showBirthCountryFlag = false,
  showCurrentCountryFlag = false,
  onMemberClick,
  onMemberHover,
  onBackgroundClick,
  viewResetSignal,
  showHoverCard = false,
  canvasWidth = 800,
  canvasHeight = 560,
  className,
}: FamilyTreeProps) {
  const hasHighlight = dimNonHighlighted && highlightedMembers && highlightedMembers.size > 0;
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const viewRef = useRef({ x: 0, y: 0, scale: 1 });
  const [view, setView] = useState({ x: 0, y: 0, scale: 1 });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const panStartRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const pinchStartRef = useRef<{ dist: number; scale: number; vx: number; vy: number; mx: number; my: number } | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const hasAutoCenteredRef = useRef(false);
  const didDragRef = useRef(false);
  const lastResetSignalRef = useRef<number | undefined>(undefined);

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

  const MIN_ZOOM = 0.3;
  const MAX_ZOOM = 3;
  const NODE_VISUAL_RADIUS = 92;
  const clampScale = (s: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s));
  const treeBounds = useMemo(() => {
    if (members.length === 0) return null;
    const xs = members.map((m) => m.x);
    const ys = members.map((m) => m.y);
    return {
      minX: Math.min(...xs) - NODE_VISUAL_RADIUS,
      maxX: Math.max(...xs) + NODE_VISUAL_RADIUS,
      minY: Math.min(...ys) - NODE_VISUAL_RADIUS,
      maxY: Math.max(...ys) + NODE_VISUAL_RADIUS + 94,
    };
  }, [members]);
  const layoutKey = useMemo(
    () => members.map((member) => `${member.profile.id}:${Math.round(member.x)}:${Math.round(member.y)}`).join("|"),
    [members]
  );

  const updateView = useCallback((next: { x: number; y: number; scale: number }) => {
    viewRef.current = next;
    setView(next);
  }, []);

  const animateTo = useCallback((target: { x: number; y: number; scale: number }) => {
    setIsAnimating(true);
    updateView(target);
    if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    animationTimeoutRef.current = window.setTimeout(() => {
      setIsAnimating(false);
      animationTimeoutRef.current = null;
    }, 320);
  }, [updateView]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current) window.clearTimeout(animationTimeoutRef.current);
    };
  }, []);

  const zoomTo = useCallback((newScale: number, cx: number, cy: number, animate = false) => {
    const v = viewRef.current;
    const clamped = clampScale(newScale);
    const ratio = clamped / v.scale;
    const x = cx - (cx - v.x) * ratio;
    const y = cy - (cy - v.y) * ratio;
    if (animate) animateTo({ x, y, scale: clamped });
    else updateView({ x, y, scale: clamped });
  }, [animateTo, updateView]);

  const zoomIn = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    zoomTo(viewRef.current.scale * 1.3, el.clientWidth / 2, el.clientHeight / 2, true);
  }, [zoomTo]);

  const zoomOut = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    zoomTo(viewRef.current.scale / 1.3, el.clientWidth / 2, el.clientHeight / 2, true);
  }, [zoomTo]);

  const fitToView = useCallback(() => {
    const el = containerRef.current;
    if (!el || !treeBounds) return;
    const vw = el.clientWidth;
    const vh = el.clientHeight;
    const breathingRoom = Math.max(96, Math.min(180, Math.min(vw, vh) * 0.16));
    const availableW = Math.max(240, vw - breathingRoom * 2);
    const availableH = Math.max(220, vh - breathingRoom * 2);
    const treeW = Math.max(1, treeBounds.maxX - treeBounds.minX);
    const treeH = Math.max(1, treeBounds.maxY - treeBounds.minY);
    const scale = clampScale(Math.min(0.92, availableW / treeW, availableH / treeH));
    const x = (vw - treeW * scale) / 2 - treeBounds.minX * scale;
    const y = (vh - treeH * scale) / 2 - treeBounds.minY * scale;
    animateTo({ x, y, scale });
  }, [treeBounds, animateTo]);

  const resetZoom = useCallback(() => {
    fitToView();
  }, [fitToView]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomIn(); }
      else if (e.key === "-") { e.preventDefault(); zoomOut(); }
      else if (e.key === "0") { e.preventDefault(); resetZoom(); }
      else if (e.key === "f") { e.preventDefault(); fitToView(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomIn, zoomOut, resetZoom, fitToView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (!shouldZoomTreeOnWheel(e)) {
        return;
      }
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const delta = e.ctrlKey ? -e.deltaY * 0.01 : -e.deltaY * 0.003;
      const factor = Math.exp(delta);
      zoomTo(viewRef.current.scale * factor, cx, cy);
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [zoomTo]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let gestureBase = 1;
    let gestureView = { x: 0, y: 0 };

    const onGestureStart = (e: Event) => {
      e.preventDefault();
      gestureBase = viewRef.current.scale;
      gestureView = { x: viewRef.current.x, y: viewRef.current.y };
    };
    const onGestureChange = (e: Event) => {
      e.preventDefault();
      const ge = e as Event & { scale?: number };
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const newScale = clampScale(gestureBase * (ge.scale ?? 1));
      const canvasX = (cx - gestureView.x) / gestureBase;
      const canvasY = (cy - gestureView.y) / gestureBase;
      updateView({ x: cx - canvasX * newScale, y: cy - canvasY * newScale, scale: newScale });
    };

    el.addEventListener("gesturestart", onGestureStart, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gesturechange", onGestureChange, { passive: false } as AddEventListenerOptions);
    el.addEventListener("gestureend", () => {}, { passive: false } as AddEventListenerOptions);
    return () => {
      el.removeEventListener("gesturestart", onGestureStart);
      el.removeEventListener("gesturechange", onGestureChange);
    };
  }, [updateView]);

  useEffect(() => {
    if (hasAutoCenteredRef.current || members.length === 0) return;
    hasAutoCenteredRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => fitToView()));
  }, [members.length, fitToView]);

  useEffect(() => {
    if (members.length === 0) return;
    hasAutoCenteredRef.current = false;
    requestAnimationFrame(() => requestAnimationFrame(() => fitToView()));
  }, [layoutKey, members.length, fitToView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      if (!hasAutoCenteredRef.current) return;
      fitToView();
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [fitToView]);

  useEffect(() => {
    if (viewResetSignal == null) return;
    if (lastResetSignalRef.current === viewResetSignal) return;
    lastResetSignalRef.current = viewResetSignal;
    fitToView();
  }, [viewResetSignal, fitToView]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    didDragRef.current = false;

    if (pointersRef.current.size === 1) {
      panStartRef.current = { x: e.clientX, y: e.clientY, vx: viewRef.current.x, vy: viewRef.current.y };
    }
    if (pointersRef.current.size === 2) {
      panStartRef.current = null;
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const rect = el.getBoundingClientRect();
      pinchStartRef.current = {
        dist,
        scale: viewRef.current.scale,
        vx: viewRef.current.x,
        vy: viewRef.current.y,
        mx: (pts[0].x + pts[1].x) / 2 - rect.left,
        my: (pts[0].y + pts[1].y) / 2 - rect.top,
      };
    }
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!pointersRef.current.has(e.pointerId)) return;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointersRef.current.size === 1 && panStartRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) didDragRef.current = true;
      updateView({
        x: panStartRef.current.vx + dx,
        y: panStartRef.current.vy + dy,
        scale: viewRef.current.scale,
      });
    }

    if (pointersRef.current.size === 2 && pinchStartRef.current) {
      const pts = [...pointersRef.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const newScale = clampScale(pinchStartRef.current.scale * (dist / pinchStartRef.current.dist));
      const el = containerRef.current!;
      const rect = el.getBoundingClientRect();
      const mx = (pts[0].x + pts[1].x) / 2 - rect.left;
      const my = (pts[0].y + pts[1].y) / 2 - rect.top;
      const canvasX = (pinchStartRef.current.mx - pinchStartRef.current.vx) / pinchStartRef.current.scale;
      const canvasY = (pinchStartRef.current.my - pinchStartRef.current.vy) / pinchStartRef.current.scale;
      updateView({
        x: mx - canvasX * newScale,
        y: my - canvasY * newScale,
        scale: newScale,
      });
      didDragRef.current = true;
    }
  }, [updateView]);

  const handlePointerEnd = useCallback((e: React.PointerEvent) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) {
      panStartRef.current = null;
      pinchStartRef.current = null;
    } else if (pointersRef.current.size === 1) {
      pinchStartRef.current = null;
      const [pt] = [...pointersRef.current.values()];
      panStartRef.current = { x: pt.x, y: pt.y, vx: viewRef.current.x, vy: viewRef.current.y };
    }
  }, []);

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomTo(viewRef.current.scale * 1.8, e.clientX - rect.left, e.clientY - rect.top, true);
  }, [zoomTo]);

  const stopTreeControlEvent = useCallback((e: React.SyntheticEvent) => {
    e.stopPropagation();
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full overflow-hidden touch-none select-none cursor-grab active:cursor-grabbing", className)}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="absolute right-3 top-3 z-30 flex items-center gap-1.5 rounded-2xl app-surface p-1.5 shadow-lg"
        onPointerDown={stopTreeControlEvent}
        onClick={stopTreeControlEvent}
        onDoubleClick={stopTreeControlEvent}
      >
        <button
          type="button"
          onClick={zoomOut}
          disabled={view.scale <= MIN_ZOOM}
          className="app-control app-icon-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Zoom out family tree"
          title="Zoom out"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          onClick={resetZoom}
          className="app-control h-10 min-w-[2.75rem] rounded-xl px-2.5 flex items-center justify-center"
          aria-label="Reset family tree zoom"
          title="Fit tree to view"
        >
          <span className="inline-flex items-center gap-1">
            <RotateCcw size={14} />
          </span>
        </button>
        <button
          type="button"
          onClick={fitToView}
          className="app-control app-icon-button flex items-center justify-center"
          aria-label="Fit tree to view"
          title="Fit to view (F)"
        >
          <Maximize2 size={16} />
        </button>
        <button
          type="button"
          onClick={zoomIn}
          disabled={view.scale >= MAX_ZOOM}
          className="app-control app-icon-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Zoom in family tree"
          title="Zoom in"
        >
          <Plus size={16} />
        </button>
      </div>
      <div
        className="relative"
        style={{
          width: canvasWidth,
          minHeight: canvasHeight,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: "0 0",
          transition: isAnimating ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          willChange: "transform",
        }}
        onClick={() => {
          if (!didDragRef.current) onBackgroundClick?.();
        }}
      >
        {/* ── SVG Connection Layer (Orthogonal Routing) ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: canvasHeight }}>
          {/* Sibship groups: spouse bar + drop line + rail + child stems */}
          {sibships.map((sib, sibIdx) => {
            const parentNodes = sib.parents
              .map((id) => members.find((m) => m.profile.id === id))
              .filter(Boolean) as TreeMember[];
            const childNodes = sib.children
              .map((id) => members.find((m) => m.profile.id === id))
              .filter(Boolean) as TreeMember[];
            if (childNodes.length === 0) return null;
            if (parentNodes.length === 0 && childNodes.length < 2) return null;

            const NODE_R = 42;
            const sortedParents = [...parentNodes].sort((a, b) => a.x - b.x);
            const sortedChildren = [...childNodes].sort((a, b) => a.x - b.x);

            const childY = sortedChildren.reduce((s, c) => s + c.y, 0) / sortedChildren.length;

            const hasCouple = sortedParents.length >= 2;
            const leftParent = sortedParents[0];
            const rightParent = sortedParents[sortedParents.length - 1];
            const parentY = sortedParents.length > 0
              ? sortedParents.reduce((s, p) => s + p.y, 0) / sortedParents.length
              : childY;
            const unionX = hasCouple
              ? (leftParent.x + rightParent.x) / 2
              : sortedParents[0]?.x ?? sortedChildren.reduce((s, c) => s + c.x, 0) / sortedChildren.length;

            const hasParents = sortedParents.length > 0;
            const dropStartY = hasCouple ? parentY : parentY + NODE_R;
            const childTopEdge = childY - NODE_R;
            const railY = hasParents
              ? Math.min(
                  childTopEdge - 24,
                  Math.max(dropStartY + 24, dropStartY + (childTopEdge - dropStartY) * 0.72)
                )
              : childTopEdge - 24;

            const allIds = [...sib.parents, ...sib.children];
            const bothHighlighted = hasHighlight && allIds.every((id) => highlightedMembers!.has(id));
            const isDimmed = hasHighlight && !bothHighlighted;

            const bracketSegments: string[] = [];

            if (hasParents) {
              bracketSegments.push(`M ${unionX} ${dropStartY} L ${unionX} ${railY}`);
            }

            const railLeft = Math.min(unionX, ...sortedChildren.map((c) => c.x));
            const railRight = Math.max(unionX, ...sortedChildren.map((c) => c.x));
            if (railRight - railLeft > 0.5) {
              bracketSegments.push(`M ${railLeft} ${railY} L ${railRight} ${railY}`);
            }

            for (const child of sortedChildren) {
              bracketSegments.push(`M ${child.x} ${railY} L ${child.x} ${childTopEdge}`);
            }

            const accentColor = "var(--accent-300)";
            const dimColor = "var(--accent-200)";

            return (
              <g key={`sibship-${sibIdx}`}>
                {hasCouple && (
                  <motion.line
                    x1={leftParent.x + NODE_R}
                    y1={parentY}
                    x2={rightParent.x - NODE_R}
                    y2={parentY}
                    stroke={isDimmed ? dimColor : accentColor}
                    strokeOpacity={isDimmed ? 0.12 : 0.6}
                    strokeWidth={isDimmed ? 0.8 : 2}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 + sibIdx * 0.05 }}
                  />
                )}
                <motion.path
                  d={bracketSegments.join(" ")}
                  fill="none"
                  stroke={isDimmed ? dimColor : accentColor}
                  strokeOpacity={isDimmed ? 0.1 : 0.5}
                  strokeWidth={isDimmed ? 0.6 : 1.5}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.3 + sibIdx * 0.05 }}
                />
              </g>
            );
          })}

          {/* Standalone parent-child connections not covered by sibships */}
          {connections
            .filter((conn) => conn.type === "parent" && !parentEdgesCoveredBySibships.has(`${conn.from}:${conn.to}`))
            .map((conn, i) => {
              const parent = members.find((m) => m.profile.id === conn.from);
              const child = members.find((m) => m.profile.id === conn.to);
              if (!parent || !child) return null;

              const NODE_R = 42;
              const bothHighlighted = hasHighlight && highlightedMembers!.has(conn.from) && highlightedMembers!.has(conn.to);
              const isDimmed = hasHighlight && !bothHighlighted;

              const parentBottom = parent.y + NODE_R;
              const childTop = child.y - NODE_R;
              const midY = parentBottom + (childTop - parentBottom) * 0.72;

              const d = Math.abs(parent.x - child.x) < 4
                ? `M ${parent.x} ${parentBottom} L ${child.x} ${childTop}`
                : `M ${parent.x} ${parentBottom} L ${parent.x} ${midY} L ${child.x} ${midY} L ${child.x} ${childTop}`;

              return (
                <motion.path
                  key={`parent-${conn.from}-${conn.to}-${i}`}
                  d={d}
                  fill="none"
                  stroke={isDimmed ? "var(--accent-200)" : "var(--accent-300)"}
                  strokeOpacity={isDimmed ? 0.1 : 0.5}
                  strokeWidth={isDimmed ? 0.6 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.04 }}
                />
              );
            })}

          {/* Spouse-only connections (no shared children) */}
          {connections
            .filter((conn) => {
              if (conn.type !== "spouse") return false;
              const from = members.find((m) => m.profile.id === conn.from);
              const to = members.find((m) => m.profile.id === conn.to);
              if (!from || !to || Math.abs(from.y - to.y) > 1) return false;
              const pairKey = conn.from < conn.to ? `${conn.from}:${conn.to}` : `${conn.to}:${conn.from}`;
              return !spousePairsWithSharedChildren.has(pairKey);
            })
            .map((conn) => {
              const from = members.find((m) => m.profile.id === conn.from)!;
              const to = members.find((m) => m.profile.id === conn.to)!;
              const NODE_R = 42;
              const left = from.x <= to.x ? from : to;
              const right = from.x <= to.x ? to : from;

              const bothHighlighted = hasHighlight && highlightedMembers!.has(conn.from) && highlightedMembers!.has(conn.to);
              const isDimmed = hasHighlight && !bothHighlighted;

              return (
                <motion.line
                  key={`spouse-${conn.from}-${conn.to}`}
                  x1={left.x + NODE_R}
                  y1={left.y}
                  x2={right.x - NODE_R}
                  y2={right.y}
                  stroke={isDimmed ? "var(--accent-200)" : "var(--accent-300)"}
                  strokeOpacity={isDimmed ? 0.12 : 0.6}
                  strokeWidth={isDimmed ? 0.8 : 2}
                  strokeLinecap="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                />
              );
            })}
        </svg>

        {/* ── Member Nodes ─────────────────────────── */}
        {members.map((member, i) => {
          const isHighlighted = highlightedMembers?.has(member.profile.id);
          const isDimmed = hasHighlight && !isHighlighted;
          const isViewerNode = viewerId === member.profile.id;
          const initials = getInitials(member.profile.first_name, member.profile.last_name);
          const birthYear = parseDateOnly(member.profile.date_of_birth)?.getFullYear() ?? null;
          const deathValue = (member.profile as { date_of_death?: string | null }).date_of_death || null;
          const deathYear = parseDateOnly(deathValue)?.getFullYear() ?? null;
          const birthCountryCode =
            inferCountryCodeFromCity(member.profile.place_of_birth || "") ||
            member.profile.country_code ||
            inferCountryCodeFromCity(member.profile.location_city || "");
          const birthFlag = birthCountryCode ? countryFlag(birthCountryCode) : null;
          const currentCountryCode =
            member.profile.country_code ||
            inferCountryCodeFromCity(member.profile.location_city || "");
          const currentFlag = currentCountryCode ? countryFlag(currentCountryCode) : null;

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
              onPointerDown={(event) => {
                // Prevent container-level pan capture so node taps/clicks stay clickable.
                didDragRef.current = false;
                event.stopPropagation();
              }}
              onClick={(event) => {
                event.stopPropagation();
                if (didDragRef.current) return;
                onMemberClick?.(member.profile.id);
              }}
            >
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-[-3px] rounded-full bg-[var(--background)]" />
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
                </div>
                {isViewerNode && (
                  <span className="mt-1.5 inline-flex items-center rounded-full bg-gold-400/15 border border-gold-400/30 px-2 py-0.5 text-[9px] font-semibold tracking-wider text-gold-300">
                    YOU
                  </span>
                )}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.3 : 1 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="mt-3 text-center"
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
                      ? formatPersonName(member.profile.first_name, member.profile.last_name)
                      : formatDisplayText(member.profile.first_name)}
                  </p>
                  {showRelationLabels && (
                    <p className="text-[10px] text-white/30 mt-0.5">
                      {member.match.relationship}
                    </p>
                  )}
                  {showBirthCountryFlag && birthFlag && (
                    <p className="text-[11px] text-white/55 mt-0.5">
                      {birthFlag}
                    </p>
                  )}
                  {showCurrentCountryFlag && currentFlag && (
                    <p className="text-[11px] text-white/55 mt-0.5">
                      {currentFlag}
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
              {formatPersonName(hoveredMember.profile.first_name, hoveredMember.profile.last_name)}
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
  );
}
