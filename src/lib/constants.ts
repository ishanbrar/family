// ══════════════════════════════════════════════════════════
// Legacy – Design Tokens & Constants
// ══════════════════════════════════════════════════════════

export const COLORS = {
  // Background hierarchy
  bg: {
    primary: "#0a0a0a",
    secondary: "#111111",
    tertiary: "#1a1a1a",
    elevated: "#222222",
  },
  // Gold / Bronze accent palette
  gold: {
    50: "#fdf8f0",
    100: "#f5e6d0",
    200: "#e8c99a",
    300: "#d4a574",
    400: "#c49a6c",
    500: "#b8864a",
    600: "#a0744a",
    700: "#7a5a3a",
    800: "#5a4228",
    900: "#3a2a1a",
  },
  // Text
  text: {
    primary: "#f5f5f5",
    secondary: "#a0a0a0",
    muted: "#666666",
  },
  // Glassmorphism
  glass: {
    bg: "rgba(255, 255, 255, 0.03)",
    border: "rgba(255, 255, 255, 0.08)",
    highlight: "rgba(255, 255, 255, 0.05)",
  },
  // Health severity
  severity: {
    mild: "#4ade80",
    moderate: "#fbbf24",
    severe: "#ef4444",
  },
} as const;

export const FONTS = {
  heading: "'Playfair Display', Georgia, serif",
  body: "'Inter', system-ui, sans-serif",
  mono: "'JetBrains Mono', monospace",
} as const;

export const ANIMATION = {
  spring: { type: "spring" as const, stiffness: 300, damping: 30 },
  springGentle: { type: "spring" as const, stiffness: 200, damping: 25 },
  springBouncy: { type: "spring" as const, stiffness: 400, damping: 20 },
  fadeIn: { initial: { opacity: 0 }, animate: { opacity: 1 }, transition: { duration: 0.5 } },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { type: "spring" as const, stiffness: 300, damping: 30 },
  },
} as const;

export const NAV_ITEMS = [
  { label: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  { label: "Family Tree", href: "/dashboard", icon: "GitBranch" },
  { label: "Health DNA", href: "/health", icon: "HeartPulse" },
  { label: "Profile", href: "/profile", icon: "User" },
] as const;
