"use client";

import { db } from "@/lib/firebase";
import {
  collection, getDocs, query, orderBy, doc, updateDoc,
  setDoc, getDoc, serverTimestamp, deleteDoc,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Moon, Sun, Flame, BookOpen, HelpCircle, Heart,
  Target, Key, Coffee, Compass, Search, X, ChevronDown,
  Trash2, Loader2, CalendarDays, Sparkles, Plus
} from "lucide-react";
import OnboardingTour from "@/components/onboarding-tour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { journalSteps } from "@/lib/tourSteps";

// ─── Types ────────────────────────────────────────────────────────────────────
type JournalEntry = {
  id: string;
  cardText: string;
  cardType: string;
  answer: string;
  mood?: string;
  timestamp: number;
  roomId?: string;
};

type StreakData = {
  count: number;
  lastDay: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const CARD_ICONS: Record<string, React.ElementType> = {
  question:     HelpCircle,
  appreciation: Heart,
  mission:      Target,
  secret:       Key,
  comfort:      Coffee,
  future:       Compass,
};

const CARD_TYPE_COLORS: Record<string, string> = {
  question:     "#8b7355",
  appreciation: "#8b5e6e",
  mission:      "#5e6e8b",
  secret:       "#6e5e8b",
  comfort:      "#7a6e5a",
  future:       "#5e8b6e",
};

const MOODS = [
  { emoji: "🌟", label: "inspired"  },
  { emoji: "😌", label: "calm"      },
  { emoji: "💭", label: "reflective"},
  { emoji: "😢", label: "heavy"     },
  { emoji: "🔥", label: "energized" },
  { emoji: "🌿", label: "grounded"  },
];

const FILTERS = ["all", "question", "appreciation", "mission", "secret", "comfort", "future"] as const;
type Filter = typeof FILTERS[number];

// ─── Global Styles ────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Pro:ital,wght@0,200;0,300;0,400;0,500;1,200;1,300&family=Space+Mono:wght@400&display=swap');

    :root {
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      --bg-card: #f5f2ee;
      --bg-card-hover: #efebe5;
      --text-main: #1a1a1a;
      --text-sub: #8c8c8c;
      --text-accent: #8b7355;
      --border-line: #e0dcd5;
      --border-strong: #a89070;
    }
    .dark {
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      --bg-card: #111113;
      --bg-card-hover: #18181b;
      --text-main: #f0f0f0;
      --text-sub: #555555;
      --text-accent: #71717a;
      --border-line: #1f1f1f;
      --border-strong: #3f3f46;
    }

    * { -webkit-tap-highlight-color: transparent !important; box-sizing: border-box; }
    button:focus, input:focus { outline: none; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.6s ease, color 0.6s ease;
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
    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-line); border-radius: 4px; }

    .journal-card {
      background: var(--bg-card);
      border: 1px solid var(--border-line);
      border-radius: 2px;
      transition: background 0.2s ease, border-color 0.2s ease;
      cursor: pointer;
    }
    .journal-card:hover {
      background: var(--bg-card-hover);
      border-color: var(--border-strong);
    }
    .naked-input {
      background: transparent; border: none; outline: none;
      width: 100%; font-family: 'Space Mono', monospace;
    }
    .naked-input::placeholder { color: var(--text-sub); opacity: 0.5; }
    .filter-pill {
      display: inline-flex; align-items: center; gap: 5px;
      padding: 4px 12px; border-radius: 999px;
      border: 1px solid var(--border-line);
      font-family: 'Space Mono', monospace;
      font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
      cursor: pointer; transition: all 0.2s ease;
      color: var(--text-sub);
      white-space: nowrap;
    }
    .filter-pill.active {
      border-color: var(--border-strong);
      color: var(--text-main);
      background: transparent;
    }
    .filter-pill:hover { color: var(--text-main); border-color: var(--border-strong); }
    .mood-btn {
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 10px 14px; border-radius: 4px;
      border: 1px solid var(--border-line);
      background: transparent; cursor: pointer;
      transition: all 0.2s ease; font-family: 'Space Mono', monospace;
      font-size: 7px; letter-spacing: 0.15em; text-transform: uppercase;
      color: var(--text-sub);
    }
    .mood-btn:hover, .mood-btn.selected {
      border-color: var(--border-strong);
      color: var(--text-main);
    }
    .mood-btn .emoji { font-size: 20px; line-height: 1; }
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .fade-up { animation: fadeUp 0.5s cubic-bezier(0.16,1,0.3,1) forwards; }
  `}</style>
);

// ─── Mood Picker (inline, shown on expanded entry if no mood yet) ─────────────
function MoodPicker({
  onSelect, current,
}: { onSelect: (mood: string) => void; current?: string }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="font-mono text-[8px] uppercase tracking-[0.25em]" style={{ color: "var(--text-sub)" }}>
        How did this make you feel?
      </span>
      <div className="flex flex-wrap gap-2">
        {MOODS.map(({ emoji, label }) => (
          <button
            key={label}
            className={`mood-btn ${current === label ? "selected" : ""}`}
            onClick={() => onSelect(label)}
          >
            <span className="emoji">{emoji}</span>
            <span>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Streak Banner ────────────────────────────────────────────────────────────
function StreakBanner({ streak }: { streak: StreakData | null }) {
  if (!streak || streak.count === 0) return null;
  const isToday = streak.lastDay === new Date().toDateString();
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-3 border px-5 py-3 rounded-sm mb-8"
      style={{ borderColor: "var(--border-line)", background: "var(--bg-card)" }}
    >
      <Flame size={14} style={{ color: isToday ? "#f97316" : "var(--text-sub)" }} />
      <div>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em]"
          style={{ color: isToday ? "#f97316" : "var(--text-sub)" }}>
          {streak.count} day{streak.count > 1 ? "s" : ""} streak
        </span>
        {!isToday && (
          <p className="font-crimson text-xs italic mt-0.5" style={{ color: "var(--text-sub)" }}>
            Draw a card today to keep it going
          </p>
        )}
      </div>
      {isToday && (
        <span className="ml-auto font-mono text-[8px] uppercase tracking-widest" style={{ color: "var(--text-sub)" }}>
          today ✓
        </span>
      )}
    </motion.div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────
function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  const router = useRouter();
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center justify-center py-24 text-center"
    >
      <BookOpen size={28} strokeWidth={1} style={{ color: "var(--text-sub)", opacity: 0.4 }} className="mb-5" />
      {hasFilter ? (
        <>
          <p className="font-crimson text-xl font-light italic mb-2" style={{ color: "var(--text-sub)" }}>
            No entries match this filter.
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest" style={{ color: "var(--text-sub)", opacity: 0.5 }}>
            Try a different type or clear the search.
          </p>
        </>
      ) : (
        <>
          <p className="font-crimson text-xl font-light italic mb-2" style={{ color: "var(--text-sub)" }}>
            Your journal is empty.
          </p>
          <p className="font-mono text-[9px] uppercase tracking-widest mb-8" style={{ color: "var(--text-sub)", opacity: 0.5 }}>
            Draw your first card to begin.
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="font-mono text-[10px] uppercase tracking-[0.25em] border px-5 py-2.5 rounded-full transition-all hover:border-[var(--border-strong)]"
            style={{ borderColor: "var(--border-line)", color: "var(--text-main)" }}
          >
            Go to Dashboard
          </button>
        </>
      )}
    </motion.div>
  );
}

// ─── Journal Entry Card ───────────────────────────────────────────────────────
function EntryCard({
  entry, onMoodSave, onDelete, dataTour
}: {
  entry: JournalEntry;
  onMoodSave: (id: string, mood: string) => void;
  onDelete: (id: string) => void;
  dataTour?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const Icon      = CARD_ICONS[entry.cardType] ?? HelpCircle;
  const typeColor = CARD_TYPE_COLORS[entry.cardType] ?? "#8b7355";
  const moodObj   = MOODS.find(m => m.label === entry.mood);

  const date = new Date(entry.timestamp);
  const dateStr = date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const timeStr = date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <motion.div
      layout
      data-tour={dataTour}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="journal-card" onClick={() => setExpanded(e => !e)}>
        {/* Header row */}
        <div className="flex items-start gap-4 p-5">
          {/* Type icon */}
          <div className="mt-0.5 shrink-0">
            <Icon size={14} strokeWidth={1.5} style={{ color: typeColor }} />
          </div>

          <div className="flex flex-col gap-1 flex-1 min-w-0">
            {/* Prompt */}
            <p className="font-crimson text-lg sm:text-xl font-light leading-snug line-clamp-2"
              style={{ color: "var(--text-main)" }}>
              {entry.cardText}
            </p>

            {/* Meta row */}
            <div className="flex items-center gap-3 flex-wrap mt-1">
              <span className="font-mono text-[8px] uppercase tracking-widest"
                style={{ color: typeColor, opacity: 0.8 }}>{entry.cardType}</span>
              <span className="font-mono text-[8px]" style={{ color: "var(--text-sub)" }}>·</span>
              <span className="font-mono text-[8px]" style={{ color: "var(--text-sub)" }}>{dateStr}</span>
              <span className="font-mono text-[8px]" style={{ color: "var(--text-sub)", opacity: 0.5 }}>{timeStr}</span>
              {moodObj && (
                <>
                  <span className="font-mono text-[8px]" style={{ color: "var(--text-sub)" }}>·</span>
                  <span style={{ fontSize: "13px" }}>{moodObj.emoji}</span>
                </>
              )}
            </div>
          </div>

          {/* Expand chevron */}
          <motion.div
            animate={{ rotate: expanded ? 180 : 0 }}
            transition={{ duration: 0.3 }}
            className="shrink-0 mt-1"
            style={{ color: "var(--text-sub)", opacity: 0.4 }}
          >
            <ChevronDown size={14} strokeWidth={1.5} />
          </motion.div>
        </div>

        {/* Expanded content */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: "hidden" }}
              onClick={e => e.stopPropagation()}
            >
              <div className="px-5 pb-5 flex flex-col gap-6 border-t" style={{ borderColor: "var(--border-line)" }}>
                {/* Answer */}
                <div className="pt-5">
                  <span className="font-mono text-[8px] uppercase tracking-[0.25em] block mb-3" style={{ color: "var(--text-sub)" }}>
                    Your reflection
                  </span>
                  <p className="font-crimson text-xl sm:text-2xl font-light leading-relaxed italic"
                    style={{ color: "var(--text-main)" }}>
                    {entry.answer}
                  </p>
                </div>

                {/* Mood picker */}
                <MoodPicker
                  current={entry.mood}
                  onSelect={mood => onMoodSave(entry.id, mood)}
                />

                {/* Delete */}
                <div className="flex justify-end pt-2 border-t" style={{ borderColor: "var(--border-line)" }}>
                  {!confirmDelete ? (
                    <button
                      onClick={() => setConfirmDelete(true)}
                      className="flex items-center gap-2 font-mono text-[8px] uppercase tracking-widest opacity-30 hover:opacity-70 transition-opacity"
                      style={{ color: "var(--text-sub)" }}
                    >
                      <Trash2 size={11} strokeWidth={1.5} />
                      <span>Delete</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-[8px] uppercase tracking-widest" style={{ color: "var(--text-sub)" }}>
                        Sure?
                      </span>
                      <button
                        onClick={() => onDelete(entry.id)}
                        className="font-mono text-[8px] uppercase tracking-widest"
                        style={{ color: "#ef4444" }}
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDelete(false)}
                        className="font-mono text-[8px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity"
                        style={{ color: "var(--text-sub)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Mood Summary Bar ─────────────────────────────────────────────────────────
function MoodSummary({ entries }: { entries: JournalEntry[] }) {
  const withMood = entries.filter(e => e.mood);
  if (withMood.length < 2) return null;

  const counts: Record<string, number> = {};
  withMood.forEach(e => { counts[e.mood!] = (counts[e.mood!] ?? 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="border p-5 mb-8"
      style={{ borderColor: "var(--border-line)", background: "var(--bg-card)" }}
    >
      <span className="font-mono text-[8px] uppercase tracking-[0.25em] block mb-4" style={{ color: "var(--text-sub)" }}>
        Mood overview · {withMood.length} entries
      </span>
      <div className="flex flex-wrap gap-3">
        {sorted.map(([label, count]) => {
          const moodObj = MOODS.find(m => m.label === label);
          if (!moodObj) return null;
          const pct = Math.round((count / withMood.length) * 100);
          return (
            <div key={label} className="flex items-center gap-2">
              <span style={{ fontSize: "16px" }}>{moodObj.emoji}</span>
              <div>
                <span className="font-mono text-[8px] uppercase tracking-widest block" style={{ color: "var(--text-main)" }}>
                  {label}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <div className="h-px rounded-full" style={{ width: `${pct * 0.6}px`, background: "var(--border-strong)" }} />
                  <span className="font-mono text-[7px]" style={{ color: "var(--text-sub)" }}>{pct}%</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
//  PAGE
// ═════════════════════════════════════════════════════════════════════════════
export default function JournalPage() {
  const router = useRouter();
  const tour = useOnboardingTour("journal");

  const [entries, setEntries]       = useState<JournalEntry[]>([]);
  const [streak, setStreak]         = useState<StreakData | null>(null);
  const [currentUser, setCurrentUser] = useState("");
  const [loading, setLoading]       = useState(true);
  const [theme, setTheme]           = useState<"light" | "dark">("light");
  const [mounted, setMounted]       = useState(false);

  const [search, setSearch]         = useState("");
  const [filter, setFilter]         = useState<Filter>("all");
  const [sortDesc, setSortDesc]     = useState(true);

  // ── Theme ──────────────────────────────────────────────────────────────────
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

  // ── Auth ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const name = localStorage.getItem("username");
    if (name) setCurrentUser(name);
    else router.push("/dashboard");
  }, [router]);

  // ── Fetch entries + streak ─────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;

    const fetchAll = async () => {
      setLoading(true);
      try {
        // Journal entries
        const q    = query(collection(db, "users", currentUser, "journal"), orderBy("timestamp", "desc"));
        const snap = await getDocs(q);
        const data: JournalEntry[] = snap.docs.map(d => ({
          id:        d.id,
          cardText:  d.data().cardText ?? "",
          cardType:  d.data().cardType ?? "question",
          answer:    d.data().answer ?? "",
          mood:      d.data().mood,
          timestamp: d.data().timestamp?.toMillis?.() ?? Date.now(),
          roomId:    d.data().roomId,
        }));
        setEntries(data);

        // Streak
        const streakDoc = await getDoc(doc(db, "users", currentUser, "streak", "data"));
        if (streakDoc.exists()) {
          setStreak(streakDoc.data() as StreakData);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [currentUser]);

  // ── Save mood ──────────────────────────────────────────────────────────────
  const handleMoodSave = async (entryId: string, mood: string) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, "users", currentUser, "journal", entryId), { mood });
      setEntries(prev => prev.map(e => e.id === entryId ? { ...e, mood } : e));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Delete entry ───────────────────────────────────────────────────────────
  const handleDelete = async (entryId: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, "users", currentUser, "journal", entryId));
      setEntries(prev => prev.filter(e => e.id !== entryId));
    } catch (e) {
      console.error(e);
    }
  };

  // ── Filtering & sorting ────────────────────────────────────────────────────
  const filtered = entries
    .filter(e => {
      const matchesType   = filter === "all" || e.cardType === filter;
      const matchesSearch = !search.trim() ||
        e.cardText.toLowerCase().includes(search.toLowerCase()) ||
        e.answer.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    })
    .sort((a, b) => sortDesc ? b.timestamp - a.timestamp : a.timestamp - b.timestamp);

  const hasFilter = filter !== "all" || !!search.trim();

  // ── Group by month ─────────────────────────────────────────────────────────
  const grouped: Record<string, JournalEntry[]> = {};
  filtered.forEach(e => {
    const key = new Date(e.timestamp).toLocaleDateString("en-US", { month: "long", year: "numeric" });
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  });

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson" style={{ background: "var(--bg-base)" }}>
      <GlobalStyles />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 backdrop-blur-md" style={{ background: "var(--bg-nav)" }}>
        <div className="max-w-3xl mx-auto px-6 h-full flex items-center justify-between">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-main)" }}
          >
            <ArrowLeft size={14} strokeWidth={1} />
            <span className="hidden sm:inline pt-[1px]">Dashboard</span>
          </button>

          <div className="flex items-center gap-2">
            <BookOpen size={13} strokeWidth={1} style={{ color: "var(--text-accent)" }} />
            <span className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: "var(--text-main)" }}>
              Journal
            </span>
          </div>

          <div className="flex items-center gap-4">
            {streak && streak.count > 0 && (
              <div className="flex items-center gap-1.5">
                <Flame size={12} strokeWidth={1.5} style={{ color: streak.lastDay === new Date().toDateString() ? "#f97316" : "var(--text-sub)" }} />
                <span className="font-mono text-[9px]" style={{ color: streak.lastDay === new Date().toDateString() ? "#f97316" : "var(--text-sub)" }}>
                  {streak.count}
                </span>
              </div>
            )}
            <button onClick={toggleTheme} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--text-main)" }}>
              {theme === "light" ? <Moon size={14} strokeWidth={1} /> : <Sun size={14} strokeWidth={1} />}
            </button>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">

        {/* Page header */}
        <div className="mb-12 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <motion.h1
              data-tour="journal-header"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-crimson text-4xl sm:text-5xl font-light mb-2"
              style={{ color: "var(--text-main)" }}
            >
              Your Reflections
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="font-mono text-[9px] uppercase tracking-[0.3em]"
              style={{ color: "var(--text-sub)" }}
            >
              {entries.length} {entries.length === 1 ? "entry" : "entries"} · solo mode
            </motion.p>
          </div>

          {/* New Entry Button for the Onboarding Tour */}
          <motion.button
            data-tour="new-entry-btn"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.6 }}
            onClick={() => router.push("/create-room")}
            className="flex items-center gap-2 border px-4 py-2 rounded-full font-mono text-[9px] uppercase tracking-widest transition-colors hover:bg-[var(--text-main)] hover:text-[var(--bg-base)]"
            style={{ color: "var(--text-main)", borderColor: "var(--border-line)" }}
          >
            <Plus size={12} strokeWidth={1.5} />
            <span>New Entry</span>
          </motion.button>
        </div>

        {/* Streak banner */}
        <StreakBanner streak={streak} />

        {/* Mood summary */}
        {!loading && <MoodSummary entries={entries} />}

        {/* Controls */}
        {!loading && entries.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="flex flex-col gap-4 mb-8"
          >
            {/* Search */}
            <div className="flex items-center gap-3 border-b pb-3" style={{ borderColor: "var(--border-line)" }}>
              <Search size={13} strokeWidth={1.5} style={{ color: "var(--text-sub)", opacity: 0.5, flexShrink: 0 }} />
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search prompts or answers..."
                className="naked-input font-mono text-[11px]"
                style={{ color: "var(--text-main)", fontSize: "11px" }}
              />
              {search && (
                <button onClick={() => setSearch("")} style={{ color: "var(--text-sub)", opacity: 0.5 }}>
                  <X size={12} strokeWidth={1.5} />
                </button>
              )}
            </div>

            {/* Filter pills + sort */}
            <div className="flex items-center gap-2 flex-wrap justify-between">
              <div className="flex items-center gap-2 flex-wrap">
                {FILTERS.map(f => (
                  <button
                    key={f}
                    className={`filter-pill ${filter === f ? "active" : ""}`}
                    onClick={() => setFilter(f)}
                  >
                    {f === "all" ? (
                      <Sparkles size={8} strokeWidth={1.5} />
                    ) : (
                      (() => {
                        const Icon = CARD_ICONS[f] ?? HelpCircle;
                        return <Icon size={8} strokeWidth={1.5} />;
                      })()
                    )}
                    {f}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setSortDesc(d => !d)}
                className="flex items-center gap-1.5 font-mono text-[8px] uppercase tracking-widest opacity-50 hover:opacity-100 transition-opacity shrink-0"
                style={{ color: "var(--text-sub)" }}
              >
                <CalendarDays size={10} strokeWidth={1.5} />
                {sortDesc ? "Newest" : "Oldest"}
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-24 gap-3" style={{ color: "var(--text-sub)" }}>
            <Loader2 size={16} className="animate-spin" strokeWidth={1.5} />
            <span className="font-mono text-[9px] uppercase tracking-widest">Loading</span>
          </div>
        )}

        {/* Empty state */}
        {!loading && filtered.length === 0 && (
          <EmptyState hasFilter={hasFilter} />
        )}

        {/* Entries grouped by month */}
        {!loading && filtered.length > 0 && (
          <div className="flex flex-col gap-10">
            {Object.entries(grouped).map(([month, monthEntries], gi) => (
              <motion.div
                key={month}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: gi * 0.05, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                {/* Month label */}
                <div className="flex items-center gap-4 mb-4">
                  <span className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)" }}>
                    {month}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--border-line)" }} />
                  <span className="font-mono text-[8px]" style={{ color: "var(--text-sub)", opacity: 0.5 }}>
                    {monthEntries.length}
                  </span>
                </div>

                {/* Cards */}
                <AnimatePresence>
                  <div className="flex flex-col gap-2">
                    {monthEntries.map((entry, i) => (
                      <EntryCard
                        key={entry.id}
                        dataTour={gi === 0 && i === 0 ? "entry-card" : undefined}
                        entry={entry}
                        onMoodSave={handleMoodSave}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}

        {/* Footer count */}
        {!loading && filtered.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="mt-16 pt-6 border-t text-center"
            style={{ borderColor: "var(--border-line)" }}
          >
            <span className="font-mono text-[8px] uppercase tracking-[0.3em]" style={{ color: "var(--text-sub)", opacity: 0.4 }}>
              {filtered.length} of {entries.length} entries shown
            </span>
          </motion.div>
        )}
      </main>

      <OnboardingTour 
        steps={journalSteps} 
        isOpen={tour.isOpen} 
        stepIndex={tour.stepIndex} 
        onNext={() => tour.next(journalSteps.length)} 
        onPrev={tour.prev} 
        onSkip={tour.skip} 
        onFinish={tour.finish} 
      />
    </div>
  );
}