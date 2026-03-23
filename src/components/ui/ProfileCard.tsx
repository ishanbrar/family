"use client";

// ══════════════════════════════════════════════════════════
// ProfileCard – Full Member Profile Display
// Combines avatar with Blood Ring, personal info, medical
// conditions summary, and social dock.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { MapPin, Briefcase, Calendar, Star, User } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Profile, GeneticMatchResult } from "@/lib/types";
import { formatGenderLabel } from "@/lib/display-format";
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

  if (isViewer) {
    return (
      <GlassCard
        glow
        className={cn(
          "w-full p-6 sm:p-8",
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
        whileHover={onClick ? { scale: 1.01, y: -2 } : undefined}
      >
        <div className="flex flex-col lg:flex-row lg:items-stretch gap-8 lg:gap-10">
          {/* Avatar + You */}
          <div className="flex flex-col items-center lg:items-start shrink-0">
            <GeneticMatchRing
              percentage={100}
              size={140}
              strokeWidth={3}
              avatarUrl={profile.avatar_url}
              initials={initials}
              label="You"
              showPercentage={false}
            />
          </div>

          {/* Name + details grid */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="text-center lg:text-left">
              <motion.h3
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.15 }}
                className="text-2xl sm:text-3xl font-serif font-semibold app-text-primary tracking-tight"
              >
                {profile.first_name} {profile.last_name}
              </motion.h3>
              {profile.display_name && (
                <p className="mt-1.5 text-sm text-[var(--accent-400)] font-medium">
                  {profile.display_name}
                </p>
              )}
              {!profile.is_alive && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
                    bg-[var(--foreground)]/[0.06] text-[11px] app-text-secondary font-medium uppercase tracking-wider"
                >
                  <Star size={11} className="text-[var(--accent-400)]" />
                  In Memoriam
                </motion.span>
              )}
            </div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4"
            >
              {profile.profession && (
                <div
                  className="rounded-xl border border-[var(--foreground)]/[0.08] bg-[var(--background)]/80
                    px-4 py-3 flex items-start gap-3 shadow-sm"
                >
                  <div className="mt-0.5 rounded-lg bg-[var(--accent-rgb)]/12 p-2 text-[var(--accent-400)]">
                    <Briefcase size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider app-text-muted font-semibold">Profession</p>
                    <p className="mt-0.5 text-sm sm:text-base app-text-primary font-medium leading-snug">
                      {profile.profession}
                    </p>
                  </div>
                </div>
              )}
              {profile.gender && (
                <div
                  className="rounded-xl border border-[var(--foreground)]/[0.08] bg-[var(--background)]/80
                    px-4 py-3 flex items-start gap-3 shadow-sm"
                >
                  <div className="mt-0.5 rounded-lg bg-[var(--accent-rgb)]/12 p-2 text-[var(--accent-400)]">
                    <User size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider app-text-muted font-semibold">Gender</p>
                    <p className="mt-0.5 text-sm sm:text-base app-text-primary font-medium">
                      {formatGenderLabel(profile.gender)}
                    </p>
                  </div>
                </div>
              )}
              {profile.location_city && (
                <div
                  className="rounded-xl border border-[var(--foreground)]/[0.08] bg-[var(--background)]/80
                    px-4 py-3 flex items-start gap-3 shadow-sm"
                >
                  <div className="mt-0.5 rounded-lg bg-[var(--accent-rgb)]/12 p-2 text-[var(--accent-400)]">
                    <MapPin size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider app-text-muted font-semibold">Location</p>
                    <p className="mt-0.5 text-sm sm:text-base app-text-primary font-medium leading-snug break-words">
                      {profile.location_city}
                    </p>
                  </div>
                </div>
              )}
              {profile.date_of_birth && (
                <div
                  className="rounded-xl border border-[var(--foreground)]/[0.08] bg-[var(--background)]/80
                    px-4 py-3 flex items-start gap-3 shadow-sm"
                >
                  <div className="mt-0.5 rounded-lg bg-[var(--accent-rgb)]/12 p-2 text-[var(--accent-400)]">
                    <Calendar size={18} strokeWidth={2} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider app-text-muted font-semibold">Birth</p>
                    <p className="mt-0.5 text-sm sm:text-base app-text-primary font-medium">
                      {formatDate(profile.date_of_birth)}
                      {age !== null && (
                        <span className="app-text-secondary font-normal"> · {age} years</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            <div className="mt-6 flex justify-center lg:justify-start">
              <SocialDock links={profile.social_links} />
            </div>
          </div>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard
      glow={false}
      className={cn("p-6 max-w-sm w-full", onClick && "cursor-pointer", className)}
      onClick={onClick}
      whileHover={onClick ? { scale: 1.02, y: -4 } : undefined}
    >
      <div className="flex flex-col items-center text-center">
        {/* Blood Ring + Avatar */}
        <GeneticMatchRing
          percentage={geneticMatch?.percentage || 0}
          size={130}
          strokeWidth={3}
          avatarUrl={profile.avatar_url}
          initials={initials}
          label={geneticMatch?.relationship || "Family"}
          showPercentage
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
        {profile.display_name && (
          <p className="mt-1 text-xs text-gold-300/85">
            {profile.display_name}
          </p>
        )}

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
          {profile.gender && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-white/40">
              <User size={12} />
              <span>{formatGenderLabel(profile.gender)}</span>
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
