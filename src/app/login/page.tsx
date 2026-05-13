"use client";

// ══════════════════════════════════════════════════════════
// Login – Sign in with email/password or magic link
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, Lock, ArrowRight, Loader2 } from "lucide-react";
import { LegacyBrandLink } from "@/components/branding/LegacyBrandLink";
import { PreAuthBackdrop } from "@/components/marketing/PreAuthBackdrop";
import {
  AUTH_TIMEOUT_MS,
  SETUP_CHECK_TIMEOUT_MS,
  friendlyAuthMessage,
  normalizeLoginEmail,
  resolvePostAuthRedirect,
  withTimeout,
  type PendingIntentPayload,
} from "@/lib/login-flow";
import { joinFamilySignupPath } from "@/lib/signup-flow";
import { createClient } from "@/lib/supabase/client";
import { DEV_SUPER_ADMIN_ENABLED, enableDevSuperAdmin } from "@/lib/dev-auth";

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

async function traceLoginStep<T>(label: string, action: () => Promise<T>): Promise<T> {
  const startedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  try {
    return await action();
  } finally {
    if (process.env.NODE_ENV !== "production") {
      const endedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
      console.info(`[Login] ${label} completed in ${Math.round(endedAt - startedAt)}ms`);
    }
  }
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const inviteCodeFromUrl = searchParams.get("code")?.trim().toUpperCase() || "";
  const authErrorFromUrl = searchParams.get("error");
  const [error, setError] = useState<string | null>(() =>
    authErrorFromUrl ? friendlyAuthMessage(authErrorFromUrl.replace(/\+/g, " ")) : null
  );
  const [pendingIntent, setPendingIntent] = useState<PendingIntentPayload | null>(null);

  const redirectPathBase = inviteCodeFromUrl
    ? `/join?code=${encodeURIComponent(inviteCodeFromUrl)}`
    : "/dashboard";

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    setError(null);
    const supabase = createClient();
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(redirectPathBase)}`;
    let oauthError: Error | null = null;
    try {
      const result = await withTimeout(
        supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo },
        }),
        "Google sign-in timed out. Please try again."
      );
      oauthError = result.error;
    } catch (err) {
      oauthError = err instanceof Error ? err : new Error("Google sign-in failed.");
    }
    if (oauthError) {
      setError(friendlyAuthMessage(oauthError.message));
      setGoogleLoading(false);
      return;
    }
    // Redirect is handled by Supabase; keep loading state until navigation
  };

  const completeDeferredSetup = async (
    supabase: ReturnType<typeof createClient>,
    userId: string,
    intent: PendingIntentPayload,
    fallbackRedirect: string,
    authPhoneNumber?: string | null
  ): Promise<string> => {
    const phoneNumber = (intent.phone_number || authPhoneNumber || "").trim();
    const socialLinks = phoneNumber ? { phone_number: phoneNumber } : {};

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
        social_links: socialLinks,
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
        social_links: socialLinks,
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
    let authResult: Awaited<ReturnType<typeof supabase.auth.signInWithPassword>>;
    try {
      authResult = await traceLoginStep("signInWithPassword", () =>
        withTimeout(
          supabase.auth.signInWithPassword({
            email: normalizeLoginEmail(identifier),
            password,
          }),
          "Supabase Auth timed out. Please try again.",
          AUTH_TIMEOUT_MS
        )
      );
    } catch (err) {
      setError(friendlyAuthMessage(err instanceof Error ? err.message : "Connection failed."));
      setLoading(false);
      return;
    }

    const { data: authData, error: authError } = authResult;

    if (authError) {
      setError(friendlyAuthMessage(authError.message));
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Login succeeded, but Supabase did not return a user. Please try again.");
      setLoading(false);
      return;
    }

    let redirectPath = redirectPathBase;

    // Complete any deferred family setup from email-confirmation signup flow (server-side intent).
    const postAuth = await resolvePostAuthRedirect({
      fallbackRedirect: redirectPathBase,
      consumePendingIntent: async () => {
        const { data, error } = await traceLoginStep("consume_pending_signup_intent", () =>
          withTimeout(
            supabase.rpc("consume_pending_signup_intent", {
              p_auth_user_id: authData.user.id,
            }),
            "Setup check timed out.",
            SETUP_CHECK_TIMEOUT_MS
          )
        );
        if (error) throw error;
        return data;
      },
      completeDeferredSetup: (intent) =>
        traceLoginStep("completeDeferredSetup", () =>
          withTimeout(
            completeDeferredSetup(
              supabase,
              authData.user.id,
              intent,
              redirectPathBase,
              typeof authData.user.user_metadata?.phone_number === "string"
                ? authData.user.user_metadata.phone_number
                : null
            ),
            "Family setup timed out. Please try again.",
            AUTH_TIMEOUT_MS
          )
        ),
      onSetupCheckError: (err) => {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[Login] Deferred setup check skipped after successful auth:", err);
        }
      },
    });

    if (postAuth.pendingIntent && postAuth.setupError) {
      setPendingIntent(postAuth.pendingIntent);
      setError(`Login succeeded, but family setup needs attention: ${postAuth.setupError.message}. Retry below.`);
      setLoading(false);
      return;
    }
    redirectPath = postAuth.redirectPath;

    if (typeof window !== "undefined") {
      window.location.assign(redirectPath);
      return;
    }
    router.replace(redirectPath);
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
      const redirectPath = await traceLoginStep("completeDeferredSetup", () =>
        withTimeout(
          completeDeferredSetup(
            supabase,
            authData.user.id,
            pendingIntent,
            redirectPathBase,
            typeof authData.user.user_metadata?.phone_number === "string"
              ? authData.user.user_metadata.phone_number
              : null
          ),
          "Family setup timed out. Please try again.",
          AUTH_TIMEOUT_MS
        )
      );
      setPendingIntent(null);
      if (typeof window !== "undefined") {
        window.location.assign(redirectPath);
        return;
      }
      router.replace(redirectPath);
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
      <PreAuthBackdrop />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 w-full max-w-md mx-4"
      >
        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
          <LegacyBrandLink
            destination="public"
            className="text-white/90"
            iconClassName="w-12 h-12 rounded-2xl bg-gold-400/10 border border-gold-400/20 text-gold-400"
            textClassName="text-2xl text-white/90"
          />
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
          <Link href={joinFamilySignupPath(inviteCodeFromUrl)} className="text-gold-400/70 hover:text-gold-300 transition-colors font-medium">
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
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center relative overflow-hidden">
      <PreAuthBackdrop />
      <div className="relative z-10 flex items-center gap-2 text-white/50 text-sm">
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
