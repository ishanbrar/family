"use client";

// ══════════════════════════════════════════════════════════
// SocialDock – Glassmorphic Social Links Bar
// Minimalist icon buttons in a glass-frosted dock at the
// bottom of a profile card.
// ══════════════════════════════════════════════════════════

import { motion } from "framer-motion";
import {
  Instagram,
  Linkedin,
  Facebook,
  Phone,
} from "lucide-react";
import type { SocialLinks } from "@/lib/types";
import { cn } from "@/lib/cn";

interface SocialDockProps {
  links: SocialLinks;
  className?: string;
}

const SOCIAL_CONFIG = [
  {
    key: "instagram" as const,
    icon: Instagram,
    getUrl: (handle: string) => `https://instagram.com/${handle}`,
    label: "Instagram",
  },
  {
    key: "linkedin" as const,
    icon: Linkedin,
    getUrl: (handle: string) => `https://linkedin.com/in/${handle}`,
    label: "LinkedIn",
  },
  {
    key: "facebook" as const,
    icon: Facebook,
    getUrl: (handle: string) => `https://facebook.com/${handle}`,
    label: "Facebook",
  },
  {
    key: "phone_number" as const,
    icon: Phone,
    getUrl: (number: string) => `tel:${number}`,
    label: "Phone",
  },
];

export function SocialDock({ links, className }: SocialDockProps) {
  const activeLinks = SOCIAL_CONFIG.filter((s) => links[s.key]);

  if (activeLinks.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.6, duration: 0.4 }}
      className={cn(
        "glass inline-flex items-center gap-1 rounded-2xl px-2 py-1.5",
        className
      )}
    >
      {activeLinks.map((social, index) => {
        const Icon = social.icon;
        const value = links[social.key]!;

        return (
          <motion.a
            key={social.key}
            href={social.getUrl(value)}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.7 + index * 0.1 }}
            whileHover={{ scale: 1.15, y: -2 }}
            whileTap={{ scale: 0.95 }}
            className="group relative flex items-center justify-center w-9 h-9 rounded-xl
              hover:bg-white/5 transition-colors duration-200"
            title={social.label}
          >
            <Icon
              size={16}
              className="text-white/40 group-hover:text-gold-300 transition-colors duration-200"
            />

            {/* Tooltip */}
            <span
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-lg
                text-[10px] font-medium text-white/80 app-popover opacity-0 group-hover:opacity-100
                transition-opacity duration-200 pointer-events-none whitespace-nowrap"
            >
              {social.key === "phone_number" ? value : `@${value}`}
            </span>
          </motion.a>
        );
      })}
    </motion.div>
  );
}
