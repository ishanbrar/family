"use client";

// ══════════════════════════════════════════════════════════
// CommandSearch – "Command K" Health Condition Search
// Global command palette for searching / adding conditions.
// ══════════════════════════════════════════════════════════

import { Command } from "cmdk";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Dna,
  HeartPulse,
  Brain,
  Shield,
  AlertCircle,
  Plus,
} from "lucide-react";
import type { MedicalCondition } from "@/lib/types";
import { useFamilyStore } from "@/store/family-store";

interface CommandSearchProps {
  conditions: MedicalCondition[];
  onSelect: (condition: MedicalCondition) => void;
}

const TYPE_ICONS = {
  hereditary: Dna,
  chronic: HeartPulse,
  autoimmune: Shield,
  mental_health: Brain,
  other: AlertCircle,
};

const TYPE_LABELS: Record<string, string> = {
  hereditary: "Hereditary",
  chronic: "Chronic",
  autoimmune: "Autoimmune",
  mental_health: "Mental Health",
  other: "Other",
};

export function CommandSearch({ conditions, onSelect }: CommandSearchProps) {
  const { commandOpen, setCommandOpen } = useFamilyStore();
  const inputRef = useRef<HTMLInputElement>(null);

  // Global Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandOpen(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setCommandOpen]);

  // Auto-focus input when opened
  useEffect(() => {
    if (commandOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [commandOpen]);

  // Group conditions by type
  const grouped = conditions.reduce(
    (acc, cond) => {
      if (!acc[cond.type]) acc[cond.type] = [];
      acc[cond.type].push(cond);
      return acc;
    },
    {} as Record<string, MedicalCondition[]>
  );

  return (
    <AnimatePresence>
      {commandOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setCommandOpen(false)}
            className="fixed inset-0 app-overlay backdrop-blur-sm z-50"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <Command
              label="Search health conditions"
              filter={(value, search) => {
                if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                return 0;
              }}
            >
              <Command.Input
                ref={inputRef}
                placeholder="Search conditions (e.g., Diabetes, Glaucoma, BRCA)..."
              />

              <Command.List>
                <Command.Empty>
                  <div className="flex flex-col items-center gap-2 py-8">
                    <Search size={24} className="text-white/20" />
                    <p className="text-sm text-white/40">No conditions found</p>
                    <p className="text-xs text-white/20">Try a different search term</p>
                  </div>
                </Command.Empty>

                {Object.entries(grouped).map(([type, items]) => {
                  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] || AlertCircle;
                  const label = TYPE_LABELS[type] || type;

                  return (
                    <Command.Group key={type} heading={label}>
                      {items.map((condition) => (
                        <Command.Item
                          key={condition.id}
                          value={condition.name}
                          onSelect={() => {
                            onSelect(condition);
                            setCommandOpen(false);
                          }}
                          className="group"
                        >
                          <Icon size={14} className="text-gold-400/60 shrink-0" />
                          <span className="flex-1 text-white/80">{condition.name}</span>
                          <Plus size={14} className="text-white/20 group-data-[selected=true]:text-gold-400" />
                        </Command.Item>
                      ))}
                    </Command.Group>
                  );
                })}
              </Command.List>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
