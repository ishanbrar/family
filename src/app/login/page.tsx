"use client";

// ══════════════════════════════════════════════════════════
// Login – Sign in with email/password or magic link
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Crown, Mail, Lock, ArrowRight, Loader2 } from "lucide-react";

function GoogleIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="currentColor"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="currentColor"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="currentColor"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}
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
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<PendingIntentPayload | null>(null);
  const inviteCodeFromUrl = searchParams.get("code")?.trim().toUpperCase() || "";

  const redirectPathBase = inviteCodeFromUrl
    ? `/join?code=${encodeURIComponent(inviteCodeFromUrl)}`
    : "/dashboard";

  const handleGoogleSignIn = async () => {
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
    // Redirect is handled by Supabase; keep loading state until navigation
  };

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
      const isLoadFailed = /load\s*failed|failed\s*to\s*fetch|network\s*error/i.test(msg);
      const isRateLimit = /rate\s*limit|too\s*many\s*requests|429/i.test(msg);
      setError(
        isLoadFailed
          ? "Connection failed. Please check your internet and try again."
          : isRateLimit
            ? "Too many attempts. Please wait an hour and try again."
            : msg
      );
      setLoading(false);
      return;
    }

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
          <p className="text-sm text-white/35 mb-6">Sign in to your family platform</p>

          <motion.button
            type="button"
            onClick={handleGoogleSignIn}
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
              <span className="px-3 bg-[var(--surface-bg)] text-white/35">or sign in with email</span>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Email or username"
                required
                className={inputClass}
              />
            </div>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 app-input-icon" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
                className={inputClass}
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-red-400/80 bg-red-400/[0.06] border border-red-400/10 rounded-xl px-4 py-2.5 space-y-2"
              >
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
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                bg-gradient-to-r from-gold-500 to-gold-400 text-[#0a0a0a] font-semibold text-sm
                hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={14} />
                </>
              )}
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
