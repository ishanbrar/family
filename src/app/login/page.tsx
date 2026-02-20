"use client";

// ══════════════════════════════════════════════════════════
// Login – Sign in with email/password or magic link
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DEV_SUPER_ADMIN_ENABLED, enableDevSuperAdmin } from "@/lib/dev-auth";

interface PendingIntentPayload {
  mode: "create" | "join";
  first_name: string;
  last_name: string;
  gender?: "female" | "male" | null;
  family_name?: string | null;
  invite_code?: string | null;
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntentPayload | null>(null);
  const inviteCodeFromUrl = searchParams.get("code")?.trim().toUpperCase() || "";

  const completeDeferredSetup = async (
    supabase: ReturnType<typeof createClient>,
    userId: string,
    intent: PendingIntentPayload,
    fallbackRedirect: string
  ): Promise<string> => {
    if (intent.mode === "create" && intent.family_name?.trim()) {
      const { data: family, error: famErr } = await supabase
        .from("families")
        .insert({ name: intent.family_name.trim(), created_by: userId })
        .select("id")
        .single();
      if (famErr || !family) throw famErr || new Error("Family creation failed");

      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: userId,
        auth_user_id: userId,
        first_name: intent.first_name || "Family",
        last_name: intent.last_name || "Member",
        gender: intent.gender || null,
        role: "ADMIN",
        family_id: family.id,
      }, { onConflict: "id" });
      if (profileErr) throw profileErr;
      return "/dashboard";
    }

    if (intent.mode === "join") {
      const pendingCode = intent.invite_code?.trim().toUpperCase() || "";
      if (!pendingCode) throw new Error("Missing pending invite code");

      const { error: profileErr } = await supabase.from("profiles").upsert({
        id: userId,
        auth_user_id: userId,
        first_name: intent.first_name || "Family",
        last_name: intent.last_name || "Member",
        gender: intent.gender || null,
        role: "MEMBER",
        family_id: null,
      }, { onConflict: "id" });
      if (profileErr) throw profileErr;
      return `/join?code=${encodeURIComponent(pendingCode)}`;
    }

    return fallbackRedirect;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (
      DEV_SUPER_ADMIN_ENABLED &&
      identifier.trim().toLowerCase() === "admin" &&
      password === "password"
    ) {
      enableDevSuperAdmin();
      router.push("/dashboard");
      router.refresh();
      return;
    }

    const supabase = createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: identifier,
      password,
    });

    if (authError) {
      const msg = authError.message;
      const isRateLimit = /rate\s*limit|too\s*many\s*requests|429/i.test(msg);
      setError(isRateLimit ? "Too many attempts. Please wait an hour and try again." : msg);
      setLoading(false);
      return;
    }

    const redirectPathBase = inviteCodeFromUrl
      ? `/join?code=${encodeURIComponent(inviteCodeFromUrl)}`
      : "/dashboard";
    let redirectPath = redirectPathBase;

    // Complete any deferred family setup from email-confirmation signup flow (server-side intent).
    const { data: consumedIntent, error: consumeErr } = await supabase.rpc("consume_pending_signup_intent", {
      p_auth_user_id: authData.user.id,
    });
    if (consumeErr) {
      setError(`Could not load deferred signup setup: ${consumeErr.message}`);
      setLoading(false);
      return;
    }

    const parsedIntent =
      consumedIntent && typeof consumedIntent === "object"
        ? (consumedIntent as PendingIntentPayload)
        : null;

    if (parsedIntent) {
      try {
        redirectPath = await completeDeferredSetup(
          supabase,
          authData.user.id,
          parsedIntent,
          redirectPathBase
        );
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setPendingIntent(parsedIntent);
        setError(`Deferred signup completion failed: ${message}. Retry below.`);
        setLoading(false);
        return;
      }
    }

    router.push(redirectPath);
    router.refresh();
  };

  const handleRetryDeferred = async () => {
    if (!pendingIntent) return;
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setError("You are no longer signed in. Please log in again.");
      setLoading(false);
      return;
    }
    const redirectPathBase = inviteCodeFromUrl
      ? `/join?code=${encodeURIComponent(inviteCodeFromUrl)}`
      : "/dashboard";
    try {
      const redirectPath = await completeDeferredSetup(
        supabase,
        authData.user.id,
        pendingIntent,
        redirectPathBase
      );
      setPendingIntent(null);
      router.push(redirectPath);
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Retry failed: ${message}`);
      setLoading(false);
    }
  };

  const inputClass =
    "w-full app-input rounded-xl pl-11 pr-4 py-3 text-sm outline-none transition-all duration-200";

  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center relative overflow-hidden">
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
        <div className="rounded-3xl p-8 app-surface">
          <h1 className="font-serif text-2xl font-bold text-white/95 mb-1">Welcome back</h1>
          <p className="text-sm text-white/35 mb-8">Sign in to your family platform</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <input
                type="text" value={identifier} onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or username" required autoFocus className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                placeholder="Password" required className={inputClass}
              />
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-xs text-red-400/80 bg-red-400/[0.06] border border-red-400/10 rounded-xl px-4 py-2.5 space-y-2">
                <p>{error}</p>
                {pendingIntent && (
                  <button
                    type="button"
                    onClick={handleRetryDeferred}
                    className="inline-flex items-center gap-1 rounded-lg bg-red-400/[0.15] px-2.5 py-1 text-[11px] text-red-200 hover:bg-red-400/[0.22] transition-colors"
                  >
                    Retry deferred setup
                  </button>
                )}
              </motion.div>
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
          {DEV_SUPER_ADMIN_ENABLED && (
            <p className="text-center text-[11px] text-white/20 mt-2">
              Dev super admin: <span className="text-white/35">admin / password</span>
            </p>
          )}
      </motion.div>
    </div>
  );
}

function LoginFallback() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center">
      <div className="flex items-center gap-2 text-white/50 text-sm">
        <Loader2 size={16} className="animate-spin text-gold-400" />
        Loading sign in...
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
