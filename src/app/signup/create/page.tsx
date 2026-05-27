import { Suspense } from "react";

import { SignupFlow } from "@/components/auth/SignupFlow";
import { PreAuthBackdrop } from "@/components/marketing/PreAuthBackdrop";
import { LegatreeLoader } from "@/components/ui/LegatreeLoader";

function SignupFallback() {
  return (
    <div className="min-h-screen bg-[color:var(--background)] flex items-center justify-center relative overflow-hidden">
      <PreAuthBackdrop />
      <LegatreeLoader label="Loading create family..." className="relative z-10 min-h-screen" />
    </div>
  );
}

export default function CreateFamilySignupPage() {
  return (
    <Suspense fallback={<SignupFallback />}>
      <SignupFlow mode="create" />
    </Suspense>
  );
}
