"use client";

import { db } from "@/lib/firebase";
import {
  doc, onSnapshot, updateDoc, collection, getDocs,
  arrayUnion, addDoc, query, orderBy, serverTimestamp,
  writeBatch
} from "firebase/firestore";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import KamustaCard from "@/components/Card/KamustaCard";
import {
  Moon, Sun, ArrowLeft, ArrowRight, Check, PenTool, Sparkles,
  Loader2, Heart, HelpCircle, Target, Key, Coffee, Compass, Send
} from "lucide-react";

const CARD_ICONS = {
  question: HelpCircle,
  appreciation: Heart,
  mission: Target,
  secret: Key,
  comfort: Coffee,
  future: Compass,
};

const REACTIONS = [
  { emoji: "❤️",  label: "love"     },
  { emoji: "😮",  label: "wow"      },
  { emoji: "😢",  label: "sad"      },
  { emoji: "😂",  label: "haha"     },
  { emoji: "👍",  label: "like"     },
  { emoji: "🙏",  label: "grateful" },
];

const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Pro:ital,wght@0,200;0,300;0,400;0,500;1,200;1,300&family=Space+Mono:wght@400&display=swap');

    :root {
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      --text-main: #1a1a1a;
      --text-sub: #8c8c8c;
      --text-accent: #8b7355;
      --border-line: #e0dcd5;
      --border-strong: #a89070;
      --bg-chat: rgba(240, 237, 232, 0.5);
      --bg-chat-mine: rgba(26, 26, 26, 0.06);
      --bg-reaction: rgba(240, 237, 232, 0.7);
      --bg-reaction-active: rgba(26, 26, 26, 0.08);
    }

    .dark {
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      --text-main: #f0f0f0;
      --text-sub: #666666;
      --text-accent: #71717a;
      --border-line: #222222;
      --border-strong: #52525b;
      --bg-chat: rgba(255,255,255,0.03);
      --bg-chat-mine: rgba(255,255,255,0.07);
      --bg-reaction: rgba(255,255,255,0.05);
      --bg-reaction-active: rgba(255,255,255,0.1);
    }

    * { -webkit-tap-highlight-color: transparent !important; box-sizing: border-box; }
    button:focus, a:focus, textarea:focus, input:focus { outline: none; }

    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.7s ease, color 0.7s ease;
      margin: 0;
    }

    .font-cinzel  { font-family: 'Cinzel Decorative', serif; }
    .font-crimson { font-family: 'Crimson Pro', Georgia, serif; }
    .font-mono    { font-family: 'Space Mono', monospace; }

    .grain-overlay::after {
      content: '';
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none;
      z-index: 9999;
      opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }

    .naked-textarea {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-line);
      border-radius: 0;
      outline: none;
      transition: border-color 0.4s ease;
      resize: none;
    }
    .naked-textarea:focus { border-bottom-color: var(--text-main); }
    .naked-textarea::placeholder { color: var(--text-sub); opacity: 0.3; }

    .naked-input {
      background: transparent;
      border: none;
      outline: none;
      width: 100%;
    }
    .naked-input::placeholder { color: var(--text-sub); opacity: 0.3; }

    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-line); border-radius: 4px; }

    .reaction-popup {
      position: absolute;
      bottom: calc(100% + 8px);
      left: 0;
      display: flex;
      gap: 4px;
      background: var(--bg-nav);
      border: 1px solid var(--border-line);
      border-radius: 999px;
      padding: 6px 10px;
      z-index: 100;
      white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      animation: popupIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    @keyframes popupIn {
      from { opacity: 0; transform: scale(0.8) translateY(4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .reaction-popup button {
      font-size: 20px;
      line-height: 1;
      background: none;
      border: none;
      cursor: pointer;
      padding: 2px 3px;
      border-radius: 50%;
      transition: transform 0.15s ease;
    }
    .reaction-popup button:hover { transform: scale(1.35); }

    .chat-msg-enter {
      animation: msgIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards;
    }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `}</style>
);

type RoomData = {
  roomCode: string;
  players: string[] | undefined;
  currentCard: { id: string; text: string; type?: string } | null;
  answers: Record<string, string> | undefined;
  answersRevealed: boolean;
  readyForNext: string[] | undefined;
  currentDrawer: string;
  status: "waiting" | "playing" | "revealing" | "answering" | "revealed";
  selectedDeck: string;
  reactions?: Record<string, Record<string, Record<string, string[]>>>;
};

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  timestamp: number;
};

async function loadAudioBuffer(url: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    const arrayBuffer = await res.arrayBuffer();
    return await ctx.decodeAudioData(arrayBuffer);
  } catch {
    return null;
  }
}

export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();

  const [room, setRoom]               = useState<RoomData | null>(null);
  const [answer, setAnswer]           = useState("");
  const [currentUser, setCurrentUser] = useState("");
  const [hasAnswered, setHasAnswered] = useState(false);
  const [drawError, setDrawError]     = useState("");
  const [theme, setTheme]             = useState<"light" | "dark">("light");
  const [mounted, setMounted]         = useState(false);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [openReactionFor, setOpenReactionFor] = useState<string | null>(null);

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const drawBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    loadAudioBuffer("/sounds/drawcard.mp3", ctx).then((buf) => {
      drawBufferRef.current = buf;
    });
  }, []);

  const playDrawSound = useCallback(() => {
    const ctx = audioCtxRef.current;
    const buf = drawBufferRef.current;
    if (!ctx || !buf) return;
    const resume = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    resume.then(() => {
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(ctx.destination);
      src.start(0);
    });
  }, []);

  // Theme
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

  // Username
  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) setCurrentUser(name);
    else router.push("/dashboard");
  }, [router]);

  // Room listener
  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), (snap) => {
      const data = snap.data() as RoomData;
      if (!data) { router.push("/dashboard"); return; }
      setRoom(data);
      if (data?.status === "answering" && !data?.answers?.[currentUser]) {
        setHasAnswered(false);
        setDrawError("");
      }
    });
    return () => unsub();
  }, [roomId, currentUser, router]);

  // Chat listener
  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "chat"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map((d) => ({
        id: d.id,
        user: d.data().user,
        text: d.data().text,
        timestamp: d.data().timestamp?.toMillis?.() ?? 0,
      })));
    });
    return () => unsub();
  }, [roomId]);

  // Auto-scroll chat
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // After card flips (3s), drawer advances everyone to answering
  useEffect(() => {
    if (room?.status === "revealing" && room.currentDrawer === currentUser) {
      const t = setTimeout(async () => {
        await updateDoc(doc(db, "rooms", roomId), { status: "answering" });
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [room?.status, room?.currentDrawer, currentUser, roomId]);

  // Auto join
  useEffect(() => {
    if (!room || !currentUser) return;
    if (!room.players?.includes(currentUser)) {
      updateDoc(doc(db, "rooms", roomId), { players: arrayUnion(currentUser) });
    }
  }, [room, currentUser, roomId]);

  // Close reaction popup on outside click
  useEffect(() => {
    if (!openReactionFor) return;
    const handler = () => setOpenReactionFor(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [openReactionFor]);

  const handleDrawCard = async () => {
    if (room?.status === "revealing") return;
    setDrawError("");
    if (!room?.selectedDeck) { setDrawError("No deck found in this room."); return; }
    try {
      const snap = await getDocs(collection(db, "decks", room.selectedDeck, "cards"));
      if (snap.empty) { setDrawError("This deck has no cards."); return; }
      const cards = snap.docs.map((d) => ({
        id: d.id, text: d.data().text as string, type: d.data().type as string,
      }));
      const random = cards[Math.floor(Math.random() * cards.length)];
      if (!random.text) { setDrawError("Card data error."); return; }

      playDrawSound();

      await updateDoc(doc(db, "rooms", roomId), {
        currentCard: { id: random.id, text: random.text, type: random.type ?? "question" },
        answers: {}, answersRevealed: false, readyForNext: [], reactions: {},
        status: "revealing",
      });
    } catch { setDrawError("Failed to draw a card."); }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    await updateDoc(doc(db, "rooms", roomId), { [`answers.${currentUser}`]: answer.trim() });
    setHasAnswered(true);
    setAnswer("");
    const updatedAnswers = { ...(room?.answers || {}), [currentUser]: answer.trim() };
    const allAnswered = room?.players?.every((p) => updatedAnswers[p] !== undefined);
    if (allAnswered) {
      await updateDoc(doc(db, "rooms", roomId), { answersRevealed: true, status: "revealed" });
    }
  };

  const clearChat = async () => {
    const chatRef = collection(db, "rooms", roomId, "chat");
    const chatSnap = await getDocs(chatRef);
    if (!chatSnap.empty) {
      const batch = writeBatch(db);
      chatSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }
  };

  const handleContinue = async () => {
    const updatedReady = [...(room?.readyForNext || []), currentUser];
    await updateDoc(doc(db, "rooms", roomId), { readyForNext: arrayUnion(currentUser) });

    const allReady = room?.players?.every((p) => updatedReady.includes(p));
    if (allReady) {
      const players = room!.players!;
      const nextDrawer = players[(players.indexOf(room!.currentDrawer) + 1) % players.length];

      await clearChat();

      await updateDoc(doc(db, "rooms", roomId), {
        currentCard: null, answers: {}, answersRevealed: false,
        readyForNext: [], reactions: {}, status: "playing",
        currentDrawer: nextDrawer,
      });
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentUser) return;
    const text = chatInput.trim();
    setChatInput("");
    try {
      await addDoc(collection(db, "rooms", roomId, "chat"), {
        user: currentUser, text, timestamp: serverTimestamp(),
      });
    } catch {}
  };

  const toggleReaction = async (targetUser: string, emoji: string) => {
    if (!room?.currentCard) return;
    const cardId = room.currentCard.id;
    const existing: string[] = (room.reactions?.[cardId]?.[targetUser] as any)?.[emoji] ?? [];
    const iReacted = existing.includes(currentUser);
    await updateDoc(doc(db, "rooms", roomId), {
      [`reactions.${cardId}.${targetUser}.${emoji}`]: iReacted
        ? existing.filter((u) => u !== currentUser)
        : arrayUnion(currentUser),
    });
    setOpenReactionFor(null);
  };

  const getAnswerReactions = (targetUser: string): Record<string, string[]> => {
    if (!room?.currentCard || !room.reactions) return {};
    return (room.reactions[room.currentCard.id]?.[targetUser] as any) ?? {};
  };

  if (!mounted || !room) {
    return (
      <div className="min-h-screen grain-overlay flex flex-col gap-4 items-center justify-center font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading Room
      </div>
    );
  }

  const isDrawer       = room.currentDrawer === currentUser;
  const isRevealing    = room.status === "revealing";
  const showDrawScreen = ["waiting", "playing", "revealing"].includes(room.status);
  const iHaveClickedContinue = room.readyForNext?.includes(currentUser) ?? false;
  const waitingForOthers = room.players?.filter((p) => !room.readyForNext?.includes(p)) ?? [];

  const phaseVariants = {
    initial: { opacity: 0, y: 15, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] } },
    exit:    { opacity: 0, y: -15, filter: "blur(4px)", transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col px-6">
      <GlobalStyles />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 backdrop-blur-md" style={{ background: 'var(--bg-nav)' }}>
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
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
            <button onClick={toggleTheme} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: 'var(--text-main)' }}>
              {theme === "light" ? <Moon size={14} strokeWidth={1} /> : <Sun size={14} strokeWidth={1} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Game Area */}
      <main className="flex-1 flex flex-col pt-28 pb-16 max-w-2xl mx-auto w-full relative z-10">

        {/* Player Bar */}
        <div className="mb-12 border-b pb-4 flex flex-wrap gap-4" style={{ borderColor: 'var(--border-line)' }}>
          {room.players?.map((p) => (
            <div key={p} className="flex items-center gap-2">
              <span
                className={`font-mono text-[9px] uppercase tracking-widest ${p === currentUser ? 'font-bold' : ''}`}
                style={{ color: p === room.currentDrawer ? 'var(--text-main)' : 'var(--text-sub)' }}
              >
                {p} {p === currentUser ? "(You)" : ""}
              </span>
              {p === room.currentDrawer && <PenTool size={10} style={{ color: 'var(--text-main)' }} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {/* PHASE 1: DRAW */}
          {showDrawScreen && (
            <motion.div key="draw-screen" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col items-center justify-center flex-1 py-10 w-full">
              <div className="text-center w-full flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-2" style={{ color: 'var(--text-sub)' }}>
                  {isRevealing ? "Revealing Prompt..." : isDrawer ? "Your Turn" : "Standby"}
                </span>
                <motion.div
                  className="my-10"
                  animate={!isRevealing && !isDrawer ? { y: [0, -5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                >
                  <KamustaCard
                    isFlipped={isRevealing}
                    isDrawer={isDrawer}
                    status={room.status}
                    onClick={handleDrawCard}
                    title={room.currentCard
                      ? ((room.currentCard.type || "question").charAt(0).toUpperCase() + (room.currentCard.type || "question").slice(1))
                      : "Mystery Prompt"}
                    text={room.currentCard?.text ?? "..."}
                    type={room.currentCard?.type ?? "Draw"}
                    icon={room.currentCard
                      ? (CARD_ICONS[(room.currentCard.type || "question") as keyof typeof CARD_ICONS] || HelpCircle)
                      : Sparkles}
                  />
                </motion.div>
                {!isRevealing && !isDrawer && (
                  <div className="flex flex-col items-center gap-4 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-sub)' }} strokeWidth={1.5} />
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                      Waiting for <span style={{ color: 'var(--text-main)', fontWeight: 600 }}>{room.currentDrawer}</span>
                    </p>
                  </div>
                )}
                {drawError && isDrawer && (
                  <p className="font-mono text-[9px] uppercase tracking-widest text-red-500/80 mt-4">{drawError}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* PHASE 2: ANSWERING */}
          {room.status === "answering" && room.currentCard && (
            <motion.div key="answering" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col flex-1 w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                  The Prompt
                </span>
                <span className="font-mono text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded-full"
                  style={{ borderColor: 'var(--border-line)', color: 'var(--text-sub)' }}>
                  {room.currentCard.type}
                </span>
              </div>
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
                          <span className="font-mono text-[11px] uppercase tracking-widest"
                            style={{ color: answered ? 'var(--text-main)' : 'var(--text-sub)' }}>{p}</span>
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
            <motion.div key="revealed" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col flex-1 w-full pb-10">

              <span className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: 'var(--text-sub)' }}>
                The Prompt
              </span>
              <h2 className="text-2xl sm:text-3xl font-light leading-tight mb-12 pb-8 border-b"
                style={{ color: 'var(--text-main)', borderColor: 'var(--border-line)' }}>
                {room.currentCard.text}
              </h2>

              <div className="flex flex-col gap-10 flex-1">
                {room.players?.map((p, i) => {
                  const answerReactions = getAnswerReactions(p);
                  const activeReactions = REACTIONS.filter(({ emoji }) => (answerReactions[emoji]?.length ?? 0) > 0);
                  const myReaction = REACTIONS.find(({ emoji }) => answerReactions[emoji]?.includes(currentUser));

                  return (
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

                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {activeReactions.map(({ emoji }) => {
                          const reactors = answerReactions[emoji] ?? [];
                          const iReacted = reactors.includes(currentUser);
                          return (
                            <button
                              key={emoji}
                              onClick={() => toggleReaction(p, emoji)}
                              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all"
                              style={{
                                borderColor: iReacted ? 'var(--border-strong)' : 'var(--border-line)',
                                background: iReacted ? 'var(--bg-reaction-active)' : 'var(--bg-reaction)',
                                fontSize: "15px",
                                lineHeight: 1.6,
                              }}
                            >
                              <span>{emoji}</span>
                              <span className="font-mono text-[9px]" style={{ color: 'var(--text-sub)' }}>
                                {reactors.length}
                              </span>
                            </button>
                          );
                        })}

                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setOpenReactionFor(openReactionFor === p ? null : p)}
                            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all"
                            style={{
                              borderColor: 'var(--border-line)',
                              background: 'transparent',
                              opacity: 0.5,
                              fontSize: "13px",
                              color: 'var(--text-sub)',
                            }}
                          >
                            {myReaction
                              ? <span style={{ fontSize: "15px" }}>{myReaction.emoji}</span>
                              : <span>+</span>
                            }
                            <span className="font-mono uppercase tracking-widest" style={{ fontSize: "8px", color: 'var(--text-sub)' }}>
                              {myReaction ? "Change" : "React"}
                            </span>
                          </button>

                          {openReactionFor === p && (
                            <div className="reaction-popup">
                              {REACTIONS.map(({ emoji, label }) => (
                                <button key={label} title={label} onClick={() => toggleReaction(p, emoji)}>
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-14 mb-6 border-t" style={{ borderColor: 'var(--border-line)' }} />

              {/* Chat */}
              <div className="flex flex-col gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                  Discussion
                </span>

                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto minimal-scrollbar pr-1">
                  {chatMessages.length === 0 && (
                    <p className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: 'var(--text-sub)' }}>
                      No messages yet
                    </p>
                  )}
                  {chatMessages.map((msg, idx) => {
                    const isMe = msg.user === currentUser;
                    const showName = idx === 0 || chatMessages[idx - 1].user !== msg.user;
                    return (
                      <div key={msg.id} className="chat-msg-enter flex flex-col gap-0.5"
                        style={{ alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        {showName && (
                          <span className="font-mono text-[8px] uppercase tracking-widest px-1" style={{ color: 'var(--text-sub)' }}>
                            {isMe ? "You" : msg.user}
                          </span>
                        )}
                        <div className="px-4 py-2 rounded-2xl max-w-[80%]"
                          style={{ background: isMe ? 'var(--bg-chat-mine)' : 'var(--bg-chat)', border: '1px solid var(--border-line)' }}>
                          <p className="font-crimson text-base leading-snug" style={{ color: 'var(--text-main)' }}>
                            {msg.text}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>

                <div className="flex items-center gap-3 border-b" style={{ borderColor: 'var(--border-line)', paddingBottom: "10px" }}>
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); }
                    }}
                    placeholder="Add a thought..."
                    className="naked-input font-crimson text-lg"
                    style={{ color: 'var(--text-main)' }}
                  />
                  <button
                    onClick={sendChatMessage}
                    disabled={!chatInput.trim()}
                    className="opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity shrink-0"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <Send size={14} strokeWidth={1} />
                  </button>
                </div>
              </div>

              {/* Next Round */}
              <div className="mt-10 pt-6 border-t flex items-center justify-end" style={{ borderColor: 'var(--border-line)' }}>
                {!iHaveClickedContinue ? (
                  <button
                    onClick={handleContinue}
                    className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span>Next Round</span>
                    <Sparkles size={14} strokeWidth={1} />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest opacity-60" style={{ color: 'var(--text-sub)' }}>
                    <Loader2 size={12} className="animate-spin shrink-0" />
                    <span>Waiting for {waitingForOthers.length} player(s)</span>
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