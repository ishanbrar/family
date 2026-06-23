"use client";

// ══════════════════════════════════════════════════════════
// FamilyTree – Interactive Family Tree Visualization
// SVG tree with spouse connections, genetic match rings,
// genetic threads, and "Related By" blood highlighting.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LocateFixed, Map as MapIcon, Minus, Network, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/cn";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import type { Profile, GeneticMatchResult, Relationship } from "@/lib/types";
import { countryFlag } from "@/lib/country-utils";
import { inferCountryCodeFromCity } from "@/lib/cities";
import { formatDisplayText, formatDateOnly, formatPersonName, formatProfileFullName, getProfileInitials, parseDateOnly } from "@/lib/display-format";
import { spousePairKey } from "@/lib/spouse-relationship";
import { shouldZoomTreeOnWheel } from "@/lib/tree-interaction";
import { createLargeFamilyTreeLayout, shouldUseLargeFamilyMode } from "@/lib/large-family-layout";
import { calculateGeneticMatch, findBloodRelatives } from "@/lib/genetic-match";

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
  marriageDate?: string | null;
}

export interface TreeSibship {
  parents: string[];
  children: string[];
  railStyle?: "full" | "stems" | "rays" | "none";
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
  showMarriageDate?: boolean;
  onMemberClick?: (id: string) => void;
  onMemberHover?: (id: string | null) => void;
  onBackgroundClick?: () => void;
  viewResetSignal?: number;
  showHoverCard?: boolean;
  povId?: string;
  povBadgeLabel?: string;
  enableLargeFamilyMode?: boolean;
  showMinimap?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  fitPadding?: number;
  className?: string;
}

type TreeView = { x: number; y: number; scale: number };
type TreeBounds = { minX: number; maxX: number; minY: number; maxY: number };
type ViewportSize = { width: number; height: number };
type LargeFamilyUnit = {
  id: string;
  parents: TreeMember[];
  children: TreeMember[];
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  childLabel: string;
  memberIds: Set<string>;
};

function marriageLabelForPair(
  memberA: string,
  memberB: string,
  marriageDate?: string | null
): string | null {
  if (!marriageDate) return null;
  return formatDateOnly(marriageDate) ?? marriageDate;
}

function SpouseMarriageLabel({
  x,
  y,
  label,
  dimmed,
}: {
  x: number;
  y: number;
  label: string;
  dimmed: boolean;
}) {
  const width = Math.max(72, label.length * 6.4 + 16);
  return (
    <g pointerEvents="none">
      <rect
        x={x - width / 2}
        y={y - 18}
        width={width}
        height={16}
        rx={8}
        fill="var(--background)"
        fillOpacity={dimmed ? 0.35 : 0.82}
        stroke="var(--accent-300)"
        strokeOpacity={dimmed ? 0.12 : 0.28}
      />
      <text
        x={x}
        y={y - 7}
        textAnchor="middle"
        fill={dimmed ? "var(--accent-200)" : "var(--accent-300)"}
        fillOpacity={dimmed ? 0.35 : 0.92}
        fontSize={10}
        fontWeight={600}
      >
        {label}
      </text>
    </g>
  );
}

function clamp(value: number, min: number, max: number): number {
  if (min > max) return (min + max) / 2;
  return Math.max(min, Math.min(max, value));
}

function lineageEdgeKey(from: string, to: string): string {
  return from < to ? `${from}:${to}` : `${to}:${from}`;
}

function compactPersonLabel(member: TreeMember): string {
  const first = formatDisplayText(member.profile.first_name);
  const last = formatDisplayText(member.profile.last_name);
  if (!last || last === "Unknown") return first;
  return `${first} ${last.charAt(0)}.`;
}

function largeFamilyUnitLabel(parents: TreeMember[]): string {
  if (parents.length === 0) return "Sibling group";
  if (parents.length === 1) return compactPersonLabel(parents[0]);
  return parents.slice(0, 2).map(compactPersonLabel).join(" + ");
}

function TreeMinimap({
  members,
  connections,
  treeBounds,
  view,
  viewportSize,
  viewerId,
  onCenterAt,
}: {
  members: TreeMember[];
  connections: TreeConnection[];
  treeBounds: TreeBounds | null;
  view: TreeView;
  viewportSize: ViewportSize;
  viewerId?: string;
  onCenterAt: (worldX: number, worldY: number) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [dragging, setDragging] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const width = 220;
  const height = 126;
  const padding = 12;

  const geometry = useMemo(() => {
    if (!treeBounds) return null;
    const treeW = Math.max(1, treeBounds.maxX - treeBounds.minX);
    const treeH = Math.max(1, treeBounds.maxY - treeBounds.minY);
    const innerW = width - padding * 2;
    const innerH = height - padding * 2;
    const scale = Math.min(innerW / treeW, innerH / treeH);
    const offsetX = padding + (innerW - treeW * scale) / 2;
    const offsetY = padding + (innerH - treeH * scale) / 2;

    const worldToMini = (x: number, y: number) => ({
      x: offsetX + (x - treeBounds.minX) * scale,
      y: offsetY + (y - treeBounds.minY) * scale,
    });
    const miniToWorld = (x: number, y: number) => ({
      x: treeBounds.minX + (x - offsetX) / scale,
      y: treeBounds.minY + (y - offsetY) / scale,
    });

    const viewportWorld = {
      x: -view.x / view.scale,
      y: -view.y / view.scale,
      width: viewportSize.width / view.scale,
      height: viewportSize.height / view.scale,
    };
    const topLeft = worldToMini(viewportWorld.x, viewportWorld.y);
    const bottomRight = worldToMini(
      viewportWorld.x + viewportWorld.width,
      viewportWorld.y + viewportWorld.height
    );

    return {
      scale,
      worldToMini,
      miniToWorld,
      viewportRect: {
        x: clamp(topLeft.x, padding, width - padding),
        y: clamp(topLeft.y, padding, height - padding),
        width: Math.max(8, Math.min(width - padding, bottomRight.x) - Math.max(padding, topLeft.x)),
        height: Math.max(8, Math.min(height - padding, bottomRight.y) - Math.max(padding, topLeft.y)),
      },
    };
  }, [treeBounds, view, viewportSize.height, viewportSize.width]);

  const centerFromPointer = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!geometry || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const miniX = event.clientX - rect.left;
    const miniY = event.clientY - rect.top;
    const world = geometry.miniToWorld(miniX, miniY);
    onCenterAt(world.x, world.y);
  }, [geometry, onCenterAt]);

  const handlePointerDown = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    event.stopPropagation();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
    centerFromPointer(event);
  }, [centerFromPointer]);

  const handlePointerMove = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragging) return;
    event.stopPropagation();
    centerFromPointer(event);
  }, [centerFromPointer, dragging]);

  const handlePointerEnd = useCallback((event: React.PointerEvent<SVGSVGElement>) => {
    event.stopPropagation();
    setDragging(false);
  }, []);

  if (!treeBounds || members.length < 2) return null;

  return (
    <div
      className="absolute bottom-3 left-3 z-30"
      onPointerDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="app-control app-icon-button flex items-center justify-center shadow-lg"
          aria-label="Open tree minimap"
          title="Open tree minimap"
        >
          <MapIcon size={16} />
        </button>
      ) : (
        <div className="w-[220px] overflow-hidden rounded-2xl app-surface border border-white/[0.1] shadow-2xl">
          <div className="flex h-7 items-center justify-between border-b border-white/[0.06] px-2.5">
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-white/45">
              <MapIcon size={12} />
              Overview
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="flex h-5 w-5 items-center justify-center rounded-md text-white/45 hover:bg-white/[0.06] hover:text-white/80"
              aria-label="Collapse tree minimap"
              title="Collapse minimap"
            >
              <Minus size={12} />
            </button>
          </div>
          <svg
            ref={svgRef}
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            className="block cursor-crosshair bg-white/[0.015]"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            {connections
              .filter((connection) => connection.type === "parent" || connection.type === "spouse")
              .map((connection, index) => {
                const from = members.find((member) => member.profile.id === connection.from);
                const to = members.find((member) => member.profile.id === connection.to);
                if (!from || !to || !geometry) return null;
                const a = geometry.worldToMini(from.x, from.y);
                const b = geometry.worldToMini(to.x, to.y);
                return (
                  <line
                    key={`${connection.type}-${connection.from}-${connection.to}-${index}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={connection.type === "spouse" ? "var(--gold-300)" : "var(--accent-300)"}
                    strokeOpacity={connection.type === "spouse" ? 0.36 : 0.18}
                    strokeWidth={connection.type === "spouse" ? 1.2 : 0.8}
                  />
                );
              })}
            {members.map((member) => {
              if (!geometry) return null;
              const point = geometry.worldToMini(member.x, member.y);
              const isViewer = member.profile.id === viewerId;
              return (
                <circle
                  key={member.profile.id}
                  cx={point.x}
                  cy={point.y}
                  r={isViewer ? 3.2 : 2.2}
                  fill={isViewer ? "var(--gold-300)" : "rgba(255,255,255,0.62)"}
                  stroke={isViewer ? "rgba(255,255,255,0.75)" : "transparent"}
                  strokeWidth={0.8}
                />
              );
            })}
            {geometry && (
              <rect
                x={geometry.viewportRect.x}
                y={geometry.viewportRect.y}
                width={geometry.viewportRect.width}
                height={geometry.viewportRect.height}
                rx={4}
                fill="rgba(244, 196, 87, 0.16)"
                stroke="var(--gold-300)"
                strokeOpacity={0.86}
                strokeWidth={1.4}
                pointerEvents="none"
              />
            )}
          </svg>
        </div>
      )}
    </div>
  );
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
  showMarriageDate = false,
  onMemberClick,
  onMemberHover,
  onBackgroundClick,
  viewResetSignal,
  showHoverCard = false,
  povId,
  povBadgeLabel = "POV",
  enableLargeFamilyMode = true,
  showMinimap = true,
  canvasWidth = 800,
  canvasHeight = 560,
  fitPadding = 36,
  className,
}: FamilyTreeProps) {
  const hasHighlight = dimNonHighlighted && highlightedMembers && highlightedMembers.size > 0;
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const [pinnedLineageMemberId, setPinnedLineageMemberId] = useState<string | null>(null);
  const [containerHeight, setContainerHeight] = useState<number | null>(null);
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
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [largeFamilyModeOverride, setLargeFamilyModeOverride] = useState<{ key: string; enabled: boolean } | null>(null);

  const sourceRowStats = useMemo(() => {
    const rowCounts = new Map<number, number>();
    for (const member of members) {
      const row = Math.round(member.y / 8) * 8;
      rowCounts.set(row, (rowCounts.get(row) ?? 0) + 1);
    }
    return {
      maxRowCount: Math.max(0, ...rowCounts.values()),
      rowCount: rowCounts.size,
    };
  }, [members]);

  const largeFamilyCandidate = useMemo(
    () =>
      enableLargeFamilyMode && shouldUseLargeFamilyMode({
        members,
        canvasWidth,
        viewportWidth: viewportSize.width || undefined,
      }),
    [canvasWidth, enableLargeFamilyMode, members, viewportSize.width]
  );
  const largeFamilyModeKey = `${members.length}:${sourceRowStats.maxRowCount}:${Math.round(canvasWidth)}`;
  const largeFamilyMode = largeFamilyModeOverride?.key === largeFamilyModeKey
    ? largeFamilyModeOverride.enabled
    : largeFamilyCandidate;
  const largeFamilyLayout = useMemo(
    () => createLargeFamilyTreeLayout(members, connections),
    [connections, members]
  );
  const layoutMembers = largeFamilyMode ? largeFamilyLayout.members : members;
  const activeCanvasWidth = largeFamilyMode ? largeFamilyLayout.width : canvasWidth;
  const activeCanvasHeight = largeFamilyMode ? largeFamilyLayout.height : canvasHeight;
  const nodeVisualRadius = largeFamilyMode ? 74 : 92;

  const hoveredMember = useMemo(
    () => layoutMembers.find((member) => member.profile.id === hoveredMemberId) || null,
    [layoutMembers, hoveredMemberId]
  );
  const lineageFocusMemberId = hoveredMemberId || pinnedLineageMemberId;
  const lineageHighlight = useMemo(() => {
    if (!lineageFocusMemberId) return null;
    const visibleIds = new Set(layoutMembers.map((member) => member.profile.id));
    if (!visibleIds.has(lineageFocusMemberId)) return null;

    const lineageRelationships: Relationship[] = connections
      .filter((conn) => visibleIds.has(conn.from) && visibleIds.has(conn.to))
      .map((conn, index) => ({
        id: `visible-${index}-${conn.from}-${conn.to}`,
        user_id: conn.from,
        relative_id: conn.to,
        type: conn.type,
        marriage_date: conn.marriageDate ?? null,
        created_at: "",
      }));

    const membersSet = findBloodRelatives(lineageFocusMemberId, [...visibleIds], lineageRelationships);
    const edgeKeys = new Set<string>();
    for (const memberId of membersSet) {
      if (memberId === lineageFocusMemberId) continue;
      const match = calculateGeneticMatch(lineageFocusMemberId, memberId, lineageRelationships);
      if (match.percentage <= 0 || match.path.length < 2) continue;
      for (let index = 1; index < match.path.length; index += 1) {
        edgeKeys.add(lineageEdgeKey(match.path[index - 1], match.path[index]));
      }
    }

    return { members: membersSet, edgeKeys };
  }, [connections, layoutMembers, lineageFocusMemberId]);
  const lineageHighlightedMembers = lineageHighlight?.members ?? null;
  const lineageHighlightedEdges = lineageHighlight?.edgeKeys ?? null;
  const effectiveHighlightedMembers = lineageHighlightedMembers ?? highlightedMembers;
  const hasEffectiveHighlight =
    !!effectiveHighlightedMembers &&
    effectiveHighlightedMembers.size > 0 &&
    (hasHighlight || !!lineageFocusMemberId);
  const memberById = useMemo(
    () => new Map(layoutMembers.map((member) => [member.profile.id, member])),
    [layoutMembers]
  );
  const marriageDateByPair = useMemo(() => {
    const map = new Map<string, string>();
    for (const conn of connections) {
      if (conn.type !== "spouse" || !conn.marriageDate) continue;
      map.set(spousePairKey(conn.from, conn.to), conn.marriageDate);
    }
    return map;
  }, [connections]);
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
  const largeFamilyUnits = useMemo<LargeFamilyUnit[]>(() => {
    if (!largeFamilyMode) return [];

    const CARD_W = 210;
    const CARD_H = 54;
    const MIN_GAP = 18;
    const LANE_GAP = 62;
    const units: LargeFamilyUnit[] = [];

    for (const [index, sib] of sibships.entries()) {
      const parents = sib.parents
        .map((id) => memberById.get(id))
        .filter((member): member is TreeMember => !!member)
        .sort((a, b) => a.x - b.x);
      const children = sib.children
        .map((id) => memberById.get(id))
        .filter((member): member is TreeMember => !!member)
        .sort((a, b) => a.x - b.x);
      if (children.length === 0) continue;
      if (parents.length === 0 && children.length < 2) continue;

      const parentCenterX =
        parents.length > 0
          ? parents.reduce((sum, parent) => sum + parent.x, 0) / parents.length
          : children.reduce((sum, child) => sum + child.x, 0) / children.length;
      const childCenterX = children.reduce((sum, child) => sum + child.x, 0) / children.length;
      const parentBottom =
        parents.length > 0
          ? Math.max(...parents.map((parent) => parent.y)) + 42
          : Math.min(...children.map((child) => child.y)) - 128;
      const childTop = Math.min(...children.map((child) => child.y)) - 42;
      const memberIds = new Set<string>([...sib.parents, ...sib.children]);

      units.push({
        id: `${sib.parents.join("+") || "parents-unknown"}:${sib.children.join("+")}:${index}`,
        parents,
        children,
        x: (parentCenterX + childCenterX) / 2,
        y: parentBottom + (childTop - parentBottom) * 0.5,
        width: CARD_W,
        height: CARD_H,
        label: largeFamilyUnitLabel(parents),
        childLabel: `${children.length} child${children.length === 1 ? "" : "ren"}`,
        memberIds,
      });
    }

    const rows = new Map<number, LargeFamilyUnit[]>();
    for (const unit of units) {
      const key = Math.round(unit.y / 72) * 72;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push(unit);
    }

    for (const rowUnits of rows.values()) {
      const laneEnds: number[] = [];
      rowUnits.sort((a, b) => a.x - b.x);
      for (const unit of rowUnits) {
        let lane = 0;
        const left = unit.x - unit.width / 2;
        while (laneEnds[lane] != null && left < laneEnds[lane] + MIN_GAP) lane++;
        laneEnds[lane] = unit.x + unit.width / 2;
        unit.y += lane * LANE_GAP;
      }
    }

    return units;
  }, [largeFamilyMode, memberById, sibships]);

  const generationColorByValue = useMemo(() => {
    const palette = ["#8B5E3C", "#7C3AED", "#16A34A", "#2563EB"];
    const generations = [...new Set(layoutMembers.map((m) => m.generation).filter((g): g is number => typeof g === "number"))]
      .sort((a, b) => b - a);
    const map = new Map<number, string>();
    generations.forEach((gen, idx) => {
      map.set(gen, palette[Math.min(idx, palette.length - 1)]);
    });
    return map;
  }, [layoutMembers]);

  const sibshipRailLaneByIndex = useMemo(() => {
    const NODE_R = 42;
    const LANE_GAP = 18;
    const SPAN_GAP = 28;
    const routes = sibships.map((sib, index) => {
      const parentNodes = sib.parents
        .map((id) => memberById.get(id))
        .filter(Boolean) as TreeMember[];
      const childNodes = sib.children
        .map((id) => memberById.get(id))
        .filter(Boolean) as TreeMember[];
      if (childNodes.length === 0 || sib.railStyle === "none" || sib.railStyle === "rays") return null;
      if (parentNodes.length === 0 && childNodes.length < 2) return null;

      const sortedParents = [...parentNodes].sort((a, b) => a.x - b.x);
      const sortedChildren = [...childNodes].sort((a, b) => a.x - b.x);
      const childY = sortedChildren.reduce((sum, child) => sum + child.y, 0) / sortedChildren.length;
      const parentY = sortedParents.length > 0
        ? sortedParents.reduce((sum, parent) => sum + parent.y, 0) / sortedParents.length
        : childY;
      const hasCouple = sortedParents.length >= 2;
      const leftParent = sortedParents[0];
      const rightParent = sortedParents[sortedParents.length - 1];
      const unionX = hasCouple
        ? (leftParent.x + rightParent.x) / 2
        : sortedParents[0]?.x ?? sortedChildren.reduce((sum, child) => sum + child.x, 0) / sortedChildren.length;
      const dropStartY = hasCouple ? parentY : parentY + NODE_R;
      const childTopEdge = childY - NODE_R;
      const baseRailY = sortedParents.length > 0
        ? Math.min(
            childTopEdge - 24,
            Math.max(dropStartY + 24, dropStartY + (childTopEdge - dropStartY) * 0.72)
          )
        : childTopEdge - 24;
      const minX = Math.min(unionX, ...sortedChildren.map((child) => child.x));
      const maxX = Math.max(unionX, ...sortedChildren.map((child) => child.x));
      return { index, baseRailY, dropStartY, childTopEdge, minX, maxX };
    }).filter((route): route is NonNullable<typeof route> => !!route);

    const laneByIndex = new Map<number, number>();
    const rows = new Map<number, typeof routes>();
    for (const route of routes) {
      const key = Math.round(route.baseRailY / 8) * 8;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key)!.push(route);
    }

    for (const rowRoutes of rows.values()) {
      const laneEnds: number[] = [];
      for (const route of rowRoutes.sort((a, b) => a.minX - b.minX || a.maxX - b.maxX)) {
        let lane = 0;
        while (laneEnds[lane] != null && route.minX < laneEnds[lane] + SPAN_GAP) {
          lane++;
        }
        laneEnds[lane] = route.maxX;
        const maxDown = Math.max(0, route.childTopEdge - 14 - route.baseRailY);
        const maxUp = Math.max(0, route.baseRailY - (route.dropStartY + 14));
        const preferred = lane * LANE_GAP;
        const offset = preferred <= maxUp ? -preferred : Math.min(maxDown, preferred);
        laneByIndex.set(route.index, offset);
      }
    }

    return laneByIndex;
  }, [memberById, sibships]);

  const MIN_ZOOM = 0.18;
  const MAX_ZOOM = 3;
  const clampScale = (s: number) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, s));
  const treeBounds = useMemo(() => {
    if (layoutMembers.length === 0) return null;
    const xs = layoutMembers.map((m) => m.x);
    const ys = layoutMembers.map((m) => m.y);
    return {
      minX: Math.min(...xs) - nodeVisualRadius,
      maxX: Math.max(...xs) + nodeVisualRadius,
      minY: Math.min(...ys) - nodeVisualRadius,
      maxY: Math.max(...ys) + nodeVisualRadius + 94,
    };
  }, [layoutMembers, nodeVisualRadius]);
  const layoutKey = useMemo(
    () => `${largeFamilyMode ? "large" : "classic"}:${layoutMembers.map((member) => `${member.profile.id}:${Math.round(member.x)}:${Math.round(member.y)}`).join("|")}`,
    [largeFamilyMode, layoutMembers]
  );
  const focusMemberId = povId || viewerId;
  const nuclearFamilyIds = useMemo(() => {
    if (!focusMemberId) return new Set<string>();

    const ids = new Set<string>([focusMemberId]);
    const parentSibships = sibships.filter((sib) => sib.parents.includes(focusMemberId));

    if (parentSibships.length > 0) {
      for (const sib of parentSibships) {
        sib.parents.forEach((id) => ids.add(id));
        sib.children.forEach((id) => ids.add(id));
      }
    } else {
      for (const sib of sibships) {
        if (!sib.children.includes(focusMemberId)) continue;
        sib.parents.forEach((id) => ids.add(id));
        sib.children.forEach((id) => ids.add(id));
      }
    }

    for (const conn of connections) {
      if (conn.type === "spouse" && conn.from === focusMemberId) ids.add(conn.to);
      if (conn.type === "spouse" && conn.to === focusMemberId) ids.add(conn.from);
      if (conn.type === "parent" && conn.from === focusMemberId) ids.add(conn.to);
      if (parentSibships.length === 0 && conn.type === "parent" && conn.to === focusMemberId) ids.add(conn.from);
    }

    return ids;
  }, [connections, focusMemberId, sibships]);

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
    const maxViewportHeight =
      typeof window !== "undefined" ? Math.min(window.innerHeight * 0.78, 860) : 760;
    const vh = Math.max(320, Math.min(maxViewportHeight, el.clientHeight || maxViewportHeight));
    const padding = fitPadding;
    const availableW = Math.max(240, vw - padding * 2);
    const availableH = Math.max(220, vh - padding * 2);
    const treeW = Math.max(1, treeBounds.maxX - treeBounds.minX);
    const treeH = Math.max(1, treeBounds.maxY - treeBounds.minY);
    const scale = clampScale(Math.min(availableW / treeW, availableH / treeH));
    const fittedHeight = Math.ceil(treeH * scale + padding * 2);
    const nextContainerHeight = Math.max(280, Math.min(fittedHeight, maxViewportHeight));
    const finalAvailableH = Math.max(220, nextContainerHeight - padding * 2);
    setContainerHeight(nextContainerHeight);
    const x = padding + (availableW - treeW * scale) / 2 - treeBounds.minX * scale;
    const y = padding + (finalAvailableH - treeH * scale) / 2 - treeBounds.minY * scale;
    animateTo({ x, y, scale });
  }, [treeBounds, animateTo, fitPadding]);

  const focusViewerFamily = useCallback(() => {
    const el = containerRef.current;
    const viewer = focusMemberId ? memberById.get(focusMemberId) : null;
    if (!el || !viewer) return;

    const familyMembers = [...nuclearFamilyIds]
      .map((id) => memberById.get(id))
      .filter((member): member is TreeMember => !!member);
    const focusMembers = familyMembers.length > 1 ? familyMembers : [viewer];
    const xs = focusMembers.map((member) => member.x);
    const ys = focusMembers.map((member) => member.y);
    const focusBounds = {
      minX: Math.min(...xs) - nodeVisualRadius,
      maxX: Math.max(...xs) + nodeVisualRadius,
      minY: Math.min(...ys) - nodeVisualRadius,
      maxY: Math.max(...ys) + nodeVisualRadius + 94,
    };

    const maxViewportHeight =
      typeof window !== "undefined" ? Math.min(window.innerHeight * 0.78, 860) : 760;
    const nextContainerHeight = Math.max(360, maxViewportHeight);
    const vw = el.clientWidth;
    const vh = nextContainerHeight;
    const padding = Math.max(72, fitPadding * 1.75);
    const availableW = Math.max(240, vw - padding * 2);
    const availableH = Math.max(220, vh - padding * 2);
    const focusW = Math.max(1, focusBounds.maxX - focusBounds.minX);
    const focusH = Math.max(1, focusBounds.maxY - focusBounds.minY);
    const scale = clampScale(Math.min(1.18, availableW / focusW, availableH / focusH));

    const centeredX = vw / 2 - viewer.x * scale;
    const centeredY = vh * 0.46 - viewer.y * scale;
    const lowerX = padding - focusBounds.minX * scale;
    const upperX = vw - padding - focusBounds.maxX * scale;
    const lowerY = padding - focusBounds.minY * scale;
    const upperY = vh - padding - focusBounds.maxY * scale;

    const clampOffset = (value: number, min: number, max: number) => {
      if (min > max) return (min + max) / 2;
      return Math.max(min, Math.min(max, value));
    };

    setContainerHeight(nextContainerHeight);
    animateTo({
      x: clampOffset(centeredX, lowerX, upperX),
      y: clampOffset(centeredY, lowerY, upperY),
      scale,
    });
  }, [animateTo, fitPadding, focusMemberId, memberById, nodeVisualRadius, nuclearFamilyIds]);

  const resetZoom = useCallback(() => {
    fitToView();
  }, [fitToView]);

  const centerAtWorldPoint = useCallback((worldX: number, worldY: number) => {
    const el = containerRef.current;
    if (!el) return;
    animateTo({
      x: el.clientWidth / 2 - worldX * viewRef.current.scale,
      y: el.clientHeight / 2 - worldY * viewRef.current.scale,
      scale: viewRef.current.scale,
    });
  }, [animateTo]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable) return;
      if (e.key === "=" || e.key === "+") { e.preventDefault(); zoomIn(); }
      else if (e.key === "-") { e.preventDefault(); zoomOut(); }
      else if (e.key === "0") { e.preventDefault(); resetZoom(); }
      else if (e.key === "f") { e.preventDefault(); fitToView(); }
      else if (e.key === "l") { e.preventDefault(); focusViewerFamily(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [zoomIn, zoomOut, resetZoom, fitToView, focusViewerFamily]);

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
    if (hasAutoCenteredRef.current || layoutMembers.length === 0) return;
    hasAutoCenteredRef.current = true;
    requestAnimationFrame(() => requestAnimationFrame(() => fitToView()));
  }, [layoutMembers.length, fitToView]);

  useEffect(() => {
    if (layoutMembers.length === 0) return;
    hasAutoCenteredRef.current = false;
    requestAnimationFrame(() => {
      setContainerHeight(null);
      requestAnimationFrame(() => fitToView());
    });
  }, [layoutKey, layoutMembers.length, fitToView]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      updateSize();
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
      style={{ height: containerHeight ?? Math.min(activeCanvasHeight, 760) }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
      onDoubleClick={handleDoubleClick}
      onClick={() => {
        if (!didDragRef.current) {
          setHoveredMemberId(null);
          setPinnedLineageMemberId(null);
          onMemberHover?.(null);
          onBackgroundClick?.();
        }
      }}
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
          className="app-control app-icon-button flex items-center justify-center"
          aria-label="Reset family tree zoom"
          title="Fit tree to view"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={focusViewerFamily}
          disabled={!focusMemberId || !memberById.has(focusMemberId)}
          className="app-control app-icon-button disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
          aria-label="Focus on selected family"
          title="Focus on selected family (L)"
        >
          <LocateFixed size={16} />
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
        {largeFamilyCandidate && (
          <button
            type="button"
            onClick={() =>
              setLargeFamilyModeOverride((current) => ({
                key: largeFamilyModeKey,
                enabled: !(current?.key === largeFamilyModeKey ? current.enabled : largeFamilyCandidate),
              }))
            }
            className={cn(
              "app-control app-icon-button flex items-center justify-center",
              largeFamilyMode && "text-gold-300 bg-gold-400/10"
            )}
            aria-pressed={largeFamilyMode}
            aria-label="Toggle large family mode"
            title={
              largeFamilyMode
                ? `Large family mode on (${sourceRowStats.maxRowCount} in widest row)`
                : "Turn on large family mode"
            }
          >
            <Network size={16} />
          </button>
        )}
      </div>
      {showMinimap && (
        <TreeMinimap
          members={layoutMembers}
          connections={connections}
          treeBounds={treeBounds}
          view={view}
          viewportSize={viewportSize}
          viewerId={viewerId}
          onCenterAt={centerAtWorldPoint}
        />
      )}
      <div
        className="relative"
        style={{
          width: activeCanvasWidth,
          minHeight: activeCanvasHeight,
          transform: `translate(${view.x}px, ${view.y}px) scale(${view.scale})`,
          transformOrigin: "0 0",
          transition: isAnimating ? "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)" : "none",
          willChange: "transform",
        }}
      >
        {/* ── SVG Connection Layer (Orthogonal Routing) ── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: activeCanvasHeight }}>
          {largeFamilyMode && (
            <g>
              {connections
                .filter((conn) => {
                  if (conn.type !== "spouse") return false;
                  const from = memberById.get(conn.from);
                  const to = memberById.get(conn.to);
                  return !!from && !!to && Math.abs(from.y - to.y) <= 2;
                })
                .map((conn) => {
                  const from = memberById.get(conn.from)!;
                  const to = memberById.get(conn.to)!;
                  const left = from.x <= to.x ? from : to;
                  const right = from.x <= to.x ? to : from;
                  const isFocused = lineageFocusMemberId === conn.from || lineageFocusMemberId === conn.to;
                  const isDimmed = !!lineageFocusMemberId && !isFocused;
                  const marriageLabel =
                    showMarriageDate && conn.marriageDate
                      ? marriageLabelForPair(conn.from, conn.to, conn.marriageDate)
                      : null;

                  return (
                    <g key={`large-spouse-${conn.from}-${conn.to}`}>
                      <motion.line
                        x1={left.x + 38}
                        y1={left.y}
                        x2={right.x - 38}
                        y2={right.y}
                        stroke="var(--gold-300)"
                        strokeOpacity={isDimmed ? 0.14 : isFocused ? 0.92 : 0.66}
                        strokeWidth={isFocused ? 3.2 : 2.4}
                        strokeLinecap="round"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.28 }}
                      />
                      {marriageLabel && (
                        <SpouseMarriageLabel
                          x={(left.x + right.x) / 2}
                          y={left.y - 10}
                          label={marriageLabel}
                          dimmed={isDimmed}
                        />
                      )}
                    </g>
                  );
                })}

              {largeFamilyUnits.map((unit, index) => {
                const isFocused = !!lineageFocusMemberId && unit.memberIds.has(lineageFocusMemberId);
                const isDimmed = !!lineageFocusMemberId && !isFocused;
                const top = unit.y - unit.height / 2;
                const bottom = unit.y + unit.height / 2;
                const left = unit.x - unit.width / 2;

                return (
                  <g key={unit.id}>
                    {unit.parents.map((parent) => {
                      const d = `M ${parent.x} ${parent.y + 42} C ${parent.x} ${parent.y + 74}, ${unit.x} ${top - 34}, ${unit.x} ${top}`;
                      return (
                        <motion.path
                          key={`large-parent-${unit.id}-${parent.profile.id}`}
                          d={d}
                          fill="none"
                          stroke="var(--accent-300)"
                          strokeOpacity={isDimmed ? 0.08 : isFocused ? 0.58 : 0.26}
                          strokeWidth={isFocused ? 1.8 : 1.1}
                          strokeLinecap="round"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.28, delay: index * 0.01 }}
                        />
                      );
                    })}
                    {unit.children.map((child) => {
                      const d = `M ${unit.x} ${bottom} C ${unit.x} ${bottom + 34}, ${child.x} ${child.y - 74}, ${child.x} ${child.y - 42}`;
                      return (
                        <motion.path
                          key={`large-child-${unit.id}-${child.profile.id}`}
                          d={d}
                          fill="none"
                          stroke="var(--accent-300)"
                          strokeOpacity={isDimmed ? 0.08 : isFocused ? 0.64 : 0.3}
                          strokeWidth={isFocused ? 1.9 : 1.15}
                          strokeLinecap="round"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.28, delay: index * 0.01 }}
                        />
                      );
                    })}
                    <motion.g
                      initial={{ opacity: 0, scale: 0.96 }}
                      animate={{ opacity: isDimmed ? 0.35 : 1, scale: 1 }}
                      transition={{ duration: 0.24, delay: 0.03 + index * 0.01 }}
                    >
                      <rect
                        x={left}
                        y={top}
                        width={unit.width}
                        height={unit.height}
                        rx={12}
                        fill="var(--background)"
                        fillOpacity={0.86}
                        stroke={isFocused ? "var(--gold-300)" : "var(--accent-300)"}
                        strokeOpacity={isFocused ? 0.62 : 0.26}
                        strokeWidth={isFocused ? 1.4 : 1}
                      />
                      <line
                        x1={left + 16}
                        y1={unit.y + 2}
                        x2={left + unit.width - 16}
                        y2={unit.y + 2}
                        stroke="var(--gold-300)"
                        strokeOpacity={0.32}
                        strokeLinecap="round"
                      />
                      <text
                        x={unit.x}
                        y={unit.y - 8}
                        textAnchor="middle"
                        fill="rgba(255,255,255,0.82)"
                        fontSize={11}
                        fontWeight={700}
                      >
                        {unit.label}
                      </text>
                      <text
                        x={unit.x}
                        y={unit.y + 17}
                        textAnchor="middle"
                        fill="var(--accent-200)"
                        fillOpacity={0.72}
                        fontSize={10}
                        fontWeight={600}
                      >
                        {unit.childLabel}
                      </text>
                    </motion.g>
                  </g>
                );
              })}
            </g>
          )}
          {/* Sibship groups: spouse bar + drop line + rail + child stems */}
          {!largeFamilyMode && sibships.map((sib, sibIdx) => {
            const parentNodes = sib.parents
              .map((id) => layoutMembers.find((m) => m.profile.id === id))
              .filter(Boolean) as TreeMember[];
            const childNodes = sib.children
              .map((id) => layoutMembers.find((m) => m.profile.id === id))
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
            const baseRailY = hasParents
              ? Math.min(
                  childTopEdge - 24,
                  Math.max(dropStartY + 24, dropStartY + (childTopEdge - dropStartY) * 0.72)
                )
              : childTopEdge - 24;
            const railOffset = sibshipRailLaneByIndex.get(sibIdx) ?? 0;
            const railY = hasParents
              ? Math.min(
                  childTopEdge - 14,
                  Math.max(dropStartY + 14, baseRailY + railOffset)
                )
              : baseRailY + railOffset;

            const allIds = [...sib.parents, ...sib.children];
            const groupHighlighted = hasEffectiveHighlight && allIds.some((id) => effectiveHighlightedMembers!.has(id));
            const groupLineHighlighted =
              !!lineageHighlightedEdges &&
              sib.parents.some((parentId) =>
                sib.children.some((childId) => lineageHighlightedEdges.has(lineageEdgeKey(parentId, childId)))
              );
            const isDimmed = hasEffectiveHighlight && !groupHighlighted;

            const bracketSegments: string[] = [];

            if (hasParents && sib.railStyle !== "none" && sib.railStyle !== "rays") {
              bracketSegments.push(`M ${unionX} ${dropStartY} L ${unionX} ${railY}`);
            }

            if (sib.railStyle === "rays") {
              for (const child of sortedChildren) {
                bracketSegments.push(`M ${unionX} ${dropStartY} L ${child.x} ${childTopEdge}`);
              }
            } else if (sib.railStyle === "stems") {
              for (const child of sortedChildren) {
                bracketSegments.push(`M ${unionX} ${railY} L ${child.x} ${railY} L ${child.x} ${childTopEdge}`);
              }
            } else if (sib.railStyle !== "none") {
              const railLeft = Math.min(unionX, ...sortedChildren.map((c) => c.x));
              const railRight = Math.max(unionX, ...sortedChildren.map((c) => c.x));
              if (railRight - railLeft > 0.5) {
                bracketSegments.push(`M ${railLeft} ${railY} L ${railRight} ${railY}`);
              }

              for (const child of sortedChildren) {
                bracketSegments.push(`M ${child.x} ${railY} L ${child.x} ${childTopEdge}`);
              }
            }

            const accentColor = groupLineHighlighted ? "var(--gold-300)" : "var(--accent-300)";
            const dimColor = "var(--accent-200)";
            const coupleMarriageDate =
              hasCouple && leftParent && rightParent
                ? marriageDateByPair.get(spousePairKey(leftParent.profile.id, rightParent.profile.id))
                : null;
            const coupleMarriageLabel =
              showMarriageDate && coupleMarriageDate
                ? marriageLabelForPair(leftParent.profile.id, rightParent.profile.id, coupleMarriageDate)
                : null;

            return (
              <g key={`sibship-${sibIdx}`}>
                {hasCouple && (
                  <motion.line
                    x1={leftParent.x + NODE_R}
                    y1={parentY}
                    x2={rightParent.x - NODE_R}
                    y2={parentY}
                    stroke={isDimmed ? dimColor : accentColor}
                    strokeOpacity={isDimmed ? 0.12 : groupLineHighlighted ? 0.96 : 0.6}
                    strokeWidth={isDimmed ? 0.8 : groupLineHighlighted ? 3.4 : 2}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.2 + sibIdx * 0.05 }}
                  />
                )}
                {coupleMarriageLabel && leftParent && rightParent && (
                  <SpouseMarriageLabel
                    x={(leftParent.x + rightParent.x) / 2}
                    y={parentY - 10}
                    label={coupleMarriageLabel}
                    dimmed={!!isDimmed}
                  />
                )}
                {bracketSegments.length > 0 && (
                  <motion.path
                    d={bracketSegments.join(" ")}
                    fill="none"
                    stroke={isDimmed ? dimColor : accentColor}
                    strokeOpacity={isDimmed ? 0.1 : groupLineHighlighted ? 0.94 : 0.5}
                    strokeWidth={isDimmed ? 0.6 : groupLineHighlighted ? 3.2 : 1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 + sibIdx * 0.05 }}
                  />
                )}
              </g>
            );
          })}

          {/* Standalone parent-child connections not covered by sibships */}
          {!largeFamilyMode && connections
            .filter((conn) => conn.type === "parent" && !parentEdgesCoveredBySibships.has(`${conn.from}:${conn.to}`))
            .map((conn, i) => {
              const parent = layoutMembers.find((m) => m.profile.id === conn.from);
              const child = layoutMembers.find((m) => m.profile.id === conn.to);
              if (!parent || !child) return null;

              const NODE_R = 42;
              const bothHighlighted =
                hasEffectiveHighlight &&
                effectiveHighlightedMembers!.has(conn.from) &&
                effectiveHighlightedMembers!.has(conn.to);
              const edgeHighlighted = !!lineageHighlightedEdges?.has(lineageEdgeKey(conn.from, conn.to));
              const isDimmed = hasEffectiveHighlight && !bothHighlighted;

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
                  stroke={isDimmed ? "var(--accent-200)" : edgeHighlighted ? "var(--gold-300)" : "var(--accent-300)"}
                  strokeOpacity={isDimmed ? 0.1 : edgeHighlighted ? 0.96 : 0.5}
                  strokeWidth={isDimmed ? 0.6 : edgeHighlighted ? 3.2 : 1.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 + i * 0.04 }}
                />
              );
            })}

          {/* Spouse-only connections (no shared children) */}
          {!largeFamilyMode && connections
            .filter((conn) => {
              if (conn.type !== "spouse") return false;
              const from = layoutMembers.find((m) => m.profile.id === conn.from);
              const to = layoutMembers.find((m) => m.profile.id === conn.to);
              if (!from || !to || Math.abs(from.y - to.y) > 1) return false;
              const pairKey = conn.from < conn.to ? `${conn.from}:${conn.to}` : `${conn.to}:${conn.from}`;
              return !spousePairsWithSharedChildren.has(pairKey);
            })
            .map((conn) => {
              const from = layoutMembers.find((m) => m.profile.id === conn.from)!;
              const to = layoutMembers.find((m) => m.profile.id === conn.to)!;
              const NODE_R = 42;
              const left = from.x <= to.x ? from : to;
              const right = from.x <= to.x ? to : from;

              const bothHighlighted =
                hasEffectiveHighlight &&
                effectiveHighlightedMembers!.has(conn.from) &&
                effectiveHighlightedMembers!.has(conn.to);
              const edgeHighlighted = !!lineageHighlightedEdges?.has(lineageEdgeKey(conn.from, conn.to));
              const isDimmed = hasEffectiveHighlight && !bothHighlighted;
              const marriageLabel =
                showMarriageDate && conn.marriageDate
                  ? marriageLabelForPair(conn.from, conn.to, conn.marriageDate)
                  : null;

              return (
                <g key={`spouse-${conn.from}-${conn.to}`}>
                  <motion.line
                    x1={left.x + NODE_R}
                    y1={left.y}
                    x2={right.x - NODE_R}
                    y2={right.y}
                    stroke={isDimmed ? "var(--accent-200)" : edgeHighlighted ? "var(--gold-300)" : "var(--accent-300)"}
                    strokeOpacity={isDimmed ? 0.12 : edgeHighlighted ? 0.96 : 0.6}
                    strokeWidth={isDimmed ? 0.8 : edgeHighlighted ? 3.2 : 2}
                    strokeLinecap="round"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                  />
                  {marriageLabel && (
                    <SpouseMarriageLabel
                      x={(left.x + right.x) / 2}
                      y={left.y - 10}
                      label={marriageLabel}
                      dimmed={!!isDimmed}
                    />
                  )}
                </g>
              );
            })}
        </svg>

        {/* ── Member Nodes ─────────────────────────── */}
        {layoutMembers.map((member, i) => {
          const isHighlighted = effectiveHighlightedMembers?.has(member.profile.id);
          const isDimmed = hasEffectiveHighlight && !isHighlighted;
          const isViewerNode = (focusMemberId || viewerId) === member.profile.id;
          const initials = getProfileInitials(member.profile);
          const ringSize = largeFamilyMode ? (isViewerNode ? 72 : 66) : (isViewerNode ? 86 : 80);
          const nodeDelay = largeFamilyMode ? Math.min(0.65, 0.08 + i * 0.006) : 0.2 + i * 0.06;
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
                delay: nodeDelay,
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
                setPinnedLineageMemberId(member.profile.id);
                onMemberClick?.(member.profile.id);
              }}
            >
              <div className="flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-[-3px] rounded-full bg-[var(--background)]" />
                  <GeneticMatchRing
                    percentage={member.match.percentage}
                    size={ringSize}
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
                    {member.profile.id === viewerId ? "YOU" : povBadgeLabel}
                  </span>
                )}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.3 : 1 }}
                  transition={{ delay: largeFamilyMode ? nodeDelay + 0.08 : 0.6 + i * 0.06 }}
                  className="mt-3 text-center"
                >
                  <p className={cn(
                    largeFamilyMode ? "text-[11px]" : "text-xs",
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
              {isHighlighted && hasEffectiveHighlight && (
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: [1, 1.3, 1], opacity: [0, 0.4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-0 left-1/2 -translate-x-1/2 rounded-full border border-gold-400/35"
                  style={{
                    width: ringSize + 4,
                    height: ringSize + 4,
                    marginTop: -2,
                  }}
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
              left: Math.min(hoveredMember.x + 56, activeCanvasWidth - 230),
              top: Math.max(12, hoveredMember.y - 38),
            }}
          >
            <p className="text-sm font-medium text-white/92">
              {formatProfileFullName(hoveredMember.profile)}
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
