"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, Globe, Lock, Palette, Settings, Users, Languages } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";
import { useFamilyData } from "@/hooks/use-family-data";
import {
  resolveAppliedThemeMode,
  resolveAppliedThemePalette,
  resolveInitialPalette,
  resolveInitialTheme,
  setThemeMode,
  setThemePalette,
  type ThemeMode,
  type ThemePalette,
} from "@/lib/theme";

const SETTINGS_STORAGE_KEY = "legacy:settings:v1";

type NotificationSettings = {
  relationship_updates: boolean;
  family_invites: boolean;
  onboarding_reminders: boolean;
};

type PrivacySettings = {
  blur_health_data: boolean;
  show_birth_year: boolean;
  show_city_in_tree: boolean;
};

type RegionSettings = {
  locale: "en-US" | "en-GB" | "en-IN";
  timezone: string;
};

type LocalSettings = {
  notifications: NotificationSettings;
  privacy: PrivacySettings;
  region: RegionSettings;
};

const DEFAULT_SETTINGS: LocalSettings = {
  notifications: {
    relationship_updates: true,
    family_invites: true,
    onboarding_reminders: true,
  },
  privacy: {
    blur_health_data: false,
    show_birth_year: true,
    show_city_in_tree: true,
  },
  region: {
    locale: "en-US",
    timezone: "America/Chicago",
  },
};

const PALETTE_OPTIONS: { id: ThemePalette; label: string; swatch: string }[] = [
  { id: "gold", label: "Gold", swatch: "linear-gradient(135deg, #d4a574, #b8864a)" },
  { id: "blue", label: "Blue", swatch: "linear-gradient(135deg, #60a5fa, #2563eb)" },
  { id: "red", label: "Red", swatch: "linear-gradient(135deg, #f87171, #dc2626)" },
  { id: "yellow", label: "Yellow", swatch: "linear-gradient(135deg, #fde047, #ca8a04)" },
];

function readStoredSettings(): LocalSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<LocalSettings>;
    return {
      notifications: {
        ...DEFAULT_SETTINGS.notifications,
        ...(parsed.notifications || {}),
      },
      privacy: {
        ...DEFAULT_SETTINGS.privacy,
        ...(parsed.privacy || {}),
      },
      region: {
        ...DEFAULT_SETTINGS.region,
        ...(parsed.region || {}),
      },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-2.5">
      <div>
        <p className="text-sm text-white/90">{label}</p>
        <p className="text-xs text-white/45 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        aria-pressed={checked}
        className={`relative w-11 h-6 rounded-full border transition-colors ${
          checked
            ? "bg-gold-400/30 border-gold-400/40"
            : "bg-white/[0.03] border-white/[0.12]"
        }`}
      >
        <span
          className={`absolute top-0.5 w-[18px] h-[18px] rounded-full transition-all ${
            checked ? "left-[22px] bg-gold-300" : "left-0.5 bg-white/60"
          }`}
        />
      </button>
    </div>
  );
}

const RELATION_LANGUAGE_OPTIONS: { value: "en" | "punjabi"; label: string }[] = [
  { value: "en", label: "English" },
  { value: "punjabi", label: "Punjabi" },
];

export default function SettingsPage() {
  const { viewer, family, loading, updateFamilyRelationLanguage } = useFamilyData();
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => {
    if (typeof document !== "undefined") return resolveAppliedThemeMode();
    return resolveInitialTheme();
  });
  const [palette, setPaletteState] = useState<ThemePalette>(() => {
    if (typeof document !== "undefined") return resolveAppliedThemePalette();
    return resolveInitialPalette();
  });
  const [settings, setSettings] = useState<LocalSettings>(() => readStoredSettings());
  const [relationLangSaving, setRelationLangSaving] = useState(false);
  const relationLanguage = (family?.relation_language as "en" | "punjabi") || "en";
  const isFamilyAdmin = !!viewer && viewer.role === "ADMIN" && !!family;

  useEffect(() => {
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const selectedPalette = useMemo(
    () => PALETTE_OPTIONS.find((option) => option.id === palette) || PALETTE_OPTIONS[0],
    [palette]
  );

  const chooseMode = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeModeState(mode);
  };

  const choosePalette = (nextPalette: ThemePalette) => {
    setThemePalette(nextPalette);
    setPaletteState(nextPalette);
  };

  return (
    <div className="min-h-screen bg-[color:var(--background)]">
      <Sidebar />
      <main className="ml-0 md:ml-[72px] lg:ml-[240px] p-4 sm:p-6 lg:p-8 safe-mobile-bottom md:pb-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 border border-white/10">
              <Settings size={22} className="text-white/40" />
            </div>
            <div>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold text-white/95">Settings</h1>
              <p className="text-sm text-white/35 mt-0.5">Customize your workspace and family app behavior</p>
            </div>
          </div>
        </motion.div>

        <div className="max-w-4xl grid grid-cols-1 xl:grid-cols-2 gap-5">
          <GlassCard className="p-5 xl:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                <Palette size={16} className="text-gold-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-white/90">Appearance</h2>
                <p className="text-xs text-white/40">Choose light/dark mode and your global accent theme</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-5">
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-white/35">Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => chooseMode("dark")}
                    className={`min-h-[44px] h-11 sm:h-10 rounded-xl border text-xs transition-colors flex items-center justify-center ${
                      themeMode === "dark"
                        ? "border-gold-400/35 bg-gold-400/15 text-gold-300"
                        : "border-white/[0.12] bg-white/[0.03] text-white/70 hover:text-white/90"
                    }`}
                  >
                    Dark
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseMode("light")}
                    className={`min-h-[44px] h-11 sm:h-10 rounded-xl border text-xs transition-colors flex items-center justify-center ${
                      themeMode === "light"
                        ? "border-gold-400/35 bg-gold-400/15 text-gold-300"
                        : "border-white/[0.12] bg-white/[0.03] text-white/70 hover:text-white/90"
                    }`}
                  >
                    Light
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-white/35">Color Theme</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {PALETTE_OPTIONS.map((option) => {
                    const selected = palette === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => choosePalette(option.id)}
                        className={`rounded-xl border p-2 text-left transition-colors ${
                          selected
                            ? "border-gold-400/35 bg-gold-400/10"
                            : "border-white/[0.12] bg-white/[0.02] hover:border-white/[0.2]"
                        }`}
                      >
                        <span
                          className="block h-7 rounded-lg border border-black/10"
                          style={{ background: option.swatch }}
                        />
                        <span className="mt-1.5 block text-xs text-white/80">{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-white/35">Current selection</p>
                <p className="text-sm text-white/85 mt-0.5">
                  {themeMode === "dark" ? "Dark mode" : "Light mode"} · {selectedPalette.label} theme
                </p>
              </div>
              <span
                className="w-10 h-10 rounded-xl border border-white/10"
                style={{ background: selectedPalette.swatch }}
                aria-hidden
              />
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                <Bell size={16} className="text-gold-300" />
              </div>
              <h2 className="text-sm font-semibold text-white/90">Notifications</h2>
            </div>
            <ToggleRow
              label="Relationship updates"
              description="Alerts when family connections are added or edited"
              checked={settings.notifications.relationship_updates}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, relationship_updates: value },
                }))
              }
            />
            <ToggleRow
              label="Family invites"
              description="Notify when an invite code is used"
              checked={settings.notifications.family_invites}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, family_invites: value },
                }))
              }
            />
            <ToggleRow
              label="Onboarding reminders"
              description="Prompt users to complete guided setup"
              checked={settings.notifications.onboarding_reminders}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  notifications: { ...prev.notifications, onboarding_reminders: value },
                }))
              }
            />
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                <Lock size={16} className="text-gold-300" />
              </div>
              <h2 className="text-sm font-semibold text-white/90">Privacy</h2>
            </div>
            <ToggleRow
              label="Blur health details"
              description="Obscure condition details until clicked"
              checked={settings.privacy.blur_health_data}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, blur_health_data: value },
                }))
              }
            />
            <ToggleRow
              label="Show birth year on cards"
              description="Display year-of-birth in profile snippets"
              checked={settings.privacy.show_birth_year}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, show_birth_year: value },
                }))
              }
            />
            <ToggleRow
              label="Show city in tree overlays"
              description="Include city metadata in tree tooltips"
              checked={settings.privacy.show_city_in_tree}
              onChange={(value) =>
                setSettings((prev) => ({
                  ...prev,
                  privacy: { ...prev.privacy, show_city_in_tree: value },
                }))
              }
            />
          </GlassCard>

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                <Globe size={16} className="text-gold-300" />
              </div>
              <h2 className="text-sm font-semibold text-white/90">Language & Region</h2>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-white/45">Locale</span>
                <select
                  value={settings.region.locale}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      region: { ...prev.region, locale: e.target.value as RegionSettings["locale"] },
                    }))
                  }
                  className="mt-1.5 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30"
                >
                  <option value="en-US">English (US)</option>
                  <option value="en-GB">English (UK)</option>
                  <option value="en-IN">English (India)</option>
                </select>
              </label>

              <label className="block">
                <span className="text-xs text-white/45">Timezone</span>
                <select
                  value={settings.region.timezone}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      region: { ...prev.region, timezone: e.target.value },
                    }))
                  }
                  className="mt-1.5 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30"
                >
                  <option value="America/Los_Angeles">America/Los_Angeles</option>
                  <option value="America/Chicago">America/Chicago</option>
                  <option value="America/New_York">America/New_York</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="Asia/Kolkata">Asia/Kolkata</option>
                </select>
              </label>
            </div>
          </GlassCard>

          {isFamilyAdmin && (
            <GlassCard className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                  <Languages size={16} className="text-gold-300" />
                </div>
                <h2 className="text-sm font-semibold text-white/90">Relation labels language</h2>
              </div>
              <p className="text-xs text-white/45 mb-4">
                Choose the language for relation labels (e.g. Uncle, Aunt) shown in the tree and profiles. More languages can be added later.
              </p>
              <label className="block">
                <span className="text-xs text-white/45">Language</span>
                <select
                  value={relationLanguage}
                  disabled={loading || relationLangSaving}
                  onChange={async (e) => {
                    const next = e.target.value as "en" | "punjabi";
                    setRelationLangSaving(true);
                    await updateFamilyRelationLanguage(next);
                    setRelationLangSaving(false);
                  }}
                  className="mt-1.5 w-full h-10 rounded-xl bg-white/[0.03] border border-white/[0.12] px-3 text-sm text-white/85 outline-none focus:border-gold-400/30 disabled:opacity-60"
                >
                  {RELATION_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
            </GlassCard>
          )}

          <GlassCard className="p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gold-400/10 border border-gold-400/20 flex items-center justify-center">
                <Users size={16} className="text-gold-300" />
              </div>
              <h2 className="text-sm font-semibold text-white/90">Family Management</h2>
            </div>
            <p className="text-xs text-white/45 mb-4">
              Admin-level family actions stay in Dashboard: invite codes, onboarding, and member management.
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center justify-center h-10 px-4 rounded-xl bg-gold-400/15 border border-gold-400/25 text-sm text-gold-300 hover:bg-gold-400/20 transition-colors"
            >
              Go To Dashboard
            </a>
          </GlassCard>
        </div>
      </main>
    </div>
  );
}
