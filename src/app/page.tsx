"use client";

// ══════════════════════════════════════════════════════════
// Legacy – Landing Page
// Routes to login/signup when auth is active.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { Crown, ArrowRight, GitBranch, HeartPulse, Globe, LogIn, UserPlus } from "lucide-react";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,165,116,0.04) 0%, transparent 70%)" }}
        />
        <div
          className="absolute bottom-0 left-0 right-0 h-[400px]"
          style={{ background: "linear-gradient(180deg, transparent 0%, rgba(212,165,116,0.02) 100%)" }}
        />
      </div>

      <motion.header
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative z-10 flex items-center justify-between px-8 lg:px-16 py-6"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gold-400/10 border border-gold-400/20">
            <Crown size={20} className="text-gold-400" />
          </div>
          <span className="font-serif text-xl font-semibold text-white/90 tracking-wide">Legacy</span>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="glass flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-gold-300 hover:border-gold-400/30 transition-all duration-300">
              <LogIn size={14} /> Sign In
            </motion.button>
          </Link>
          <Link href="/signup">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-400/15 text-gold-300 text-sm font-medium hover:bg-gold-400/20 transition-colors">
              <UserPlus size={14} /> Get Started
            </motion.button>
          </Link>
        </div>
      </motion.header>

      <main className="relative z-10 flex flex-col items-center justify-center px-8 pt-24 lg:pt-32">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className="glass inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-gold-400 animate-pulse" />
          <span className="text-xs font-medium text-white/50 tracking-wider uppercase">Ancestry & Health Intelligence</span>
        </motion.div>

        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="font-serif text-5xl lg:text-7xl xl:text-8xl font-bold text-center leading-tight">
          <span className="text-white/95">Know Your</span><br />
          <span style={{
            background: "linear-gradient(135deg, #d4a574 0%, #e8c99a 50%, #c49a6c 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>Bloodline</span>
        </motion.h1>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="mt-6 text-lg lg:text-xl text-white/40 text-center max-w-xl leading-relaxed">
          Trace your genetic legacy. Understand inherited health patterns.<br />Connect with family across the globe.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }} className="mt-10 flex items-center gap-4">
          <Link href="/signup">
            <motion.button whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
              className="group flex items-center gap-3 px-7 py-3.5 rounded-2xl
                bg-gradient-to-r from-gold-500 to-gold-400 text-[#0a0a0a]
                font-semibold text-sm tracking-wide shadow-lg glow-gold hover:glow-gold-intense transition-all duration-300">
              Explore Your Legacy
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </motion.button>
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
          {[
            { icon: GitBranch, title: "Blood Match", desc: "Scientifically accurate genetic relationship coefficients visualized as glowing Blood Rings." },
            { icon: HeartPulse, title: "Health DNA", desc: "Track hereditary conditions across generations. See genetic threads connecting your family." },
            { icon: Globe, title: "Global Family", desc: "Interactive globe showing your family's worldwide presence with real-time location pulses." },
          ].map((feature, i) => {
            const Icon = feature.icon;
            return (
              <motion.div key={feature.title}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.8 + i * 0.15 }} whileHover={{ y: -4 }}
                className="glass-card rounded-2xl p-6 group cursor-default">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gold-400/10 mb-4 group-hover:bg-gold-400/15 transition-colors duration-300">
                  <Icon size={22} className="text-gold-400/70 group-hover:text-gold-300 transition-colors" />
                </div>
                <h3 className="font-serif text-lg font-semibold text-white/90 mb-2">{feature.title}</h3>
                <p className="text-sm text-white/35 leading-relaxed">{feature.desc}</p>
              </motion.div>
            );
          })}
        </motion.div>

        <div className="h-32" />
      </main>
    </div>
  );
}
