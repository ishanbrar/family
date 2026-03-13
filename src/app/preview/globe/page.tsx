"use client";

import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { MOCK_PROFILES } from "@/lib/mock-data";

export default function PreviewGlobePage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl aspect-square">
        <InteractiveGlobe members={MOCK_PROFILES} />
      </div>
    </div>
  );
}
