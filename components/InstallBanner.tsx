// components/InstallBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Smartphone } from "lucide-react";
import { usePWA } from "@/hooks/usePWA";

const SHOW_DELAY = 3000;
const DISMISSED_KEY = "kamusta-a2hs-dismissed";

export default function InstallBanner() {
  const { canInstall, promptInstall } = usePWA();
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    setMounted(true);

    // Already installed as PWA — never show
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;
    if (isStandalone) return;

    // Already dismissed this session
    if (sessionStorage.getItem(DISMISSED_KEY)) return;

    // Detect platform
    const ua = navigator.userAgent;
    if (/iphone|ipad|ipod/i.test(ua)) {
      setPlatform("ios");
    } else if (/android/i.test(ua)) {
      setPlatform("android");
    }

    const timer = setTimeout(() => setShow(true), SHOW_DELAY);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = () => {
    setShow(false);
    sessionStorage.setItem(DISMISSED_KEY, "1");
  };

  const handleInstall = async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted") setShow(false);
  };

  if (!mounted) return null;

  const transition = {
    duration: 0.55,
    ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
  };

  const positionerStyle: React.CSSProperties = {
    position: "fixed",
    bottom: "calc(1.25rem + env(safe-area-inset-bottom, 0px))",
    left: "1.25rem",
    right: "1.25rem",
    maxWidth: "420px",
    marginLeft: "auto",
    marginRight: "auto",
    zIndex: 99999,
    overflow: "hidden",
    paddingBottom: "8px",
    paddingLeft: "2px",
    paddingRight: "2px",
  };

  const cardStyle: React.CSSProperties = {
    background: "rgba(0,0,0,0.45)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: "4px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.18)",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Space Mono', monospace",
    fontSize: "9px",
    textTransform: "uppercase",
    letterSpacing: "0.2em",
    color: "rgba(255,255,255,0.7)",
    margin: "0 0 2px",
  };

  const headingStyle: React.CSSProperties = {
    fontFamily: "'Crimson Pro', Georgia, serif",
    fontSize: "15px",
    fontStyle: "italic",
    color: "rgba(255,255,255,0.95)",
    margin: 0,
    lineHeight: 1.3,
  };

  const closeBtn: React.CSSProperties = {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    padding: 4,
    color: "rgba(255,255,255,0.7)",
    display: "flex",
    flexShrink: 0,
  };

  const banner = (
    <>
      {/* Scrim */}
      <AnimatePresence>
        {show && (
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              position: "fixed",
              inset: 0,
              background: "linear-gradient(to top, rgba(30,18,8,0.55) 0%, rgba(30,18,8,0.0) 60%)",
              zIndex: 99998,
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Banner */}
      <AnimatePresence>
        {show && (
          <div key="positioner" style={positionerStyle}>
            <motion.div
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "110%" }}
              transition={transition}
            >
              {/* iOS: manual share instructions */}
              {platform === "ios" && (
                <div style={{ ...cardStyle, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <p style={{ ...labelStyle, margin: 0 }}>Add to Home Screen</p>
                    <button onClick={dismiss} style={{ ...closeBtn, padding: 0 }}>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <p style={{ ...headingStyle, margin: "0 0 0.75rem", lineHeight: 1.4 }}>
                    Install Kamusta on your iPhone for a native experience.
                  </p>
                  {[
                    { step: "1", text: "Tap the Share button in Safari's toolbar" },
                    { step: "2", text: 'Scroll and tap "Add to Home Screen"' },
                    { step: "3", text: 'Tap "Add" — done.' },
                  ].map(({ step, text }) => (
                    <div key={step} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 2 }}>
                        {step}.
                      </span>
                      <span style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Android with install prompt */}
              {platform === "android" && canInstall && (
                <div style={{ ...cardStyle, padding: "1rem 1.25rem", display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ width: 36, height: 36, minWidth: 36, borderRadius: "50%", background: "#8b735522", border: "1px solid #8b735533", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Smartphone size={15} strokeWidth={1.5} style={{ color: "#8b7355" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={labelStyle}>Add to Home Screen</p>
                    <p style={headingStyle}>Install Kamusta for a native feel.</p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexShrink: 0 }}>
                    <button onClick={handleInstall} style={{ fontFamily: "'Space Mono', monospace", fontSize: "9px", textTransform: "uppercase", letterSpacing: "0.25em", color: "rgba(255,255,255,0.95)", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.25)", padding: "6px 12px", cursor: "pointer", borderRadius: "2px", whiteSpace: "nowrap" }}>
                      Install
                    </button>
                    <button onClick={dismiss} style={closeBtn}>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
              )}

              {/* Android without prompt / desktop — generic fallback */}
              {(platform !== "ios") && !canInstall && (
                <div style={{ ...cardStyle, padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "0.75rem" }}>
                    <p style={{ ...labelStyle, margin: 0 }}>Add to Home Screen</p>
                    <button onClick={dismiss} style={{ ...closeBtn, padding: 0 }}>
                      <X size={14} strokeWidth={1.5} />
                    </button>
                  </div>
                  <p style={{ ...headingStyle, margin: "0 0 0.75rem", lineHeight: 1.4 }}>
                    Install Kamusta for a native experience.
                  </p>
                  {[
                    { step: "1", text: "Tap the menu (⋮) in your browser" },
                    { step: "2", text: 'Tap "Add to Home Screen" or "Install app"' },
                    { step: "3", text: 'Tap "Add" — done.' },
                  ].map(({ step, text }) => (
                    <div key={step} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: "0.4rem" }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", color: "rgba(255,255,255,0.6)", letterSpacing: "0.1em", flexShrink: 0, paddingTop: 2 }}>
                        {step}.
                      </span>
                      <span style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "14px", color: "rgba(255,255,255,0.8)", lineHeight: 1.4 }}>
                        {text}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );

  return createPortal(banner, document.body);
}