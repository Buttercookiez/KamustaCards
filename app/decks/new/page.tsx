"use client";

import { db, auth } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Moon, Sun, ArrowLeft, ArrowRight, Lock, Globe, Users, Heart, Home as HomeIcon, Coffee, Library } from "lucide-react";

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
  `}</style>
);

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

export default function NewDeckPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  
  // Form State
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("friends");
  const [visibility, setVisibility] = useState("private");
  const [loading, setLoading] = useState(false);

  // Theme State
  const [theme, setTheme] = useState<"light" | "dark">("light");
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
  }, [router]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, "decks"), {
        title: title.trim(),
        description: description.trim(),
        category,
        visibility,
        owner: user.uid,
        ownerName: user.displayName || "Creator",
        likes: 0,
        createdAt: Date.now(),
      });

      router.push(`/decks/${docRef.id}`);
    } catch (err) {
      console.error(err);
      setLoading(false);
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
            onClick={() => router.back()}
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
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease:[0.16, 1, 0.3, 1] }}
          className="mb-16 border-b pb-8" 
          style={{ borderColor: 'var(--border-line)' }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[0.3em] block mb-4" style={{ color: 'var(--text-sub)' }}>
            Initialize
          </span>
          <h1 className="text-4xl sm:text-5xl font-light tracking-tight" style={{ color: 'var(--text-main)' }}>
            Create Deck
          </h1>
        </motion.div>

        {/* Form Area */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="flex flex-col gap-12"
        >
          {/* Title Input */}
          <div className="flex flex-col gap-4 group">
            <label className="font-mono text-[9px] uppercase tracking-[0.3em] transition-colors group-focus-within:text-[var(--text-main)]" style={{ color: 'var(--text-sub)' }}>
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Deep Talk with Bestie"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="naked-input pb-3 font-crimson text-3xl sm:text-4xl"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Description Input */}
          <div className="flex flex-col gap-4 group">
            <label className="font-mono text-[9px] uppercase tracking-[0.3em] transition-colors group-focus-within:text-[var(--text-main)]" style={{ color: 'var(--text-sub)' }}>
              Description
            </label>
            <textarea
              placeholder="What is the mood of this deck?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="naked-textarea pb-3 font-crimson text-2xl sm:text-3xl h-24"
              style={{ color: 'var(--text-main)' }}
            />
          </div>

          {/* Category & Visibility Selectors */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 sm:gap-10">
            
            {/* Category Selector */}
            <div className="flex flex-col gap-5">
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
                      <Icon size={12} strokeWidth={1.5} />
                      <span className="pt-[1px]">{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visibility Selector */}
            <div className="flex flex-col gap-5">
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
                      <Icon size={12} strokeWidth={1.5} />
                      <span className="pt-[1px]">{vis.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-12 mt-4 border-t flex justify-end" style={{ borderColor: 'var(--border-line)' }}>
            <button
              onClick={handleCreate}
              disabled={loading || !title.trim()}
              className="group flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.3em] transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70"
              style={{ color: 'var(--text-main)' }}
            >
              <span className="pt-[2px]">{loading ? "Initializing..." : "Create & Add Cards"}</span>
              <ArrowRight size={16} strokeWidth={1} className="transition-transform duration-500 group-hover:translate-x-2" />
            </button>
          </div>
        </motion.div>
        
      </main>
    </div>
  );
}