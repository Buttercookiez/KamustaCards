"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, query, orderBy, doc,
  updateDoc, addDoc, serverTimestamp, getDocs, getDoc, setDoc, deleteDoc,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft, Bell, Library, Check, X, Trash2,
  Moon, Sun, Volume2, VolumeX, SkipBack, SkipForward, UserPlus, Sparkles, Heart
} from "lucide-react";
import { useSoundContext } from "@/components/sound-provider";

// ─── Global Styles ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
    :root {
      --bg-base: #faf8f5; --bg-nav: rgba(250,248,245,0.95); --bg-card: transparent;
      --bg-card-hover: rgba(0,0,0,0.02); --text-main: #2c2825; --text-sub: #6b4423;
      --text-accent: #8b7355; --border-subtle: #d4c8b8; --border-strong: #a89070;
      --action-bg: #2c2825; --action-text: #f5f0e8; --action-sub: #a89070;
      --icon-bg: rgba(0,0,0,0.04);
      --shadow-hover: 0 12px 24px -10px rgba(0,0,0,0.1);
      --shadow-primary: 0 8px 20px -8px rgba(0,0,0,0.3);
    }
    .dark {
      --bg-base: #09090b; --bg-nav: rgba(9,9,11,0.95); --bg-card: transparent;
      --bg-card-hover: rgba(255,255,255,0.03); --text-main: #e4ddd2; --text-sub: #a1a1aa;
      --text-accent: #71717a; --border-subtle: #27272a; --border-strong: #52525b;
      --action-bg: #e4ddd2; --action-text: #09090b; --action-sub: #71717a;
      --icon-bg: rgba(255,255,255,0.05);
      --shadow-hover: 0 12px 24px -10px rgba(0,0,0,0.6);
      --shadow-primary: 0 8px 20px -8px rgba(255,255,255,0.15);
    }
    * { -webkit-tap-highlight-color: transparent !important; }
    button:focus, input:focus { outline: none; }
    body { background-color: var(--bg-base); color: var(--text-main); transition: background-color 0.5s ease, color 0.5s ease; }
    .font-cinzel  { font-family: 'Cinzel', serif; }
    .font-crimson { font-family: 'Crimson Pro', Georgia, serif; }
    .font-mono    { font-family: 'Space Mono', monospace; }
    .grain-overlay::after {
      content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9999; opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }
    .hover-card { background-color: var(--bg-card); border-color: var(--border-subtle); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
    .hover-card:hover { background-color: var(--bg-card-hover); border-color: var(--border-strong); box-shadow: var(--shadow-hover); }
    .primary-action { background-color: var(--action-bg); box-shadow: var(--shadow-primary); transition: all 0.4s cubic-bezier(0.16,1,0.3,1); }
    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-subtle); border-radius: 4px; }
    @keyframes kspin { to { transform: rotate(360deg); } }
    @keyframes shimmerSweep { 0% { transform: translateX(-100%); } 100% { transform: translateX(300%); } }
    @keyframes sparkle { 0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); } 50% { opacity: 1; transform: scale(1) rotate(180deg); } }
  `}</style>
);

// ─── Types ────────────────────────────────────────────────────────────────────
type Notif = {
  id: string;
  type: "deck_share" | "friend_request";
  fromUid: string;
  fromName: string;
  fromPhoto: string | null;
  deckId?: string;
  deckTitle?: string;
  deckDescription?: string;
  cardCount?: number;
  requestId?: string;
  sentAt: number;
  read: boolean;
  status?: "accepted" | "declined" | "added" | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string) {
  const p = name.trim().split(" ");
  if (p.length === 1) return p[0].slice(0, 2).toUpperCase();
  return (p[0][0] + p[p.length - 1][0]).toUpperCase();
}

function relativeTime(ts: number) {
  const d = Date.now() - ts;
  const m = Math.floor(d / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.floor(h / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Avatar({ name, photo, size = 44 }: { name: string; photo: string | null; size?: number }) {
  if (photo) return (
    <div style={{ width: size, height: size, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border-subtle)" }}>
      <Image src={photo} alt={name} width={size} height={size} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
    </div>
  );
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid var(--border-subtle)", backgroundColor: "var(--icon-bg)",
      color: "var(--text-accent)", fontFamily: "'Cinzel', serif",
      fontSize: size * 0.27, fontWeight: 600,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Card Face Components (Matches KamustaCard Design) ────────────────────────
const CardBack = () => (
  <div
    className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] rounded-2xl flex flex-col items-center justify-center border border-[#8b7355]/30"
    style={{
      backfaceVisibility: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
    {/* SVG Noise Overlay */}
    <div
      className="absolute inset-0 rounded-2xl opacity-[0.08] mix-blend-overlay"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='6' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")`,
      }}
    />
    <div className="relative flex flex-col items-center justify-center w-full px-4">
      <div 
        className="font-cinzel text-2xl font-normal tracking-[0.25em] text-[#f5f0e8] uppercase drop-shadow-md"
        style={{ paddingLeft: '0.25em' }}
      >
        Kamusta
      </div>
      <div className="w-16 h-px bg-[rgba(245,240,232,0.3)] my-4" />
      <div 
        className="font-mono text-[10px] tracking-[0.4em] text-[#f5f0e8]/70 uppercase"
        style={{ paddingLeft: '0.4em' }}
      >
        Cards
      </div>
    </div>
  </div>
);

const CardFront = ({ type, text, title }: { type: string; text: string; title: string }) => (
  <div
    className="absolute inset-0 w-full h-full rounded-2xl flex flex-col"
    style={{
      backfaceVisibility: "hidden",
      transform: "rotateY(180deg)",
      background: "#f7f3ee",
      border: "1px solid #ddd6cc",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08), 0 20px 50px rgba(0,0,0,0.1)",
    }}
  >
    <div className="flex items-center justify-between px-5 pt-5 pb-0">
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", letterSpacing: "0.35em", textTransform: "uppercase", color: "#a89070" }}>
        {type}
      </span>
      <div className="flex items-center justify-center" style={{ width: "28px", height: "28px", borderRadius: "50%", border: "1px solid rgba(90,74,56,0.2)", background: "transparent" }}>
        <Heart style={{ width: "13px", height: "13px", color: "#5a4a38", strokeWidth: 1.25 }} />
      </div>
    </div>

    <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
      <p style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: "19px", fontWeight: 300, lineHeight: 1.55, color: "#2c2318", letterSpacing: "0.01em" }}>
        {text}
      </p>
    </div>

    <div className="px-5 pb-5 pt-0 flex items-center justify-center">
      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: "8px", letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(90,74,56,0.4)" }}>
        {title}
      </span>
    </div>
  </div>
);

// Miniature Card Back for the 3-card Fan Animation
const MiniCardBack = () => (
  <div className="w-full h-full relative bg-gradient-to-br from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] rounded-lg border border-[#8b7355]/30 shadow-lg flex flex-col items-center justify-center overflow-hidden">
    <div 
      className="absolute inset-0 opacity-[0.08] mix-blend-overlay pointer-events-none"
      style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='6' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")` }}
    />
    <span className="font-cinzel text-[12px] font-normal tracking-[0.2em] text-[#f5f0e8] uppercase" style={{ paddingLeft: '0.2em' }}>
      K
    </span>
  </div>
);

// ─── Interactive Card Stack Preview ───────────────────────────────────────────
function CardPreviewStack({ cards, onFinish, soundEnabled }: { cards: any[]; onFinish: () => void; soundEnabled: boolean }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  const handleCardClick = () => {
    if (!flipped) {
      if (soundEnabled) {
        const audio = new Audio("/sounds/drawcard.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {});
      }
      setFlipped(true);
    } else {
      if (index + 1 >= cards.length) {
        onFinish();
      } else {
        setFlipped(false);
        setIndex((i) => i + 1);
      }
    }
  };

  const currentCard = cards[index] || {};
  const cardTitle = currentCard.title || "Deep Connection";
  const cardType = currentCard.type || "Question Card";
  const cardText = currentCard.question || currentCard.text || currentCard.front || "Blank Card";

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px' }}>
      
      <div style={{ marginBottom: 24, fontFamily: "'Space Mono', monospace", fontSize: 12, color: '#f5f0e8', textTransform: 'uppercase', letterSpacing: '0.2em', opacity: 0.9, fontWeight: 600 }}>
        Preview • {index + 1} / {cards.length}
      </div>

      <div className="relative w-64 sm:w-72 aspect-[3/4]" style={{ perspective: "1200px" }}>
        <AnimatePresence mode="popLayout">
          <motion.div
            key={index}
            initial={{ scale: 0.9, opacity: 0, x: -60, rotateZ: -10 }}
            animate={{ scale: 1, opacity: 1, x: 0, rotateZ: 0 }}
            exit={{ x: 300, y: -50, rotateZ: 20, opacity: 0 }}
            transition={{ duration: 0.5, ease: "backOut" }}
            onClick={handleCardClick}
            style={{ position: 'absolute', inset: 0, zIndex: 20, cursor: 'pointer' }}
          >
            <motion.div
              className="w-full h-full relative"
              style={{ transformStyle: "preserve-3d" }}
              animate={{ rotateY: flipped ? 180 : 0 }}
              transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 20 }}
            >
              <CardBack />
              <CardFront type={cardType} text={cardText} title={cardTitle} />
            </motion.div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ marginTop: 32, display: 'flex', gap: 16, alignItems: 'center' }}>
        <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.15em', color: '#f5f0e8', opacity: 0.8 }}>
          {flipped ? "Tap to draw next" : "Tap to flip"}
        </p>
        <span style={{ color: '#f5f0e8', opacity: 0.4 }}>|</span>
        <button 
          onClick={(e) => { e.stopPropagation(); onFinish(); }} 
          style={{ background: 'none', border: 'none', color: '#f5f0e8', fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', cursor: 'pointer', opacity: 0.8 }}
        >
          Skip Preview
        </button>
      </div>
    </div>
  );
}


// ─── Deck Receive Modal (With Flow Transition) ─────────────────────────────────
function DeckReceiveModal({
  notif,
  onConfirm,
  onClose,
  soundEnabled,
}: {
  notif: Notif;
  onConfirm: () => Promise<any[] | void>;
  onClose: () => void;
  soundEnabled: boolean;
}) {
  const [phase, setPhase] = useState<"idle" | "loading" | "preview" | "success">("idle");
  const [previewCards, setPreviewCards] = useState<any[]>([]);

  const handleConfirm = async () => {
    if (phase !== "idle") return;
    setPhase("loading");
    const fetchedCards = await onConfirm();
    if (fetchedCards && fetchedCards.length > 0) {
      setPreviewCards(fetchedCards);
      setPhase("preview");
    } else {
      setPhase("success");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }} 
      exit={{ opacity: 0 }} 
      transition={{ duration: 0.3 }}
      style={{
        position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(12px)", padding: "16px",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && (phase === "idle" || phase === "success")) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: "100%", maxWidth: 360 }}
      >
        <AnimatePresence mode="wait">
          
          {/* Phase 1: Summary Box with 3 Fanned Cards */}
          {(phase === "idle" || phase === "loading") && (
            <motion.div
              key="summary"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              style={{
                backgroundColor: "var(--bg-nav)", borderRadius: 24, border: "1px solid var(--border-subtle)",
                boxShadow: "0 32px 80px -16px rgba(0,0,0,0.4)", overflow: "hidden", position: "relative"
              }}
            >
              <div style={{ height: 4, background: "linear-gradient(90deg, var(--border-subtle), var(--border-strong), var(--border-subtle))" }} />
              
              <div style={{ position: "relative", height: 150, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, var(--icon-bg) 0%, transparent 70%)" }} />
                
                <div style={{ position: "relative", width: 100, height: 90, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <motion.div initial={{ rotate: 0, x: 0, y: 0 }} animate={{ rotate: -15, x: -30, y: 10 }} transition={{ duration: 0.6, delay: 0.1, ease: "backOut" }} className="absolute w-[60px] aspect-[3/4] z-0">
                    <MiniCardBack />
                  </motion.div>

                  <motion.div initial={{ rotate: 0, x: 0, y: 0 }} animate={{ rotate: 15, x: 30, y: 10 }} transition={{ duration: 0.6, delay: 0.2, ease: "backOut" }} className="absolute w-[60px] aspect-[3/4] z-0">
                    <MiniCardBack />
                  </motion.div>

                  <motion.div initial={{ scale: 0.8, y: 15 }} animate={{ scale: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.3, ease: "backOut" }} className="absolute w-[66px] aspect-[3/4] z-10">
                    <MiniCardBack />
                  </motion.div>
                </div>

                {[
                  { top: "20%", left: "18%", delay: "0s", size: 12 }, { top: "15%", right: "22%", delay: "0.3s", size: 8 },
                  { bottom: "25%", left: "28%", delay: "0.6s", size: 6 }, { bottom: "20%", right: "18%", delay: "0.9s", size: 10 },
                ].map((s, i) => (
                  <div key={i} style={{ position: "absolute", ...s, animation: `sparkle 2s ${s.delay} ease-in-out infinite`, color: "var(--text-accent)" }}>
                    <Sparkles size={s.size} strokeWidth={1.5} />
                  </div>
                ))}
              </div>

              <div style={{ padding: "0 28px 28px" }}>
                <div style={{ marginBottom: 6 }}>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.25em", color: "var(--text-accent)" }}>Deck received</span>
                </div>
                <h2 style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 26, fontWeight: 500, lineHeight: 1.2, color: "var(--text-main)", marginBottom: 4 }}>
                  {notif.deckTitle || "Untitled Deck"}
                </h2>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-sub)", opacity: 0.6, marginBottom: 8 }}>
                  {notif.cardCount ?? 0} cards · from {notif.fromName.split(" ")[0]}
                </p>
                
                {notif.deckDescription && (
                  <p style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, color: "var(--text-sub)", lineHeight: 1.55, marginBottom: 16, fontStyle: "italic" }}>
                    {notif.deckDescription}
                  </p>
                )}
                
                <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={handleConfirm} disabled={phase !== "idle"}
                    style={{ flex: 1, padding: "11px 0", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: "var(--action-bg)", color: "var(--action-text)", fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "var(--shadow-primary)" }}>
                    {phase === "loading" ? <div style={{ width: 12, height: 12, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "var(--action-text)", animation: "kspin 0.7s linear infinite" }} /> : <><Check size={11} /> Add to Library</>}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} onClick={onClose} disabled={phase !== "idle"}
                    style={{ padding: "11px 18px", borderRadius: 999, cursor: "pointer", backgroundColor: "transparent", color: "var(--text-sub)", border: "1px solid var(--border-subtle)", fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em" }}>Later</motion.button>
                </div>
              </div>
              
              <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: "var(--text-sub)", opacity: 0.4, padding: 4 }}>
                <X size={16} strokeWidth={1.5} />
              </button>
            </motion.div>
          )}

          {/* Phase 2: Interactive Deck Preview */}
          {phase === "preview" && (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <CardPreviewStack cards={previewCards} onFinish={() => setPhase("success")} soundEnabled={soundEnabled} />
            </motion.div>
          )}

          {/* Phase 3: Simple & Clean Success Box */}
          {phase === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
              style={{ backgroundColor: "var(--bg-nav)", borderRadius: 24, border: "1px solid var(--border-subtle)", boxShadow: "0 32px 80px -16px rgba(0,0,0,0.4)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}
            >
              <div className="relative mb-6">
                <motion.div 
                  initial={{ scale: 0.5, opacity: 0.5 }} 
                  animate={{ scale: 2, opacity: 0 }} 
                  transition={{ duration: 1.5, ease: "easeOut" }} 
                  className="absolute inset-0 rounded-full"
                  style={{ backgroundColor: "var(--border-strong)" }}
                />
                <motion.div 
                  initial={{ scale: 0 }} 
                  animate={{ scale: 1 }} 
                  transition={{ type: "spring", stiffness: 300, damping: 20, delay: 0.1 }} 
                  style={{ position: 'relative', width: 48, height: 48, borderRadius: "50%", backgroundColor: "var(--icon-bg)", border: "1px solid var(--border-strong)", display: "flex", alignItems: "center", justifyContent: "center" }}
                >
                  <Check size={20} strokeWidth={1.5} style={{ color: "var(--text-accent)" }} />
                </motion.div>
              </div>
              
              <h3 style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 24, fontWeight: 500, color: "var(--text-main)", marginBottom: 6 }}>Added to library!</h3>
              <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-accent)", marginBottom: 28 }}>{notif.deckTitle} is ready</p>
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose} style={{ width: "100%", padding: "12px 0", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: "var(--action-bg)", color: "var(--action-text)", fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", boxShadow: "var(--shadow-primary)" }}>
                Done
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Deck accept row with shimmer ──────────────────────────────────────────────
function DeckRow({ notif, onOpenModal, done }: { notif: Notif; onOpenModal: (e: React.MouseEvent) => void; done: boolean; }) {
  const [hovered, setHovered] = useState(false);
  
  return (
    <div onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={done ? undefined : onOpenModal}
      style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${hovered && !done ? "var(--border-strong)" : "var(--border-subtle)"}`, cursor: done ? "default" : "pointer", transform: hovered && !done ? "scale(1.015)" : "scale(1)", transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease", marginTop: 10 }}>
      
      {hovered && !done && (
        <div aria-hidden style={{ position: "absolute", top: 0, left: 0, bottom: 0, width: "40%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.13), transparent)", animation: "shimmerSweep 0.65s ease forwards", zIndex: 5, pointerEvents: "none" }} />
      )}
      
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "10px 14px", backgroundColor: hovered && !done ? "var(--bg-card-hover)" : "transparent", transition: "background-color 0.3s ease" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--icon-bg)" }}>
            <Library size={14} strokeWidth={1.5} style={{ color: "var(--text-accent)" }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 15, fontWeight: 500, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {notif.deckTitle}
            </p>
            <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-sub)", opacity: 0.6, marginTop: 2 }}>
              {notif.cardCount ?? 0} cards
            </p>
          </div>
        </div>
        
        <div style={{ flexShrink: 0, transition: "opacity 0.2s ease" }}>
          {done ? (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-accent)" }}>Added ✓</span> 
          ) : (
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--text-accent)", opacity: hovered ? 1 : 0, transition: "opacity 0.2s" }}>View →</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Notification row ──────────────────────────────────────────────────────────
function NotifRow({ notif, onAcceptFriend, onDeclineFriend, onDelete, onOpenDeckModal, onMarkRead }: { notif: Notif; onAcceptFriend: (n: Notif) => Promise<void>; onDeclineFriend: (n: Notif) => Promise<void>; onDelete: (id: string) => void; onOpenDeckModal: (n: Notif) => void; onMarkRead: (id: string) => void; }) {
  const [processing, setProcessing] = useState(false);
  const isDeck = notif.type === "deck_share";
  const currentFriendStatus = notif.status; 
  const isDeckDone = notif.status === "added";

  return (
    <motion.div
      layout
      // Outer wrapper gracefully handles the slide-up animation by shrinking height to 0
      initial={{ opacity: 0, height: 0, marginBottom: 0 }}
      animate={{ opacity: 1, height: "auto", marginBottom: 12 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      style={{ overflow: "hidden" }}
    >
      {/* Inner card maintains perfect original sizing and padding */}
      <div 
        className="hover-card border rounded-2xl relative"
        onClick={() => { if (!notif.read) onMarkRead(notif.id); }}
        style={{ 
          borderColor: "var(--border-subtle)", 
          padding: "20px", 
          opacity: notif.read && !isDeck && !currentFriendStatus ? 0.65 : 1,
          transition: "opacity 0.3s ease" 
        }}
      >
        {!notif.read && !notif.status && (
          <span style={{ position: "absolute", top: 18, right: 16, width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--border-strong)" }} />
        )}

        <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
          <Avatar name={notif.fromName} photo={notif.fromPhoto} size={44} />
          
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "flex-start", justifyItems: "space-between", justifyContent: "space-between", gap: 8 }}>
              <div>
                <p className="font-crimson" style={{ fontSize: 18, fontWeight: 500, color: "var(--text-main)", lineHeight: 1.25 }}>
                  {notif.fromName}
                </p>
                <p className="font-mono" style={{ fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-sub)", opacity: 0.6, marginTop: 3 }}>
                  {isDeck ? "Shared a deck with you" : "Sent you a friend request"} · {relativeTime(notif.sentAt)}
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete(notif.id); }} 
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-sub)", opacity: 0.3, flexShrink: 0, marginTop: 2, padding: 2 }} 
                onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")} 
                onMouseLeave={e => (e.currentTarget.style.opacity = "0.3")}
              >
                <Trash2 size={13} strokeWidth={1.5} />
              </button>
            </div>

            {isDeck && !isDeckDone && (
              <DeckRow notif={notif} done={false} onOpenModal={(e) => { e.stopPropagation(); if (!notif.read) onMarkRead(notif.id); onOpenDeckModal(notif); }} />
            )}
            
            {isDeck && isDeckDone && (
              <div style={{ marginTop: 12, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--icon-bg)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <p className="font-mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 6, textAlign: "center" }}>
                  <Check size={12} strokeWidth={2} /> Added to your library
                </p>
              </div>
            )}

            {!isDeck && !currentFriendStatus && (
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <motion.button 
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }} 
                  onClick={(e) => { e.stopPropagation(); setProcessing(true); onAcceptFriend(notif).finally(() => setProcessing(false)); }} 
                  disabled={processing} 
                  style={{ padding: "7px 20px", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: "var(--action-bg)", color: "var(--action-text)", fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", display: "flex", alignItems: "center", gap: 5, boxShadow: "var(--shadow-primary)", opacity: processing ? 0.6 : 1 }}
                >
                  {processing ? "..." : <><Check size={10} /> Accept</>}
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.03 }} 
                  whileTap={{ scale: 0.97 }} 
                  onClick={(e) => { e.stopPropagation(); setProcessing(true); onDeclineFriend(notif).finally(() => setProcessing(false)); }} 
                  disabled={processing} 
                  style={{ padding: "7px 16px", borderRadius: 999, cursor: "pointer", backgroundColor: "transparent", color: "var(--text-sub)", border: "1px solid var(--border-subtle)", fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", opacity: processing ? 0.6 : 1 }}
                >
                  Decline
                </motion.button>
              </div>
            )}
            
            {!isDeck && currentFriendStatus === "accepted" && (
              <div style={{ marginTop: 12, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--icon-bg)", borderRadius: 8, border: "1px solid var(--border-subtle)" }}>
                <p className="font-mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 6, textAlign: "center" }}>
                  <Check size={12} strokeWidth={2} /> Now friends with {notif.fromName.split(" ")[0]}
                </p>
              </div>
            )}
            
            {!isDeck && currentFriendStatus === "declined" && (
              <div style={{ marginTop: 12, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "transparent", borderRadius: 8, border: "1px dashed var(--border-subtle)" }}>
                <p className="font-mono" style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-sub)", opacity: 0.6, textAlign: "center" }}>
                  Request declined
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "decks" | "friends">("all");
  const [activeModalNotif, setActiveModalNotif] = useState<Notif | null>(null); 

  const { soundEnabled, trackIndex, trackCount, toggleSound, nextTrack, prevTrack, startIfNeeded } = useSoundContext();

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) { 
      setTheme("dark"); document.documentElement.classList.add("dark"); 
    }
    else { 
      setTheme("light"); document.documentElement.classList.remove("dark"); 
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next); localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  useEffect(() => { 
    const unsub = onAuthStateChanged(auth, u => { 
      if (!u) { router.push("/"); return; } 
      setUser(u); 
    }); 
    return () => unsub(); 
  }, [router]);

  useEffect(() => {
    if (!user) return;
    const unsubNotifs = onSnapshot(query(collection(db, "users", user.uid, "notifications"), orderBy("sentAt", "desc")), snap => {
      setNotifs(snap.docs.map(d => ({
        id: d.id, type: d.data().type, fromUid: d.data().fromUid, fromName: d.data().fromName || "Someone", fromPhoto: d.data().fromPhoto || null, deckId: d.data().deckId, deckTitle: d.data().deckTitle, deckDescription: d.data().deckDescription, cardCount: d.data().cardCount, requestId: d.data().requestId, sentAt: d.data().sentAt?.toMillis?.() ?? 0, read: d.data().read ?? false, status: d.data().status ?? null, 
      })));
      setLoading(false);
    });
    return () => unsubNotifs();
  }, [user]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); };

  const markRead = async (id: string) => { 
    if (!user) return; 
    try { await updateDoc(doc(db, "users", user.uid, "notifications", id), { read: true }); } 
    catch (e) { console.error("Failed to mark read"); } 
  };

  const acceptDeck = async (notif: Notif): Promise<any[]> => {
    if (!user || !notif.deckId) return [];
    try {
      const srcSnap = await getDoc(doc(db, "decks", notif.deckId));
      if (!srcSnap.exists()) { showToast("Deck no longer available"); return []; }
      const srcData = srcSnap.data();
      const newRef = await addDoc(collection(db, "decks"), { title: notif.deckTitle || srcData.title, category: srcData.category || "friends", description: srcData.description || "", owner: user.uid, sharedFrom: notif.fromName, createdAt: serverTimestamp() });
      const cardsSnap = await getDocs(collection(db, "decks", notif.deckId, "cards"));
      
      const copiedCards = [];
      for (const c of cardsSnap.docs) {
        const cData = c.data();
        copiedCards.push(cData);
        await addDoc(collection(db, "decks", newRef.id, "cards"), cData);
      }
      
      await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true, status: "added" });
      showToast("Deck added to your library!");
      return copiedCards;
    } catch { showToast("Failed to add deck"); return []; }
  };

  const acceptFriend = async (notif: Notif) => { 
    if (!user || !notif.requestId) return; 
    try { 
      await updateDoc(doc(db, "friendRequests", notif.requestId), { status: "accepted" }); 
      await setDoc(doc(db, "users", user.uid, "friends", notif.fromUid), { uid: notif.fromUid, displayName: notif.fromName, photoURL: notif.fromPhoto || "", addedAt: serverTimestamp() }); 
      await setDoc(doc(db, "users", notif.fromUid, "friends", user.uid), { uid: user.uid, displayName: user.displayName || "", photoURL: user.photoURL || "", addedAt: serverTimestamp() }); 
      await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true, status: "accepted" }); 
      showToast(`${notif.fromName.split(" ")[0]} is now your friend!`); 
    } catch { showToast("Failed to accept"); } 
  };

  const declineFriend = async (notif: Notif) => { 
    if (!user || !notif.requestId) return; 
    try { 
      await updateDoc(doc(db, "friendRequests", notif.requestId), { status: "declined" }); 
      await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true, status: "declined" }); 
    } catch { showToast("Failed to decline"); } 
  };

  const deleteNotif = async (id: string) => { 
    if (!user) return; 
    try { await deleteDoc(doc(db, "users", user.uid, "notifications", id)); } 
    catch { showToast("Failed to delete"); } 
  };

  const markAllRead = async () => { 
    if (!user) return; 
    await Promise.all(notifs.filter(n => !n.read).map(n => updateDoc(doc(db, "users", user.uid, "notifications", n.id), { read: true }).catch(() => {}))); 
    showToast("All marked as read"); 
  };

  const clearAll = async () => { 
    if (!user) return; 
    await Promise.all(notifs.map(n => deleteDoc(doc(db, "users", user.uid, "notifications", n.id)).catch(() => {}))); 
    showToast("Cleared all notifications"); 
  };

  const filtered = notifs.filter(n => { 
    if (filter === "unread") return !n.read; 
    if (filter === "decks") return n.type === "deck_share"; 
    if (filter === "friends") return n.type === "friend_request"; 
    return true; 
  });
  
  const unreadCount = notifs.filter(n => !n.read).length;

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson transition-colors duration-500" onClick={startIfNeeded}>
      <GlobalStyles />

      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md h-16 transition-colors duration-500" style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ x: -2 }} onClick={() => router.back()} className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-main)" }}>
              <ArrowLeft size={16} strokeWidth={1.5} />
            </motion.button>
            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-subtle)" }} />
            <div className="relative w-7 h-7 rounded-md overflow-hidden border cursor-pointer" style={{ borderColor: "var(--border-subtle)" }} onClick={() => router.push("/dashboard")}>
              <Image src="/logo.png" alt="Kamusta Logo" fill className="object-cover" sizes="28px" />
            </div>
            <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block" style={{ color: "var(--text-main)" }}>Notifications</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} onClick={prevTrack} style={{ color: "var(--text-sub)" }}>
                <SkipBack size={14} strokeWidth={1.5} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleSound} style={{ color: "var(--text-sub)" }}>
                {soundEnabled ? <Volume2 size={16} strokeWidth={1.5} /> : <VolumeX size={16} strokeWidth={1.5} />}
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.85 }} onClick={nextTrack} style={{ color: "var(--text-sub)" }}>
                <SkipForward size={14} strokeWidth={1.5} />
              </motion.button>
            </div>
            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-subtle)" }} />
            <motion.button whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }} whileTap={{ scale: 0.9 }} onClick={toggleTheme} style={{ color: "var(--text-sub)" }}>
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>
          </div>
        </div>
      </nav>

      <main className="pt-28 pb-20 px-4 sm:px-6 max-w-2xl mx-auto relative z-10">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55 }} className="mb-8">
          <div className="flex items-end justify-between">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.25em] block mb-2" style={{ color: "var(--text-accent)" }}>
                {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
              </span>
              <h1 className="text-4xl sm:text-5xl font-crimson font-medium tracking-tight" style={{ color: "var(--text-main)" }}>Notifications</h1>
            </div>
            {notifs.length > 0 && (
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={markAllRead} className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-main)" }}>
                    Mark all read
                  </motion.button>
                )}
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={clearAll} className="font-mono text-[9px] uppercase tracking-[0.15em] opacity-40 hover:opacity-70 transition-opacity flex items-center gap-1" style={{ color: "var(--text-sub)" }}>
                  <Trash2 size={11} strokeWidth={1.5} /> Clear all
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.05 }} className="flex border-b mb-8" style={{ borderColor: "var(--border-subtle)" }}>
          {([
            { key: "all", label: "All", count: notifs.length }, 
            { key: "unread", label: "Unread", count: unreadCount }, 
            { key: "decks", label: "Decks", count: notifs.filter(n => n.type === "deck_share").length }, 
            { key: "friends", label: "Friends", count: notifs.filter(n => n.type === "friend_request").length }
          ] as const).map(t => (
            <button 
              key={t.key} 
              onClick={() => setFilter(t.key)} 
              className="font-mono text-[9px] uppercase tracking-[0.2em] py-3 mr-5 flex items-center gap-1.5 transition-all" 
              style={{ color: "var(--text-main)", opacity: filter === t.key ? 1 : 0.38, borderBottom: filter === t.key ? "1px solid var(--text-main)" : "1px solid transparent" }}
            >
              {t.label}
              {t.count > 0 && (
                <span style={{ width: 16, height: 16, borderRadius: "50%", fontSize: 8, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: filter === t.key ? "var(--text-main)" : "var(--border-strong)", color: filter === t.key ? "var(--bg-base)" : "var(--text-main)" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {loading && (
          <div className="flex justify-center py-20">
            <div className="w-5 h-5 rounded-full border-t-2 animate-spin" style={{ borderColor: "var(--text-accent)" }} />
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center text-center py-24 gap-4">
            <Bell size={28} strokeWidth={1} style={{ color: "var(--text-accent)", opacity: 0.3 }} />
            <p className="font-crimson text-xl font-light" style={{ color: "var(--text-sub)" }}>
              {filter === "all" ? "No notifications yet" : `No ${filter} notifications`}
            </p>
            <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-accent)" }}>
              {filter === "all" ? "Add friends to get started" : "Switch to All to see everything"}
            </p>
            {filter === "all" && (
              <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => router.push("/friends")} className="mt-2 px-6 py-2.5 rounded-full font-mono text-[9px] uppercase tracking-[0.2em] primary-action flex items-center gap-2" style={{ color: "var(--action-text)" }}>
                <UserPlus size={12} /> Find Friends
              </motion.button>
            )}
          </motion.div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="flex flex-col">
            {/* AnimatePresence without popLayout ensures items animate their height down, pushing siblings up smoothly */}
            <AnimatePresence initial={false}>
              {filtered.map((notif) => (
                <NotifRow 
                  key={notif.id} 
                  notif={notif} 
                  onAcceptFriend={acceptFriend} 
                  onDeclineFriend={declineFriend} 
                  onDelete={deleteNotif} 
                  onOpenDeckModal={(n) => setActiveModalNotif(n)} 
                  onMarkRead={markRead} 
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </main>

      {/* FIXED TOAST NOTIFICATION: Centered Responsive Container */}
      <div className="fixed bottom-8 left-0 right-0 z-[9998] flex justify-center pointer-events-none px-4">
        <AnimatePresence>
          {toast && (
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }} 
              animate={{ opacity: 1, y: 0, scale: 1 }} 
              exit={{ opacity: 0, y: 20, scale: 0.95 }} 
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} 
              className="px-6 py-3.5 rounded-full primary-action shadow-2xl flex items-center justify-center text-center max-w-full"
            >
              <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.2em] truncate" style={{ color: "var(--action-text)" }}>
                {toast}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {activeModalNotif && (
          <DeckReceiveModal
            notif={activeModalNotif}
            soundEnabled={soundEnabled}
            onConfirm={async () => {
              const cards = await acceptDeck(activeModalNotif);
              return cards;
            }}
            onClose={() => setActiveModalNotif(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}