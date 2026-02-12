"use client";

// ══════════════════════════════════════════════════════════
// MedicalHistoryCard – Health Condition Display
// Shows a user's medical condition with severity indicator,
// age of onset, and privacy blur for non-immediate family.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import {
  HeartPulse,
  Dna,
  Brain,
  Shield,
  AlertCircle,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/cn";
import type { UserCondition, MedicalCondition, ConditionSeverity } from "@/lib/types";
import { useState } from "react";

interface MedicalHistoryCardProps {
  userCondition: UserCondition;
  condition: MedicalCondition;
  isPrivate?: boolean;
  onHighlight?: (conditionId: string) => void;
  isHighlighted?: boolean;
  className?: string;
}

const TYPE_ICONS = {
  hereditary: Dna,
  chronic: HeartPulse,
  autoimmune: Shield,
  mental_health: Brain,
  other: AlertCircle,
};

const SEVERITY_COLORS: Record<ConditionSeverity, { bg: string; text: string; dot: string }> = {
  mild: {
    bg: "bg-severity-mild/10",
    text: "text-severity-mild",
    dot: "bg-severity-mild",
  },
  moderate: {
    bg: "bg-severity-moderate/10",
    text: "text-severity-moderate",
    dot: "bg-severity-moderate",
  },
  severe: {
    bg: "bg-severity-severe/10",
    text: "text-severity-severe",
    dot: "bg-severity-severe",
  },
};

export function MedicalHistoryCard({
  userCondition,
  condition,
  isPrivate = false,
  onHighlight,
  isHighlighted = false,
  className,
}: MedicalHistoryCardProps) {
  const [revealed, setRevealed] = useState(false);
  const Icon = TYPE_ICONS[condition.type] || AlertCircle;
  const severity = SEVERITY_COLORS[userCondition.severity];
  const shouldBlur = isPrivate && !revealed;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      onClick={() => {
        if (isPrivate) setRevealed(!revealed);
        if (onHighlight) onHighlight(condition.id);
      }}
      className={cn(
        "glass-card rounded-2xl p-4 cursor-pointer transition-all duration-300",
        isHighlighted && "ring-1 ring-gold-400/30 glow-gold",
        shouldBlur && "privacy-blur",
        className
      )}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className={cn(
            "flex items-center justify-center w-10 h-10 rounded-xl shrink-0",
            isHighlighted
              ? "bg-gold-400/15 text-gold-300"
              : "bg-white/5 text-white/40"
          )}
        >
          <Icon size={18} />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-sm font-medium text-white/90 truncate">
              {condition.name}
            </h4>
            <div className={cn("flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", severity.bg, severity.text)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", severity.dot)} />
              {userCondition.severity}
            </div>
          </div>

          {/* Description */}
          <p className="text-xs text-white/40 mt-1 line-clamp-1">
            {condition.description}
          </p>

          {/* Meta */}
          <div className="flex items-center gap-3 mt-2">
            {userCondition.age_of_onset && (
              <span className="text-[10px] text-white/30 font-medium">
                Onset: Age {userCondition.age_of_onset}
              </span>
            )}
            {userCondition.diagnosed_at && (
              <span className="text-[10px] text-white/30 font-medium">
                Dx: {new Date(userCondition.diagnosed_at).getFullYear()}
              </span>
            )}
            {condition.icd_code && (
              <span className="text-[10px] text-white/20 font-mono">
                {condition.icd_code}
              </span>
            )}
          </div>
        </div>

        {/* Privacy Indicator */}
        {isPrivate && (
          <div className="flex items-center justify-center w-6 h-6">
            <Eye
              size={14}
              className={cn(
                "transition-colors duration-200",
                revealed ? "text-gold-400" : "text-white/20"
              )}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
