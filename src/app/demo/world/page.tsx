"use client";

import { useEffect } from "react";
import { DemoSidebar } from "@/components/demo/DemoSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { WorldPageContent } from "@/components/world/WorldPageContent";
import { MOCK_PROFILES, MOCK_RELATIONSHIPS } from "@/lib/mock-data";
import { useFamilyStore } from "@/store/family-store";

export default function DemoWorldPage() {
  const store = useFamilyStore();

  useEffect(() => {
    store.setViewer(MOCK_PROFILES[0]);
    store.setMembers(MOCK_PROFILES);
    store.setRelationships(MOCK_RELATIONSHIPS);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const members = store.members.length > 0 ? store.members : MOCK_PROFILES;

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <DemoSidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <div className="mx-auto w-full max-w-[1700px]">
          <WorldPageContent members={members} profileBasePath="/demo/profile" />
          <footer className="mt-10 border-t border-white/[0.08] pt-6">
            <SiteFooter />
          </footer>
        </div>
      </main>
    </div>
  );
}
