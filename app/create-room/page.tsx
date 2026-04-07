"use client";

// ─────────────────────────────────────────────────────────────────────────────
// CHANGES FROM ORIGINAL:
//  1. Import OnboardingTour + useOnboardingTour + createRoomSteps
//  2. Add data-tour="<id>" attributes to key UI elements
//  3. Render <OnboardingTour /> at the bottom of the JSX
// ─────────────────────────────────────────────────────────────────────────────

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Gamepad2,
  Users,
  Heart,
  Home as HomeIcon,
  ArrowRight,
  ArrowLeft,
  Moon,
  Sun,
} from "lucide-react";
import Image from "next/image";
import OnboardingTour from "@/components/onboarding-tour";      // ← NEW
import { useOnboardingTour } from "@/hooks/useOnboardingTour";   // ← NEW
import { createRoomSteps } from "@/lib/tourSteps";               // ← NEW

const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

    :root {
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      --bg-card: transparent;
      --bg-card-hover: rgba(0, 0, 0, 0.02);
      --text-main: #2c2825;
      --text-sub: #6b4423;
      --text-accent: #8b7355;
      --border-subtle: #d4c8b8;
      --border-strong: #a89070;
      --action-bg: #2c2825;
      --action-text: #f5f0e8;
      --action-sub: #a89070;
      --icon-bg: rgba(0, 0, 0, 0.04);
      --shadow-hover: 0 12px 24px -10px rgba(0, 0, 0, 0.1);
      --shadow-primary: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
    }

    .dark {
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      --bg-card: transparent;
      --bg-card-hover: rgba(255, 255, 255, 0.03);
      --text-main: #e4ddd2;
      --text-sub: #a1a1aa;
      --text-accent: #71717a;
      --border-subtle: #27272a;
      --border-strong: #52525b;
      --action-bg: #e4ddd2;
      --action-text: #09090b;
      --action-sub: #71717a;
      --icon-bg: rgba(255, 255, 255, 0.05);
      --shadow-hover: 0 12px 24px -10px rgba(0, 0, 0, 0.6);
      --shadow-primary: 0 8px 20px -8px rgba(255, 255, 255, 0.15);
    }

    * { -webkit-tap-highlight-color: transparent !important; }
    button:focus, a:focus { outline: none; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.5s ease, color 0.5s ease;
    }
    .font-cinzel  { font-family: 'Cinzel', serif; }
    .font-crimson { font-family: 'Crimson Pro', Georgia, serif; }
    .font-mono    { font-family: 'Space Mono', monospace; }
    .grain-overlay::after {
      content: '';
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }
    .hover-card {
      background-color: var(--bg-card);
      border-color: var(--border-subtle);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .hover-card:hover {
      background-color: var(--bg-card-hover);
      border-color: var(--border-strong);
      box-shadow: var(--shadow-hover);
    }
    .mode-selected {
      background-color: var(--action-bg) !important;
      border-color: var(--action-bg) !important;
      box-shadow: var(--shadow-primary) !important;
    }
    .mode-selected .card-title { color: var(--action-text) !important; }
    .mode-selected .card-sub   { color: var(--action-sub)  !important; }
    .mode-selected .card-icon-wrap {
      background: rgba(255,255,255,0.1) !important;
      border-color: transparent !important;
    }
    .mode-selected .card-icon { color: var(--action-text) !important; opacity: 1 !important; }
    .primary-action {
      background-color: var(--action-bg);
      box-shadow: var(--shadow-primary);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
  `}</style>
);

const modes = [
  { id: "solo",   Icon: Gamepad2,  label: "Solo Reflection", subtitle: "Self-care · Journaling · Healing" },
  { id: "friend", Icon: Users,     label: "Friend Mode",     subtitle: "2–8 players · Room code" },
  { id: "couple", Icon: Heart,     label: "Couple Mode",     subtitle: "2 players · Deep talks" },
  { id: "family", Icon: HomeIcon,  label: "Family Mode",     subtitle: "2–10 players · Bonding" },
];

export default function ChooseModePage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [theme, setTheme]       = useState<"light" | "dark">("light");
  const [mounted, setMounted]   = useState(false);

  // ── Onboarding tour ─────────────────────────────────────────────────────
  const tour = useOnboardingTour("create-room");  // ← NEW

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
  }, []);

  const playThemeClick = () => {
    try {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.12);
    } catch (_) {}
  };

  const toggleTheme = () => {
    playThemeClick();
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  if (!mounted) return null;

  const containerVariants = {
    hidden:  { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };
  const itemVariants = {
    hidden:  { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.16, 1, 0.3, 1] as any } },
  };

  return (
    <div
      className="min-h-screen grain-overlay font-crimson transition-colors duration-500"
      style={{ backgroundColor: "var(--bg-base)", color: "var(--text-main)" }}
    >
      <GlobalStyles />

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md h-16 transition-colors duration-500"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div className="relative w-7 h-7 rounded-md overflow-hidden border" style={{ borderColor: "var(--border-subtle)" }}>
              <Image src="/logo.png" alt="Kamusta Logo" fill className="object-cover" />
            </div>
            <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block" style={{ color: "var(--text-main)" }}>
              Kamusta
            </span>
          </motion.div>

          <div className="flex items-center gap-3 sm:gap-4">
            <motion.button
              whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="transition-colors hover:opacity-100"
              style={{ color: "var(--text-sub)" }}
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>

            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-subtle)" }} />

            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors hover:opacity-100 group"
              style={{ color: "var(--text-sub)" }}
            >
              <ArrowLeft size={14} strokeWidth={1.5} className="group-hover:text-[var(--text-main)] group-hover:-translate-x-0.5 transition-all" />
              <span className="hidden sm:inline group-hover:text-[var(--text-main)] transition-colors">Dashboard</span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="pt-32 pb-36 px-4 sm:px-6 max-w-5xl mx-auto relative z-10">

        {/* Header — data-tour added */}
        <motion.div
          data-tour="step-indicator"            
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-12 sm:mb-16"
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] block mb-3" style={{ color: "var(--text-accent)" }}>
            Create Room · Step 1 of 2
          </span>
          <h1 className="text-4xl sm:text-5xl font-crimson font-medium tracking-tight" style={{ color: "var(--text-main)" }}>
            Choose your mode
          </h1>
        </motion.div>

        {/* Mode cards — data-tour added per card */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5"
        >
          {modes.map((mode) => {
            const isSelected = selected === mode.id;
            const { Icon } = mode;

            return (
              <motion.button
                key={mode.id}
                data-tour={`mode-${mode.id}`}  
                variants={itemVariants}
                whileHover={isSelected ? {} : { y: -4, transition: { type: "spring", stiffness: 400, damping: 20 } }}
                whileTap={{ scale: 0.985 }}
                onClick={() => setSelected(mode.id)}
                className={`hover-card border rounded-xl p-6 sm:p-8 text-left w-full select-none flex flex-row items-center justify-between group ${isSelected ? "mode-selected" : ""}`}
              >
                <div className="flex flex-col">
                  <h3 className="card-title font-crimson font-medium text-2xl tracking-wide mb-1 transition-colors" style={{ color: "var(--text-main)" }}>
                    {mode.label}
                  </h3>
                  <p className="card-sub font-mono text-[9px] uppercase tracking-[0.18em] transition-colors" style={{ color: "var(--text-accent)" }}>
                    {mode.subtitle}
                  </p>
                </div>
                <div
                  className="card-icon-wrap w-10 h-10 rounded-full border flex items-center justify-center flex-shrink-0 transition-all duration-400"
                  style={{ borderColor: "var(--border-subtle)", backgroundColor: "var(--icon-bg)" }}
                >
                  <Icon size={18} strokeWidth={1.5} className="card-icon opacity-70 transition-all duration-500 group-hover:scale-110" style={{ color: "var(--text-main)" }} />
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </main>

      {/* ── Sticky bottom CTA — data-tour added ── */}
      <div
        data-tour="continue-cta"               
        className="fixed bottom-0 left-0 right-0 z-40 border-t backdrop-blur-md transition-colors duration-500"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between gap-4">
          <div>
            {selected ? (
              <motion.div key={selected} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] block" style={{ color: "var(--text-accent)" }}>Selected</span>
                <span className="font-crimson font-medium text-lg" style={{ color: "var(--text-main)" }}>
                  {modes.find((m) => m.id === selected)?.label}
                </span>
              </motion.div>
            ) : (
              <span className="font-crimson italic text-base" style={{ color: "var(--text-accent)" }}>No mode selected</span>
            )}
          </div>

          <motion.button
            whileHover={selected ? { scale: 1.02 } : {}}
            whileTap={selected ? { scale: 0.97 } : {}}
            onClick={() => selected && router.push(`/create-room/deck?mode=${selected}`)}
            disabled={!selected}
            className="primary-action flex items-center gap-2 h-10 px-7 rounded-full font-mono text-[10px] uppercase tracking-[0.2em] select-none transition-opacity"
            style={{ color: "var(--action-text)", opacity: selected ? 1 : 0.35, cursor: selected ? "pointer" : "not-allowed" }}
          >
            Choose Deck
            <ArrowRight size={14} strokeWidth={1.5} />
          </motion.button>
        </div>
      </div>

      {/* ── Onboarding Tour ── */}
      <OnboardingTour
        steps={createRoomSteps}
        isOpen={tour.isOpen}
        stepIndex={tour.stepIndex}
        onNext={() => tour.next(createRoomSteps.length)}
        onPrev={tour.prev}
        onSkip={tour.skip}
        onFinish={tour.finish}
      />
    </div>
  );
}