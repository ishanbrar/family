"use client";

// ══════════════════════════════════════════════════════════
// Signup – Create account and initial profile
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, Mail, Lock, User, Users, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Gender } from "@/lib/types";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const GENDER_OPTIONS: { value: Gender; label: string }[] = [
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
];

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialMode: "create" | "join" =
    searchParams.get("mode") === "join" ? "join" : "create";
  const initialInviteCode = searchParams.get("code")?.trim().toUpperCase() || "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [familyName, setFamilyName] = useState("");
  const [inviteCode, setInviteCode] = useState(initialInviteCode);
  const [mode, setMode] = useState<"create" | "join">(initialMode);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const redirectPathBase = initialInviteCode
    ? `/join?code=${encodeURIComponent(initialInviteCode)}`
    : "/dashboard";

  const handleGoogleSignUp = async () => {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(redirectPathBase)}`;
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false);
      return;
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (!gender) {
      setError("Please select gender.");
      setLoading(false);
      return;
    }
    const selectedGender = gender;

    const supabase = createClient();

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          gender: selectedGender,
        },
      },
    });

    if (authError) {
      const msg = authError.message;
      const isLoadFailed = /load\s*failed|failed\s*to\s*fetch|network\s*error/i.test(msg);
      const isRateLimit = /rate\s*limit|too\s*many\s*requests|429/i.test(msg);
      setError(
        isLoadFailed
          ? "Connection failed. Please check your internet and try again."
          : isRateLimit
            ? "Too many signup emails sent. Please wait an hour or sign in if you already have an account."
            : msg
      );
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Something went wrong. Please try again.");
      setLoading(false);
      return;
    }

    const userId = authData.user.id;

    // With email-confirmation flows there is no session yet, so RLS-protected
    // family/profile writes should happen after first authenticated sign-in.
    if (!authData.session) {
      const { error: pendingErr } = await supabase.rpc("upsert_pending_signup_intent", {
        p_auth_user_id: userId,
        p_mode: mode,
        p_first_name: firstName.trim(),
        p_last_name: lastName.trim(),
        p_gender: selectedGender,
        p_family_name: mode === "create" ? familyName.trim() : null,
        p_invite_code: mode === "join" ? inviteCode.trim().toUpperCase() : null,
      });
      if (pendingErr) {
        setError(
          `Account created, but we could not save your onboarding intent: ${pendingErr.message}. Please sign in and try again.`
        );
        setLoading(false);
        return;
      }
      setSuccess(true);
      setLoading(false);
      return;
    }

    if (mode === "join") {
      const normalizedCode = inviteCode.trim().toUpperCase();
      const { data: resolvedFamilyId, error: joinErr } = await supabase.rpc(
        "lookup_family_by_invite_code",
        { p_invite_code: normalizedCode }
      );
      const matchedFamilyId =
        typeof resolvedFamilyId === "string" && resolvedFamilyId.length > 0
          ? resolvedFamilyId
          : null;

      if (joinErr || !matchedFamilyId) {
        setError("Invalid invite code. Please check and try again.");
        setLoading(false);
        return;
      }

      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: userId,
        auth_user_id: userId,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        gender: selectedGender,
        role: "MEMBER",
        family_id: null,
      }, { onConflict: "id" });

      if (profileErr) {
        console.error("[Signup] Join-flow profile upsert failed:", {
          message: profileErr.message,
          code: (profileErr as { code?: string }).code,
          details: (profileErr as { details?: string }).details,
          full: profileErr,
        });
        const isNetwork = /load\s*failed|failed\s*to\s*fetch|network\s*error/i.test(profileErr.message);
        setError(
          isNetwork
            ? "Connection failed. Please check your internet and try again."
            : `Profile setup failed: ${profileErr.message}`
        );
        setLoading(false);
        return;
      }

      router.push(`/join?code=${encodeURIComponent(normalizedCode)}`);
      router.refresh();
      return;
    }

    // 2. Create family for new family flow
    let familyId: string | null = null;
    if (familyName.trim()) {
      const { data: family, error: famErr } = await supabase
        .from("families")
        .insert({ name: familyName.trim(), created_by: userId })
        .select("id")
        .single();

      if (famErr) {
        const famMessage = famErr.message || "Database policy blocked family creation";
        // DEBUG: log full error so you can see code, message, details in browser console
        console.error("[Signup] Family insert failed:", {
          message: famMessage,
          code: (famErr as { code?: string }).code,
          details: (famErr as { details?: string }).details,
          hint: (famErr as { hint?: string }).hint,
          full: famErr,
        });
        const isNetwork = /load\s*failed|failed\s*to\s*fetch|network\s*error/i.test(famMessage);
        const debugMsg = isNetwork
          ? "Connection failed. Please check your internet and try again."
          : `Could not create family: ${famMessage}. Ensure latest Supabase migrations are applied.`;
        setError(debugMsg);
        setLoading(false);
        return;
      }
      familyId = family.id;
    }

    // 3. Upsert profile fields (trigger may have already created the row)
    const { error: profileErr } = await supabase.from("profiles").upsert({
      id: userId,
      auth_user_id: userId,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      gender: selectedGender,
      role: "ADMIN",
      family_id: familyId,
    }, { onConflict: "id" });

    if (profileErr) {
      console.error("[Signup] Profile upsert failed:", {
        message: profileErr.message,
        code: (profileErr as { code?: string }).code,
        details: (profileErr as { details?: string }).details,
        hint: (profileErr as { hint?: string }).hint,
        full: profileErr,
      });
      const isNetwork = /load\s*failed|failed\s*to\s*fetch|network\s*error/i.test(profileErr.message);
      setError(
        isNetwork
          ? "Connection failed. Please check your internet and try again."
          : `Profile setup failed: ${profileErr.message}`
      );
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const inputClass =
    "w-full app-input rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200";

  if (success) {
    return (
      <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
          className="max-w-md mx-4 text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-gold-400/10 border border-gold-400/20 mx-auto mb-6">
            <Mail size={28} className="text-gold-400" />
          </div>
          <h1 className="font-serif text-2xl font-bold text-white/95 mb-2">Check your email</h1>
          <p className="text-sm text-white/40 mb-8">
            We&apos;ve sent a confirmation link to <span className="text-gold-300">{email}</span>.
            Click the link to activate your account. After your first sign-in,
            we&apos;ll automatically complete your family setup.
          </p>
          <Link href="/login" className="text-sm text-gold-400/70 hover:text-gold-300 transition-colors font-medium">
            Back to sign in
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center relative overflow-hidden">
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

        <div className="rounded-3xl p-8 app-surface">
          <h1 className="font-serif text-2xl font-bold text-white/95 mb-1">Create your legacy</h1>
          <p className="text-sm text-white/35 mb-6">Start or join a family platform</p>

          {mode === "join" && inviteCode && (
            <div className="mb-4 rounded-xl border border-gold-400/15 bg-gold-400/[0.06] px-3 py-2">
              <p className="text-xs text-gold-300/85">
                Invitation detected. Continue signup to join via code <span className="font-mono tracking-wide">{inviteCode}</span>.
              </p>
            </div>
          )}

          <motion.button
            type="button"
            onClick={handleGoogleSignUp}
            disabled={googleLoading || loading}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
            className="w-full flex items-center justify-center gap-3 py-3 rounded-xl
              bg-white text-[#1a1a1a] font-medium text-sm border border-white/20
              hover:bg-white/95 transition-colors disabled:opacity-50 mb-6"
          >
            {googleLoading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <>
                <GoogleIcon />
                <span>Continue with Google</span>
              </>
            )}
          </motion.button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/[0.08]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-3 bg-[var(--surface-bg)] text-white/35">or create account with email</span>
            </div>
          </div>

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
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
                <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  placeholder="First name" required className={inputClass} />
              </div>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
                <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)}
                  placeholder="Last name" required className={inputClass} />
              </div>
            </div>

            <div className="relative">
              <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender | "")}
                required
                className={inputClass}
              >
                <option value="" disabled>Select gender</option>
                {GENDER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address" required className={inputClass} />
            </div>

            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password (min 6 characters)" required minLength={6} className={inputClass} />
            </div>

            {mode === "create" ? (
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
                <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Family name (e.g., The Montagues)" required className={inputClass} />
              </div>
            ) : (
              <div className="relative">
                <Users size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
                <input type="text" value={inviteCode} onChange={(e) => setInviteCode(e.target.value)}
                  placeholder="Family invite code" required autoCapitalize="none" className={inputClass} />
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
          <Link
            href={inviteCode.trim() ? `/login?code=${encodeURIComponent(inviteCode.trim().toUpperCase())}` : "/login"}
            className="text-gold-400/70 hover:text-gold-300 transition-colors font-medium"
          >
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

function SignupFallback() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Loader2 size={16} className="animate-spin text-gold-400" />
        Loading sign up...
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}
