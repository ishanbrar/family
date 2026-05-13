"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";
import {
  resolveAppliedThemeMode,
  THEME_CHANGE_EVENT,
  type ThemeMode,
} from "@/lib/theme";

type VantaCloudsOptions = {
  el: HTMLElement;
  mouseControls?: boolean;
  touchControls?: boolean;
  gyroControls?: boolean;
  minHeight?: number;
  minWidth?: number;
  backgroundColor?: number;
  skyColor?: number;
  cloudColor?: number;
  cloudShadowColor?: number;
  sunColor?: number;
  sunGlareColor?: number;
  sunlightColor?: number;
  speed?: number;
  THREE?: unknown;
};

type VantaCloudsInstance = {
  destroy?: () => void;
};

declare global {
  interface Window {
    THREE?: unknown;
    VANTA?: {
      CLOUDS?: (options: VantaCloudsOptions) => VantaCloudsInstance;
    };
  }
}

const DARK_CLOUDS_OPTIONS: Omit<VantaCloudsOptions, "el" | "THREE"> = {
  mouseControls: false,
  touchControls: false,
  gyroControls: false,
  minHeight: 200,
  minWidth: 200,
  backgroundColor: 0x020304,
  skyColor: 0x0b1016,
  cloudColor: 0x98a0ae,
  cloudShadowColor: 0x172233,
  sunColor: 0xb8864a,
  sunGlareColor: 0xff9c52,
  sunlightColor: 0xffb56b,
  speed: 0.8,
};

const LIGHT_CLOUDS_OPTIONS: Omit<VantaCloudsOptions, "el" | "THREE"> = {
  mouseControls: false,
  touchControls: false,
  gyroControls: false,
  minHeight: 200,
  minWidth: 200,
  backgroundColor: 0xffffff,
  skyColor: 0x68b8d7,
  cloudColor: 0xadc1de,
  cloudShadowColor: 0x577b9d,
  sunColor: 0xff9919,
  sunGlareColor: 0xff6633,
  sunlightColor: 0xff9933,
  speed: 0.8,
};

export function VantaCloudBackdrop() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const effectRef = useRef<VantaCloudsInstance | null>(null);
  const [isVantaReady, setIsVantaReady] = useState(false);
  const [theme, setTheme] = useState<ThemeMode>(() => resolveAppliedThemeMode());

  useEffect(() => {
    const syncTheme = () => setTheme(resolveAppliedThemeMode());
    syncTheme();
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !isVantaReady) return;
    if (!window.VANTA?.CLOUDS || !window.THREE) return;

    effectRef.current?.destroy?.();
    host.innerHTML = "";
    effectRef.current = window.VANTA.CLOUDS({
      el: host,
      THREE: window.THREE,
      ...(theme === "light" ? LIGHT_CLOUDS_OPTIONS : DARK_CLOUDS_OPTIONS),
    });

    return () => {
      effectRef.current?.destroy?.();
      effectRef.current = null;
      host.innerHTML = "";
    };
  }, [isVantaReady, theme]);

  const glowOverlayClass =
    theme === "light"
      ? "absolute inset-0 bg-[radial-gradient(circle_at_58%_44%,rgba(255,214,139,0.22),transparent_18%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.18)_42%,rgba(255,255,255,0.3)_100%)]"
      : "absolute inset-0 bg-[radial-gradient(circle_at_52%_44%,rgba(255,191,115,0.14),transparent_18%),linear-gradient(180deg,rgba(2,3,4,0.16)_0%,rgba(2,3,4,0.28)_38%,rgba(2,3,4,0.48)_100%)]";

  const toneOverlayClass =
    theme === "light"
      ? "absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.1)_36%,rgba(243,248,252,0.2)_100%)]"
      : "absolute inset-0 bg-[linear-gradient(180deg,rgba(5,6,7,0.08)_0%,rgba(5,6,7,0.22)_45%,rgba(5,6,7,0.44)_100%)]";

  return (
    <>
      <Script
        src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js"
        strategy="beforeInteractive"
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.clouds.min.js"
        strategy="afterInteractive"
        onReady={() => setIsVantaReady(true)}
      />
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div ref={hostRef} className="absolute inset-x-0 top-[18%] bottom-[-18%]" />
        <div className={glowOverlayClass} />
        <div className={toneOverlayClass} />
      </div>
    </>
  );
}
