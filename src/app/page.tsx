"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const PRODUCT_SCREENS = [
  {
    title: "Family Tree",
    description: "Visualize connections across generations with an interactive tree layout.",
    screenshotPath: "/preview/tree",
  },
  {
    title: "Member Profile",
    description: "View detailed profiles with relationships, locations, and health insights.",
    screenshotPath: "/preview/member",
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
];

function ScreenshotFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded border border-white/10 bg-[#050505]">
      <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5 px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-white/20" />
        <span className="w-2 h-2 rounded-full bg-white/15" />
        <span className="w-2 h-2 rounded-full bg-white/10" />
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          title={title}
          src={src}
          className="border-0 pointer-events-none absolute left-0 top-0 h-[220%] w-[220%] origin-top-left scale-[0.455]"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent pointer-events-none" />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = joinCode.trim().toUpperCase();
    if (!normalized) return;
    router.push(`/signup?mode=join&code=${encodeURIComponent(normalized)}`);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] relative overflow-hidden">
      {/* Soft gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-[-30%] left-[-20%] w-[80%] h-[80%] rounded-full opacity-[0.04]"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.4) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-[0.03]"
          style={{
            background: "radial-gradient(circle, rgba(212,165,116,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] opacity-[0.02]"
          style={{
            background: `radial-gradient(ellipse at center, rgba(255,255,255,0.08) 0%, transparent 50%),
                        repeating-linear-gradient(0deg, transparent, transparent 80px, rgba(255,255,255,0.01) 80px, rgba(255,255,255,0.01) 81px),
                        repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(255,255,255,0.01) 80px, rgba(255,255,255,0.01) 81px)`,
          }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-16 pr-14 lg:pr-20 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded border border-white/10 bg-white/5">
            <Crown size={18} className="text-white/80" />
          </div>
          <span
            className="text-base font-semibold text-white/95"
            style={{ fontFamily: "var(--font-source-serif)" }}
          >
            Legacy
          </span>
        </div>

        <nav className="flex items-center gap-6">
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

          {/* Two primary actions */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
            style={{ fontFamily: "var(--font-source-sans)" }}
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded bg-white text-[#0a0a0a] text-sm font-semibold hover:bg-neutral-100 transition-colors"
            >
              Create your tree
              <ArrowRight size={13} strokeWidth={2.5} />
            </Link>
            <form onSubmit={handleJoinByCode} className="flex gap-2 w-full sm:w-auto max-w-sm sm:max-w-none">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Invite code"
                className="flex-1 min-w-0 h-10 rounded border border-white/20 bg-white/5 px-3.5 text-sm text-white placeholder:text-white/40 outline-none focus:border-white/40 transition-colors"
                autoCapitalize="characters"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded border border-white/20 bg-transparent text-sm font-medium text-white/90 hover:bg-white/10 hover:border-white/30 transition-colors"
              >
                Join
              </button>
            </form>
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
                <ScreenshotFrame src={item.screenshotPath} title={item.title} />
              </motion.article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
