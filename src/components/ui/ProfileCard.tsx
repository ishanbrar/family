"use client";

// ══════════════════════════════════════════════════════════
// ProfileCard – Full Member Profile Display
// Combines avatar with Blood Ring, personal info, medical
// conditions summary, and social dock.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { MapPin, Briefcase, Calendar, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Profile, GeneticMatchResult } from "@/lib/types";
import { GeneticMatchRing } from "./GeneticMatchRing";
import { SocialDock } from "./SocialDock";
import { GlassCard } from "./GlassCard";

interface ProfileCardProps {
  profile: Profile;
  geneticMatch?: GeneticMatchResult;
  isViewer?: boolean;
  onClick?: () => void;
  className?: string;
}

function getInitials(first: string, last: string): string {
  return `${first[0] || ""}${last[0] || ""}`.toUpperCase();
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function calculateAge(dateStr: string | null): number | null {
  if (!dateStr) return null;
  const birth = new Date(dateStr);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function ProfileCard({
  profile,
  geneticMatch,
  isViewer = false,
  onClick,
  className,
}: ProfileCardProps) {
  const age = calculateAge(profile.date_of_birth);
  const initials = getInitials(profile.first_name, profile.last_name);

  return (
    <GlassCard
      glow={isViewer}
      className={cn("p-6 max-w-sm w-full", onClick && "cursor-pointer", className)}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02, y: -4 } : undefined}
    >
      <div className="flex flex-col items-center text-center">
        {/* Blood Ring + Avatar */}
        <GeneticMatchRing
          percentage={isViewer ? 100 : geneticMatch?.percentage || 0}
          size={130}
          strokeWidth={3}
          avatarUrl={profile.avatar_url}
          initials={initials}
          label={
            isViewer
              ? "You"
              : geneticMatch?.relationship || "Family"
          }
          showPercentage={!isViewer}
        />

        {/* Name */}
        <motion.h3
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-4 text-xl font-serif font-semibold text-white/95"
        >
          {profile.first_name} {profile.last_name}
        </motion.h3>

        {/* Alive/Deceased Badge */}
        {!profile.is_alive && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full
              bg-white/5 text-[10px] text-white/30 font-medium tracking-wider uppercase"
          >
            <Star size={10} className="text-gold-400/50" />
            In Memoriam
          </motion.span>
        )}

        {/* Meta Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-3 flex flex-col gap-1.5"
        >
          {profile.profession && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
              <Briefcase size={12} />
              <span>{profile.profession}</span>
            </div>
          )}
          {profile.location_city && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
              <MapPin size={12} />
              <span>{profile.location_city}</span>
            </div>
          )}
          {profile.date_of_birth && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
              <Calendar size={12} />
              <span>
                {formatDate(profile.date_of_birth)}
                {age !== null && ` (${age})`}
              </span>
            </div>
          )}
        </motion.div>

        {/* Social Dock */}
        <div className="mt-4">
          <SocialDock links={profile.social_links} />
        </div>
      </div>
    </GlassCard>
  );
}
