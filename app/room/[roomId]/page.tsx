"use client";

import { db } from "@/lib/firebase";
import { doc, onSnapshot, updateDoc, collection, getDocs, arrayUnion } from "firebase/firestore";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Moon, Sun, ArrowLeft, ArrowRight, Check, PenTool, Sparkles, Loader2 } from "lucide-react";

// ============================================
// CSS VARIABLES & GLOBAL STYLES (Ultra-Minimal)
// ============================================
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,200;0,300;0,400;0,500;1,200;1,300&family=Space+Mono:wght@400&display=swap');
    
    :root {
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      --text-main: #1a1a1a;
      --text-sub: #8c8c8c;
      --text-accent: #8b7355;
      --border-line: #e0dcd5;
      --border-strong: #a89070;
    }
    
    .dark {
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      --text-main: #f0f0f0;
      --text-sub: #666666;
      --text-accent: #71717a;
      --border-line: #222222;
      --border-strong: #52525b;
    }
    
    * {
      -webkit-tap-highlight-color: transparent !important;
      box-sizing: border-box;
    }

    button:focus, a:focus, textarea:focus {
      outline: none;
    }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.7s ease, color 0.7s ease;
      margin: 0;
    }

    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-crimson { font-family: 'Crimson Pro', Georgia, serif; }
    .font-mono { font-family: 'Space Mono', monospace; }
    
    .grain-overlay::after {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    /* Invisible Input Styling */
    .naked-textarea {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-line);
      border-radius: 0;
      outline: none;
      transition: border-color 0.4s ease, opacity 0.4s ease;
      resize: none;
    }
    .naked-textarea:focus {
      border-bottom-color: var(--text-main);
    }
    .naked-textarea::placeholder {
      color: var(--text-sub);
      opacity: 0.3;
    }

    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-line); border-radius: 4px; }
  `}</style>
);

type RoomData = {
  roomCode: string;
  players: string[] | undefined;
  currentCard: { id: string; text: string } | null;
  answers: Record<string, string> | undefined;
  answersRevealed: boolean;
  readyForNext: string[] | undefined;
  currentDrawer: string;
  status: "waiting" | "playing" | "answering" | "revealed";
  selectedDeck: string;
};

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();

  const[room, setRoom] = useState<RoomData | null>(null);
  const [answer, setAnswer] = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const[hasAnswered, setHasAnswered] = useState(false);
  const [drawError, setDrawError] = useState("");

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const[mounted, setMounted] = useState(false);

  // Theme setup
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
  },[]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  // Get username
  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) setCurrentUser(name);
    else router.push("/dashboard"); // Redirects to dashboard if no username
  }, [router]);

  // Realtime listener
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snapshot) => {
      const data = snapshot.data() as RoomData;
      if (!data) {
        router.push("/dashboard"); // Redirects to dashboard if room is deleted
        return;
      }
      setRoom(data);

      if (data?.status === "answering" && !data?.answers?.[currentUser]) {
        setHasAnswered(false);
        setDrawError("");
      }
    });
    return () => unsub();
  },[roomId, currentUser, router]);

  // Auto join room
  useEffect(() => {
    if (!room || !currentUser) return;
    if (!room.players?.includes(currentUser)) {
      updateDoc(doc(db, "rooms", roomId), {
        players: arrayUnion(currentUser),
      });
    }
  },[room, currentUser, roomId]);

  // Actions
  const drawCard = async () => {
    setDrawError("");
    if (!room?.selectedDeck) {
      setDrawError("No deck found in this room.");
      return;
    }

    try {
      const cardsRef = collection(db, "decks", room.selectedDeck, "cards");
      const snapshot = await getDocs(cardsRef);

      if (snapshot.empty) {
        setDrawError("This deck has no cards.");
        return;
      }

      const cards = snapshot.docs.map((d) => ({
        id: d.id,
        text: d.data().text as string,
        type: d.data().type as string,
      }));

      const random = cards[Math.floor(Math.random() * cards.length)];
      if (!random.text) {
        setDrawError("Card data error.");
        return;
      }

      await updateDoc(doc(db, "rooms", roomId), {
        currentCard: {
          id: random.id,
          text: random.text,
          type: random.type ?? "question",
        },
        answers: {},
        answersRevealed: false,
        readyForNext:[],
        status: "answering",
      });
    } catch (err) {
      setDrawError("Failed to draw a card.");
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;

    await updateDoc(doc(db, "rooms", roomId), {[`answers.${currentUser}`]: answer.trim(),
    });

    setHasAnswered(true);
    setAnswer("");

    const updatedAnswers = { ...(room?.answers || {}), [currentUser]: answer.trim() };
    const allAnswered = room?.players?.every((p) => updatedAnswers[p] !== undefined) === true;

    if (allAnswered) {
      await updateDoc(doc(db, "rooms", roomId), {
        answersRevealed: true,
        status: "revealed",
      });
    }
  };

  const handleContinue = async () => {
    const updatedReady =[...(room?.readyForNext || []), currentUser];
    await updateDoc(doc(db, "rooms", roomId), {
      readyForNext: arrayUnion(currentUser),
    });

    const allReady = room?.players?.every((p) => updatedReady.includes(p)) === true;
    if (allReady) {
      const players = room!.players!;
      const currentIndex = players.indexOf(room!.currentDrawer);
      const nextIndex = (currentIndex + 1) % players.length;
      const nextDrawer = players[nextIndex];

      await updateDoc(doc(db, "rooms", roomId), {
        currentCard: null,
        answers: {},
        answersRevealed: false,
        readyForNext:[],
        status: "playing",
        currentDrawer: nextDrawer,
      });
    }
  };

  if (!mounted || !room) {
    return (
      <div className="min-h-screen grain-overlay flex flex-col gap-4 items-center justify-center font-mono text-[10px] uppercase tracking-widest text-[var(--text-sub)]">
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading Room
      </div>
    );
  }

  const isDrawer = room.currentDrawer === currentUser;
  const iHaveClickedContinue = room.readyForNext?.includes(currentUser) ?? false;
  const waitingForOthers = room.players?.filter((p) => !room.readyForNext?.includes(p)) ??[];

  const phaseVariants = {
    initial: { opacity: 0, y: 15, filter: "blur(4px)" },
    animate: { 
      opacity: 1, 
      y: 0, 
      filter: "blur(0px)", 
      transition: { duration: 0.8, ease:[0.16, 1, 0.3, 1] as [number, number, number, number] } 
    },
    exit: { 
      opacity: 0, 
      y: -15, 
      filter: "blur(4px)", 
      transition: { duration: 0.4 } 
    }
  };

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col px-6">
      <GlobalStyles />

      {/* Invisible Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-[var(--bg-nav)] backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Changed router.push to point to /dashboard */}
          <motion.button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-main)' }}
          >
            <ArrowLeft size={14} strokeWidth={1} />
            <span className="hidden sm:inline pt-[1px]">Leave</span>
          </motion.button>
          
          <div className="flex items-center gap-6">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-50" style={{ color: 'var(--text-main)' }}>
              {room.roomCode}
            </span>
            <button
              onClick={toggleTheme}
              className="opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-main)' }}
            >
              {theme === "light" ? <Moon size={14} strokeWidth={1} /> : <Sun size={14} strokeWidth={1} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Game Area */}
      <main className="flex-1 flex flex-col pt-28 pb-16 max-w-2xl mx-auto w-full relative z-10">
        
        {/* Dynamic Player Status Bar */}
        <div className="mb-12 border-b pb-4 flex flex-wrap gap-4" style={{ borderColor: 'var(--border-line)' }}>
          {room.players?.map((p) => {
            const isCurrentDrawer = p === room.currentDrawer;
            const isMe = p === currentUser;
            return (
              <div key={p} className="flex items-center gap-2">
                <span 
                  className={`font-mono text-[9px] uppercase tracking-widest ${isMe ? 'font-bold' : ''}`}
                  style={{ color: isCurrentDrawer ? 'var(--text-main)' : 'var(--text-sub)' }}
                >
                  {p} {isMe ? "(You)" : ""}
                </span>
                {isCurrentDrawer && <PenTool size={10} style={{ color: 'var(--text-main)' }} />}
              </div>
            );
          })}
        </div>

        {/* Dynamic Phases */}
        <AnimatePresence mode="wait">
          
          {/* PHASE 1: WAITING / DRAWING */}
          {(room.status === "waiting" || room.status === "playing") && (
            <motion.div key="waiting" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col items-center justify-center flex-1 py-10">
              {isDrawer ? (
                <div className="text-center w-full">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-8" style={{ color: 'var(--text-sub)' }}>
                    Your Turn
                  </span>
                  <h2 className="text-4xl sm:text-5xl font-light mb-16" style={{ color: 'var(--text-main)' }}>
                    Draw a new card
                  </h2>
                  <button
                    onClick={drawCard}
                    className="group mx-auto flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] transition-opacity hover:opacity-70"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span>Draw Card</span>
                    <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
                  </button>
                  {drawError && (
                    <p className="mt-8 font-mono text-[9px] uppercase tracking-widest text-red-500/80">
                      {drawError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center w-full flex flex-col items-center">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-8" style={{ color: 'var(--text-sub)' }}>
                    Standby
                  </span>
                  <motion.div 
                    animate={{ opacity:[0.4, 1, 0.4] }} 
                    transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                    className="flex flex-col items-center gap-6 px-4"
                  >
                    <Loader2 className="animate-spin w-8 h-8" strokeWidth={1} style={{ color: 'var(--text-main)' }} />
                    <h2 className="text-2xl sm:text-4xl font-light leading-snug" style={{ color: 'var(--text-main)' }}>
                      <span className="font-medium">{room.currentDrawer}</span> is drawing
                    </h2>
                  </motion.div>
                </div>
              )}
            </motion.div>
          )}

          {/* PHASE 2: ANSWERING */}
          {room.status === "answering" && room.currentCard && (
            <motion.div key="answering" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-1 w-full">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--text-sub)' }}>
                The Prompt
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight mb-16" style={{ color: 'var(--text-main)' }}>
                {room.currentCard.text}
              </h2>

              {!hasAnswered ? (
                <div className="flex flex-col w-full mt-auto mb-8">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--text-sub)' }}>
                    Your Response
                  </span>
                  <textarea
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your truth..."
                    className="naked-textarea w-full pb-4 font-crimson text-2xl sm:text-3xl h-24"
                    style={{ color: 'var(--text-main)' }}
                  />
                  <div className="flex justify-end mt-8">
                    <button
                      onClick={submitAnswer}
                      disabled={!answer.trim()}
                      className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      style={{ color: 'var(--text-main)' }}
                    >
                      <span>Submit</span>
                      <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col mt-auto pb-10">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] mb-6" style={{ color: 'var(--text-sub)' }}>
                    Status
                  </span>
                  <div className="flex flex-col gap-4">
                    {room.players?.map((p) => {
                      const answered = room.answers?.[p] !== undefined;
                      return (
                        <div key={p} className="flex justify-between items-center border-b pb-2" style={{ borderColor: 'var(--border-line)' }}>
                          <span className="font-mono text-[11px] uppercase tracking-widest" style={{ color: answered ? 'var(--text-main)' : 'var(--text-sub)' }}>
                            {p}
                          </span>
                          <span style={{ color: answered ? 'var(--text-main)' : 'var(--text-sub)', opacity: answered ? 1 : 0.5 }}>
                            {answered ? <Check size={14} strokeWidth={1.5} /> : "..."}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* PHASE 3: REVEALED */}
          {room.status === "revealed" && room.currentCard && (
            <motion.div key="revealed" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-1 w-full pb-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--text-sub)' }}>
                The Prompt
              </span>
              <h2 className="text-2xl sm:text-3xl font-light leading-tight mb-12 pb-8 border-b" style={{ color: 'var(--text-main)', borderColor: 'var(--border-line)' }}>
                {room.currentCard.text}
              </h2>

              <div className="flex flex-col gap-10 flex-1">
                {room.players?.map((p, i) => (
                  <motion.div 
                    key={p} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex flex-col gap-3"
                  >
                    <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                      {p}
                    </span>
                    <p className="text-2xl sm:text-3xl font-light leading-relaxed break-words" style={{ color: 'var(--text-main)' }}>
                      {room.answers?.[p]}
                    </p>
                  </motion.div>
                ))}
              </div>

              <div className="mt-16 pt-8 border-t flex flex-col sm:flex-row items-end sm:items-center justify-between gap-6" style={{ borderColor: 'var(--border-line)' }}>
                {!iHaveClickedContinue ? (
                  <button
                    onClick={handleContinue}
                    className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] transition-opacity hover:opacity-70 ml-auto"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span>Next Round</span>
                    <Sparkles size={14} strokeWidth={1} />
                  </button>
                ) : (
                  <div className="flex items-center justify-end gap-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest opacity-60 ml-auto text-right w-full sm:w-auto" style={{ color: 'var(--text-sub)' }}>
                    <Loader2 size={12} className="animate-spin shrink-0" />
                    <span className="leading-snug">Waiting for {waitingForOthers.length} player(s)</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}