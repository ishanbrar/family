"use client";

// ══════════════════════════════════════════════════════════
// Login – Sign in with email/password or magic link
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white/90 placeholder:text-white/20 outline-none focus:border-gold-400/30 focus:bg-white/[0.06] transition-all duration-200";

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,165,116,0.04) 0%, transparent 70%)" }}
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20">
            <Crown size={24} className="text-gold-400" />
          </div>
          <span className="font-serif text-2xl font-semibold text-white/90 tracking-wide">Legacy</span>
        </div>

        {/* Card */}
        <div className="rounded-3xl p-8" style={{ background: "rgba(17,17,17,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 className="font-serif text-2xl font-bold text-white/95 mb-1">Welcome back</h1>
          <p className="text-sm text-white/35 mb-8">Sign in to your family platform</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required autoFocus className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required className={inputClass}
              />
            </div>

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs text-red-400/80 bg-red-400/[0.06] border border-red-400/10 rounded-xl px-4 py-2.5">
                {error}
              </motion.p>
            )}

            <motion.button
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                bg-gradient-to-r from-gold-500 to-gold-400 text-[#0a0a0a] font-semibold text-sm
                hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>Sign In</span><ArrowRight size={14} /></>}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-sm text-white/25 mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-gold-400/70 hover:text-gold-300 transition-colors font-medium">
            Create one
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
