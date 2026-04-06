// components/InstallBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, X, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

// How long to wait before showing the banner (ms)
const SHOW_DELAY = 3000;
// LocalStorage key so we don't bug the user repeatedly
const DISMISSED_KEY = "kamusta-a2hs-dismissed";

export default function InstallBanner() {
  const { canInstall, isInstalled, promptInstall } = usePWA();
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosVisible, setIosVisible] = useState(false);

  useEffect(() => {
    // Detect iOS (Safari doesn't fire beforeinstallprompt)
    const ios =
      /iphone|ipad|ipod/i.test(navigator.userAgent) &&
      !(navigator as unknown as { standalone?: boolean }).standalone;
    setIsIOS(ios);

    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (dismissed) return;

    const timer = setTimeout(() => {
      if (ios) setIosVisible(true);
    }, SHOW_DELAY);

    return () => clearTimeout(timer);
  }, []);

  // Show Android/Chrome banner when prompt is available
  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    if (canInstall && !dismissed) {
      const timer = setTimeout(() => setVisible(true), SHOW_DELAY);
      return () => clearTimeout(timer);
    }
  }, [canInstall]);

  const dismiss = () => {
    setVisible(false);
    setIosVisible(false);
    localStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") setVisible(false);
  };

  // Already installed — render nothing
  if (isInstalled) return null;

  return (
    <>
      {/* ── Android / Chrome / Desktop banner ── */}
      <AnimatePresence>
        {visible && canInstall && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
            style={{
              position: "fixed",
              bottom: "1.25rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9998,
              width: "calc(100% - 2.5rem)",
              maxWidth: "420px",
            }}
          >
            <div
              style={{
                background: "var(--bg-card, #f5f2ee)",
                border: "1px solid var(--border-strong, #a89070)",
                borderRadius: "2px",
                padding: "1rem 1.25rem",
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              }}
            >
              {/* Icon */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "50%",
                  background: "#8b735522",
                  border: "1px solid #8b735533",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Smartphone size={15} strokeWidth={1.5} style={{ color: "#8b7355" }} />
              </div>

              {/* Text */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "var(--text-sub, #8c8c8c)",
                    margin: "0 0 2px",
                  }}
                >
                  Add to Home Screen
                </p>
                <p
                  style={{
                    fontFamily: "'Crimson Pro', Georgia, serif",
                    fontSize: "15px",
                    fontStyle: "italic",
                    color: "var(--text-main, #1a1a1a)",
                    margin: 0,
                    lineHeight: 1.3,
                  }}
                >
                  Install Kamusta for a native feel.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                <button
                  onClick={handleInstall}
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.25em",
                    color: "var(--text-main, #1a1a1a)",
                    background: "transparent",
                    border: "1px solid var(--border-strong, #a89070)",
                    padding: "6px 12px",
                    cursor: "pointer",
                    borderRadius: "2px",
                  }}
                >
                  Install
                </button>
                <button
                  onClick={dismiss}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 4,
                    color: "var(--text-sub, #8c8c8c)",
                    opacity: 0.5,
                    display: "flex",
                  }}
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── iOS Safari instructions ── */}
      <AnimatePresence>
        {iosVisible && isIOS && (
          <motion.div
            initial={{ opacity: 0, y: 80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 80 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] as [number,number,number,number] }}
            style={{
              position: "fixed",
              bottom: "1.25rem",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9998,
              width: "calc(100% - 2.5rem)",
              maxWidth: "420px",
            }}
          >
            <div
              style={{
                background: "var(--bg-card, #f5f2ee)",
                border: "1px solid var(--border-strong, #a89070)",
                borderRadius: "2px",
                padding: "1rem 1.25rem",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                <p
                  style={{
                    fontFamily: "'Space Mono', monospace",
                    fontSize: "9px",
                    textTransform: "uppercase",
                    letterSpacing: "0.2em",
                    color: "var(--text-sub, #8c8c8c)",
                    margin: 0,
                  }}
                >
                  Add to Home Screen
                </p>
                <button
                  onClick={dismiss}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    color: "var(--text-sub, #8c8c8c)",
                    opacity: 0.5,
                    display: "flex",
                  }}
                >
                  <X size={14} strokeWidth={1.5} />
                </button>
              </div>

              <p
                style={{
                  fontFamily: "'Crimson Pro', Georgia, serif",
                  fontSize: "15px",
                  fontStyle: "italic",
                  color: "var(--text-main, #1a1a1a)",
                  margin: "0 0 0.75rem",
                  lineHeight: 1.4,
                }}
              >
                Install Kamusta on your iPhone for a native experience.
              </p>

              {/* Steps */}
              {[
                { step: "1", text: "Tap the Share button in Safari's toolbar" },
                { step: "2", text: 'Scroll and tap "Add to Home Screen"' },
                { step: "3", text: 'Tap "Add" — done.' },
              ].map(({ step, text }) => (
                <div key={step} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                  <span
                    style={{
                      fontFamily: "'Space Mono', monospace",
                      fontSize: "8px",
                      color: "#8b7355",
                      letterSpacing: "0.1em",
                      flexShrink: 0,
                      paddingTop: 2,
                    }}
                  >
                    {step}.
                  </span>
                  <span
                    style={{
                      fontFamily: "'Crimson Pro', Georgia, serif",
                      fontSize: "14px",
                      color: "var(--text-sub, #8c8c8c)",
                      lineHeight: 1.4,
                    }}
                  >
                    {text}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}