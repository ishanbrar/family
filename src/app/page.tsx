"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LegacyBrandLink } from "@/components/branding/LegacyBrandLink";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { PreAuthBackdrop } from "@/components/marketing/PreAuthBackdrop";
import { CREATE_FAMILY_SIGNUP_PATH, joinFamilySignupPath } from "@/lib/signup-flow";
import { resolveAppliedThemeMode, THEME_CHANGE_EVENT, type ThemeMode } from "@/lib/theme";

const PRODUCT_SCREENS = [
  {
    title: "Family Tree",
    description: "Visualize connections across generations with an interactive tree layout.",
    screenshotPath: "/preview/tree",
  },
  {
    title: "Expanded Profiles",
    description: "Explore full profile views with places, health details, and richer family context.",
    screenshotPath: "/preview/profile-expanded",
  },
  {
    title: "Add Members",
    description: "Add relatives and define relationships with guided forms.",
    screenshotPath: "/preview/add",
  },
  {
    title: "Globe View",
    description: "See where your family lives around the world.",
    screenshotPath: "/preview/globe",
  },
  {
    title: "Health DNA",
    description: "Review hereditary patterns, health snapshots, and read-only demo health insights.",
    screenshotPath: "/preview/health",
  },
  {
    title: "Tree Export",
    description: "Export a polished family tree image for keepsakes, reunions, and sharing.",
    screenshotPath: "/preview/export",
  },
];

function ScreenshotFrame({
  src,
  title,
  themeMode,
}: {
  src: string;
  title: string;
  themeMode: ThemeMode;
}) {
  const isDark = themeMode === "dark";

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded border border-black/8 bg-[color:var(--background)] dark:border-white/10">
      <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5 px-3 py-2">
        <span className={`w-2 h-2 rounded-full ${isDark ? "bg-white/20" : "bg-black/15"}`} />
        <span className={`w-2 h-2 rounded-full ${isDark ? "bg-white/15" : "bg-black/12"}`} />
        <span className={`w-2 h-2 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          key={`${src}-${themeMode}`}
          title={title}
          src={`${src}?theme=${themeMode}`}
          className="border-0 pointer-events-none absolute left-0 top-0 h-[220%] w-[220%] origin-top-left scale-[0.455]"
          loading="lazy"
        />
      </div>
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? "linear-gradient(to top, rgba(10,10,10,0.78), rgba(10,10,10,0) 40%)"
            : "linear-gradient(to top, rgba(238,245,238,0.82), rgba(238,245,238,0) 40%)",
        }}
      />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const inviteInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncTheme = () => setThemeMode(resolveAppliedThemeMode());
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
  }, []);

  useEffect(() => {
    const blurInviteField = () => {
      if (document.activeElement === inviteInputRef.current) {
        inviteInputRef.current?.blur();
      }
    };

    const timeoutId = window.setTimeout(blurInviteField, 0);
    const animationFrame = window.requestAnimationFrame(blurInviteField);
    window.addEventListener("pageshow", blurInviteField);

    return () => {
      window.clearTimeout(timeoutId);
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pageshow", blurInviteField);
    };
  }, []);

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) return;
    router.push(joinFamilySignupPath(normalized));
  };

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden">
      <PreAuthBackdrop variant="landing" />

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-16 pr-20 lg:pr-24 py-6">
        <LegacyBrandLink
          destination="public"
          className="text-white/95"
          iconClassName="border border-white/10 bg-white/5 text-white/80"
          textClassName="text-base text-white/95"
        />

        <nav className="mr-10 sm:mr-12 lg:mr-14 flex items-center gap-4 sm:gap-6">
          <Link
            href="/demo"
            className="text-sm text-white/55 hover:text-white/90 transition-colors"
            style={{ fontFamily: "var(--font-source-sans)" }}
          >
            View Demo
          </Link>
          <Link
            href="/login"
            className="text-sm text-white/90 hover:text-white transition-colors border-b border-white/30 hover:border-white/60 pb-0.5"
            style={{ fontFamily: "var(--font-source-sans)" }}
          >
            Sign In
          </Link>
        </nav>
      </header>

      <main className="relative z-10 px-6 lg:px-16 pb-24">
        {/* Hero – Mission & Purpose */}
        <section className="pt-12 lg:pt-20 max-w-4xl mx-auto text-center">
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl leading-[1.15] font-semibold text-white"
            style={{ fontFamily: "var(--font-source-serif)" }}
          >
            Preserve your family&apos;s story.
            <br />
            <span className="text-white/70">Connect generations.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mt-6 text-base lg:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed"
            style={{ fontFamily: "var(--font-source-sans)" }}
          >
            Legacy helps families build a shared tree, view detailed member profiles, and see where relatives live around the world. Join an existing family network or create your own.
          </motion.p>

          {/* Invite-first actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-10 flex flex-col items-center justify-center gap-4"
            style={{ fontFamily: "var(--font-source-sans)" }}
          >
            <div className="w-full max-w-md text-center">
              <p className="mb-3 text-xs uppercase tracking-[0.18em] text-white/42">
                Join an existing family
              </p>
              <form onSubmit={handleJoinByCode} className="flex gap-2 w-full">
                <input
                  ref={inviteInputRef}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  className="flex-1 min-w-0 h-11 rounded border border-white/20 bg-white/8 px-3.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 transition-colors"
                  autoCapitalize="characters"
                />
                <button
                  type="submit"
                  className="h-11 px-5 rounded bg-white text-[#0a0a0a] text-sm font-semibold hover:bg-neutral-100 transition-colors"
                >
                  Join
                </button>
              </form>
            </div>

            <div className="flex flex-col items-center gap-3">
              <p className="text-sm text-white/42">or</p>
              <Link
                href={CREATE_FAMILY_SIGNUP_PATH}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded border border-white/20 bg-transparent text-white/90 text-sm font-medium hover:bg-white/10 hover:border-white/30 transition-colors"
              >
                Create Your Own Family
                <ArrowRight size={13} strokeWidth={2.5} />
              </Link>
            </div>
          </motion.div>
        </section>

        {/* Product Screens – What the platform offers */}
        <section className="mt-24 lg:mt-32 max-w-6xl mx-auto">
          <div className="mb-10">
            <p
              className="text-xs uppercase tracking-widest text-white/45"
              style={{ fontFamily: "var(--font-source-sans)" }}
            >
              Explore the platform
            </p>
            <h2
              className="mt-2 text-2xl lg:text-3xl text-white/95 font-semibold"
              style={{ fontFamily: "var(--font-source-serif)" }}
            >
              What you&apos;ll find
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-6">
            {PRODUCT_SCREENS.map((item, index) => (
              <motion.article
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: index * 0.08, duration: 0.5 }}
                className="rounded border border-white/10 bg-white/[0.02] p-5"
              >
                <h3
                  className="text-base font-semibold text-white/95"
                  style={{ fontFamily: "var(--font-source-serif)" }}
                >
                  {item.title}
                </h3>
                <p
                  className="mt-1.5 text-sm text-white/50 leading-relaxed mb-4"
                  style={{ fontFamily: "var(--font-source-sans)" }}
                >
                  {item.description}
                </p>
                <ScreenshotFrame src={item.screenshotPath} title={item.title} themeMode={themeMode} />
              </motion.article>
            ))}
          </div>
        </section>

        <footer className="mt-24 lg:mt-28 max-w-6xl mx-auto border-t border-white/10 pt-8">
          <SiteFooter variant="public" />
        </footer>
      </main>
    </div>
  );
}
