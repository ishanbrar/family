"use client";

// ══════════════════════════════════════════════════════════
// Sidebar – Main Navigation with sign-out
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  GitBranch,
  Globe2,
  HeartPulse,
  User,
  Settings,
  LogOut,
  Crown,
  type LucideIcon,
} from "lucide-react";
import { LegatreeTreeIcon } from "@/components/branding/LegatreeTreeIcon";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { disableDevSuperAdmin, isDevSuperAdminClient } from "@/lib/dev-auth";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  heading?: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    heading: "Your Tree",
    items: [
      { label: "Family Tree", href: "/tree", icon: GitBranch },
      { label: "World", href: "/world", icon: Globe2 },
    ],
  },
  {
    items: [
      { label: "Health DNA", href: "/health", icon: HeartPulse },
      { label: "Profile", href: "/profile", icon: User },
      { label: "Settings", href: "/settings", icon: Settings },
      { label: "Super Admin", href: "/super-admin", icon: Crown },
    ],
  },
];

const NAV_ITEMS = NAV_SECTIONS.flatMap((section) => section.items);

const MOBILE_NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tree", href: "/tree", icon: GitBranch },
  { label: "World", href: "/world", icon: Globe2 },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Admin", href: "/super-admin", icon: Crown },
];

export function Sidebar() {
  const pathname = usePathname();

  const isPathActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/profile") return pathname.startsWith("/profile");
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const handleSignOut = async () => {
    if (isDevSuperAdminClient()) {
      disableDevSuperAdmin();
      window.location.href = "/login";
      return;
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/login";
  };

  const activeDesktopIndex = NAV_ITEMS.findIndex((item, idx) => {
    if (!isPathActive(item.href)) return false;
    if (item.href === "/dashboard") return idx === 0;
    return true;
  });

  let navItemIndex = 0;

  return (
    <>
      <motion.aside
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="fixed left-0 top-0 bottom-0 hidden md:flex w-[72px] lg:w-[240px] z-40
          glass border-r border-white/[0.06] flex-col"
        style={{
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-4 lg:px-6 h-16 border-b border-white/[0.06] hover:bg-white/[0.03] transition-colors"
          aria-label="Go to dashboard"
        >
          <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gold-400/10 shrink-0">
            <LegatreeTreeIcon size={32} />
          </div>
          <span className="hidden lg:block font-serif text-xl font-semibold text-white/90 tracking-wide">
            Legatree
          </span>
        </Link>

        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_SECTIONS.map((section) => (
            <div key={section.heading || section.items[0]?.href} className="space-y-1">
              {section.heading && (
                <p className="hidden lg:block px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/22">
                  {section.heading}
                </p>
              )}
              {section.items.map((item) => {
                const Icon = item.icon;
                const idx = navItemIndex++;
                const isActive = idx === activeDesktopIndex;
                return (
                  <Link key={item.label} href={item.href}>
                    <motion.div whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                        isActive ? "bg-gold-400/10 text-gold-300" : "text-white/40 hover:text-white/70 hover:bg-white/[0.03]"
                      )}>
                      <Icon size={18} className="shrink-0" />
                      <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                      {isActive && (
                        <motion.div layoutId="sidebar-indicator"
                          className="hidden lg:block ml-auto w-1.5 h-1.5 rounded-full bg-gold-400"
                          transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                      )}
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          ))}

          <motion.button whileHover={{ x: 2 }} whileTap={{ scale: 0.98 }}
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left text-white/20 hover:text-red-400/60 hover:bg-red-400/[0.03] transition-all duration-200 mt-1">
            <LogOut size={18} className="shrink-0" />
            <span className="hidden lg:block text-sm font-medium">Sign Out</span>
          </motion.button>
        </nav>
      </motion.aside>

      <nav
        className="fixed md:hidden inset-x-0 bottom-0 z-40 app-surface border-t border-white/[0.08]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
        }}
      >
        <div className="grid grid-cols-8 gap-1 px-1.5 py-2">
          {[...MOBILE_NAV_ITEMS, { label: "Sign Out", href: "#", icon: LogOut }].map((item) => {
            const Icon = item.icon;
            const isSignOut = item.label === "Sign Out";
            const isActive = !isSignOut && isPathActive(item.href);
            if (isSignOut) {
              return (
                <button
                  key={item.label}
                  onClick={handleSignOut}
                  className="h-12 min-h-[44px] touch-target-44 rounded-xl flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-red-300/70 hover:text-red-200 hover:bg-red-400/[0.1] active:scale-[0.97] transition-colors"
                  aria-label="Sign out"
                  title="Sign out"
                >
                  <Icon size={15} />
                  <span>Sign Out</span>
                </button>
              );
            }
            return (
              <Link key={item.label} href={item.href} className="touch-target-44 flex">
                <div
                  className={cn(
                    "h-12 min-h-[44px] rounded-xl flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] font-medium transition-colors active:scale-[0.97]",
                    isActive
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
