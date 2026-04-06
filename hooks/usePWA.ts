// hooks/usePWA.ts
"use client";

import { useEffect, useState } from "react";

// The browser fires this before showing the native A2HS prompt.
// We intercept it so we can show our own styled prompt first.
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export interface PWAState {
  /** true once the SW is registered and ready */
  isReady: boolean;
  /** true if the app is already installed / running in standalone */
  isInstalled: boolean;
  /** true if we have a deferred install prompt available (Android / desktop Chrome) */
  canInstall: boolean;
  /** Call this to trigger the native A2HS prompt */
  promptInstall: () => Promise<"accepted" | "dismissed" | "unavailable">;
}

export function usePWA(): PWAState {
  const [isReady, setIsReady]       = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // ── Detect standalone mode (already installed) ──────────────────────────
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // iOS Safari
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    // ── Register service worker ─────────────────────────────────────────────
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] registered, scope:", reg.scope);
          setIsReady(true);
        })
        .catch((err) => {
          console.warn("[SW] registration failed:", err);
          setIsReady(false);
        });
    }

    // ── Capture the A2HS prompt ─────────────────────────────────────────────
    const handler = (e: Event) => {
      e.preventDefault(); // stop the browser from auto-showing it
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // ── Track if user installs via the browser UI ───────────────────────────
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const promptInstall = async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!deferredPrompt) return "unavailable";
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    return outcome;
  };

  return {
    isReady,
    isInstalled,
    canInstall: !!deferredPrompt,
    promptInstall,
  };
}