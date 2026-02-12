"use client";

// ══════════════════════════════════════════════════════════
// Signup – Create account and initial profile
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Crown, Mail, Lock, User, Users, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [mode, setMode] = useState<"create" | "join">("create");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // 2. Handle family — create or join
    let familyId: string | null = null;

    if (mode === "create" && familyName.trim()) {
      const { data: family, error: famErr } = await supabase
        .from("families")
        .insert({ name: familyName.trim(), created_by: userId })
        .select("id")
        .single();

      if (famErr) {
        console.error("Family creation error:", famErr);
      } else {
        familyId = family.id;
      }
    } else if (mode === "join" && inviteCode.trim()) {
      const { data: family } = await supabase
        .from("families")
        .select("id")
        .eq("invite_code", inviteCode.trim())
        .single();

      if (family) {
        familyId = family.id;
      } else {
        setError("Invalid invite code. Please check and try again.");
        setLoading(false);
        return;
      }
    }

    // 3. Create profile
    const { error: profileErr } = await supabase.from("profiles").insert({
      id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      role: mode === "create" ? "ADMIN" : "MEMBER",
      family_id: familyId,
    });

    if (profileErr) {
      console.error("Profile creation error:", profileErr);
      // The profile might already exist via a DB trigger — that's OK
    }

    // If email confirmation is enabled, show success message
    if (authData.user && !authData.session) {
      setSuccess(true);
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const inputClass =
    "w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-11 pr-4 py-3 text-sm text-white/90 placeholder:text-white/20 outline-none focus:border-gold-400/30 focus:bg-white/[0.06] transition-all duration-200";

  if (success) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-400/10 border border-gold-400/20 mx-auto mb-6">
            <Mail size={28} className="text-gold-400" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white/95 mb-2">Check your email</h1>
          <p className="text-sm text-white/40 mb-8">
            We&apos;ve sent a confirmation link to <span className="text-gold-300">{email}</span>.
            Click the link to activate your account.
          </p>
          <Link href="/login" className="text-sm text-gold-400/70 hover:text-gold-300 transition-colors font-medium">
            Back to sign in
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(212,165,116,0.04) 0%, transparent 70%)" }} />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }} className="relative z-10 w-full max-w-md mx-4">

        <div className="flex items-center justify-center gap-3 mb-10">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20">
            <Crown size={24} className="text-gold-400" />
          </div>
          <span className="font-serif text-2xl font-semibold text-white/90 tracking-wide">Legacy</span>
        </div>

        <div className="rounded-3xl p-8" style={{ background: "rgba(17,17,17,0.8)", border: "1px solid rgba(255,255,255,0.06)" }}>
          <h1 className="font-serif text-2xl font-bold text-white/95 mb-1">Create your legacy</h1>
          <p className="text-sm text-white/35 mb-6">Start or join a family platform</p>

          {/* Mode toggle */}
          <div className="flex rounded-xl bg-white/[0.03] p-1 mb-6">
            {(["create", "join"] as const).map((m) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
                  mode === m ? "bg-gold-400/15 text-gold-300" : "text-white/30 hover:text-white/50"
                }`}>
                {m === "create" ? "Create Family" : "Join Family"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSignup} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name" required className={inputClass} />
              </div>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name" required className={inputClass} />
              </div>
            </div>

            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required className={inputClass} />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)" required minLength={6} className={inputClass} />
            </div>

            {mode === "create" ? (
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Family name (e.g., The Montagues)" required className={inputClass} />
              </div>
            ) : (
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Family invite code" required className={inputClass} />
              </div>
            )}

            {error && (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs text-red-400/80 bg-red-400/[0.06] border border-red-400/10 rounded-xl px-4 py-2.5">
                {error}
              </motion.p>
            )}

            <motion.button whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                bg-gradient-to-r from-gold-500 to-gold-400 text-[#0a0a0a] font-semibold text-sm
                hover:opacity-90 transition-opacity disabled:opacity-50">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <><span>{mode === "create" ? "Create Family" : "Join Family"}</span><ArrowRight size={14} /></>}
            </motion.button>
          </form>
        </div>

        <p className="text-center text-sm text-white/25 mt-6">
          Already have an account?{" "}
          <Link href="/login" className="text-gold-400/70 hover:text-gold-300 transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
