"use client";

import { db, auth } from "@/lib/firebase";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  updateDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Moon, Sun, ArrowLeft, ArrowRight, Plus, X, Lock, Globe, 
  HelpCircle, Heart, Target, Key, Coffee, Compass, Trash2, Sparkles, Pencil 
} from "lucide-react";

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

type Card = {
  id: string;
  text: string;
  type: string;
};

type Deck = {
  title: string;
  description: string;
  category: string;
  visibility: string;
  owner: string;
};

const CARD_TYPES =[
  { id: "question", label: "Question", icon: HelpCircle },
  { id: "appreciation", label: "Appreciation", icon: Heart },
  { id: "mission", label: "Mission", icon: Target },
  { id: "secret", label: "Secret", icon: Key },
  { id: "comfort", label: "Comfort", icon: Coffee },
  { id: "future", label: "Future", icon: Compass },
];

export default function DeckEditorPage() {
  const params = useParams();
  const deckId = params?.deckId as string;
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [deck, setDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Card[]>([]);
  const [fetching, setFetching] = useState(true);
  
  // Add Card State
  const[showForm, setShowForm] = useState(false);
  const [newCardText, setNewCardText] = useState("");
  const[newCardType, setNewCardType] = useState("question");
  const[loading, setLoading] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  // Edit Card State
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const[editCardText, setEditCardText] = useState("");
  const[editCardType, setEditCardType] = useState("question");
  const [editLoading, setEditLoading] = useState(false);

  // Delete Card State (Modal)
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Theme State
  const[theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

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

  // Fetch deck + cards
  useEffect(() => {
    if (!deckId || !user) return;

    const fetchData = async () => {
      try {
        const deckSnap = await getDoc(doc(db, "decks", deckId));
        if (!deckSnap.exists()) {
          router.push("/decks");
          return;
        }

        const deckData = deckSnap.data() as Deck;
        setDeck(deckData);
        setIsOwner(deckData.owner === user.uid);

        const cardsSnap = await getDocs(collection(db, "decks", deckId, "cards"));
        const cardsData = cardsSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Card, "id">),
        }));
        setCards(cardsData);
      } finally {
        setFetching(false);
      }
    };

    fetchData();
  },[deckId, user, router]);

  const addCard = async () => {
    if (!newCardText.trim()) return;
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, "decks", deckId, "cards"), {
        text: newCardText.trim(),
        type: newCardType,
        createdAt: Date.now(),
      });

      setCards((prev) =>[
        ...prev,
        { id: docRef.id, text: newCardText.trim(), type: newCardType },
      ]);
      setNewCardText("");
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!cardToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "decks", deckId, "cards", cardToDelete));
      setCards((prev) => prev.filter((c) => c.id !== cardToDelete));
    } catch (error) {
      console.error("Failed to delete:", error);
    } finally {
      setIsDeleting(false);
      setCardToDelete(null);
    }
  };

  const startEditing = (card: Card) => {
    setEditingCardId(card.id);
    setEditCardText(card.text);
    setEditCardType(card.type);
  };

  const cancelEditing = () => {
    setEditingCardId(null);
    setEditCardText("");
    setEditCardType("question");
  };

  const saveEdit = async () => {
    if (!editCardText.trim() || !editingCardId) return;
    setEditLoading(true);

    try {
      await updateDoc(doc(db, "decks", deckId, "cards", editingCardId), {
        text: editCardText.trim(),
        type: editCardType,
      });

      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? { ...c, text: editCardText.trim(), type: editCardType }
            : c
        )
      );
      cancelEditing();
    } catch (error) {
      console.error(error);
    } finally {
      setEditLoading(false);
    }
  };

  const toggleVisibility = async () => {
    const newVisibility = deck?.visibility === "public" ? "private" : "public";
    await updateDoc(doc(db, "decks", deckId), { visibility: newVisibility });
    setDeck((prev) => prev ? { ...prev, visibility: newVisibility } : prev);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col px-6">
      <GlobalStyles />

      {/* Invisible Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 bg-[var(--bg-nav)] backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-4 h-full flex items-center justify-between">
          <motion.button 
            onClick={() => router.push("/decks")}
            className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] opacity-60 hover:opacity-100 transition-opacity"
            style={{ color: 'var(--text-main)' }}
          >
            <ArrowLeft size={14} strokeWidth={1} />
            <span className="hidden sm:inline pt-[1px]">Back</span>
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
              Deck Editor
            </span>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>
              {deck?.title || "Loading..."}
            </h1>
            {deck?.description && (
              <p className="font-crimson text-lg mt-4 max-w-lg opacity-70" style={{ color: 'var(--text-sub)' }}>
                {deck.description}
              </p>
            )}
          </div>

          {isOwner && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={toggleVisibility}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors border px-4 py-2 rounded-full hover:bg-[var(--text-main)] text-[var(--text-main)] hover:text-[var(--bg-base)] shrink-0"
              style={{ borderColor: 'var(--border-line)' }}
            >
              {deck?.visibility === "public" ? <Globe size={12} strokeWidth={1.5} /> : <Lock size={12} strokeWidth={1.5} />}
              <span className="pt-[2px]">{deck?.visibility === "public" ? "Public" : "Private"}</span>
            </motion.button>
          )}
        </div>

        {/* Action Bar (Add Card Toggle) */}
        {!fetching && isOwner && (
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
              Cards ({cards.length})
            </h2>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => {
                setShowForm(!showForm);
                if (editingCardId) cancelEditing();
              }}
              className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] transition-colors group"
              style={{ color: showForm ? 'var(--text-sub)' : 'var(--text-main)' }}
            >
              <span className="pt-[2px]">{showForm ? "Cancel" : "Add Card"}</span>
              <div className="w-8 h-8 rounded-full border flex items-center justify-center transition-colors group-hover:bg-[var(--text-main)] group-hover:text-[var(--bg-base)] group-hover:border-[var(--text-main)]" style={{ borderColor: 'var(--border-line)' }}>
                {showForm ? <X size={12} strokeWidth={1.5} /> : <Plus size={12} strokeWidth={1.5} />}
              </div>
            </motion.button>
          </div>
        )}

        {/* Create Card Form (Accordion) */}
        <AnimatePresence>
          {showForm && isOwner && (
            <motion.div
              initial={{ opacity: 0, height: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, height: "auto", filter: "blur(0px)", transition: { duration: 0.6, ease:[0.16, 1, 0.3, 1] as[number, number, number, number] } }}
              exit={{ opacity: 0, height: 0, filter: "blur(4px)", transition: { duration: 0.4 } }}
              className="overflow-hidden mb-12"
            >
              <div className="flex flex-col gap-8 pt-4 pb-8 border-b" style={{ borderColor: 'var(--border-line)' }}>
                
                {/* Prompt */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                    Prompt
                  </label>
                  <textarea
                    placeholder="Write your card prompt..."
                    value={newCardText}
                    onChange={(e) => setNewCardText(e.target.value)}
                    className="naked-textarea pb-2 font-crimson text-2xl h-20 custom-scrollbar"
                    style={{ color: 'var(--text-main)' }}
                  />
                </div>

                {/* Type Selection */}
                <div className="flex flex-col gap-4">
                  <label className="font-mono text-[9px] uppercase tracking-[0.3em]" style={{ color: 'var(--text-sub)' }}>
                    Type
                  </label>
                  <div className="flex flex-wrap gap-3">
                    {CARD_TYPES.map((type) => {
                      const isSelected = newCardType === type.id;
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setNewCardType(type.id)}
                          className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] px-4 py-2 border rounded-full transition-all duration-300"
                          style={{ 
                            borderColor: isSelected ? 'var(--text-main)' : 'var(--border-line)',
                            color: isSelected ? 'var(--bg-base)' : 'var(--text-sub)',
                            backgroundColor: isSelected ? 'var(--text-main)' : 'transparent'
                          }}
                        >
                          <Icon size={12} strokeWidth={1.5} />
                          <span className="pt-[1px]">{type.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={addCard}
                    disabled={loading || !newCardText.trim()}
                    className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                    style={{ color: 'var(--text-main)' }}
                  >
                    <span className="pt-[2px]">{loading ? "Adding..." : "Append Card"}</span>
                    <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
                  </button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Cards List */}
        <div className="flex flex-col gap-0">
          {fetching ? (
            <div className="py-20 text-center font-mono text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
              Reading deck...
            </div>
          ) : cards.length === 0 && !showForm ? (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 1 }}
              className="py-24 text-center flex flex-col items-center gap-6"
            >
              <Sparkles size={24} strokeWidth={1} style={{ color: 'var(--border-strong)' }} />
              <p className="font-mono text-[11px] uppercase tracking-[0.3em] max-w-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                This deck is empty. Add your first prompt.
              </p>
            </motion.div>
          ) : (
            cards.map((card, i) => {
              const typeInfo = CARD_TYPES.find(t => t.id === card.type) || CARD_TYPES[0];
              const Icon = typeInfo.icon;
              const isEditing = editingCardId === card.id;
              
              return (
                <motion.div
                  key={card.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: i * 0.05 }}
                  className="group border-b py-8 transition-all duration-500 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  style={{ borderColor: 'var(--border-line)' }}
                >
                  
                  {isEditing ? (
                    // --------------------------
                    // INLINE EDIT STATE
                    // --------------------------
                    <div className="w-full flex flex-col gap-6">
                      <textarea
                        value={editCardText}
                        onChange={(e) => setEditCardText(e.target.value)}
                        className="naked-textarea pb-2 font-crimson text-2xl h-16 sm:h-20 custom-scrollbar"
                        style={{ color: 'var(--text-main)' }}
                      />
                      
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div className="flex flex-wrap gap-2">
                          {CARD_TYPES.map((type) => {
                            const isSelected = editCardType === type.id;
                            const TypeIcon = type.icon;
                            return (
                              <button
                                key={type.id}
                                onClick={() => setEditCardType(type.id)}
                                className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-[0.15em] px-3 py-1.5 border rounded-full transition-all duration-300"
                                style={{ 
                                  borderColor: isSelected ? 'var(--text-main)' : 'var(--border-line)',
                                  color: isSelected ? 'var(--bg-base)' : 'var(--text-sub)',
                                  backgroundColor: isSelected ? 'var(--text-main)' : 'transparent'
                                }}
                              >
                                <TypeIcon size={10} strokeWidth={1.5} />
                                <span className="pt-[1px]">{type.label}</span>
                              </button>
                            );
                          })}
                        </div>
                        
                        <div className="flex items-center gap-4 shrink-0">
                          <button
                            onClick={cancelEditing}
                            className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors hover:text-red-500"
                            style={{ color: 'var(--text-sub)' }}
                          >
                            Cancel
                          </button>
                          <button
                            onClick={saveEdit}
                            disabled={editLoading || !editCardText.trim()}
                            className="font-mono text-[10px] uppercase tracking-[0.2em] transition-colors border px-4 py-2 rounded-full hover:bg-[var(--text-main)] text-[var(--text-main)] hover:text-[var(--bg-base)] disabled:opacity-30 disabled:cursor-not-allowed"
                            style={{ borderColor: 'var(--border-line)' }}
                          >
                            {editLoading ? "Saving..." : "Save"}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // --------------------------
                    // DEFAULT DISPLAY STATE
                    // --------------------------
                    <>
                      <div className="flex flex-col gap-4 max-w-xl">
                        <div className="flex items-center gap-2 font-mono text-[9px] uppercase tracking-widest" style={{ color: 'var(--text-sub)' }}>
                          <Icon size={12} strokeWidth={1.5} />
                          <span className="pt-[1px]">{typeInfo.label}</span>
                        </div>
                        <p className="font-crimson text-2xl sm:text-3xl leading-relaxed" style={{ color: 'var(--text-main)' }}>
                          {card.text}
                        </p>
                      </div>

                      {isOwner && (
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 shrink-0 mt-4 sm:mt-0">
                          <button
                            onClick={() => {
                              setShowForm(false);
                              startEditing(card);
                            }}
                            className="p-2 hover:bg-black/5 dark:hover:bg-white/5 rounded-full text-[var(--text-sub)] hover:text-[var(--text-main)] transition-colors"
                            title="Edit Card"
                          >
                            <Pencil size={14} strokeWidth={1.5} />
                          </button>
                          <button
                            onClick={() => setCardToDelete(card.id)}
                            className="p-2 hover:bg-red-500/10 rounded-full text-[var(--text-sub)] hover:text-red-500 transition-colors"
                            title="Delete Card"
                          >
                            <Trash2 size={14} strokeWidth={1.5} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                  
                </motion.div>
              );
            })
          )}
        </div>

      </main>

      {/* -------------------------- */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* -------------------------- */}
      <AnimatePresence>
        {cardToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => !isDeleting && setCardToDelete(null)}
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
                  Erase Prompt
                </h3>
                <p className="font-mono text-[10px] uppercase tracking-widest leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                  Are you certain? This action cannot be undone and will permanently remove this prompt from the deck.
                </p>
              </div>

              <div className="flex items-center justify-end gap-6 pt-2">
                <button 
                  onClick={() => setCardToDelete(null)}
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