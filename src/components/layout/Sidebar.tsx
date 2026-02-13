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
  { label: "Family Tree", href: "/dashboard", icon: GitBranch },
  { label: "Health DNA", href: "/health", icon: HeartPulse },
  { label: "Profile", href: "/profile", icon: User },
];

const BOTTOM_ITEMS = [
  { label: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

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

  return (
    <motion.aside
      initial={{ x: -80, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed left-0 top-0 bottom-0 w-[72px] lg:w-[240px] z-40
        glass border-r border-white/[0.06] flex flex-col"
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
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
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
          return (
            <Link key={item.label} href={item.href}>
              <motion.div whileHover={{ x: 2 }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-white/30 hover:text-white/50 hover:bg-white/[0.03] transition-all duration-200">
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
  );
}
