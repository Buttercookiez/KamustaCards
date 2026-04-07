"use client";

import { db, auth } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Moon, Sun, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import OnboardingTour from "@/components/onboarding-tour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { joinSteps } from "@/lib/tourSteps";

const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

    :root {
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      --text-main: #2c2825;
      --text-sub: #6b4423;
      --text-accent: #8b7355;
      --border-subtle: #e6dfd5;
      --border-strong: #a89070;
      --action-bg: #2c2825;
      --action-text: #f5f0e8;
      --shadow-primary: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
    }

    .dark {
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      --text-main: #e4ddd2;
      --text-sub: #a1a1aa;
      --text-accent: #71717a;
      --border-subtle: #27272a;
      --border-strong: #52525b;
      --action-bg: #e4ddd2;
      --action-text: #09090b;
      --shadow-primary: 0 8px 20px -8px rgba(255, 255, 255, 0.15);
    }

    * { -webkit-tap-highlight-color: transparent !important; }
    button:focus, a:focus { outline: none; }
    button:focus-visible, a:focus-visible {
      outline: 2px solid var(--border-strong);
      outline-offset: 2px;
    }
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

    .primary-action {
      background-color: var(--action-bg);
      box-shadow: var(--shadow-primary);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .primary-action:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      box-shadow: none;
    }

    .minimal-input { border-radius: 0; }
    .minimal-input:focus, .minimal-input:focus-visible {
      outline: none !important;
      border-bottom-color: var(--text-main) !important;
    }

    .code-input { letter-spacing: 0.35em; text-transform: uppercase; }
    .code-input::placeholder { letter-spacing: 0.2em; opacity: 0.25; }

    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .spin-slow { animation: spin-slow 1.2s linear infinite; }
  `}</style>
);

type RoomStatus = "waiting" | "playing" | "answering" | "revealing" | "revealed" | "finished";

export default function JoinPage() {
  const router = useRouter();
  const tour = useOnboardingTour("join");

  const [authReady, setAuthReady] = useState(false); // true once Firebase auth resolves
  const [name, setName]           = useState("");
  const [code, setCode]           = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [theme, setTheme]         = useState<"light" | "dark">("light");

  // ── Theme — run immediately on mount, no flicker ────────────────────────────
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const isDark = stored === "dark" || (!stored && prefersDark);
    setTheme(isDark ? "dark" : "light");
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // ── Auth guard + prefill name ───────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.push("/");
        return;
      }
      const saved = localStorage.getItem("username");
      setName(saved || u.displayName || "");
      setAuthReady(true); // show the form now
    });
    return () => unsub();
  }, [router]);

  // ── Clear error when inputs change ──────────────────────────────────────────
  useEffect(() => { setError(""); }, [name, code]);

  // ── Join logic ──────────────────────────────────────────────────────────────
  const joinRoom = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) { setError("Please enter your nickname."); return; }
    if (code.trim().length !== 6) { setError("Room code must be 6 characters."); return; }

    setLoading(true);
    setError("");

    try {
      const q = query(
        collection(db, "rooms"),
        where("roomCode", "==", code.trim().toUpperCase())
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setError("Room not found. Double-check the code.");
        setLoading(false);
        return;
      }

      const roomDoc  = snapshot.docs[0];
      const roomData = roomDoc.data();
      const status   = roomData.status as RoomStatus;

      if (status === "finished") {
        setError("This room has already ended.");
        setLoading(false);
        return;
      }

      localStorage.setItem("username", name.trim());
      router.push(`/lobby?id=${roomDoc.id}`);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  };

  const canSubmit = name.trim().length > 0 && code.trim().length === 6 && !loading;

  // ── Loading state — shown while Firebase auth resolves ─────────────────────
  // This replaces the blank screen from "if (!mounted) return null"
  if (!authReady) {
    return (
      <div
        className="min-h-screen flex items-center justify-center grain-overlay"
        style={{ backgroundColor: "var(--bg-base)" }}
      >
        <GlobalStyles />
        <Loader2
          size={24}
          strokeWidth={1.5}
          className="spin-slow"
          style={{ color: "var(--text-accent)" }}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen grain-overlay font-crimson transition-colors duration-500 flex flex-col">
      <GlobalStyles />

      {/* ── Navbar ── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md h-16 transition-colors duration-500"
        style={{ backgroundColor: "var(--bg-nav)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">

          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div
              className="relative w-7 h-7 rounded-md overflow-hidden border"
              style={{ borderColor: "var(--border-subtle)" }}
            >
              <Image src="/logo.png" alt="Kamusta Logo" fill sizes="28px" className="object-cover" />
            </div>
            <span
              className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block"
              style={{ color: "var(--text-main)" }}
            >
              Kamusta
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            {/* Theme toggle */}
            <motion.button
              whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="transition-colors hover:opacity-100"
              style={{ color: "var(--text-sub)" }}
              aria-label="Toggle Dark Mode"
            >
              {theme === "light"
                ? <Moon size={16} strokeWidth={1.5} />
                : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>

            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-subtle)" }} />

            {/* Back to Dashboard */}
            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors hover:opacity-100 group"
              style={{ color: "var(--text-sub)" }}
            >
              <ArrowLeft
                size={14} strokeWidth={1.5}
                className="group-hover:text-[var(--text-main)] group-hover:-translate-x-0.5 transition-all"
              />
              <span className="hidden sm:inline group-hover:text-[var(--text-main)] transition-colors">
                Dashboard
              </span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="text-center mb-16">
            <span
              className="font-mono text-[10px] uppercase tracking-[0.25em] block mb-4"
              style={{ color: "var(--text-sub)" }}
            >
              Enter the Lobby
            </span>
            <h1
              className="text-4xl sm:text-5xl font-crimson font-light tracking-tight"
              style={{ color: "var(--text-main)" }}
            >
              Join Room
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={joinRoom} className="flex flex-col gap-10">

            {/* Error */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-red-500/90 font-mono text-[10px] uppercase tracking-widest text-center"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Nickname */}
            <div className="flex flex-col gap-3 group">
              <label
                className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[var(--text-main)]"
                style={{ color: "var(--text-sub)" }}
              >
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="How should we call you?"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="nickname"
                className="minimal-input w-full bg-transparent border-b-2 pb-3 font-crimson text-2xl sm:text-3xl transition-all duration-500 placeholder:opacity-30"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              />
            </div>

            {/* Room Code */}
            <div className="flex flex-col gap-3 group">
              <div className="flex items-center justify-between">
                <label
                  className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[var(--text-main)]"
                  style={{ color: "var(--text-sub)" }}
                >
                  Room Code
                </label>
                <span
                  className="font-mono text-[9px] tabular-nums transition-colors"
                  style={{ color: code.length === 6 ? "var(--text-main)" : "var(--border-strong)" }}
                >
                  {code.length} / 6
                </span>
              </div>
              <input
                data-tour="room-code-input"
                type="text"
                placeholder="XXXXXX"
                maxLength={6}
                value={code}
                onChange={(e) => {
                  const cleaned = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6);
                  setCode(cleaned);
                }}
                onKeyDown={(e) => {
                  // Block dash, space, and other symbols at the keyboard level
                  if (/[^a-zA-Z0-9]/.test(e.key) && e.key.length === 1) {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  e.preventDefault();
                  const pasted = e.clipboardData
                    .getData("text")
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, "")
                    .slice(0, 6);
                  setCode(pasted);
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="characters"
                spellCheck={false}
                inputMode="text"
                className="code-input minimal-input w-full bg-transparent border-b-2 pb-3 font-mono text-2xl sm:text-3xl transition-all duration-500"
                style={{ borderColor: "var(--border-subtle)", color: "var(--text-main)" }}
              />
            </div>

            {/* Submit */}
            <motion.button
              data-tour="join-btn"
              whileHover={{ scale: canSubmit ? 1.02 : 1 }}
              whileTap={{ scale: canSubmit ? 0.98 : 1 }}
              type="submit"
              disabled={!canSubmit}
              className="mt-6 primary-action h-14 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 select-none w-full"
              style={{ color: "var(--action-text)" }}
            >
              {loading
                ? <><Loader2 size={16} strokeWidth={1.5} className="spin-slow" /> Joining...</>
                : <>Enter <ArrowRight className="w-4 h-4" /></>
              }
            </motion.button>

          </form>
        </motion.div>
      </main>

      <OnboardingTour 
        steps={joinSteps} 
        isOpen={tour.isOpen} 
        stepIndex={tour.stepIndex} 
        onNext={() => tour.next(joinSteps.length)} 
        onPrev={tour.prev} 
        onSkip={tour.skip} 
        onFinish={tour.finish} 
      />
    </div>
  );
}



