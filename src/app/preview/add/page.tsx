"use client";

import { AddMemberModal } from "@/components/ui/AddMemberModal";
import { MOCK_PROFILES } from "@/lib/mock-data";
import type { Profile, RelationshipType } from "@/lib/types";

export default function PreviewAddPage() {
  return (
    <div className="min-h-screen w-full bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <AddMemberModal
          existingMembers={MOCK_PROFILES}
          isOpen={true}
          onClose={() => {}}
          onAdd={(
            _member: Omit<Profile, "id" | "created_at" | "updated_at">,
            _rel: { relativeId: string; type: RelationshipType; marriageDate?: string | null },
            _avatarFile?: File
          ) => {}}
        />
      </div>
    </div>
  );
}
