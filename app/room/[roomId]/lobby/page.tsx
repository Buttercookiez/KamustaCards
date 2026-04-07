"use client";

import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, arrayUnion } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  Moon, Sun, ArrowLeft, Check, Crown, Play,
  Users, Heart, UserCircle, Home
} from "lucide-react";

const MODE_CONFIG: Record<string, { label: string; icon: React.ElementType; description: string; color: string }> = {
  solo:   { label: "Solo",   icon: UserCircle, description: "Reflect alone. Journal your thoughts.", color: "#8b7355" },
  friend: { label: "Friend", icon: Users,      description: "Take turns. Share & react together.",   color: "#5e8b6e" },
  couple: { label: "Couple", icon: Heart,      description: "Two players. Deep connection.",          color: "#8b5e6e" },
  family: { label: "Family", icon: Home,       description: "Everyone plays. Family-themed prompts.", color: "#5e6e8b" },
};

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

    * { -webkit-tap-highlight-color: transparent !important; box-sizing: border-box; }
    button:focus, a:focus { outline: none; }
    button:focus-visible, a:focus-visible { outline: 2px solid var(--border-strong); outline-offset: 2px; }

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
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
    }

    .primary-action {
      background-color: var(--action-bg);
      box-shadow: var(--shadow-primary);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .primary-action:disabled { opacity: 0.5; cursor: not-allowed; box-shadow: none; }

    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-subtle); border-radius: 4px; }

    .mode-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 12px 4px 8px;
      border-radius: 999px;
      border: 1px solid var(--border-subtle);
      font-family: 'Space Mono', monospace;
      font-size: 9px;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      transition: all 0.3s ease;
    }

    @keyframes spin-slow {
      from { transform: rotate(0deg); }
      to   { transform: rotate(360deg); }
    }
    .spin-slow { animation: spin-slow 1.2s linear infinite; }
  `}</style>
);

// All statuses that mean the game is already running
const IN_GAME = ["playing", "answering", "revealing", "revealed"];

export default function LobbyPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();

  const [room, setRoom]               = useState<any>(null);
  const [currentUser, setCurrentUser] = useState("");
  const [theme, setTheme]             = useState<"light" | "dark">("light");
  const [mounted, setMounted]         = useState(false);
  const [rejoining, setRejoining]     = useState(false);

  // ── Theme ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    } else {
      setTheme("light");
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // ── Current user ───────────────────────────────────────────────────────────
  useEffect(() => {
    const name = localStorage.getItem("username") || "";
    if (!name) { router.push("/"); return; }
    setCurrentUser(name);
  }, [router]);

  // ── Room snapshot ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      const data = snap.data();
      if (!data) { router.push("/dashboard"); return; }
      setRoom(data);

      // ✅ THE FIX: catch ALL in-game statuses, not just "playing"
      // This handles: normal start, AFK return, mid-round reconnect
      if (IN_GAME.includes(data.status)) {
        setRejoining(true);
        router.push(`/room/${roomId}`);
        return;
      }

      // Room ended — go back to dashboard
      if (data.status === "finished") {
        router.push("/dashboard");
      }
    });
    return () => unsub();
  }, [roomId, router]);

  // ── Add player only while waiting ─────────────────────────────────────────
  // Room page handles adding them back mid-game via arrayUnion on its own mount
  useEffect(() => {
    if (!room || !currentUser || !roomId) return;
    if (room.status !== "waiting") return;
    if (!room.players?.includes(currentUser)) {
      updateDoc(doc(db, "rooms", roomId), { players: arrayUnion(currentUser) });
    }
  }, [room, currentUser, roomId]);

  const handleReady = async () => {
    if (!roomId || !currentUser) return;
    await updateDoc(doc(db, "rooms", roomId), { readyPlayers: arrayUnion(currentUser) });
  };

  const startGame = async () => {
    if (!roomId || !room) return;
    await updateDoc(doc(db, "rooms", roomId), {
      status: "playing",
      currentDrawer: room.players[0],
    });
  };

  // ── Rejoining screen ───────────────────────────────────────────────────────
  if (rejoining) {
    return (
      <div
        className="min-h-screen grain-overlay font-crimson flex flex-col items-center justify-center gap-4"
        style={{ backgroundColor: "var(--bg-base)", color: "var(--text-main)" }}
      >
        <GlobalStyles />
        <div
          className="w-6 h-6 rounded-full border-t-2 spin-slow"
          style={{ borderColor: "var(--text-accent)" }}
        />
        <div className="text-center">
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] mb-2" style={{ color: "var(--text-sub)" }}>
            Game in progress
          </p>
          <p className="font-crimson text-2xl" style={{ color: "var(--text-main)" }}>
            Catching you up...
          </p>
        </div>
      </div>
    );
  }

  if (!mounted || !room) return null;

  const mode     = (room.mode as string) || "friend";
  const modeInfo = MODE_CONFIG[mode] ?? MODE_CONFIG.friend;
  const ModeIcon = modeInfo.icon;

  const isSolo       = mode === "solo";
  const isHost       = room.players?.[0] === currentUser;
  const readyPlayers = room.readyPlayers || [];
  const isReady      = readyPlayers.includes(currentUser);
  const allReady     = room.players?.length > 0 && room.players.every((p: string) => readyPlayers.includes(p));

  return (
    <div className="min-h-screen grain-overlay font-crimson transition-colors duration-500 flex flex-col">
      <GlobalStyles />

      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md h-16 transition-colors duration-500"
        style={{ backgroundColor: "var(--bg-nav)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div className="relative w-7 h-7 rounded-md overflow-hidden border" style={{ borderColor: "var(--border-subtle)" }}>
              <Image src="/logo.png" alt="Kamusta Logo" fill sizes="28px" className="object-cover" />
            </div>
            <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block" style={{ color: "var(--text-main)" }}>
              Kamusta
            </span>
          </motion.div>
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              style={{ color: "var(--text-sub)" }}
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>
            <div className="h-3 w-px" style={{ background: "var(--border-subtle)" }} />
            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] group"
              style={{ color: "var(--text-sub)" }}
            >
              <ArrowLeft
                size={14} strokeWidth={1.5}
                className="group-hover:text-[var(--text-main)] group-hover:-translate-x-0.5 transition-all"
              />
              <span className="hidden sm:inline group-hover:text-[var(--text-main)] transition-colors">Leave</span>
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Main */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-4 sm:px-6 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm"
        >
          {/* Header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex justify-center mb-6"
            >
              <div className="mode-badge" style={{ color: modeInfo.color, borderColor: modeInfo.color + "44" }}>
                <ModeIcon size={11} strokeWidth={1.5} />
                <span>{modeInfo.label} Mode</span>
              </div>
            </motion.div>

            <span className="font-mono text-[10px] uppercase tracking-[0.25em] block mb-4" style={{ color: "var(--text-sub)" }}>
              Room Access Code
            </span>
            <h1 className="text-5xl sm:text-6xl font-mono font-light tracking-[0.2em] uppercase" style={{ color: "var(--text-main)" }}>
              {room.roomCode}
            </h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="font-crimson text-base mt-3 italic"
              style={{ color: "var(--text-sub)" }}
            >
              {modeInfo.description}
            </motion.p>
          </div>

          {/* Solo */}
          {isSolo ? (
            <div className="flex flex-col gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={startGame}
                className="primary-action h-14 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 select-none w-full"
                style={{ color: "var(--action-text)" }}
              >
                Begin Session <Play className="w-4 h-4 fill-current" />
              </motion.button>
            </div>
          ) : (
            <>
              {/* Player List */}
              <div className="flex flex-col gap-3 mb-10">
                <div
                  className="font-mono text-[10px] uppercase tracking-[0.2em] flex justify-between items-end border-b-2 pb-3"
                  style={{ color: "var(--text-sub)", borderColor: "var(--border-subtle)" }}
                >
                  <span>Players ({room.players?.length || 0})</span>
                  <span style={{ color: "var(--text-accent)" }}>{readyPlayers.length} Ready</span>
                </div>

                <div className="flex flex-col gap-1 max-h-60 overflow-y-auto minimal-scrollbar pr-2 mt-2">
                  <AnimatePresence>
                    {room.players?.map((p: string, index: number) => {
                      const isPReady = readyPlayers.includes(p);
                      const isPHost  = room.players[0] === p;
                      const isMe     = p === currentUser;
                      return (
                        <motion.div
                          key={p}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                          className="flex items-center justify-between border-b border-dashed pb-3 pt-2"
                          style={{
                            borderColor: isPReady ? "var(--text-main)" : "var(--border-subtle)",
                            opacity: isPReady ? 1 : 0.6,
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-crimson text-xl sm:text-2xl" style={{ color: "var(--text-main)" }}>
                              {p}
                              {isMe && (
                                <span className="font-mono text-[9px] uppercase tracking-widest ml-2 opacity-40">
                                  you
                                </span>
                              )}
                            </span>
                            {isPHost && <Crown size={14} style={{ color: "var(--text-accent)" }} strokeWidth={1.5} className="mt-1" />}
                          </div>
                          <div className="flex items-center">
                            {isPReady ? (
                              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                                <Check className="w-5 h-5" style={{ color: "var(--text-main)" }} strokeWidth={1.5} />
                              </motion.div>
                            ) : (
                              <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-sub)" }}>
                                Waiting
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-4 mt-6">
                {!isReady && (
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleReady}
                    className="primary-action h-14 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 select-none w-full"
                    style={{ color: "var(--action-text)" }}
                  >
                    Mark as Ready <Check className="w-4 h-4" />
                  </motion.button>
                )}

                {isHost && isReady && (
                  <motion.button
                    whileHover={{ scale: allReady ? 1.02 : 1 }}
                    whileTap={{ scale: allReady ? 0.98 : 1 }}
                    onClick={startGame}
                    disabled={!allReady}
                    className="primary-action h-14 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 select-none w-full"
                    style={{ color: "var(--action-text)" }}
                  >
                    {allReady ? "Start Game" : "Awaiting Players"}
                    {allReady && <Play className="w-4 h-4 fill-current" />}
                  </motion.button>
                )}

                <div className="text-center h-6 mt-2 flex items-center justify-center">
                  {isHost && !allReady && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="font-mono text-[9px] uppercase tracking-widest animate-pulse"
                      style={{ color: "var(--text-sub)" }}
                    >
                      Waiting for all players to ready up...
                    </motion.span>
                  )}
                  {!isHost && isReady && (
                    <motion.span
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="font-mono text-[9px] uppercase tracking-widest animate-pulse"
                      style={{ color: "var(--text-sub)" }}
                    >
                      Waiting for host to begin...
                    </motion.span>
                  )}
                </div>
              </div>
            </>
          )}
        </motion.div>
      </main>
    </div>
  );
}