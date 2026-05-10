"use client";

import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { MOCK_PROFILES } from "@/lib/mock-data";

export default function PreviewAddPage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6">
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
