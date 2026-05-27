"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { MarketingHeader } from "@/components/marketing/MarketingHeader";
import { PreAuthBackdrop } from "@/components/marketing/PreAuthBackdrop";
import { CREATE_FAMILY_SIGNUP_PATH, joinFamilySignupPath } from "@/lib/signup-flow";
import { useKeyboardGuardedInput } from "@/hooks/use-keyboard-guarded-input";
import { resolveAppliedThemeMode, THEME_CHANGE_EVENT, type ThemeMode } from "@/lib/theme";

type ProductScreen =
  | {
      title: string;
      description: string;
      mode: "iframe";
      screenshotPath: string;
    }
  | {
      title: string;
      description: string;
      mode: "static";
      /** Theme-matched static assets (no live iframe). */
      staticPaths: { light: string; dark: string };
    };

const PRODUCT_SCREENS: ProductScreen[] = [
  {
    title: "Family Tree",
    description: "Visualize connections across generations with an interactive tree layout.",
    mode: "iframe",
    screenshotPath: "/preview/tree",
  },
  {
    title: "Expanded Profiles",
    description: "Explore full profile views with places, health details, and richer family context.",
    mode: "iframe",
    screenshotPath: "/preview/profile-expanded",
  },
  {
    title: "Add Members",
    description: "Add relatives and define relationships with guided forms.",
    mode: "static",
    staticPaths: {
      light: "/marketing/preview-add-light.png",
      dark: "/marketing/preview-add-dark.png",
    },
  },
  {
    title: "Globe View",
    description: "See where your family lives around the world.",
    mode: "iframe",
    screenshotPath: "/preview/globe",
  },
  {
    title: "Health DNA",
    description: "Review hereditary patterns, health snapshots, and read-only demo health insights.",
    mode: "static",
    staticPaths: {
      light: "/marketing/preview-health-light.png",
      dark: "/marketing/preview-health-dark.png",
    },
  },
  {
    title: "Tree Export",
    description: "Export a polished family tree image for keepsakes, reunions, and sharing.",
    mode: "static",
    staticPaths: {
      light: "/marketing/preview-export-light.png",
      dark: "/marketing/preview-export-dark.png",
    },
  },
];

function PreviewChrome({ themeMode }: { themeMode: ThemeMode }) {
  const isDark = themeMode === "dark";
  return (
    <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5 px-3 py-2">
      <span className={`w-2 h-2 rounded-full ${isDark ? "bg-white/20" : "bg-black/15"}`} />
      <span className={`w-2 h-2 rounded-full ${isDark ? "bg-white/15" : "bg-black/12"}`} />
      <span className={`w-2 h-2 rounded-full ${isDark ? "bg-white/10" : "bg-black/10"}`} />
    </div>
  );
}

function PreviewBottomFade({ themeMode }: { themeMode: ThemeMode }) {
  const isDark = themeMode === "dark";
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        background: isDark
          ? "linear-gradient(to top, rgba(10,10,10,0.78), rgba(10,10,10,0) 40%)"
          : "linear-gradient(to top, rgba(238,245,238,0.82), rgba(238,245,238,0) 40%)",
      }}
    />
  );
}

function LivePreviewFrame({
  src,
  title,
  themeMode,
  iframeScale = 0.455,
}: {
  src: string;
  title: string;
  themeMode: ThemeMode;
  /** Slightly below 0.455 shows more of the embedded page (zoomed out). */
  iframeScale?: number;
}) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded border border-black/8 bg-[color:var(--background)] dark:border-white/10">
      <PreviewChrome themeMode={themeMode} />
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          key={`${src}-${themeMode}`}
          title={title}
          src={`${src}?theme=${themeMode}`}
          className="border-0 pointer-events-none absolute left-0 top-0 h-[220%] w-[220%] origin-top-left"
          style={{ transform: `scale(${iframeScale})` }}
          loading="lazy"
        />
      </div>
      <PreviewBottomFade themeMode={themeMode} />
    </div>
  );
}

function StaticPreviewFrame({
  title,
  themeMode,
  staticPaths,
}: {
  title: string;
  themeMode: ThemeMode;
  staticPaths: { light: string; dark: string };
}) {
  const src = themeMode === "dark" ? staticPaths.dark : staticPaths.light;

  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded border border-black/8 bg-[color:var(--background)] dark:border-white/10">
      <PreviewChrome themeMode={themeMode} />
      <div className="absolute inset-0 overflow-hidden">
        <Image
          key={src}
          src={src}
          alt={`${title} screen preview`}
          width={1600}
          height={1000}
          className="pointer-events-none h-full w-full object-cover object-top"
          loading="lazy"
          sizes="(max-width: 768px) 100vw, 50vw"
        />
      </div>
      <PreviewBottomFade themeMode={themeMode} />
    </div>
  );
}

function ProductPreview({ item, themeMode }: { item: ProductScreen; themeMode: ThemeMode }) {
  if (item.mode === "static") {
    return <StaticPreviewFrame title={item.title} themeMode={themeMode} staticPaths={item.staticPaths} />;
  }
  return (
    <LivePreviewFrame
      src={item.screenshotPath}
      title={item.title}
      themeMode={themeMode}
      iframeScale={item.screenshotPath === "/preview/tree" ? 0.4 : 0.455}
    />
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [themeMode, setThemeMode] = useState<ThemeMode>("light");
  const { ref: inviteInputRef, guardedProps: inviteInputProps } = useKeyboardGuardedInput();

  useEffect(() => {
    const syncTheme = () => setThemeMode(resolveAppliedThemeMode());
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    return () => window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
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

      <MarketingHeader />

      <main className="relative z-10 px-4 sm:px-6 lg:px-16 pb-24">
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
            Legatree helps families build a shared tree, view detailed member profiles, and see where relatives live around the world. Join an existing family network or create your own.
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
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="go"
                  {...inviteInputProps}
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
                <ProductPreview item={item} themeMode={themeMode} />
              </motion.article>
            ))}
          </div>
        </section>

        {/* Privacy */}
        <section className="mt-16 lg:mt-20 max-w-6xl mx-auto">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8">
            <div className="max-w-3xl">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                  <Lock size={18} className="text-gold-300/85" aria-hidden />
                </div>
                <div>
                  <p
                    className="text-xs uppercase tracking-widest text-white/45"
                    style={{ fontFamily: "var(--font-source-sans)" }}
                  >
                    Privacy-first by design
                  </p>
                  <h2
                    className="mt-2 text-2xl lg:text-3xl text-white/95 font-semibold"
                    style={{ fontFamily: "var(--font-source-serif)" }}
                  >
                    Built for families, not for data brokers
                  </h2>
                </div>
              </div>
              <p
                className="mt-4 text-sm lg:text-base text-white/55 leading-relaxed"
                style={{ fontFamily: "var(--font-source-sans)" }}
              >
                Legatree is invite-only and family-scoped. Your family data stays in your private database on
                Supabase. We run no ads, never sell your information, and never share it with third parties.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                {
                  title: "Invite-only families",
                  body: "Joining requires an invite. Your family stays private by default.",
                },
                {
                  title: "Your private database",
                  body: "Family records stay in your secured database with row-level access controls.",
                },
                {
                  title: "Private galleries",
                  body: "Photos live in private storage with family-scoped access rules.",
                },
                {
                  title: "No ads. No third parties.",
                  body: "We don't sell data, we don't run ads, and your family information never leaves your private server and database.",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4"
                >
                  <p className="text-sm font-semibold text-white/90" style={{ fontFamily: "var(--font-source-serif)" }}>
                    {item.title}
                  </p>
                  <p className="mt-1.5 text-sm text-white/55 leading-relaxed" style={{ fontFamily: "var(--font-source-sans)" }}>
                    {item.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <footer className="mt-24 lg:mt-28 max-w-6xl mx-auto border-t border-white/10 pt-8">
          <SiteFooter variant="public" />
        </footer>
      </main>
    </div>
  );
}
