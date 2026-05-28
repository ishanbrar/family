"use client";

import { motion } from "framer-motion";
import { ArrowRight, GitBranch } from "lucide-react";
import { useRouter } from "next/navigation";

import { LegatreeBrandLink } from "@/components/branding/LegatreeBrandLink";
import { PreAuthBackdrop } from "@/components/marketing/PreAuthBackdrop";
import { DEMO_FAMILY_OPTIONS, setStoredDemoFamily, type DemoFamilyKey } from "@/lib/demo-family";

export default function DemoSelectPage() {
  const router = useRouter();

  const chooseFamily = (key: DemoFamilyKey) => {
    setStoredDemoFamily(key);
    router.push(`/demo?family=${key}`);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <PreAuthBackdrop variant="auth" />
      <header className="relative z-10 flex items-center justify-between px-4 py-4 sm:px-6 lg:px-16">
        <LegatreeBrandLink destination="public" size="header" variant="plain" className="text-white/95" />
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] max-w-5xl flex-col justify-center px-4 pb-16 sm:px-6">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300/75">Choose a demo</p>
          <h1 className="mt-3 font-serif text-4xl font-semibold text-white/95 sm:text-5xl">
            Explore Legatree with an example family.
          </h1>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2">
          {DEMO_FAMILY_OPTIONS.map((family, index) => (
            <motion.button
              key={family.key}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 * index }}
              onClick={() => chooseFamily(family.key)}
              className="group flex min-h-56 flex-col items-start justify-between rounded-lg border border-white/10 bg-white/[0.035] p-6 text-left transition-colors hover:border-gold-300/35 hover:bg-white/[0.055]"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-gold-300">
                <GitBranch size={20} />
              </span>
              <span>
                <span className="font-serif text-2xl font-semibold text-white/95">{family.label}</span>
                <span className="mt-3 block text-sm leading-relaxed text-white/52">{family.description}</span>
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-medium text-gold-300">
                View demo <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </span>
            </motion.button>
          ))}
        </div>
      </main>
    </div>
  );
}
