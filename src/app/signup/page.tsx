import { Suspense } from "react";
import { Loader2 } from "lucide-react";

import { SignupFlow } from "@/components/auth/SignupFlow";
import { PreAuthBackdrop } from "@/components/marketing/PreAuthBackdrop";

function SignupFallback() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center relative overflow-hidden">
      <PreAuthBackdrop />
      <div className="relative z-10 flex items-center gap-2 text-white/50 text-sm">
        <Loader2 size={16} className="animate-spin text-gold-400" />
        Loading sign up...
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupFlow mode="join" />
    </Suspense>
  );
}
