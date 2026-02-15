"use client";

// ══════════════════════════════════════════════════════════
// FamilyTree – Interactive Family Tree Visualization
// SVG tree with spouse connections, genetic match rings,
// genetic threads, and "Related By" blood highlighting.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import { GeneticMatchRing } from "@/components/ui/GeneticMatchRing";
import type { Profile, GeneticMatchResult } from "@/lib/types";

export interface TreeMember {
  profile: Profile;
  match: GeneticMatchResult;
  x: number;
  y: number;
}

export interface TreeConnection {
  from: string;
  to: string;
  type: "parent" | "spouse" | "sibling" | "half_sibling";
}

interface FamilyTreeProps {
  members: TreeMember[];
  connections: TreeConnection[];
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

export function FamilyTree({
  members,
  connections,
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

  const hoveredMember = useMemo(
    () => members.find((member) => member.profile.id === hoveredMemberId) || null,
    [members, hoveredMemberId]
  );

  return (
    <div className={cn("relative w-full overflow-x-auto", className)}>
      <div
        className="relative"
        style={{ minWidth: canvasWidth, minHeight: canvasHeight }}
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

          {connections.map((conn, i) => {
            const from = members.find((m) => m.profile.id === conn.from);
            const to = members.find((m) => m.profile.id === conn.to);
            if (!from || !to) return null;

            const bothHighlighted =
              hasHighlight &&
              highlightedMembers!.has(conn.from) &&
              highlightedMembers!.has(conn.to);
            const isDimmed = hasHighlight && !bothHighlighted;

            if (conn.type === "spouse") {
              // ── Horizontal spouse line ──
              const y = from.y;
              const x1 = Math.min(from.x, to.x) + 42;
              const x2 = Math.max(from.x, to.x) - 42;
              const midX = (x1 + x2) / 2;

              return (
                <g key={`spouse-${conn.from}-${conn.to}`}>
                  <motion.line
                    x1={x1} y1={y} x2={x2} y2={y}
                    stroke={isDimmed ? "rgba(255,255,255,0.03)" : "url(#spouseGrad)"}
                    strokeWidth={isDimmed ? 0.5 : 0.9}
                    strokeDasharray={isDimmed ? "4 4" : "5 4"}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                  {/* Small heart/diamond at midpoint */}
                  {!isDimmed && (
                    <motion.circle
                      cx={midX} cy={y} r={2.5}
                      fill="var(--accent-300)"
                      fillOpacity="0.45"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.9, type: "spring" }}
                    />
                  )}
                </g>
              );
            }

            if (conn.type === "sibling" || conn.type === "half_sibling") {
              const left = from.x <= to.x ? from : to;
              const right = from.x <= to.x ? to : from;
              const startX = left.x + 40;
              const endX = right.x - 40;
              const y = (left.y + right.y) / 2 - 18;
              const controlY = y - Math.max(14, Math.abs(left.x - right.x) * 0.06);

              return (
                <motion.path
                  key={`sibling-${conn.from}-${conn.to}-${i}`}
                  d={`M ${startX} ${y} Q ${(startX + endX) / 2} ${controlY}, ${endX} ${y}`}
                  fill="none"
                  stroke={isDimmed ? "url(#dimThread)" : "url(#goldThread)"}
                  strokeWidth={isDimmed ? 0.6 : 1}
                  strokeDasharray={conn.type === "half_sibling" ? "5 4" : undefined}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.35 + i * 0.07, ease: "easeOut" }}
                />
              );
            }

            // ── Parent → child curved line ──
            const startY = from.y + 42;
            const endY = to.y - 42;
            const midY = (startY + endY) / 2;

            return (
              <motion.path
                key={`parent-${conn.from}-${conn.to}-${i}`}
                d={`M ${from.x} ${startY} C ${from.x} ${midY}, ${to.x} ${midY}, ${to.x} ${endY}`}
                fill="none"
                stroke={isDimmed ? "url(#dimThread)" : "url(#goldThread)"}
                strokeWidth={isDimmed ? 0.5 : 1}
                filter={bothHighlighted && !isDimmed ? "url(#glow)" : undefined}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.2, delay: 0.3 + i * 0.08, ease: "easeOut" }}
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
  );
}
