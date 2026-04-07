"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection, onSnapshot, query, where,
  orderBy, doc, updateDoc, addDoc, serverTimestamp,
  getDocs, getDoc, setDoc,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Bell, BellDot, X, Library, ChevronRight, Check, ArrowRight, Sparkles, Heart } from "lucide-react";
import { useSoundContext } from "@/components/sound-provider";

type Notification = {
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
};

function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function SmallAvatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) return (
    <div style={{ width: 32, height: 32, borderRadius: "50%", overflow: "hidden", flexShrink: 0, border: "1px solid var(--border-subtle)" }}>
      <Image src={photo} alt={name} width={32} height={32} style={{ objectFit: "cover", width: "100%", height: "100%" }} />
    </div>
  );
  return (
    <div style={{
      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
      display: "flex", alignItems: "center", justifyContent: "center",
      border: "1px solid var(--border-subtle)", backgroundColor: "var(--icon-bg)",
      color: "var(--text-accent)", fontFamily: "'Cinzel', serif", fontSize: 10, fontWeight: 600,
    }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Card Face Components ──────────────────────────────────────────────────────
const CardBack = () => (
  <div
    className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] rounded-2xl flex flex-col items-center justify-center border border-[#8b7355]/30"
    style={{
      backfaceVisibility: "hidden",
      boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
    }}
  >
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

// ─── Deck Receive Modal ────────────────────────────────────────────────────────
function DeckReceiveModal({
  notif,
  onConfirm,
  onClose,
  soundEnabled,
}: {
  notif: Notification;
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
        position: "fixed", inset: 0, zIndex: 9995, display: "flex", alignItems: "center", justifyContent: "center",
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
                  <div key={i} style={{ position: "absolute", ...s, animation: `sparkleAnim 2s ${s.delay} ease-in-out infinite`, color: "var(--text-accent)" }}>
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
                    style={{ flex: 1, padding: "11px 0", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: "var(--action-bg)", color: "var(--action-text)", fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, boxShadow: "0 4px 12px -4px rgba(0,0,0,0.3)" }}>
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
              
              <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={onClose} style={{ width: "100%", padding: "12px 0", borderRadius: 999, border: "none", cursor: "pointer", backgroundColor: "var(--action-bg)", color: "var(--action-text)", fontFamily: "'Space Mono', monospace", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", boxShadow: "0 4px 12px -4px rgba(0,0,0,0.3)" }}>
                Done
              </motion.button>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}

// ─── Deck card with shimmer hover animation ─────────────────────────────────────
function DeckCard({ notif, onOpenModal }: { notif: Notification; onOpenModal: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <>
      <style>{`
        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(300%); }
        }
        @keyframes kspin {
          to { transform: rotate(360deg); }
        }
        @keyframes sparkleAnim {
          0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
          50%       { opacity: 1; transform: scale(1) rotate(180deg); }
        }
      `}</style>
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onClick={onOpenModal}
        style={{
          position: "relative",
          borderRadius: 12,
          border: `1px solid ${hovered ? "var(--border-strong)" : "var(--border-subtle)"}`,
          cursor: "pointer",
          overflow: "hidden",
          marginTop: 12,
          transform: hovered ? "scale(1.022)" : "scale(1)",
          transition: "transform 0.3s cubic-bezier(0.16,1,0.3,1), border-color 0.3s ease",
        }}
      >
        {hovered && (
          <div
            aria-hidden
            style={{
              position: "absolute",
              top: 0, left: 0, bottom: 0,
              width: "40%",
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
              animation: "shimmerSweep 0.65s ease forwards",
              zIndex: 5,
              pointerEvents: "none",
            }}
          />
        )}

        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12,
          padding: "10px 12px",
          backgroundColor: hovered ? "var(--bg-card-hover)" : "transparent",
          transition: "background-color 0.3s ease",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              backgroundColor: "var(--icon-bg)",
            }}>
              <Library size={14} strokeWidth={1.5} style={{ color: "var(--text-accent)" }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, fontWeight: 500,
                color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {notif.deckTitle}
              </p>
              <p style={{
                fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase",
                letterSpacing: "0.1em", color: "var(--text-sub)", opacity: 0.6, marginTop: 2,
              }}>
                {notif.cardCount ?? 0} cards
              </p>
            </div>
          </div>

          <div style={{
            flexShrink: 0,
            opacity: hovered ? 1 : 0,
            transform: hovered ? "translateX(0)" : "translateX(-6px)",
            transition: "opacity 0.2s ease, transform 0.2s ease",
          }}>
            <ArrowRight size={14} strokeWidth={1.5} style={{ color: "var(--text-accent)" }} />
          </div>
        </div>

        <div style={{
          maxHeight: hovered ? 26 : 0,
          overflow: "hidden",
          transition: "max-height 0.25s cubic-bezier(0.16,1,0.3,1)",
        }}>
          <p style={{
            fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase",
            letterSpacing: "0.15em", color: "var(--text-accent)", padding: "0 12px 8px",
          }}>
            Click to preview and add →
          </p>
        </div>
      </div>
    </>
  );
}

// ── Single popup card ──────────────────────────────────────────────────────────
function NotifCard({
  notif, onDismiss, onAcceptDeck, onAcceptFriend, onDeclineFriend, DURATION, soundEnabled
}: {
  notif: Notification;
  onDismiss: (id: string) => void;
  onAcceptDeck: (notif: Notification) => Promise<any[]>;
  onAcceptFriend: (notif: Notification) => Promise<void>;
  onDeclineFriend: (notif: Notification) => Promise<void>;
  DURATION: number;
  soundEnabled: boolean;
}) {
  const [progress, setProgress] = useState(100);
  const [modalOpen, setModalOpen] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [friendStatus, setFriendStatus] = useState<"accepted" | "declined" | null>(null);

  const elapsedRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isPausedRef = useRef(false);

  const startInterval = () => {
    const segmentStart = Date.now();
    intervalRef.current = setInterval(() => {
      const total = elapsedRef.current + (Date.now() - segmentStart);
      const remaining = Math.max(0, 100 - (total / DURATION) * 100);
      setProgress(remaining);
      if (remaining === 0) {
        clearInterval(intervalRef.current!);
        onDismiss(notif.id);
      }
    }, 80);
  };

  useEffect(() => {
    startInterval();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  // Pause timer when modal is open OR when processing a friend request OR after completion
  useEffect(() => {
    if (modalOpen || processing || friendStatus) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      isPausedRef.current = true;
    } else if (isPausedRef.current && !processing && !friendStatus) {
      isPausedRef.current = false;
      startInterval();
    }
  }, [modalOpen, processing, friendStatus]);

  const handleAcceptFriendClick = async () => {
    setProcessing(true);
    try {
      await onAcceptFriend(notif);
      setFriendStatus("accepted");
      // Wait 2.5 seconds to show the success badge, then dismiss
      setTimeout(() => onDismiss(notif.id), 2500);
    } catch {
      setProcessing(false);
    }
  };

  const handleDeclineFriendClick = async () => {
    setProcessing(true);
    try {
      await onDeclineFriend(notif);
      setFriendStatus("declined");
      // Wait 1.5 seconds to show the decline text, then dismiss
      setTimeout(() => onDismiss(notif.id), 1500);
    } catch {
      setProcessing(false);
    }
  };

  const isDeck = notif.type === "deck_share";

  return (
    <>
      <AnimatePresence>
        {modalOpen && (
          <DeckReceiveModal
            notif={notif}
            soundEnabled={soundEnabled}
            onConfirm={async () => {
              return await onAcceptDeck(notif);
            }}
            onClose={() => {
              setModalOpen(false);
              onDismiss(notif.id); // Clean up the popup once they finish reviewing the deck
            }}
          />
        )}
      </AnimatePresence>

      <motion.div
        layout
        initial={{ opacity: 0, x: 80, scale: 0.9 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 80, scale: 0.9, transition: { duration: 0.22 } }}
        transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
        style={{
          position: "relative", borderRadius: 16, width: 300,
          border: "1px solid var(--border-subtle)",
          backgroundColor: "var(--bg-nav)", backdropFilter: "blur(16px)",
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.22)",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, backgroundColor: "var(--border-subtle)" }}>
          <div style={{ height: "100%", width: `${progress}%`, backgroundColor: "var(--border-strong)", transition: "width 0.08s linear" }} />
        </div>

        <div style={{ padding: "16px 14px 12px" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <SmallAvatar name={notif.fromName} photo={notif.fromPhoto} />
              <div>
                <p style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, fontWeight: 500, color: "var(--text-main)", lineHeight: 1.2 }}>
                  {notif.fromName.split(" ")[0]}
                </p>
                <p style={{ fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-sub)", opacity: 0.6, marginTop: 2 }}>
                  {isDeck ? "shared a deck with you" : "sent you a friend request"}
                </p>
              </div>
            </div>
            <button
              onClick={() => onDismiss(notif.id)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-sub)", opacity: 0.4, padding: 2, marginTop: 2, flexShrink: 0 }}
              onMouseEnter={e => (e.currentTarget.style.opacity = "0.9")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "0.4")}
            >
              <X size={14} strokeWidth={1.5} />
            </button>
          </div>

          {/* Deck card — opens modal on click */}
          {isDeck && <DeckCard notif={notif} onOpenModal={() => setModalOpen(true)} />}

          {/* Friend Request Actions & Badges */}
          {!isDeck && !friendStatus && (
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button 
                onClick={handleAcceptFriendClick} 
                disabled={processing}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 999, border: "none", cursor: "pointer",
                  backgroundColor: "var(--action-bg)", color: "var(--action-text)",
                  fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
                  boxShadow: "var(--shadow-primary)", opacity: processing ? 0.7 : 1
                }}
              >
                {processing ? (
                  <div style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid transparent", borderTopColor: "var(--action-text)", animation: "kspin 0.7s linear infinite" }} />
                ) : (
                  <><Check size={10} /> Accept</>
                )}
              </button>
              <button 
                onClick={handleDeclineFriendClick} 
                disabled={processing}
                style={{
                  flex: 1, padding: "7px 0", borderRadius: 999, cursor: "pointer",
                  backgroundColor: "transparent", color: "var(--text-sub)",
                  border: "1px solid var(--border-subtle)",
                  fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em",
                  opacity: processing ? 0.6 : 1
                }}
              >
                Decline
              </button>
            </div>
          )}

          {/* Friend Request Accepted Badge */}
          {!isDeck && friendStatus === "accepted" && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 12, padding: "8px 12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "var(--icon-bg)", borderRadius: 8,
                border: "1px solid var(--border-subtle)"
              }}
            >
              <p className="font-mono" style={{ 
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", 
                color: "var(--text-accent)", display: "flex", alignItems: "center", gap: 6, textAlign: "center" 
              }}>
                <Check size={12} strokeWidth={2} /> Now friends with {notif.fromName.split(" ")[0]}
              </p>
            </motion.div>
          )}

          {/* Friend Request Declined Badge */}
          {!isDeck && friendStatus === "declined" && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: 12, padding: "8px 12px",
                display: "flex", alignItems: "center", justifyContent: "center",
                backgroundColor: "transparent", borderRadius: 8,
                border: "1px dashed var(--border-subtle)"
              }}
            >
              <p className="font-mono" style={{ 
                fontSize: 9, textTransform: "uppercase", letterSpacing: "0.15em", 
                color: "var(--text-sub)", opacity: 0.6, textAlign: "center" 
              }}>
                Request declined
              </p>
            </motion.div>
          )}

        </div>
      </motion.div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FriendNotifications() {
  const router = useRouter();
  const DURATION = 57_000;
  const { soundEnabled } = useSoundContext();

  const [user, setUser] = useState<any>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [allNotifs, setAllNotifs] = useState<Notification[]>([]);
  const dismissedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, u => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const unsubNotifs = onSnapshot(
      query(collection(db, "users", user.uid, "notifications"), orderBy("sentAt", "desc")),
      snap => {
        const all: Notification[] = snap.docs.map(d => ({
          id: d.id, type: d.data().type,
          fromUid: d.data().fromUid, fromName: d.data().fromName || "Someone",
          fromPhoto: d.data().fromPhoto || null, deckId: d.data().deckId,
          deckTitle: d.data().deckTitle, deckDescription: d.data().deckDescription,
          cardCount: d.data().cardCount, requestId: d.data().requestId,
          sentAt: d.data().sentAt?.toMillis?.() ?? 0, read: d.data().read ?? false,
        }));
        setAllNotifs(all);
        setNotifications(prev => {
          const prevIds = new Set(prev.map(n => n.id));
          const stillVisible = prev.filter(n => !dismissedRef.current.has(n.id));
          const newOnes = all.filter(n => !n.read && !dismissedRef.current.has(n.id) && !prevIds.has(n.id));
          return [...stillVisible, ...newOnes];
        });
      }
    );

    const unsubRequests = onSnapshot(
      query(collection(db, "friendRequests"), where("toUid", "==", user.uid), where("status", "==", "pending")),
      async snap => {
        for (const change of snap.docChanges()) {
          if (change.type === "added") {
            const req = change.doc.data();
            const existingSnap = await getDocs(query(
              collection(db, "users", user.uid, "notifications"),
              where("type", "==", "friend_request"), where("fromUid", "==", req.fromUid)
            ));
            if (existingSnap.empty) {
              await addDoc(collection(db, "users", user.uid, "notifications"), {
                type: "friend_request", fromUid: req.fromUid, fromName: req.fromName,
                fromPhoto: req.fromPhoto || "", requestId: change.doc.id,
                sentAt: serverTimestamp(), read: false,
              });
            }
          }
        }
      }
    );

    return () => { unsubNotifs(); unsubRequests(); };
  }, [user]);

  const dismiss = (id: string) => {
    dismissedRef.current.add(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
    if (user) updateDoc(doc(db, "users", user.uid, "notifications", id), { read: true }).catch(() => {});
  };

  const acceptDeck = async (notif: Notification): Promise<any[]> => {
    if (!user || !notif.deckId) return [];
    try {
      const srcSnap = await getDoc(doc(db, "decks", notif.deckId));
      if (!srcSnap.exists()) return [];
      const srcData = srcSnap.data();
      const newRef = await addDoc(collection(db, "decks"), {
        title: notif.deckTitle || srcData.title, category: srcData.category || "friends",
        description: srcData.description || "", owner: user.uid,
        sharedFrom: notif.fromName, createdAt: serverTimestamp(),
      });
      const cardsSnap = await getDocs(collection(db, "decks", notif.deckId, "cards"));
      const copiedCards = [];
      for (const c of cardsSnap.docs) {
        const cData = c.data();
        copiedCards.push(cData);
        await addDoc(collection(db, "decks", newRef.id, "cards"), cData);
      }
      await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true });
      return copiedCards;
    } catch (err) { console.error("acceptDeck:", err); return []; }
  };

  const acceptFriend = async (notif: Notification): Promise<void> => {
    if (!user || !notif.requestId) return;
    await updateDoc(doc(db, "friendRequests", notif.requestId), { status: "accepted" });
    await setDoc(doc(db, "users", user.uid, "friends", notif.fromUid), {
      uid: notif.fromUid, displayName: notif.fromName, photoURL: notif.fromPhoto || "", addedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "users", notif.fromUid, "friends", user.uid), {
      uid: user.uid, displayName: user.displayName || "", photoURL: user.photoURL || "", addedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true });
  };

  const declineFriend = async (notif: Notification): Promise<void> => {
    if (!user || !notif.requestId) return;
    await updateDoc(doc(db, "friendRequests", notif.requestId), { status: "declined" });
    await updateDoc(doc(db, "users", user.uid, "notifications", notif.id), { read: true });
  };

  const unreadCount = allNotifs.filter(n => !n.read).length;
  if (!user) return null;

  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 300, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "flex-end" }}>
        <AnimatePresence mode="popLayout">
          {notifications.slice(0, 3).map(notif => (
            <NotifCard key={notif.id} notif={notif} onDismiss={dismiss}
              onAcceptDeck={acceptDeck} onAcceptFriend={acceptFriend}
              onDeclineFriend={declineFriend} DURATION={DURATION} soundEnabled={soundEnabled} />
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.94 }}
        onClick={() => setBellOpen(v => !v)}
        style={{
          position: "relative", width: 44, height: 44, borderRadius: "50%",
          border: "1px solid var(--border-strong)", backgroundColor: "var(--action-bg)",
          boxShadow: "0 4px 16px -4px rgba(0,0,0,0.3)",
          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
        }}
      >
        <motion.div animate={unreadCount > 0 ? { rotate: [0, -14, 14, -8, 8, 0] } : {}} transition={{ duration: 0.6, repeat: unreadCount > 0 ? Infinity : 0, repeatDelay: 5 }}>
          {unreadCount > 0
            ? <BellDot size={16} strokeWidth={1.5} style={{ color: "var(--action-text)" }} />
            : <Bell size={16} strokeWidth={1.5} style={{ color: "var(--action-text)" }} />}
        </motion.div>
        {unreadCount > 0 && (
          <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} style={{
            position: "absolute", top: -4, right: -4,
            width: 18, height: 18, borderRadius: "50%",
            backgroundColor: "#ef4444", color: "#fff",
            fontFamily: "'Space Mono', monospace", fontSize: 8, fontWeight: 700,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </motion.span>
        )}
      </motion.button>

      <AnimatePresence>
        {bellOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 8 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute", bottom: 56, right: 0, width: 300, borderRadius: 16,
              border: "1px solid var(--border-subtle)", backgroundColor: "var(--bg-nav)",
              backdropFilter: "blur(16px)", boxShadow: "0 16px 40px -8px rgba(0,0,0,0.25)",
              overflow: "hidden",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", borderBottom: "1px solid var(--border-subtle)" }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", color: "var(--text-accent)" }}>
                Notifications
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  onClick={() => { setBellOpen(false); router.push("/notifications"); }}
                  style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "'Space Mono', monospace", fontSize: 8, textTransform: "uppercase", letterSpacing: "0.15em", color: "var(--text-main)", opacity: 0.6, display: "flex", alignItems: "center", gap: 4 }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = "1")}
                  onMouseLeave={e => (e.currentTarget.style.opacity = "0.6")}
                >
                  See all <ChevronRight size={10} />
                </button>
                <button onClick={() => setBellOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-sub)", opacity: 0.4 }}>
                  <X size={13} strokeWidth={1.5} />
                </button>
              </div>
            </div>
            <div style={{ maxHeight: 280, overflowY: "auto", scrollbarWidth: "none" }}>
              {allNotifs.length === 0 ? (
                <div style={{ padding: "40px 16px", textAlign: "center" }}>
                  <Bell size={20} strokeWidth={1} style={{ color: "var(--text-accent)", opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                  <p style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 14, color: "var(--text-sub)", fontWeight: 300 }}>All caught up</p>
                </div>
              ) : allNotifs.slice(0, 10).map((notif, i) => (
                <div key={notif.id} style={{
                  display: "flex", alignItems: "center", gap: 12, padding: "10px 16px",
                  borderBottom: i < Math.min(allNotifs.length, 10) - 1 ? "1px solid var(--border-subtle)" : "none",
                  opacity: notif.read ? 0.45 : 1, transition: "opacity 0.3s",
                }}>
                  <SmallAvatar name={notif.fromName} photo={notif.fromPhoto} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontFamily: "'Crimson Pro', Georgia, serif", fontSize: 13, color: "var(--text-main)", lineHeight: 1.3 }}>
                      <span style={{ fontWeight: 500 }}>{notif.fromName.split(" ")[0]}</span>
                      {notif.type === "deck_share" ? ` shared "${notif.deckTitle}"` : " sent a friend request"}
                    </p>
                  </div>
                  {!notif.read && <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--border-strong)", flexShrink: 0 }} />}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}