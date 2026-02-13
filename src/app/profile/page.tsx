"use client";

// ══════════════════════════════════════════════════════════
// Profile – Redirects to the viewer's own profile page.
// ══════════════════════════════════════════════════════════

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFamilyData } from "@/hooks/use-family-data";

export default function ProfileRedirect() {
  const router = useRouter();
  const { viewer, loading } = useFamilyData();

  useEffect(() => {
    if (!loading && viewer) {
      router.replace(`/profile/${viewer.id}`);
    }
  }, [viewer, loading, router]);

  if (!loading && !viewer) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-white/50 mb-3">You need to sign in to view your profile.</p>
          <a href="/login" className="text-sm text-gold-300 hover:text-gold-200 transition-colors">Go to login</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="w-5 h-5 border border-gold-400/30 border-t-gold-400 rounded-full animate-spin" />
    </div>
  );
}
