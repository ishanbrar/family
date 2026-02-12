"use client";

// ══════════════════════════════════════════════════════════
// GlassCard – Reusable Glassmorphism Container
// ══════════════════════════════════════════════════════════

import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/cn";

interface GlassCardProps extends HTMLMotionProps<"div"> {
  elevated?: boolean;
  glow?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function GlassCard({
  elevated = false,
  glow = false,
  children,
  className,
  ...props
}: GlassCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "rounded-2xl",
        elevated ? "glass-elevated" : "glass-card",
        glow && "glow-gold",
        className
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}
