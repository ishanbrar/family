"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink, X } from "lucide-react";
import { useAccessibleDialog } from "@/hooks/use-accessible-dialog";
import { googleMapsHrefFor } from "@/lib/maps";
import { LOCATION_SOURCE_META, LOCATION_SOURCE_ORDER } from "@/lib/location-source-meta";
import {
  groupWorldCountryByMember,
  shouldLinkLocationToGoogleMaps,
  type WorldCountrySummary,
} from "@/lib/world-locations";
import { CountryLocationMap } from "./CountryLocationMap";
import { cn } from "@/lib/cn";

interface CountryLocationModalProps {
  country: WorldCountrySummary | null;
  isOpen: boolean;
  onClose: () => void;
  onProfileClick?: (memberId: string) => void;
}

function memberInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] || ""}${parts[parts.length - 1][0] || ""}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function MemberHeadshot({
  name,
  avatarUrl,
  onClick,
}: {
  name: string;
  avatarUrl: string | null;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const initials = memberInitials(name);
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.04] transition-transform hover:scale-[1.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/40"
      aria-label={`Open ${name}'s profile`}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center bg-gold-400/10 text-xs font-medium text-gold-200/90">
          {initials}
        </span>
      )}
    </button>
  );
}

function LocationLegend() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {LOCATION_SOURCE_ORDER.map((source) => {
        const meta = LOCATION_SOURCE_META[source];
        const Icon = meta.icon;
        return (
          <span
            key={source}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] text-white/55"
          >
            <Icon size={12} className="shrink-0 opacity-80" />
            {meta.label}
          </span>
        );
      })}
    </div>
  );
}

export function CountryLocationModal({ country, isOpen, onClose, onProfileClick }: CountryLocationModalProps) {
  const { dialogRef } = useAccessibleDialog({ isOpen, onClose });
  const [expandedMemberId, setExpandedMemberId] = useState<string | null>(null);

  const memberGroups = useMemo(
    () => (country ? groupWorldCountryByMember(country) : []),
    [country]
  );

  return (
    <AnimatePresence>
      {isOpen && country && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
        >
          <button
            type="button"
            aria-label="Close country map"
            className="absolute inset-0 backdrop-blur-sm"
            style={{ background: "var(--overlay-bg)" }}
            onClick={onClose}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="country-location-title"
            tabIndex={-1}
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-3xl border shadow-2xl sm:rounded-3xl"
            style={{
              background: "var(--surface-bg)",
              borderColor: "var(--surface-border)",
            }}
          >
            <div
              className="flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-6"
              style={{ borderColor: "var(--surface-border)" }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none">{country.flag}</span>
                  <div>
                    <h2 id="country-location-title" className="font-serif text-2xl text-white/95">
                      {country.name}
                    </h2>
                    <p className="text-xs text-white/40">
                      {country.memberCount} family member{country.memberCount === 1 ? "" : "s"} ·{" "}
                      {country.locationCount} saved location{country.locationCount === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <LocationLegend />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-white/50 transition-colors hover:text-white/80"
              >
                <X size={18} />
              </button>
            </div>

            <div className="overflow-y-auto px-5 py-5 sm:px-6">
              <CountryLocationMap countryCode={country.code} pins={country.locations} />

              <div className="mt-5 space-y-2">
                {memberGroups.map((group) => {
                  const expanded = expandedMemberId === group.memberId;
                  return (
                    <div
                      key={group.memberId}
                      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:bg-white/[0.03]"
                    >
                      <div className="flex w-full items-center gap-3 px-4 py-3.5">
                        <MemberHeadshot
                          name={group.memberName}
                          avatarUrl={group.memberAvatarUrl}
                          onClick={(event) => {
                            event.stopPropagation();
                            onProfileClick?.(group.memberId);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMemberId(expanded ? null : group.memberId)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left transition-colors hover:opacity-90"
                          aria-expanded={expanded}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-white/88">{group.memberName}</p>
                            <p className="mt-0.5 text-[11px] text-white/40">
                              {group.locations.length} connection{group.locations.length === 1 ? "" : "s"} in{" "}
                              {country.name}
                            </p>
                          </div>

                          <div className="flex shrink-0 items-center gap-1.5">
                            {LOCATION_SOURCE_ORDER.filter((source) => group.sources.includes(source)).map(
                              (source) => {
                                const meta = LOCATION_SOURCE_META[source];
                                const Icon = meta.icon;
                                return (
                                  <span
                                    key={source}
                                    title={meta.label}
                                    className={cn(
                                      "inline-flex h-7 w-7 items-center justify-center rounded-full border",
                                      group.locations.find((entry) => entry.source === source)?.accentClass
                                    )}
                                  >
                                    <Icon size={13} />
                                  </span>
                                );
                              }
                            )}
                          </div>

                          <ChevronDown
                            size={16}
                            className={cn(
                              "shrink-0 text-white/30 transition-transform",
                              expanded && "rotate-180"
                            )}
                          />
                        </button>
                      </div>

                      <AnimatePresence initial={false}>
                        {expanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="space-y-2 border-t border-white/[0.06] px-4 py-3">
                              {group.locations.map((location) => {
                                const meta = LOCATION_SOURCE_META[location.source];
                                const Icon = meta.icon;
                                const mapsUrl = shouldLinkLocationToGoogleMaps(location)
                                  ? googleMapsHrefFor(location.query)
                                  : null;

                                return (
                                  <div
                                    key={location.id}
                                    className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
                                  >
                                    <span
                                      className={cn(
                                        "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border",
                                        location.accentClass
                                      )}
                                    >
                                      <Icon size={14} />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                      <p className="text-[11px] font-medium uppercase tracking-wider text-white/45">
                                        {meta.label}
                                      </p>
                                      <p className="mt-1 text-sm text-white/78 break-words">{location.city}</p>
                                    </div>
                                    {mapsUrl && (
                                      <a
                                        href={mapsUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.03] text-gold-300 transition-colors hover:bg-gold-400/10"
                                        aria-label={`Open ${location.city} in Google Maps`}
                                      >
                                        <ExternalLink size={14} />
                                      </a>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
