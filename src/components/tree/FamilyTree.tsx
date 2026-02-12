"use client";

// ══════════════════════════════════════════════════════════
// FamilyTree – Interactive Family Tree Visualization
// SVG tree with spouse connections, genetic match rings,
// genetic threads, and "Related By" blood highlighting.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
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
  type: "parent" | "spouse";
}

interface FamilyTreeProps {
  members: TreeMember[];
  connections: TreeConnection[];
  highlightedMembers?: Set<string>;
  dimNonHighlighted?: boolean;
  onMemberClick?: (id: string) => void;
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
  onMemberClick,
  className,
}: FamilyTreeProps) {
  const hasHighlight = dimNonHighlighted && highlightedMembers && highlightedMembers.size > 0;

  return (
    <div className={cn("relative w-full overflow-x-auto", className)}>
      <div className="relative min-w-[800px]" style={{ minHeight: 560 }}>
        {/* ── SVG Connection Layer ─────────────────── */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: 560 }}>
          <defs>
            <linearGradient id="goldThread" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(212, 165, 116, 0.5)" />
              <stop offset="100%" stopColor="rgba(212, 165, 116, 0.3)" />
            </linearGradient>
            <linearGradient id="dimThread" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.04)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <linearGradient id="spouseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(212, 165, 116, 0.25)" />
              <stop offset="50%" stopColor="rgba(212, 165, 116, 0.4)" />
              <stop offset="100%" stopColor="rgba(212, 165, 116, 0.25)" />
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
                    strokeWidth={isDimmed ? 0.5 : 1}
                    strokeDasharray={isDimmed ? "4 4" : "none"}
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.5 }}
                  />
                  {/* Small heart/diamond at midpoint */}
                  {!isDimmed && (
                    <motion.circle
                      cx={midX} cy={y} r={2.5}
                      fill="rgba(212, 165, 116, 0.4)"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.9, type: "spring" }}
                    />
                  )}
                </g>
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
          const initials = getInitials(member.profile.first_name, member.profile.last_name);

          return (
            <motion.div
              key={member.profile.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{
                opacity: isDimmed ? 0.25 : 1,
                scale: 1,
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
              onClick={() => onMemberClick?.(member.profile.id)}
            >
              <div className="flex flex-col items-center">
                <GeneticMatchRing
                  percentage={member.match.percentage}
                  size={80}
                  strokeWidth={2.5}
                  avatarUrl={member.profile.avatar_url}
                  initials={initials}
                  showPercentage={member.match.percentage > 0 && member.match.relationship !== "Self"}
                />
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isDimmed ? 0.3 : 1 }}
                  transition={{ delay: 0.6 + i * 0.06 }}
                  className="mt-2 text-center"
                >
                  <p className={cn(
                    "text-xs font-medium",
                    isHighlighted ? "text-gold-300 text-glow-gold" : "text-white/70"
                  )}>
                    {member.profile.first_name}
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    {member.match.relationship}
                  </p>
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
                    rounded-full border border-gold-400/30"
                />
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
