"use client";

import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { MOCK_PROFILES } from "@/lib/mock-data";
import { usePreviewTheme } from "../usePreviewTheme";

export default function PreviewAddPage() {
  usePreviewTheme();
  return (
    <div className="app-surface min-h-screen w-full bg-[color:var(--background)] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <AddMemberModal
          existingMembers={MOCK_PROFILES}
          isOpen={true}
          onClose={() => {}}
          onAdd={() => {}}
        />
      </div>
    </div>
  );
}
