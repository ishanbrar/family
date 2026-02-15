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
  HeartPulse,
  User,
  Settings,
  LogOut,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { createClient } from "@/lib/supabase/client";
import { disableDevSuperAdmin, isDevSuperAdminClient } from "@/lib/dev-auth";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Family Tree", href: "/tree", icon: GitBranch },
  { label: "Health DNA", href: "/health", icon: HeartPulse },
  { label: "Profile", href: "/profile", icon: User },
];

const BOTTOM_ITEMS = [
  { label: "Settings", href: "/settings", icon: Settings },
];

const MOBILE_NAV_ITEMS = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tree", href: "/tree", icon: GitBranch },
  { label: "Health", href: "/health", icon: HeartPulse },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
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
        <div className="flex items-center gap-3 px-4 lg:px-6 h-16 border-b border-white/[0.06]">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gold-400/10">
            <Crown size={18} className="text-gold-400" />
          </div>
          <span className="hidden lg:block font-serif text-lg font-semibold text-white/90 tracking-wide">
            Legacy
          </span>
        </div>

        <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item, idx) => {
            const Icon = item.icon;
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
        </nav>

        <div className="px-2 lg:px-3 py-4 border-t border-white/[0.06] space-y-1">
          {BOTTOM_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.href);
            return (
              <Link key={item.label} href={item.href}>
                <motion.div whileHover={{ x: 2 }}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-gold-400/10 text-gold-300"
                      : "text-white/30 hover:text-white/50 hover:bg-white/[0.03]"
                  )}>
                  <Icon size={18} className="shrink-0" />
                  <span className="hidden lg:block text-sm font-medium">{item.label}</span>
                </motion.div>
              </Link>
            );
          })}

          <motion.button whileHover={{ x: 2 }}
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-white/20 hover:text-red-400/60 hover:bg-red-400/[0.03] transition-all duration-200">
            <LogOut size={18} className="shrink-0" />
            <span className="hidden lg:block text-sm font-medium">Sign Out</span>
          </motion.button>
        </div>
      </motion.aside>

      <nav
        className="fixed md:hidden inset-x-0 bottom-0 z-40 app-surface border-t border-white/[0.08]"
        style={{
          paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)",
          paddingLeft: "max(env(safe-area-inset-left), 0.5rem)",
          paddingRight: "max(env(safe-area-inset-right), 0.5rem)",
        }}
      >
        <div className="grid grid-cols-6 gap-1 px-2 py-2">
          {MOBILE_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = isPathActive(item.href);
            return (
              <Link key={item.label} href={item.href}>
                <div
                  className={cn(
                    "h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors",
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
          <button
            onClick={handleSignOut}
            className="h-12 rounded-xl flex flex-col items-center justify-center gap-1 text-[10px] font-medium text-red-300/70 hover:text-red-200 hover:bg-red-400/[0.1] transition-colors"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>
    </>
  );
}
