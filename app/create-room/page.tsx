"use client";

import { db, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { nanoid } from "nanoid";
import { motion } from "framer-motion";
import Image from "next/image";
import { Moon, Sun, ArrowLeft, ArrowRight, Check } from "lucide-react";

// ============================================
// CSS VARIABLES & GLOBAL STYLES (Bulletproof Theme)
// ============================================
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
    
    :root {
      /* Light Mode Palette */
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      
      --text-main: #2c2825;
      --text-sub: #6b4423;
      --text-accent: #8b7355;
      
      --border-subtle: #e6dfd5;
      --border-strong: #a89070;
      
      /* Primary Action Button (Inverted) */
      --action-bg: #2c2825;
      --action-text: #f5f0e8;
      
      --shadow-primary: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
    }
    
    .dark {
      /* Dark Mode Palette */
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      
      --text-main: #e4ddd2;
      --text-sub: #a1a1aa;
      --text-accent: #71717a;
      
      --border-subtle: #27272a;
      --border-strong: #52525b;
      
      /* Primary Action Button (Inverted) */
      --action-bg: #e4ddd2;
      --action-text: #09090b;
      
      --shadow-primary: 0 8px 20px -8px rgba(255, 255, 255, 0.15);
    }
    
    * {
      -webkit-tap-highlight-color: transparent !important;
    }

    button:focus, a:focus {
      outline: none;
    }
    
    button:focus-visible, a:focus-visible {
      outline: 2px solid var(--border-strong);
      outline-offset: 2px;
    }
    
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.5s ease, color 0.5s ease;
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
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
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

    /* Minimalist Input Override */
    .minimal-input {
      border-radius: 0;
    }
    .minimal-input:focus, .minimal-input:focus-visible {
      outline: none !important;
      border-bottom-color: var(--text-main) !important;
    }

    /* Invisible Scrollbar for Deck List */
    .minimal-scrollbar::-webkit-scrollbar {
      width: 2px;
    }
    .minimal-scrollbar::-webkit-scrollbar-track {
      background: transparent;
    }
    .minimal-scrollbar::-webkit-scrollbar-thumb {
      background-color: var(--border-subtle);
      border-radius: 4px;
    }
  `}</style>
);

type Deck = {
  id: string;
  title: string;
  category: string;
};

export default function CreateRoomPage() {
  const router = useRouter();
  const[user, setUser] = useState<any>(null);
  const [nickname, setNickname] = useState("");
  const [selectedDeck, setSelectedDeck] = useState("");
  const [decks, setDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  // Theme state
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  // Handle Theme Safely on Mount
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
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  // Auth guard + prefill nickname
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/");
      else {
        setUser(u);
        const saved = localStorage.getItem("username");
        setNickname(saved || u.displayName || "");
      }
    });
    return () => unsub();
  }, [router]);

  // Fetch user's decks
  useEffect(() => {
    if (!user) return;
    const fetchDecks = async () => {
      const q = query(collection(db, "decks"), where("owner", "==", user.uid));
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((d) => ({
        id: d.id,
        title: d.data().title,
        category: d.data().category,
      }));
      setDecks(data);
      if (data.length > 0) setSelectedDeck(data[0].id);
    };
    fetchDecks();
  }, [user]);

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }
    if (!selectedDeck) {
      setError("Please select a deck");
      return;
    }

    setLoading(true);
    setError("");

    try {
      localStorage.setItem("username", nickname.trim());
      const roomCode = nanoid(6).toUpperCase();

      const docRef = await addDoc(collection(db, "rooms"), {
        roomCode,
        selectedDeck,
        currentCard: null,
        answers: {},
        answersRevealed: false,
        readyForNext:[],
        status: "waiting",
        players:[],
        currentDrawer: null,
        createdBy: user.uid,
        createdAt: Date.now(),
      });

      router.push(`/room/${docRef.id}/lobby`);
    } catch (err) {
      setError("Failed to create room.");
      setLoading(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson transition-colors duration-500 flex flex-col">
      <GlobalStyles />

      {/* Navbar Minimalist */}
      <nav 
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md h-16 transition-colors duration-500"
        style={{ backgroundColor: 'var(--bg-nav)' }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div 
              className="relative w-7 h-7 rounded-md overflow-hidden border"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <Image src="/logo.png" alt="Kamusta Logo" fill className="object-cover" />
            </div>
            <span 
              className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block"
              style={{ color: 'var(--text-main)' }}
            >
              Kamusta
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleTheme}
              className="transition-colors hover:opacity-100"
              style={{ color: 'var(--text-sub)' }}
              aria-label="Toggle Dark Mode"
            >
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>
            <div className="h-3 w-px bg-[var(--border-subtle)]" />
            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => router.back()}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] transition-colors hover:opacity-100 group"
              style={{ color: 'var(--text-sub)' }}
            >
              <ArrowLeft size={14} strokeWidth={1.5} className="group-hover:text-[var(--text-main)] transition-all" />
              <span className="hidden sm:inline group-hover:text-[var(--text-main)] transition-colors">Back</span> 
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
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
              style={{ color: 'var(--text-sub)' }}
            >
              Start a new game
            </span>
            <h1 
              className="text-4xl sm:text-5xl font-crimson font-light tracking-tight"
              style={{ color: 'var(--text-main)' }}
            >
              Create Room
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={createRoom} className="flex flex-col gap-10">
            
            {/* Error Message */}
            {error && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-500/90 font-mono text-[10px] uppercase tracking-widest text-center"
              >
                {error}
              </motion.div>
            )}

            {/* Name Input */}
            <div className="flex flex-col gap-3 group">
              <label 
                className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[var(--text-main)]"
                style={{ color: 'var(--text-sub)' }}
              >
                Your Nickname
              </label>
              <input
                type="text"
                placeholder="How should we call you?"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="minimal-input w-full bg-transparent border-b-2 pb-3 font-crimson text-2xl sm:text-3xl transition-all duration-500 placeholder:opacity-30"
                style={{ 
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-main)'
                }}
              />
            </div>

            {/* Deck List Selection - Styled to match minimal input */}
            <div className="flex flex-col gap-3 group">
              <label 
                className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group-focus-within:text-[var(--text-main)] flex justify-between items-center"
                style={{ color: 'var(--text-sub)' }}
              >
                <span>Select Deck</span>
                {decks.length > 0 && <span style={{ color: 'var(--text-accent)' }}>{decks.length} Available</span>}
              </label>
              
              {decks.length === 0 ? (
                <div 
                  className="w-full border-b-2 pb-3 font-crimson text-xl transition-all duration-500 flex justify-between items-center cursor-pointer opacity-50 hover:opacity-100"
                  style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-main)' }}
                  onClick={() => router.push("/decks")}
                >
                  No decks found
                  <span className="font-mono text-[9px] uppercase tracking-widest flex items-center gap-1">
                    Create <ArrowLeft className="w-3 h-3 rotate-180" />
                  </span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-48 overflow-y-auto minimal-scrollbar pr-2 mt-2">
                  {decks.map((deck) => {
                    const isSelected = selectedDeck === deck.id;
                    return (
                      <div
                        key={deck.id}
                        onClick={() => setSelectedDeck(deck.id)}
                        className="flex items-end justify-between border-b-2 pb-3 cursor-pointer transition-all duration-500"
                        style={{ 
                          borderColor: isSelected ? 'var(--text-main)' : 'var(--border-subtle)',
                          opacity: isSelected ? 1 : 0.4
                        }}
                      >
                        <div className="flex flex-col">
                          <span 
                            className="font-crimson text-xl sm:text-2xl transition-colors line-clamp-1" 
                            style={{ color: 'var(--text-main)' }}
                          >
                            {deck.title}
                          </span>
                          <span 
                            className="font-mono text-[9px] uppercase tracking-[0.2em] mt-1" 
                            style={{ color: 'var(--text-sub)' }}
                          >
                            {deck.category}
                          </span>
                        </div>
                        <div className="w-6 h-6 flex items-center justify-center mb-1">
                          {isSelected && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                              <Check className="w-5 h-5" style={{ color: 'var(--text-main)' }} strokeWidth={1.5} />
                            </motion.div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <motion.button
              whileHover={{ scale: loading || !nickname || !selectedDeck ? 1 : 1.02 }}
              whileTap={{ scale: loading || !nickname || !selectedDeck ? 1 : 0.98 }}
              type="submit"
              disabled={loading || !nickname || !selectedDeck}
              className="mt-6 primary-action h-14 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 select-none w-full"
              style={{ color: 'var(--action-text)' }}
            >
              {loading ? "Creating..." : "Launch"} 
              {!loading && <ArrowRight className="w-4 h-4" />}
            </motion.button>
          </form>
        </motion.div>
      </main>
    </div>
  );
}