"use client";

import { motion } from "framer-motion";
import { Settings, Bell, Lock, Palette, Globe, Users } from "lucide-react";
import { Sidebar } from "@/components/layout/Sidebar";
import { GlassCard } from "@/components/ui/GlassCard";

const SETTING_SECTIONS = [
  { icon: Users, label: "Family Management", desc: "Invite members, manage roles and permissions" },
  { icon: Lock, label: "Privacy & Security", desc: "Control who can see your health data" },
  { icon: Bell, label: "Notifications", desc: "Configure alerts for family updates" },
  { icon: Palette, label: "Appearance", desc: "Theme preferences and display options" },
  { icon: Globe, label: "Language & Region", desc: "Set your locale and timezone" },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Sidebar />
      <main className="ml-[72px] lg:ml-[240px] p-6 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5">
              <Settings size={22} className="text-white/40" />
            </div>
            <div>
              <h1 className="font-serif text-3xl font-bold text-white/95">Settings</h1>
              <p className="text-sm text-white/35 mt-0.5">Manage your account and preferences</p>
            </div>
          </div>
        </motion.div>

        <div className="max-w-2xl space-y-4">
          {SETTING_SECTIONS.map((section, i) => {
            const Icon = section.icon;
            return (
              <GlassCard key={section.label} className="p-5">
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-4 cursor-pointer group"
                >
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-white/5 group-hover:bg-gold-400/10 transition-colors">
                    <Icon size={18} className="text-white/30 group-hover:text-gold-400 transition-colors" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-white/80 group-hover:text-white/95 transition-colors">
                      {section.label}
                    </h3>
                    <p className="text-xs text-white/30 mt-0.5">{section.desc}</p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 16 16" className="text-white/15 group-hover:text-white/30 transition-colors">
                    <path d="M6 4l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                </motion.div>
              </GlassCard>
            );
          })}
        </div>
      </main>
    </div>
  );
}
