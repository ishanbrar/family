"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartPulse, LayoutDashboard, LogIn, User, GitBranch } from "lucide-react";
import { LegatreeTreeIcon } from "@/components/branding/LegatreeTreeIcon";
import { cn } from "@/lib/cn";

const DEMO_NAV_ITEMS = [
  { label: "Dashboard", href: "/demo", icon: LayoutDashboard },
  { label: "Your Tree", href: "/demo/tree", icon: GitBranch },
  { label: "Health DNA", href: "/demo/health", icon: HeartPulse },
  { label: "Profile", href: "/demo/profile", icon: User },
];

export function DemoSidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === "/demo") return pathname === "/demo";
    if (href === "/demo/profile") {
      return pathname === "/demo/profile" || pathname.startsWith("/demo/profile/");
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <aside
        className="fixed left-0 top-0 bottom-0 hidden md:flex w-[72px] lg:w-[240px] z-40
          glass border-r border-white/[0.06] flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Link
          href="/demo"
          className="flex items-center gap-3 px-4 lg:px-6 h-16 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
          aria-label="Go to demo dashboard"
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold-400/10 shrink-0">
            <LegatreeTreeIcon size={32} />
          </div>
          <span className="hidden lg:block font-serif text-xl font-semibold text-white/90 tracking-wide">
            Legatree Demo
          </span>
        </Link>

        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1 overflow-y-auto">
          {DEMO_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link key={item.label} href={item.href}>
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    active
                      ? "bg-gold-400/10 text-gold-300"
                      : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                  )}
                >
                  <Icon size={18} className="shrink-0" />
                  <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <Link
            href="/login"
            className="flex items-center justify-center gap-2 w-full rounded-xl bg-gold-400/10 px-3 py-2.5 text-sm font-medium text-gold-300 hover:bg-gold-400/15 transition-colors"
          >
            <LogIn size={16} />
            <span className="hidden lg:inline">Sign In</span>
          </Link>
        </div>
      </aside>

      <nav
        className="fixed md:hidden inset-x-0 bottom-0 z-40 app-surface border-t border-white/[0.08]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
        }}
      >
        <div className="grid grid-cols-5 gap-1 px-1.5 py-2">
          {[...DEMO_NAV_ITEMS, { label: "Sign In", href: "/login", icon: LogIn }].map((item) => {
            const Icon = item.icon;
            const active = item.href !== "/login" && isActive(item.href);
            return (
              <Link key={item.label} href={item.href} className="touch-target-44 flex">
                <div
                  className={cn(
                    "h-12 min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors active:scale-[0.97]",
                    active
                      ? "bg-gold-400/12 text-gold-300"
                      : "text-white/45 hover:text-white/75 hover:bg-white/[0.05]"
                  )}
                >
                  <Icon size={15} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
