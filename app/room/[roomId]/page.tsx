"use client";

import { db } from "@/lib/firebase";
import {
  doc, getDoc, onSnapshot, updateDoc, collection, getDocs,
  arrayUnion, arrayRemove, addDoc, query, orderBy, serverTimestamp,
  writeBatch, setDoc
} from "firebase/firestore";
import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import KamustaCard from "@/components/Card/KamustaCard";
import {
  Moon, Sun, ArrowLeft, ArrowRight, Check, PenTool, Sparkles,
  Loader2, Heart, HelpCircle, Target, Key, Coffee, Compass, Send,
  BookOpen, Flame, Save, CalendarClock, Users, UserCircle, Home,
  Layers, PartyPopper
} from "lucide-react";

// ─── Card Icons ───────────────────────────────────────────────────────────────
const CARD_ICONS = {
  question:     HelpCircle,
  appreciation: Heart,
  mission:      Target,
  secret:       Key,
  comfort:      Coffee,
  future:       Compass,
};

// ─── Reactions ────────────────────────────────────────────────────────────────
const REACTIONS = [
  { emoji: "❤️",  label: "love"     },
  { emoji: "😮",  label: "wow"      },
  { emoji: "😢",  label: "sad"      },
  { emoji: "😂",  label: "haha"     },
  { emoji: "👍",  label: "like"     },
  { emoji: "🙏",  label: "grateful" },
];

// ─── Mode Config ──────────────────────────────────────────────────────────────
const MODE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  solo:   { label: "Solo",   icon: UserCircle, color: "#8b7355" },
  friend: { label: "Friend", icon: Users,      color: "#5e8b6e" },
  couple: { label: "Couple", icon: Heart,      color: "#8b5e6e" },
  family: { label: "Family", icon: Home,       color: "#5e6e8b" },
};

// ─── Global Styles ────────────────────────────────────────────────────────────
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
      content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9999; opacity: 0.03;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }
    .naked-textarea {
      background: transparent; border: none;
      border-bottom: 1px solid var(--border-line);
      border-radius: 0; outline: none;
      transition: border-color 0.4s ease; resize: none;
    }
    .naked-textarea:focus { border-bottom-color: var(--text-main); }
    .naked-textarea::placeholder { color: var(--text-sub); opacity: 0.3; }
    .naked-input { background: transparent; border: none; outline: none; width: 100%; }
    .naked-input::placeholder { color: var(--text-sub); opacity: 0.3; }
    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-line); border-radius: 4px; }
    .reaction-popup {
      position: absolute; bottom: calc(100% + 8px); left: 0;
      display: flex; gap: 4px;
      background: var(--bg-nav); border: 1px solid var(--border-line);
      border-radius: 999px; padding: 6px 10px;
      z-index: 100; white-space: nowrap;
      box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      animation: popupIn 0.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    @keyframes popupIn {
      from { opacity: 0; transform: scale(0.8) translateY(4px); }
      to   { opacity: 1; transform: scale(1) translateY(0); }
    }
    .reaction-popup button {
      font-size: 20px; line-height: 1; background: none; border: none;
      cursor: pointer; padding: 2px 3px; border-radius: 50%;
      transition: transform 0.15s ease;
    }
    .reaction-popup button:hover { transform: scale(1.35); }
    .chat-msg-enter { animation: msgIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; }
    @keyframes msgIn {
      from { opacity: 0; transform: translateY(6px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .mode-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px 3px 7px; border-radius: 999px;
      border: 1px solid var(--border-line);
      font-family: 'Space Mono', monospace;
      font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
    }
    .cards-left-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 3px 10px 3px 8px; border-radius: 999px;
      border: 1px solid var(--border-line);
      font-family: 'Space Mono', monospace;
      font-size: 8px; letter-spacing: 0.15em;
      color: var(--text-sub);
    }
  `}</style>
);

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A card stored in deckQueue — full data so zero extra reads per draw.
 * Previously this was just a string (ID). Now it carries text + type too.
 */
type QueueCard = { id: string; text: string; type: string };

type RoomData = {
  roomCode: string;
  mode: string;
  players: string[] | undefined;
  activePlayers?: string[];
  currentCard: { id: string; text: string; type?: string } | null;
  answers: Record<string, string> | undefined;
  answersRevealed: boolean;
  readyForNext: string[] | undefined;
  currentDrawer: string;
  status: "waiting" | "playing" | "revealing" | "answering" | "revealed" | "finished";
  selectedDeck: string;
  reactions?: Record<string, Record<string, Record<string, string[]>>>;
  deckQueue?: QueueCard[];
  totalCards?: number;
};

type ChatMessage = {
  id: string; user: string; text: string; timestamp: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Fisher-Yates shuffle */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Ensure the room has a shuffled deckQueue with full card objects.
 *
 * Read cost:
 *   • First call (no queue yet): 1 × getDocs on the cards collection
 *   • Every subsequent call:     0 reads — queue is returned from Firestore cache
 */
async function ensureQueue(
  roomId: string,
  selectedDeck: string,
  existingQueue: QueueCard[] | undefined,
  totalCards: number | undefined,
): Promise<{ queue: QueueCard[]; total: number }> {
  // Queue already populated — return immediately, zero reads
  if (existingQueue && existingQueue.length > 0 && totalCards) {
    return { queue: existingQueue, total: totalCards };
  }
  // First time: one getDocs, store full card objects so future draws are free
  const snap  = await getDocs(collection(db, "decks", selectedDeck, "cards"));
  const cards: QueueCard[] = snap.docs
    .filter(d => !!d.data().text)
    .map(d => ({
      id:   d.id,
      text: d.data().text as string,
      type: (d.data().type as string) ?? "question",
    }));
  const queue = shuffle(cards);
  const total = queue.length;
  await updateDoc(doc(db, "rooms", roomId), { deckQueue: queue, totalCards: total });
  return { queue, total };
}

// ─── Audio Loader ─────────────────────────────────────────────────────────────
async function loadAudioBuffer(url: string, ctx: AudioContext): Promise<AudioBuffer | null> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    return await ctx.decodeAudioData(buf);
  } catch { return null; }
}

// ─── Cards Left Pill ──────────────────────────────────────────────────────────
function CardsLeftPill({ remaining, total }: { remaining: number; total: number }) {
  return (
    <div className="cards-left-pill">
      <Layers size={9} strokeWidth={1.5} />
      <span>{remaining}<span style={{ opacity: 0.45 }}>/{total}</span></span>
    </div>
  );
}

// ─── Ending Screen ────────────────────────────────────────────────────────────
function EndingScreen({
  roomId, currentUser, mode, router,
}: {
  roomId: string; currentUser: string; mode: string; router: ReturnType<typeof useRouter>;
}) {
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]       = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "chat"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, snap => {
      setChatMessages(snap.docs.map(d => ({
        id: d.id, user: d.data().user, text: d.data().text,
        timestamp: d.data().timestamp?.toMillis?.() ?? 0,
      })));
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentUser) return;
    const text = chatInput.trim(); setChatInput("");
    try { await addDoc(collection(db, "rooms", roomId, "chat"), { user: currentUser, text, timestamp: serverTimestamp() }); } catch {}
  };

  const isSolo = mode === "solo";

  const endingLines: Record<string, { headline: string; sub: string }> = {
    solo:   { headline: "You've reflected on every card.",   sub: "A full deck — every thought counted." },
    friend: { headline: "Every card has been played.",       sub: "That's a conversation worth remembering." },
    couple: { headline: "You went through the whole deck.",  sub: "Every question answered, together." },
    family: { headline: "The deck is complete.",             sub: "Thank you for sharing this time." },
  };
  const { headline, sub } = endingLines[mode] ?? endingLines.friend;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col flex-1 w-full pb-10"
    >
      <div className="flex flex-col items-center text-center py-14 border-b" style={{ borderColor: "var(--border-line)" }}>
        <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }} className="mb-6">
          <PartyPopper size={36} strokeWidth={1} style={{ color: "var(--text-accent)" }} />
        </motion.div>
        <motion.h2 initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.7 }}
          className="text-3xl sm:text-4xl font-light leading-tight mb-3" style={{ color: "var(--text-main)" }}>
          {headline}
        </motion.h2>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.55, duration: 0.6 }}
          className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>
          {sub}
        </motion.p>
      </div>

      {!isSolo && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7, duration: 0.6 }}
          className="flex flex-col gap-4 mt-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>Final Thoughts</span>
          <div className="flex flex-col gap-3 max-h-64 overflow-y-auto minimal-scrollbar pr-1">
            {chatMessages.length === 0 && (
              <p className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-sub)" }}>
                Anything left to say?
              </p>
            )}
            {chatMessages.map((msg, idx) => {
              const isMe = msg.user === currentUser;
              const showName = idx === 0 || chatMessages[idx - 1].user !== msg.user;
              return (
                <div key={msg.id} className="chat-msg-enter flex flex-col gap-0.5" style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
                  {showName && (
                    <span className="font-mono text-[8px] uppercase tracking-widest px-1" style={{ color: "var(--text-sub)" }}>
                      {isMe ? "You" : msg.user}
                    </span>
                  )}
                  <div className="px-4 py-2 rounded-2xl max-w-[80%]"
                    style={{ background: isMe ? "var(--bg-chat-mine)" : "var(--bg-chat)", border: "1px solid var(--border-line)" }}>
                    <p className="font-crimson text-base leading-snug" style={{ color: "var(--text-main)" }}>{msg.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={chatBottomRef} />
          </div>
          <div className="flex items-center gap-3 border-b" style={{ borderColor: "var(--border-line)", paddingBottom: "10px" }}>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
              placeholder="One last thought..." className="naked-input font-crimson text-lg" style={{ color: "var(--text-main)" }} />
            <button onClick={sendChatMessage} disabled={!chatInput.trim()}
              className="opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity shrink-0" style={{ color: "var(--text-main)" }}>
              <Send size={14} strokeWidth={1} />
            </button>
          </div>
        </motion.div>
      )}

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        transition={{ delay: isSolo ? 0.6 : 1.0, duration: 0.6 }} className="mt-12 flex justify-center">
        <button onClick={() => router.push("/dashboard")}
          className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] border px-6 py-3 rounded-full transition-all hover:border-[var(--border-strong)]"
          style={{ borderColor: "var(--border-line)", color: "var(--text-main)" }}>
          <ArrowLeft size={14} strokeWidth={1} className="transition-transform duration-500 group-hover:-translate-x-1" />
          <span>Back to Dashboard</span>
        </button>
      </motion.div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  SOLO MODE
// ═════════════════════════════════════════════════════════════════════════════
function SoloRoom({ room, roomId, currentUser, theme, toggleTheme }: {
  room: RoomData; roomId: string; currentUser: string;
  theme: "light" | "dark"; toggleTheme: () => void;
}) {
  const router = useRouter();

  const [answer, setAnswer]             = useState("");
  const [submitted, setSubmitted]       = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);
  const [isSaving, setIsSaving]         = useState(false);
  const [streak, setStreak]             = useState(0);
  const [drawError, setDrawError]       = useState("");

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const drawBufferRef = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    loadAudioBuffer("/sounds/drawcard.mp3", ctx).then(b => { drawBufferRef.current = b; });
  }, []);

  const playDrawSound = useCallback(() => {
    const ctx = audioCtxRef.current; const buf = drawBufferRef.current;
    if (!ctx || !buf) return;
    const r = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    r.then(() => { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(0); });
  }, []);

  useEffect(() => {
    if (room.status === "answering") {
      setSubmitted(false); setAnswer(""); setJournalSaved(false);
    }
  }, [room.status]);

  // ── Draw: pop from queue — ZERO extra Firestore reads ─────────────────────
  const handleDrawCard = async () => {
    if (room.status === "revealing") return;
    setDrawError("");
    if (!room.selectedDeck) { setDrawError("No deck found."); return; }

    try {
      const { queue, total } = await ensureQueue(
        roomId, room.selectedDeck, room.deckQueue, room.totalCards,
      );

      if (queue.length === 0) {
        await updateDoc(doc(db, "rooms", roomId), { status: "finished" });
        return;
      }

      // Pop first card — already has id, text, type. No getDoc needed.
      const [card, ...rest] = queue;

      playDrawSound();
      await updateDoc(doc(db, "rooms", roomId), {
        currentCard: card,
        answers:     {},
        status:      "revealing",
        deckQueue:   rest,
        totalCards:  total,
      });
    } catch (e) {
      console.error(e);
      setDrawError("Failed to draw a card. Please try again.");
    }
  };

  // Flip → answering after 3 s
  useEffect(() => {
    if (room.status !== "revealing") return;
    const t = setTimeout(() => updateDoc(doc(db, "rooms", roomId), { status: "answering" }), 3000);
    return () => clearTimeout(t);
  }, [room.status, roomId]);

  const submitReflection = async () => {
    if (!answer.trim()) return;
    await updateDoc(doc(db, "rooms", roomId), { [`answers.${currentUser}`]: answer.trim() });
    setSubmitted(true);
  };

  const saveJournalEntry = async () => {
    if (!room.currentCard) return;
    setIsSaving(true);
    try {
      await addDoc(collection(db, "users", currentUser, "journal"), {
        cardText:  room.currentCard.text,
        cardType:  room.currentCard.type ?? "question",
        answer:    room.answers?.[currentUser] ?? answer,
        timestamp: serverTimestamp(),
        roomId,
      });
      // getDoc (1 read) instead of getDocs on the whole streak sub-collection
      const today      = new Date().toDateString();
      const streakRef  = doc(db, "users", currentUser, "streak", "data");
      const streakSnap = await getDoc(streakRef);
      const last       = streakSnap.exists() ? streakSnap.data() : null;
      const newStreak  = last?.lastDay === today ? last.count : (last?.count ?? 0) + 1;
      await setDoc(streakRef, { count: newStreak, lastDay: today });
      setStreak(newStreak);
      setJournalSaved(true);
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const nextCard = async () => {
    const remaining = room.deckQueue?.length ?? 0;
    if (remaining === 0) {
      await updateDoc(doc(db, "rooms", roomId), { currentCard: null, answers: {}, status: "finished" });
    } else {
      await updateDoc(doc(db, "rooms", roomId), { currentCard: null, answers: {}, status: "playing" });
    }
    setSubmitted(false); setJournalSaved(false); setAnswer("");
  };

  const isRevealing = room.status === "revealing";
  const isFinished  = room.status === "finished";
  const showDraw    = ["waiting", "playing", "revealing"].includes(room.status);
  const showReflect = room.status === "answering";
  const cardType    = (room.currentCard?.type ?? "question") as keyof typeof CARD_ICONS;
  const CardIcon    = CARD_ICONS[cardType] ?? HelpCircle;
  const remaining   = room.deckQueue?.length ?? 0;
  const total       = room.totalCards ?? 0;

  const phaseVariants = {
    initial: { opacity: 0, y: 15, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16,1,0.3,1] as [number,number,number,number] } },
    exit:    { opacity: 0, y: -15, filter: "blur(4px)", transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col px-6">
      <GlobalStyles />

      <nav className="fixed top-0 left-0 right-0 z-50 h-20 backdrop-blur-md" style={{ background: "var(--bg-nav)" }}>
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <motion.button onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-main)" }}>
            <ArrowLeft size={14} strokeWidth={1} />
            <span className="hidden sm:inline pt-[1px]">Leave</span>
          </motion.button>
          <div className="flex items-center gap-5">
            <div className="mode-pill" style={{ color: "#8b7355", borderColor: "#8b735544" }}>
              <UserCircle size={10} strokeWidth={1.5} /><span>Solo</span>
            </div>
            {total > 0 && !isFinished && <CardsLeftPill remaining={remaining} total={total} />}
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-50" style={{ color: "var(--text-main)" }}>
              {room.roomCode}
            </span>
            {streak > 0 && (
              <div className="flex items-center gap-1 opacity-70">
                <Flame size={11} style={{ color: "#f97316" }} />
                <span className="font-mono text-[9px]" style={{ color: "#f97316" }}>{streak}</span>
              </div>
            )}
            <button onClick={toggleTheme} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-main)" }}>
              {theme === "light" ? <Moon size={14} strokeWidth={1} /> : <Sun size={14} strokeWidth={1} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col pt-28 pb-16 max-w-2xl mx-auto w-full relative z-10">
        <div className="mb-12 border-b pb-4" style={{ borderColor: "var(--border-line)" }}>
          <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>
            Solo Session · {currentUser}
          </span>
        </div>

        <AnimatePresence mode="wait">

          {isFinished && (
            <motion.div key="solo-finished" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-1 w-full">
              <EndingScreen roomId={roomId} currentUser={currentUser} mode="solo" router={router} />
            </motion.div>
          )}

          {showDraw && (
            <motion.div key="solo-draw" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col items-center justify-center flex-1 py-10 w-full">
              <div className="text-center w-full flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-2" style={{ color: "var(--text-sub)" }}>
                  {isRevealing ? "Revealing Prompt..." : "Tap to Draw"}
                </span>
                <motion.div className="my-10">
                  <KamustaCard
                    isFlipped={isRevealing} isDrawer={true} status={room.status}
                    onClick={handleDrawCard}
                    title={room.currentCard ? (cardType.charAt(0).toUpperCase() + cardType.slice(1)) : "Mystery Prompt"}
                    text={room.currentCard?.text ?? "..."}
                    type={room.currentCard?.type ?? "Draw"}
                    icon={room.currentCard ? CardIcon : Sparkles}
                  />
                </motion.div>
                {drawError && (
                  <p className="font-mono text-[9px] uppercase tracking-widest text-red-500/80 mt-4">{drawError}</p>
                )}
              </div>
            </motion.div>
          )}

          {showReflect && room.currentCard && (
            <motion.div key="solo-reflect" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col flex-1 w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>Today's Prompt</span>
                <span className="font-mono text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded-full"
                  style={{ borderColor: "var(--border-line)", color: "var(--text-sub)" }}>{room.currentCard.type}</span>
              </div>

              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight mb-12" style={{ color: "var(--text-main)" }}>
                {room.currentCard.text}
              </h2>

              {!submitted ? (
                <div className="flex flex-col w-full mt-auto mb-8">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color: "var(--text-sub)" }}>Your Reflection</span>
                  <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                    placeholder="Write your thoughts..."
                    className="naked-textarea w-full pb-4 font-crimson text-2xl sm:text-3xl h-32"
                    style={{ color: "var(--text-main)" }} autoFocus />
                  <div className="flex justify-end mt-8">
                    <button onClick={submitReflection} disabled={!answer.trim()}
                      className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      style={{ color: "var(--text-main)" }}>
                      <span>Reflect</span>
                      <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
                    </button>
                  </div>
                </div>
              ) : (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col gap-8 mt-2 pb-10">
                  <div className="border-l-2 pl-5" style={{ borderColor: "var(--border-strong)" }}>
                    <span className="font-mono text-[8px] uppercase tracking-[0.25em] block mb-3" style={{ color: "var(--text-sub)" }}>You wrote</span>
                    <p className="text-2xl sm:text-3xl font-light leading-relaxed italic" style={{ color: "var(--text-main)" }}>
                      {room.answers?.[currentUser]}
                    </p>
                  </div>
                  <div className="pt-6 border-t flex items-center justify-between flex-wrap gap-4" style={{ borderColor: "var(--border-line)" }}>
                    {!journalSaved ? (
                      <button onClick={saveJournalEntry} disabled={isSaving}
                        className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.25em] border px-4 py-2 rounded-full transition-all hover:border-[var(--border-strong)] disabled:opacity-40"
                        style={{ borderColor: "var(--border-line)", color: "var(--text-main)" }}>
                        {isSaving ? <Loader2 size={12} className="animate-spin" /> : <BookOpen size={12} strokeWidth={1.5} />}
                        <span>{isSaving ? "Saving..." : "Save to Journal"}</span>
                      </button>
                    ) : (
                      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                        className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: "#5e8b6e" }}>
                        <Check size={12} strokeWidth={2} /><span>Saved</span>
                        {streak > 0 && (
                          <span className="flex items-center gap-1 ml-2" style={{ color: "#f97316" }}>
                            <Flame size={11} /> {streak} day{streak > 1 ? "s" : ""}
                          </span>
                        )}
                      </motion.div>
                    )}
                    <button onClick={nextCard}
                      className="group flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
                      style={{ color: "var(--text-main)" }}>
                      <span>{remaining === 0 ? "Finish" : "Next Card"}</span>
                      <Sparkles size={14} strokeWidth={1} />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  MULTIPLAYER
// ═════════════════════════════════════════════════════════════════════════════
function MultiplayerRoom({ room, roomId, currentUser, theme, toggleTheme }: {
  room: RoomData; roomId: string; currentUser: string;
  theme: "light" | "dark"; toggleTheme: () => void;
}) {
  const router = useRouter();

  const [answer, setAnswer]                   = useState("");
  const [hasAnswered, setHasAnswered]         = useState(false);
  const [drawError, setDrawError]             = useState("");
  const [chatMessages, setChatMessages]       = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput]             = useState("");
  const chatBottomRef                         = useRef<HTMLDivElement>(null);
  const [openReactionFor, setOpenReactionFor] = useState<string | null>(null);
  const [sendLater, setSendLater]             = useState(false);
  const [savedMoment, setSavedMoment]         = useState(false);

  const audioCtxRef   = useRef<AudioContext | null>(null);
  const drawBufferRef = useRef<AudioBuffer | null>(null);
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    audioCtxRef.current = ctx;
    loadAudioBuffer("/sounds/drawcard.mp3", ctx).then(b => { drawBufferRef.current = b; });
  }, []);
  const playDrawSound = useCallback(() => {
    const ctx = audioCtxRef.current; const buf = drawBufferRef.current;
    if (!ctx || !buf) return;
    const r = ctx.state === "suspended" ? ctx.resume() : Promise.resolve();
    r.then(() => { const s = ctx.createBufferSource(); s.buffer = buf; s.connect(ctx.destination); s.start(0); });
  }, []);

  useEffect(() => {
    if (room.status === "answering" && !room.answers?.[currentUser]) {
      setHasAnswered(false); setDrawError("");
    }
  }, [room.status, room.answers, currentUser]);

  useEffect(() => {
    if (!roomId) return;
    const q = query(collection(db, "rooms", roomId, "chat"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, snap => {
      setChatMessages(snap.docs.map(d => ({
        id: d.id, user: d.data().user, text: d.data().text,
        timestamp: d.data().timestamp?.toMillis?.() ?? 0,
      })));
    });
    return () => unsub();
  }, [roomId]);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  useEffect(() => {
    if (room.status === "revealing" && room.currentDrawer === currentUser) {
      const t = setTimeout(() => updateDoc(doc(db, "rooms", roomId), { status: "answering" }), 3000);
      return () => clearTimeout(t);
    }
  }, [room.status, room.currentDrawer, currentUser, roomId]);

  useEffect(() => {
    if (!openReactionFor) return;
    const h = () => setOpenReactionFor(null);
    document.addEventListener("click", h);
    return () => document.removeEventListener("click", h);
  }, [openReactionFor]);

  // ── Draw: pop from queue — ZERO extra Firestore reads ─────────────────────
  const handleDrawCard = async () => {
    if (room.status === "revealing") return;
    setDrawError("");
    if (!room.selectedDeck) { setDrawError("No deck found in this room."); return; }

    try {
      const { queue, total } = await ensureQueue(
        roomId, room.selectedDeck, room.deckQueue, room.totalCards,
      );

      if (queue.length === 0) {
        await updateDoc(doc(db, "rooms", roomId), { status: "finished" });
        return;
      }

      // Pop first card — already has id, text, type. No getDoc needed.
      const [card, ...rest] = queue;

      playDrawSound();
      await updateDoc(doc(db, "rooms", roomId), {
        currentCard:     card,
        answers:         {},
        answersRevealed: false,
        readyForNext:    [],
        reactions:       {},
        status:          "revealing",
        deckQueue:       rest,
        totalCards:      total,
      });
    } catch (e) {
      console.error(e);
      setDrawError("Failed to draw a card. Please try again.");
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) return;
    await updateDoc(doc(db, "rooms", roomId), { [`answers.${currentUser}`]: answer.trim() });
    setHasAnswered(true); setAnswer("");
    const updated     = { ...(room.answers || {}), [currentUser]: answer.trim() };
    const active      = room.activePlayers?.length ? room.activePlayers : room.players;
    const allAnswered = active?.every((p: string) => updated[p] !== undefined);
    if (allAnswered) await updateDoc(doc(db, "rooms", roomId), { answersRevealed: true, status: "revealed" });
  };

  const saveCoupleMoment = async () => {
    if (!room.currentCard) return;
    try {
      await addDoc(collection(db, "rooms", roomId, "moments"), {
        cardText: room.currentCard.text, answers: room.answers, timestamp: serverTimestamp(),
      });
      setSavedMoment(true);
    } catch {}
  };

  const clearChat = async () => {
    const snap = await getDocs(collection(db, "rooms", roomId, "chat"));
    if (!snap.empty) {
      const batch = writeBatch(db);
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
    }
  };

  const handleContinue = async () => {
    const updated       = [...(room.readyForNext || []), currentUser];
    await updateDoc(doc(db, "rooms", roomId), { readyForNext: arrayUnion(currentUser) });
    const activePlayers = room.activePlayers?.length ? room.activePlayers : room.players;
    if (activePlayers?.every((p: string) => updated.includes(p))) {
      const players    = room.players!;
      const nextDrawer = players[(players.indexOf(room.currentDrawer) + 1) % players.length];
      const remaining  = room.deckQueue?.length ?? 0;
      await clearChat();
      await updateDoc(doc(db, "rooms", roomId), {
        currentCard: null, answers: {}, answersRevealed: false,
        readyForNext: [], reactions: {},
        status: remaining === 0 ? "finished" : "playing",
        currentDrawer: nextDrawer,
      });
    }
  };

  const sendChatMessage = async () => {
    if (!chatInput.trim() || !currentUser) return;
    const text = chatInput.trim(); setChatInput("");
    try { await addDoc(collection(db, "rooms", roomId, "chat"), { user: currentUser, text, timestamp: serverTimestamp() }); } catch {}
  };

  const toggleReaction = async (targetUser: string, emoji: string) => {
    if (!room.currentCard) return;
    const cardId   = room.currentCard.id;
    const existing: string[] = (room.reactions?.[cardId]?.[targetUser] as any)?.[emoji] ?? [];
    const iReacted = existing.includes(currentUser);
    await updateDoc(doc(db, "rooms", roomId), {
      [`reactions.${cardId}.${targetUser}.${emoji}`]: iReacted
        ? existing.filter((u: string) => u !== currentUser)
        : arrayUnion(currentUser),
    });
    setOpenReactionFor(null);
  };

  const getAnswerReactions = (targetUser: string): Record<string, string[]> => {
    if (!room.currentCard || !room.reactions) return {};
    return (room.reactions[room.currentCard.id]?.[targetUser] as any) ?? {};
  };

  const mode     = room.mode || "friend";
  const modeInfo = MODE_CONFIG[mode] ?? MODE_CONFIG.friend;
  const ModeIcon = modeInfo.icon;
  const isCouple = mode === "couple";
  const isFamily = mode === "family";

  const isDrawer             = room.currentDrawer === currentUser;
  const isRevealing          = room.status === "revealing";
  const isFinished           = room.status === "finished";
  const showDrawScreen       = ["waiting", "playing", "revealing"].includes(room.status);
  const iHaveClickedContinue = room.readyForNext?.includes(currentUser) ?? false;
  const activePlayers        = room.activePlayers?.length ? room.activePlayers : (room.players ?? []);
  const waitingForOthers     = activePlayers.filter((p: string) => !room.readyForNext?.includes(p));
  const remaining            = room.deckQueue?.length ?? 0;
  const total                = room.totalCards ?? 0;

  const phaseVariants = {
    initial: { opacity: 0, y: 15, filter: "blur(4px)" },
    animate: { opacity: 1, y: 0,  filter: "blur(0px)", transition: { duration: 0.8, ease: [0.16,1,0.3,1] as [number,number,number,number] } },
    exit:    { opacity: 0, y: -15, filter: "blur(4px)", transition: { duration: 0.4 } },
  };

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col px-6">
      <GlobalStyles />

      <nav className="fixed top-0 left-0 right-0 z-50 h-20 backdrop-blur-md" style={{ background: "var(--bg-nav)" }}>
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <motion.button onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-main)" }}>
            <ArrowLeft size={14} strokeWidth={1} />
            <span className="hidden sm:inline pt-[1px]">Leave</span>
          </motion.button>
          <div className="flex items-center gap-5">
            <div className="mode-pill" style={{ color: modeInfo.color, borderColor: modeInfo.color + "44" }}>
              <ModeIcon size={10} strokeWidth={1.5} /><span>{modeInfo.label}</span>
            </div>
            {total > 0 && !isFinished && <CardsLeftPill remaining={remaining} total={total} />}
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] opacity-50" style={{ color: "var(--text-main)" }}>
              {room.roomCode}
            </span>
            <button onClick={toggleTheme} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-main)" }}>
              {theme === "light" ? <Moon size={14} strokeWidth={1} /> : <Sun size={14} strokeWidth={1} />}
            </button>
          </div>
        </div>
      </nav>

      <main className="flex-1 flex flex-col pt-28 pb-16 max-w-2xl mx-auto w-full relative z-10">
        <div className="mb-12 border-b pb-4 flex flex-wrap gap-4" style={{ borderColor: "var(--border-line)" }}>
          {room.players?.map((p: string) => (
            <div key={p} className="flex items-center gap-2">
              <span className={`font-mono text-[9px] uppercase tracking-widest ${p === currentUser ? "font-bold" : ""}`}
                style={{ color: p === room.currentDrawer ? "var(--text-main)" : "var(--text-sub)" }}>
                {p} {p === currentUser ? "(You)" : ""}
              </span>
              {p === room.currentDrawer && !isFinished && <PenTool size={10} style={{ color: "var(--text-main)" }} />}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">

          {isFinished && (
            <motion.div key="mp-finished" variants={phaseVariants} initial="initial" animate="animate" exit="exit" className="flex flex-col flex-1 w-full">
              <EndingScreen roomId={roomId} currentUser={currentUser} mode={mode} router={router} />
            </motion.div>
          )}

          {showDrawScreen && (
            <motion.div key="draw-screen" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col items-center justify-center flex-1 py-10 w-full">
              <div className="text-center w-full flex flex-col items-center">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-2" style={{ color: "var(--text-sub)" }}>
                  {isRevealing ? "Revealing Prompt..." : isDrawer ? "Your Turn" : "Standby"}
                </span>
                <motion.div className="my-10"
                  animate={!isRevealing && !isDrawer ? { y: [0, -5, 0] } : {}}
                  transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}>
                  <KamustaCard
                    isFlipped={isRevealing} isDrawer={isDrawer} status={room.status}
                    onClick={handleDrawCard}
                    title={room.currentCard ? ((room.currentCard.type || "question").charAt(0).toUpperCase() + (room.currentCard.type || "question").slice(1)) : "Mystery Prompt"}
                    text={room.currentCard?.text ?? "..."}
                    type={room.currentCard?.type ?? "Draw"}
                    icon={room.currentCard ? (CARD_ICONS[(room.currentCard.type || "question") as keyof typeof CARD_ICONS] || HelpCircle) : Sparkles}
                  />
                </motion.div>
                {!isRevealing && !isDrawer && (
                  <div className="flex flex-col items-center gap-4 mt-2">
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--text-sub)" }} strokeWidth={1.5} />
                    <p className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>
                      Waiting for <span style={{ color: "var(--text-main)", fontWeight: 600 }}>{room.currentDrawer}</span>
                    </p>
                  </div>
                )}
                {drawError && isDrawer && (
                  <p className="font-mono text-[9px] uppercase tracking-widest text-red-500/80 mt-4">{drawError}</p>
                )}
              </div>
            </motion.div>
          )}

          {room.status === "answering" && room.currentCard && (
            <motion.div key="answering" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col flex-1 w-full">
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>The Prompt</span>
                <span className="font-mono text-[8px] uppercase tracking-widest border px-2 py-0.5 rounded-full"
                  style={{ borderColor: "var(--border-line)", color: "var(--text-sub)" }}>{room.currentCard.type}</span>
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-light leading-tight mb-16" style={{ color: "var(--text-main)" }}>
                {room.currentCard.text}
              </h2>
              {!hasAnswered ? (
                <div className="flex flex-col w-full mt-auto mb-8">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em] mb-4" style={{ color: "var(--text-sub)" }}>Your Response</span>
                  <textarea value={answer} onChange={e => setAnswer(e.target.value)}
                    placeholder="Type your truth..."
                    className="naked-textarea w-full pb-4 font-crimson text-2xl sm:text-3xl h-24"
                    style={{ color: "var(--text-main)" }} />
                  {isCouple && (
                    <div className="mt-6 flex items-center gap-3 cursor-pointer select-none" onClick={() => setSendLater(!sendLater)}>
                      <div className="w-9 h-5 rounded-full transition-colors flex items-center px-0.5"
                        style={{ background: sendLater ? "var(--text-main)" : "var(--border-line)" }}>
                        <motion.div className="w-4 h-4 rounded-full bg-white shadow-sm"
                          animate={{ x: sendLater ? 16 : 0 }} transition={{ type: "spring", stiffness: 500, damping: 30 }} />
                      </div>
                      <div>
                        <span className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-main)" }}>Send Later</span>
                        <p className="font-crimson text-xs mt-0.5 italic" style={{ color: "var(--text-sub)" }}>
                          {sendLater ? "Will be delivered tomorrow" : "Share now with your partner"}
                        </p>
                      </div>
                      <CalendarClock size={13} className="ml-auto opacity-50" style={{ color: "var(--text-main)" }} />
                    </div>
                  )}
                  <div className="flex justify-end mt-8">
                    <button onClick={submitAnswer} disabled={!answer.trim()}
                      className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                      style={{ color: "var(--text-main)" }}>
                      <span>Submit</span>
                      <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col mt-auto pb-10">
                  <span className="font-mono text-[10px] uppercase tracking-[0.3em] mb-6" style={{ color: "var(--text-sub)" }}>Status</span>
                  <div className="flex flex-col gap-4">
                    {room.players?.map((p: string) => {
                      const answered = room.answers?.[p] !== undefined;
                      const isActive = activePlayers.includes(p);
                      return (
                        <div key={p} className="flex justify-between items-center border-b pb-2"
                          style={{ borderColor: "var(--border-line)", opacity: isActive ? 1 : 0.35 }}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] uppercase tracking-widest"
                              style={{ color: answered ? "var(--text-main)" : "var(--text-sub)" }}>{p}</span>
                            {!isActive && (
                              <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "var(--text-sub)" }}>offline</span>
                            )}
                          </div>
                          <span style={{ color: answered ? "var(--text-main)" : "var(--text-sub)", opacity: answered ? 1 : 0.5 }}>
                            {answered ? <Check size={14} strokeWidth={1.5} /> : isActive ? "..." : "—"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  {room.currentDrawer === currentUser && activePlayers.some((p: string) => room.answers?.[p] === undefined) && (
                    <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 15 }}
                      onClick={async () => { await updateDoc(doc(db, "rooms", roomId), { answersRevealed: true, status: "revealed" }); }}
                      className="mt-6 font-mono text-[9px] uppercase tracking-widest opacity-40 hover:opacity-80 transition-opacity"
                      style={{ color: "var(--text-sub)" }}>
                      Skip offline players →
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          )}

          {room.status === "revealed" && room.currentCard && (
            <motion.div key="revealed" variants={phaseVariants} initial="initial" animate="animate" exit="exit"
              className="flex flex-col flex-1 w-full pb-10">
              <span className="font-mono text-[10px] uppercase tracking-[0.3em] mb-4" style={{ color: "var(--text-sub)" }}>The Prompt</span>
              <h2 className="text-2xl sm:text-3xl font-light leading-tight mb-12 pb-8 border-b"
                style={{ color: "var(--text-main)", borderColor: "var(--border-line)" }}>
                {room.currentCard.text}
              </h2>

              <div className="flex flex-col gap-10 flex-1">
                {room.players?.map((p: string, i: number) => {
                  const ar      = getAnswerReactions(p);
                  const active  = REACTIONS.filter(({ emoji }) => (ar[emoji]?.length ?? 0) > 0);
                  const myReact = REACTIONS.find(({ emoji }) => ar[emoji]?.includes(currentUser));
                  return (
                    <motion.div key={p} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }} className="flex flex-col gap-3">
                      <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>
                        {p === currentUser ? "You" : p}
                      </span>
                      <p className="text-2xl sm:text-3xl font-light leading-relaxed break-words" style={{ color: "var(--text-main)" }}>
                        {room.answers?.[p]}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap mt-1">
                        {active.map(({ emoji }) => {
                          const reactors = ar[emoji] ?? [];
                          const iReacted = reactors.includes(currentUser);
                          return (
                            <button key={emoji} onClick={() => toggleReaction(p, emoji)}
                              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border transition-all"
                              style={{ borderColor: iReacted ? "var(--border-strong)" : "var(--border-line)", background: iReacted ? "var(--bg-reaction-active)" : "var(--bg-reaction)", fontSize: "15px", lineHeight: 1.6 }}>
                              <span>{emoji}</span>
                              <span className="font-mono text-[9px]" style={{ color: "var(--text-sub)" }}>{reactors.length}</span>
                            </button>
                          );
                        })}
                        <div className="relative" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setOpenReactionFor(openReactionFor === p ? null : p)}
                            className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border transition-all"
                            style={{ borderColor: "var(--border-line)", background: "transparent", opacity: 0.5, fontSize: "13px", color: "var(--text-sub)" }}>
                            {myReact ? <span style={{ fontSize: "15px" }}>{myReact.emoji}</span> : <span>+</span>}
                            <span className="font-mono uppercase tracking-widest" style={{ fontSize: "8px", color: "var(--text-sub)" }}>
                              {myReact ? "Change" : "React"}
                            </span>
                          </button>
                          {openReactionFor === p && (
                            <div className="reaction-popup">
                              {REACTIONS.map(({ emoji, label }) => (
                                <button key={label} title={label} onClick={() => toggleReaction(p, emoji)}>{emoji}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-14 mb-6 border-t" style={{ borderColor: "var(--border-line)" }} />
              <div className="flex flex-col gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>Discussion</span>
                <div className="flex flex-col gap-3 max-h-64 overflow-y-auto minimal-scrollbar pr-1">
                  {chatMessages.length === 0 && (
                    <p className="font-mono text-[9px] uppercase tracking-widest opacity-40" style={{ color: "var(--text-sub)" }}>No messages yet</p>
                  )}
                  {chatMessages.map((msg, idx) => {
                    const isMe     = msg.user === currentUser;
                    const showName = idx === 0 || chatMessages[idx - 1].user !== msg.user;
                    return (
                      <div key={msg.id} className="chat-msg-enter flex flex-col gap-0.5" style={{ alignItems: isMe ? "flex-end" : "flex-start" }}>
                        {showName && (
                          <span className="font-mono text-[8px] uppercase tracking-widest px-1" style={{ color: "var(--text-sub)" }}>
                            {isMe ? "You" : msg.user}
                          </span>
                        )}
                        <div className="px-4 py-2 rounded-2xl max-w-[80%]"
                          style={{ background: isMe ? "var(--bg-chat-mine)" : "var(--bg-chat)", border: "1px solid var(--border-line)" }}>
                          <p className="font-crimson text-base leading-snug" style={{ color: "var(--text-main)" }}>{msg.text}</p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={chatBottomRef} />
                </div>
                <div className="flex items-center gap-3 border-b" style={{ borderColor: "var(--border-line)", paddingBottom: "10px" }}>
                  <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } }}
                    placeholder="Add a thought..." className="naked-input font-crimson text-lg" style={{ color: "var(--text-main)" }} />
                  <button onClick={sendChatMessage} disabled={!chatInput.trim()}
                    className="opacity-60 hover:opacity-100 disabled:opacity-20 transition-opacity shrink-0" style={{ color: "var(--text-main)" }}>
                    <Send size={14} strokeWidth={1} />
                  </button>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t" style={{ borderColor: "var(--border-line)" }}>
                {isCouple && (
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    {!savedMoment ? (
                      <button onClick={saveCoupleMoment}
                        className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest border px-3 py-1.5 rounded-full transition-all hover:border-[var(--border-strong)]"
                        style={{ borderColor: "var(--border-line)", color: "var(--text-sub)" }}>
                        <Save size={11} strokeWidth={1.5} /> Save This Moment
                      </button>
                    ) : (
                      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        className="font-mono text-[9px] uppercase tracking-widest flex items-center gap-2" style={{ color: "#8b5e6e" }}>
                        <Heart size={11} fill="currentColor" /> Moment Saved
                      </motion.span>
                    )}
                    {!iHaveClickedContinue ? (
                      <button onClick={handleContinue}
                        className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
                        style={{ color: "var(--text-main)" }}>
                        <span>{remaining === 0 ? "Finish" : "Next Round"}</span><Sparkles size={14} strokeWidth={1} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 font-mono text-[9px] uppercase tracking-widest opacity-60" style={{ color: "var(--text-sub)" }}>
                        <Loader2 size={12} className="animate-spin shrink-0" />
                        <span>Waiting for {waitingForOthers.length} player(s)</span>
                      </div>
                    )}
                  </div>
                )}
                {(mode === "friend" || isFamily) && (
                  <div className="flex items-center justify-end">
                    {!iHaveClickedContinue ? (
                      <button onClick={handleContinue}
                        className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] hover:opacity-70 transition-opacity"
                        style={{ color: "var(--text-main)" }}>
                        <span>{remaining === 0 ? "Finish" : "Next Round"}</span><Sparkles size={14} strokeWidth={1} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-3 font-mono text-[9px] sm:text-[10px] uppercase tracking-widest opacity-60" style={{ color: "var(--text-sub)" }}>
                        <Loader2 size={12} className="animate-spin shrink-0" />
                        <span>Waiting for {waitingForOthers.length} player(s)</span>
                      </div>
                    )}
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

// ═════════════════════════════════════════════════════════════════════════════
//  ROOT PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function RoomPage() {
  const params = useParams();
  const roomId = params?.roomId as string;
  const router = useRouter();

  const [room, setRoom]               = useState<RoomData | null>(null);
  const [currentUser, setCurrentUser] = useState("");
  const [theme, setTheme]             = useState<"light" | "dark">("light");
  const [mounted, setMounted]         = useState(false);

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark"); document.documentElement.classList.add("dark");
    } else {
      setTheme("light"); document.documentElement.classList.remove("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next); localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) setCurrentUser(name);
    else router.push("/dashboard");
  }, [router]);

  useEffect(() => {
    if (!roomId) return;
    const unsub = onSnapshot(doc(db, "rooms", roomId), snap => {
      const data = snap.data() as RoomData;
      if (!data) { router.push("/dashboard"); return; }
      setRoom(data);
    });
    return () => unsub();
  }, [roomId, router]);

  // ✅ FIXED INFINITE LOOP: Removed room?.players from dependencies
  useEffect(() => {
    if (!currentUser || !roomId) return;

    // Add user to arrays. arrayUnion prevents duplicates automatically on the server.
    updateDoc(doc(db, "rooms", roomId), { 
      players: arrayUnion(currentUser),
      activePlayers: arrayUnion(currentUser) 
    });

    // Handle closing the browser tab
    const handleTabClose = () => {
      updateDoc(doc(db, "rooms", roomId), { activePlayers: arrayRemove(currentUser) });
    };
    window.addEventListener("beforeunload", handleTabClose);

    // Handle leaving the component via navigation
    return () => {
      window.removeEventListener("beforeunload", handleTabClose);
      updateDoc(doc(db, "rooms", roomId), { activePlayers: arrayRemove(currentUser) });
    };
  }, [currentUser, roomId]); 

  if (!mounted || !room || !currentUser) {
    return (
      <div className="min-h-screen grain-overlay flex flex-col gap-4 items-center justify-center font-mono text-[10px] uppercase tracking-widest"
        style={{ color: "var(--text-sub)", background: "var(--bg-base)" }}>
        <GlobalStyles />
        <Loader2 className="w-5 h-5 animate-spin" />
        Loading Room
      </div>
    );
  }

  const sharedProps = { room, roomId, currentUser, theme, toggleTheme };
  if (room.mode === "solo") return <SoloRoom {...sharedProps} />;
  return <MultiplayerRoom {...sharedProps} />;
}