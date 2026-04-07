"use client";

import { db, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, where, doc, deleteDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun, ArrowLeft, ArrowRight, Plus, X, Lock, Globe, Users, Heart, Home as HomeIcon, Coffee, Library, Sparkles, Trash2 } from "lucide-react";
import OnboardingTour from "@/components/onboarding-tour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { decksSteps } from "@/lib/tourSteps";

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

    button:focus, a:focus, input:focus, textarea:focus {
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

    .naked-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-line);
      border-radius: 0;
      outline: none;
      transition: border-color 0.4s ease, opacity 0.4s ease;
      width: 100%;
    }
    .naked-input:focus { border-bottom-color: var(--text-main); }
    .naked-input::placeholder { color: var(--text-sub); opacity: 0.3; }

    .naked-textarea {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-line);
      border-radius: 0;
      outline: none;
      transition: border-color 0.4s ease, opacity 0.4s ease;
      width: 100%;
      resize: none;
    }
    .naked-textarea:focus { border-bottom-color: var(--text-main); }
    .naked-textarea::placeholder { color: var(--text-sub); opacity: 0.3; }

    .custom-scrollbar::-webkit-scrollbar { width: 2px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-line); border-radius: 4px; }
  `}</style>
);

type Deck = {
  id: string;
  title: string;
  description: string;
  category: string;
  visibility: string;
};

const CATEGORIES =[
  { id: "friends", label: "Friends", icon: Users },
  { id: "couples", label: "Couples", icon: Heart },
  { id: "family", label: "Family", icon: HomeIcon },
  { id: "ldr", label: "LDR", icon: Globe },
  { id: "comfort", label: "Comfort", icon: Coffee },
];

const VISIBILITIES =[
  { id: "private", label: "Private", icon: Lock },
  { id: "public", label: "Public", icon: Globe },
];

const getCategoryIcon = (id: string, className: string = "") => {
  const CatIcon = CATEGORIES.find(c => c.id === id)?.icon || Library;
  return <CatIcon className={className} strokeWidth={1.5} />;
};

export default function DecksPage() {
  const router = useRouter();
  const tour = useOnboardingTour("decks");
  const [user, setUser] = useState<any>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const[showForm, setShowForm] = useState(false);
  
  // Form State
  const[title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("friends");
  const [visibility, setVisibility] = useState("private");
  const[loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Delete Deck State (Modal)
  const [deckToDelete, setDeckToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const[mounted, setMounted] = useState(false);

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

  // Auth guard
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) router.push("/");
      else setUser(u);
    });
    return () => unsub();
  },[router]);

  // Fetch user's decks
  useEffect(() => {
    if (!user) return;
    const fetchDecks = async () => {
      try {
        const q = query(collection(db, "decks"), where("owner", "==", user.uid));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Deck, "id">),
        }));
        setDecks(data);
      } finally {
        setFetching(false);
      }
    };
    fetchDecks();
  }, [user]);

  const handleCreateDeck = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, "decks"), {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        owner: user.uid,
        ownerName: user.displayName || "Unknown",
        likes: 0,
        createdAt: Date.now(),
      });

      // FIXED: Pushes to the deck editor instead of throwing 404
      router.push(`/decks/edit?id=${docRef.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, deckId: string) => {
    e.stopPropagation(); // Prevents clicking the row from navigating
    setDeckToDelete(deckId);
  };

  const confirmDelete = async () => {
    if (!deckToDelete) return;
    setIsDeleting(true);
    
    try {
      await deleteDoc(doc(db, "decks", deckToDelete));
      setDecks((prev) => prev.filter((d) => d.id !== deckToDelete));
    } catch (err) {
      console.error("Failed to delete deck:", err);
    } finally {
      setIsDeleting(false);
      setDeckToDelete(null);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col px-6">
      <GlobalStyles />

      {/* Invisible Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-[var(--bg-nav)] backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <motion.button 
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-main)' }}
          >
            <ArrowLeft size={14} strokeWidth={1} />
            <span className="hidden sm:inline pt-[1px]">Dashboard</span>
          </motion.button>
          
          <button
            onClick={toggleTheme}
            className="opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-main)' }}
          >
            {theme === "light" ? <Moon size={14} strokeWidth={1} /> : <Sun size={14} strokeWidth={1} />}
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col pt-32 pb-20 max-w-2xl mx-auto w-full relative z-10">
        
        {/* Header Area */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-12 border-b pb-8" style={{ borderColor: 'var(--border-line)' }}>
          <div>
            <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-4" style={{ color: 'var(--text-sub)' }}>
              Collection
            </span>
            <h1 data-tour="decks-header" className="text-4xl sm:text-5xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>
              Your Decks
            </h1>
          </div>

          <motion.button
            data-tour="new-deck-btn"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group"
            style={{ color: showForm ? 'var(--text-sub)' : 'var(--text-main)' }}
          >
            <span className="pt-[2px]">{showForm ? "Cancel" : "New Deck"}</span>
            <div className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors group-hover:bg-[var(--text-main)] group-hover:text-[var(--bg-base)] group-hover:border-[var(--text-main)]" style={{ borderColor: 'var(--border-line)' }}>
              {showForm ? <X size={12} strokeWidth={1.5} /> : <Plus size={12} strokeWidth={1.5} />}
            </div>
          </motion.button>
        </div>

        {/* Create Deck Form (Accordion) */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, height: "auto", filter: "blur(0px)", transition: { duration: 0.6, ease:[0.16, 1, 0.3, 1] as[number, number, number, number] } }}
              exit={{ opacity: 0, height: 0, filter: "blur(4px)", transition: { duration: 0.4 } }}
              className="overflow-hidden mb-16"
            >
              <div className="flex flex-col gap-10 pt-4 pb-8">
                
                {/* Title */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                    Title
                  </label>
                  <input
                    type="text"
                    placeholder="Name your deck..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="naked-input pb-2 font-crimson text-3xl sm:text-4xl"
                    style={{ color: 'var(--text-main)' }}
                  />
                </div>

                {/* Description */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                    Description
                  </label>
                  <textarea
                    placeholder="What is this deck about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="naked-textarea pb-2 font-crimson text-xl sm:text-2xl h-16"
                    style={{ color: 'var(--text-main)' }}
                  />
                </div>

                {/* Category & Visibility Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-10">
                  {/* Category Selection */}
                  <div className="flex flex-col gap-4">
                    <label className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                      Category
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {CATEGORIES.map((cat) => {
                        const isSelected = category === cat.id;
                        const Icon = cat.icon;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setCategory(cat.id)}
                            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] px-4 py-2 border rounded-full transition-all duration-300"
                            style={{ 
                              borderColor: isSelected ? 'var(--text-main)' : 'var(--border-line)',
                              color: isSelected ? 'var(--bg-base)' : 'var(--text-sub)',
                              backgroundColor: isSelected ? 'var(--text-main)' : 'transparent'
                            }}
                          >
                            <Icon size={12} />
                            <span className="pt-[1px]">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Visibility Selection */}
                  <div className="flex flex-col gap-4">
                    <label className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                      Visibility
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {VISIBILITIES.map((vis) => {
                        const isSelected = visibility === vis.id;
                        const Icon = vis.icon;
                        return (
                          <button
                            key={vis.id}
                            onClick={() => setVisibility(vis.id)}
                            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] px-4 py-2 border rounded-full transition-all duration-300"
                            style={{ 
                              borderColor: isSelected ? 'var(--text-main)' : 'var(--border-line)',
                              color: isSelected ? 'var(--bg-base)' : 'var(--text-sub)',
                              backgroundColor: isSelected ? 'var(--text-main)' : 'transparent'
                            }}
                          >
                            <Icon size={12} />
                            <span className="pt-[1px]">{vis.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleCreateDeck}
                    disabled={loading || !title.trim()}
                    className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span className="pt-[2px]">{loading ? "Creating..." : "Initialize"}</span>
                    <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Deck List */}
        <div className="flex flex-col gap-0">
          {fetching ? (
            <div className="py-20 text-center font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
              Loading collection...
            </div>
          ) : decks.length === 0 && !showForm ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
              className="py-24 text-center flex flex-col items-center gap-6"
            >
              <Sparkles size={24} strokeWidth={1} style={{ color: 'var(--border-strong)' }} />
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] max-w-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                Your library is empty. Begin curating your first deck.
              </p>
            </motion.div>
          ) : (
            decks.map((deck, i) => (
              <motion.div
                key={deck.id}
                data-tour={i === 0 ? "deck-card" : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: i * 0.05 }}
                // FIXED: Now pushes to the editor properly instead of throwing 404
                onClick={() => router.push(`/decks/edit?id=${deck.id}`)}
                className="group border-b py-8 cursor-pointer transition-all duration-500 relative"
                style={{ borderColor: 'var(--border-line)' }}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex flex-col gap-2">
                    <h2 
                      className="text-2xl sm:text-3xl font-light tracking-tight transition-colors group-hover:text-[var(--text-accent)]" 
                      style={{ color: 'var(--text-main)' }}
                    >
                      {deck.title}
                    </h2>
                    {deck.description && (
                      <p className="font-crimson text-lg line-clamp-1 opacity-70 max-w-lg" style={{ color: 'var(--text-sub)' }}>
                        {deck.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-4 sm:gap-6 shrink-0 mt-2 sm:mt-0">
                    <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
                      {getCategoryIcon(deck.category, "w-3 h-3")}
                      <span className="pt-[2px]">{deck.category}</span>
                    </div>
                    <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
                      {deck.visibility === 'public' ? <Globe className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                      <span className="pt-[2px]">{deck.visibility}</span>
                    </div>
                    
                    {/* Hover Actions (Delete & Arrow) */}
                    <div className="flex items-center gap-2 ml-2">
                      <button
                        onClick={(e) => handleDeleteClick(e, deck.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-red-500/10 rounded-full text-[var(--text-sub)] hover:text-red-500 shrink-0"
                        title="Delete Deck"
                      >
                        <Trash2 size={14} strokeWidth={1.5} />
                      </button>
                      <ArrowRight size={14} strokeWidth={1} className="opacity-0 -translate-x-4 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0 hidden sm:block" style={{ color: 'var(--text-accent)' }} />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>

      </main>

      <OnboardingTour 
        steps={decksSteps} 
        isOpen={tour.isOpen} 
        stepIndex={tour.stepIndex} 
        onNext={() => tour.next(decksSteps.length)} 
        onPrev={tour.prev} 
        onSkip={tour.skip} 
        onFinish={tour.finish} 
      />

      {/* -------------------------- */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* -------------------------- */}
      <AnimatePresence>
        {deckToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setDeckToDelete(null)}
            />
            
            {/* Modal Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.4, ease:[0.16, 1, 0.3, 1] }}
              className="relative w-full max-w-sm p-8 flex flex-col gap-8 shadow-2xl border"
              style={{ 
                backgroundColor: 'var(--bg-base)', 
                borderColor: 'var(--border-line)',
              }}
            >
              <div className="flex flex-col gap-3">
                <h3 className="font-crimson text-3xl" style={{ color: 'var(--text-main)' }}>
                  Erase Deck
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                  Are you certain? This action cannot be undone and will permanently remove this deck and all its prompts.
                </p>
              </div>

              <div className="flex items-center justify-end gap-6 pt-2">
                <button 
                  onClick={() => setDeckToDelete(null)}
                  disabled={isDeleting}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:opacity-70 disabled:opacity-30" 
                  style={{ color: 'var(--text-sub)' }}
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete} 
                  disabled={isDeleting}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors px-5 py-2.5 border rounded-full hover:bg-red-500 hover:text-white hover:border-red-500 disabled:opacity-30 disabled:cursor-not-allowed" 
                  style={{ color: 'var(--text-main)', borderColor: 'var(--border-line)' }}
                >
                  {isDeleting ? "Erasing..." : "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}