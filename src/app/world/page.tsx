"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { LegatreeLoader } from "@/components/ui/LegatreeLoader";
import { WorldPageContent } from "@/components/world/WorldPageContent";
import { useFamilyData } from "@/hooks/use-family-data";

export default function WorldPage() {
  const { members, loading } = useFamilyData();

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />

      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        {loading ? (
          <div className="flex min-h-[50vh] items-center justify-center">
            <LegatreeLoader />
          </div>
        ) : (
          <div className="mx-auto w-full max-w-[1700px]">
            <WorldPageContent members={members} profileBasePath="/profile" />
            <footer className="mt-10 border-t border-white/[0.08] pt-6">
              <SiteFooter />
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
