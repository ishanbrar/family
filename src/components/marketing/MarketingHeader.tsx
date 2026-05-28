"use client";

import Link from "next/link";
import { LegatreeBrandLink } from "@/components/branding/LegatreeBrandLink";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function MarketingHeader() {
  return (
    <header className="relative z-20 px-4 sm:px-6 lg:px-16 pt-[max(env(safe-area-inset-top),0.75rem)] pb-4">
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        <LegatreeBrandLink
          destination="public"
          size="header"
          variant="plain"
          className="min-w-0 shrink text-white/95"
          textClassName="text-white/95"
        />

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <nav
            className="flex items-center gap-3 sm:gap-6 lg:gap-8"
            aria-label="Marketing"
          >
            <Link
              href="/demo/select"
              className="text-sm sm:text-base lg:text-lg font-medium text-white/60 hover:text-white/95 transition-colors min-h-[44px] inline-flex items-center whitespace-nowrap"
              style={{ fontFamily: "var(--font-source-sans)" }}
            >
              View Demo
            </Link>
            <Link
              href="/login"
              className="text-sm sm:text-base lg:text-lg font-medium text-white/90 hover:text-white transition-colors border-b-2 border-white/35 hover:border-white/70 pb-0.5 min-h-[44px] inline-flex items-center whitespace-nowrap"
              style={{ fontFamily: "var(--font-source-sans)" }}
            >
              Sign In
            </Link>
          </nav>
          <ThemeToggle placement="inline" />
        </div>
      </div>
    </header>
  );
}
