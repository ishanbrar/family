"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type InputHTMLAttributes, type PointerEvent } from "react";

/**
 * Prevents iOS standalone/PWA from auto-focusing an input and opening the keyboard on load.
 * The field only becomes editable after an intentional tap.
 */
export function useKeyboardGuardedInput() {
  const ref = useRef<HTMLInputElement | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const input = ref.current;
    if (!input || armed) return;
    if (document.activeElement === input) {
      input.blur();
    }
  }, [armed]);

  const arm = useCallback(() => {
    setArmed(true);
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent<HTMLInputElement>) => {
      if (armed) return;
      event.preventDefault();
      const input = event.currentTarget;
      input.readOnly = false;
      setArmed(true);
      requestAnimationFrame(() => {
        input.focus({ preventScroll: true });
      });
    },
    [armed]
  );

  const onFocus = useCallback(
    (event: FocusEvent<HTMLInputElement>) => {
      if (armed) return;
      event.currentTarget.blur();
    },
    [armed]
  );

  const guardedProps: Pick<
    InputHTMLAttributes<HTMLInputElement>,
    "readOnly" | "onPointerDown" | "onFocus"
  > = {
    readOnly: !armed,
    onPointerDown,
    onFocus,
  };

  return { ref, guardedProps, armed, arm };
}
