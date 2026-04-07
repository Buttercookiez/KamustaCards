// hooks/usePWA.ts
"use client";

import { useEffect, useState, useCallback } from "react";

// ─── Capture the prompt at module level ───────────────────────────────────────
// `beforeinstallprompt` can fire BEFORE React even mounts a component.
// By listening at the top of this module we never miss it.
let _deferredPrompt: BeforeInstallPromptEvent | null = null;

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
  prompt(): Promise<void>;
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();                          // stop the mini-infobar
    _deferredPrompt = e as BeforeInstallPromptEvent;
    // Dispatch a custom event so any mounted hook can react immediately
    window.dispatchEvent(new Event("pwa-prompt-ready"));
  });
}
// ─────────────────────────────────────────────────────────────────────────────

export function usePWA() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Already in standalone mode (installed)?
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(standalone);

    // If the prompt was already captured before this hook mounted, use it now.
    if (_deferredPrompt) setCanInstall(true);

    // Otherwise wait for the custom event we fire above.
    const onReady = () => setCanInstall(true);
    window.addEventListener("pwa-prompt-ready", onReady);

    // Also handle the case where the app gets installed while open.
    const onInstalled = () => {
      setIsInstalled(true);
      setCanInstall(false);
      _deferredPrompt = null;
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("pwa-prompt-ready", onReady);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async (): Promise<"accepted" | "dismissed" | "unavailable"> => {
    if (!_deferredPrompt) return "unavailable";
    await _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    _deferredPrompt = null;
    setCanInstall(false);
    return outcome;
  }, []);

  return { canInstall, isInstalled, promptInstall };
}