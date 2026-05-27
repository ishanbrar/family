"use client";

import { GlassCard } from "@/components/ui/GlassCard";
import type { FarAndWideRow } from "@/lib/world-locations";

interface FarAndWideSectionProps {
  rows: FarAndWideRow[];
}

export function FarAndWideSection({ rows }: FarAndWideSectionProps) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-end sm:justify-between mb-4">
        <div>
          <h2 className="font-serif text-lg text-white/92">Far and Wide</h2>
          <p className="text-xs text-white/35">
            Distance traveled from birthplace to current city, sorted from highest to lowest.
          </p>
        </div>
        <span className="text-[11px] text-white/40">
          {rows.length} member{rows.length === 1 ? "" : "s"} with complete location data
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-6 text-sm text-white/40 text-center">
          Add birth cities and current cities to start comparing how far your family has spread.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-white/[0.02]">
          <table className="min-w-full text-left">
            <thead className="border-b border-white/[0.08] bg-white/[0.02]">
              <tr className="text-[11px] uppercase tracking-wider text-white/42">
                <th className="px-4 py-3 font-medium">Person</th>
                <th className="px-4 py-3 font-medium">Birth City</th>
                <th className="px-4 py-3 font-medium">Current City</th>
                <th className="px-4 py-3 font-medium text-right">Miles</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-white/[0.06] last:border-b-0">
                  <td className="px-4 py-3 text-sm text-white/82">{row.name}</td>
                  <td className="px-4 py-3 text-sm text-white/62">{row.birthCity}</td>
                  <td className="px-4 py-3 text-sm text-white/62">{row.currentCity}</td>
                  <td className="px-4 py-3 text-sm text-gold-300 text-right">{row.miles.toLocaleString()} mi</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
}
