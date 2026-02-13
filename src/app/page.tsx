"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, ArrowRight, LogIn, Eye, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const HOW_IT_WORKS_STEPS = [
  {
    number: "1",
    title: "Create your profile",
    description: "Add yourself first so your tree starts from the right root person.",
    screenshotPath: "/signup",
  },
  {
    number: "2",
    title: "Add 3 core relatives",
    description: "Use starter templates and suggestions to quickly add your first branch.",
    screenshotPath: "/demo",
  },
  {
    number: "3",
    title: "Invite 1 family member",
    description: "Share your invite code so your family can join the same network.",
    screenshotPath: "/signup?mode=join&code=DEMO1234",
  },
];

function ScreenshotFrame({ src, title }: { src: string; title: string }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-white/[0.1] bg-[#050505]">
      <div className="absolute left-0 top-0 z-10 flex items-center gap-1.5 px-3 py-2">
        <span className="w-2 h-2 rounded-full bg-red-400/70" />
        <span className="w-2 h-2 rounded-full bg-yellow-400/70" />
        <span className="w-2 h-2 rounded-full bg-green-400/70" />
      </div>
      <div className="absolute inset-0 overflow-hidden">
        <iframe
          title={title}
          src={src}
          className="border-0 pointer-events-none absolute left-0 top-0 h-[220%] w-[220%] origin-top-left scale-[0.455]"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
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
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-[-220px] left-1/2 -translate-x-1/2 w-[860px] h-[860px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,165,116,0.08) 0%, transparent 72%)" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[420px]"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(212,165,116,0.03) 100%)" }}
        />
      </div>

      <header className="relative z-10 flex items-center justify-between px-6 lg:px-16 py-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/20">
            <Crown size={20} className="text-gold-400" />
          </div>
          <span className="font-serif text-xl font-semibold text-white/90 tracking-wide">Legacy</span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/demo"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs text-white/55 hover:text-white/75 hover:bg-white/[0.04] transition-colors"
          >
            <Eye size={13} />
            View Demo
          </Link>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.1] text-xs text-white/70 hover:text-gold-300 hover:border-gold-400/30 transition-colors"
          >
            <LogIn size={13} />
            Sign In
          </Link>
        </div>
      </header>

      <main className="relative z-10 px-6 lg:px-16 pb-20">
        <section className="pt-16 lg:pt-24 max-w-5xl mx-auto text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-gold-400/20 bg-gold-400/[0.07] text-[11px] tracking-wide uppercase text-gold-300/85"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-gold-300" />
            Family tree onboarding that actually finishes
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-6 font-serif text-4xl sm:text-5xl lg:text-7xl leading-tight"
          >
            <span className="text-white/95">Build your family network</span>
            <br />
              <span
                style={{
                  background: "linear-gradient(135deg, var(--accent-300) 0%, var(--accent-200) 45%, var(--accent-500) 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
            >
              in 10 minutes.
            </span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="mt-5 text-base lg:text-lg text-white/45 max-w-2xl mx-auto"
          >
            One guided flow: add yourself, add 3 core relatives, invite 1 family member. No blank-canvas confusion.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-8 space-y-3"
          >
            <Link
              href="/signup"
              className="inline-flex items-center gap-2.5 px-7 py-3.5 rounded-2xl bg-gradient-to-r from-gold-500 to-gold-400 text-[#0a0a0a] text-sm font-semibold shadow-lg hover:opacity-95 transition-opacity"
            >
              Build your family network in 10 minutes
              <ArrowRight size={15} />
            </Link>

            <form onSubmit={handleJoinByCode} className="max-w-md mx-auto flex gap-2">
              <input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Already have a family code?"
                className="flex-1 h-11 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 placeholder:text-white/28 outline-none focus:border-gold-400/35"
                autoCapitalize="none"
              />
              <button
                type="submit"
                className="h-11 px-4 rounded-xl bg-white/[0.04] border border-white/[0.14] text-sm text-white/80 hover:text-white/95 hover:border-gold-400/28 transition-colors"
              >
                Join by Code
              </button>
            </form>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-white/35"
          >
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-gold-300/80" />
              Guided onboarding
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-gold-300/80" />
              Invite-code sharing
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 size={12} className="text-gold-300/80" />
              Shared family tree
            </span>
          </motion.div>
        </section>

        <section className="mt-20 lg:mt-24 max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/35">How it works</p>
            <h2 className="font-serif text-3xl lg:text-4xl text-white/92 mt-2">
              Three steps, real product screens
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {HOW_IT_WORKS_STEPS.map((step, index) => (
              <motion.article
                key={step.number}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ delay: index * 0.08 }}
                className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gold-400/15 text-gold-300 text-xs font-semibold">
                      {step.number}
                    </span>
                    <h3 className="mt-2 font-serif text-xl text-white/90">{step.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-white/45 mb-4">{step.description}</p>
                <ScreenshotFrame src={step.screenshotPath} title={step.title} />
              </motion.article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
