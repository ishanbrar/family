"use client";

import { InteractiveGlobe } from "@/components/globe/InteractiveGlobe";
import { MOCK_PROFILES } from "@/lib/mock-data";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewGlobePage() {
  usePreviewTheme();
  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] flex items-center justify-center p-6">
      <div className="w-full max-w-2xl aspect-square">
        <InteractiveGlobe members={MOCK_PROFILES} />
      </div>
    </div>
  );
}
