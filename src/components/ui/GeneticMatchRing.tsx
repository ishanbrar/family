"use client";

// ══════════════════════════════════════════════════════════
// GeneticMatchRing – "Blood Ring" Visualization
// A glowing circular progress ring that represents the
// coefficient of genetic relationship between two people.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { getMatchColor, getMatchGlow } from "@/lib/genetic-match";

interface GeneticMatchRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  avatarUrl?: string | null;
  initials?: string;
  label?: string;
  className?: string;
  showPercentage?: boolean;
}

export function GeneticMatchRing({
  percentage,
  size = 120,
  strokeWidth = 4,
  avatarUrl,
  initials = "?",
  label,
  className,
  showPercentage = true,
}: GeneticMatchRingProps) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (percentage / 100) * circumference;
  const color = getMatchColor(percentage);
  const glow = getMatchGlow(percentage);

  return (
    <div className={cn("relative flex flex-col items-center gap-2", className)}>
      <div
        className="relative blood-ring-pulse"
        style={{ width: size, height: size }}
      >
        {/* Background ring */}
        <svg
          width={size}
          height={size}
          className="absolute inset-0 -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.06)"
            strokeWidth={strokeWidth}
          />
          {/* Animated progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference - progress }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.3 }}
            style={{
              filter: `drop-shadow(${glow === "none" ? "0 0 0 transparent" : glow.replace(/box-shadow: /, "")})`,
            }}
          />
        </svg>

        {/* Avatar or Initials */}
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ padding: strokeWidth * 2 + 4 }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-white/80 font-serif font-medium"
              style={{
                background: `linear-gradient(135deg, rgba(212, 165, 116, 0.15) 0%, rgba(212, 165, 116, 0.05) 100%)`,
                fontSize: size * 0.25,
              }}
            >
              {initials}
            </div>
          )}
        </div>

        {/* Percentage badge */}
        {showPercentage && percentage > 0 && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1, type: "spring", stiffness: 400, damping: 20 }}
            className="absolute -bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: color,
              color: "#0a0a0a",
              boxShadow: glow,
            }}
          >
            {percentage}%
          </motion.div>
        )}
      </div>

      {/* Label */}
      {label && (
        <span className="text-xs text-white/50 font-medium tracking-wide">
          {label}
        </span>
      )}
    </div>
  );
}
