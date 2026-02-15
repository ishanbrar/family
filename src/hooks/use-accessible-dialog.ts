"use client";

import { useEffect, useRef } from "react";

interface UseAccessibleDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
}

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

export function useAccessibleDialog({
  isOpen,
  onClose,
  closeOnEscape = true,
}: UseAccessibleDialogOptions) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    restoreFocusRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    if (!dialog) return;

    const focusables = Array.from(
      dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    ).filter((el) => !el.hasAttribute("disabled"));

    const first = focusables[0];
    if (first) {
      first.focus();
    } else {
      dialog.focus();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && closeOnEscape) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const active = document.activeElement as HTMLElement | null;
      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
      ).filter((el) => !el.hasAttribute("disabled"));
      if (nodes.length === 0) return;

      const currentIndex = active ? nodes.indexOf(active) : -1;
      if (event.shiftKey) {
        if (currentIndex <= 0) {
          event.preventDefault();
          nodes[nodes.length - 1].focus();
        }
        return;
      }

      if (currentIndex === -1 || currentIndex === nodes.length - 1) {
        event.preventDefault();
        nodes[0].focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [isOpen, onClose, closeOnEscape]);

  useEffect(() => {
    if (isOpen) return;
    restoreFocusRef.current?.focus();
    restoreFocusRef.current = null;
  }, [isOpen]);

  return { dialogRef };
}
