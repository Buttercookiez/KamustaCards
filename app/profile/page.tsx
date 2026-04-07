"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, updateProfile } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, getDocs,
  query, orderBy, limit,
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft, Moon, Sun, Flame, BookOpen,
  ChevronRight, LogOut, Volume2, VolumeX,
  SkipBack, SkipForward, Camera, Check, X, Pencil,
} from "lucide-react";
import { useSoundContext } from "@/components/sound-provider";

// ─── Global Styles ─────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');

    :root {
      --bg-base: #faf8f5;
      --bg-nav: rgba(250, 248, 245, 0.95);
      --bg-card: transparent;
      --bg-card-hover: rgba(0, 0, 0, 0.02);
      --text-main: #2c2825;
      --text-sub: #6b4423;
      --text-accent: #8b7355;
      --border-subtle: #d4c8b8;
      --border-strong: #a89070;
      --action-bg: #2c2825;
      --action-text: #f5f0e8;
      --action-sub: #a89070;
      --icon-bg: rgba(0, 0, 0, 0.04);
      --shadow-hover: 0 12px 24px -10px rgba(0, 0, 0, 0.1);
      --shadow-primary: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
    }
    .dark {
      --bg-base: #09090b;
      --bg-nav: rgba(9, 9, 11, 0.95);
      --bg-card: transparent;
      --bg-card-hover: rgba(255, 255, 255, 0.03);
      --text-main: #e4ddd2;
      --text-sub: #a1a1aa;
      --text-accent: #71717a;
      --border-subtle: #27272a;
      --border-strong: #52525b;
      --action-bg: #e4ddd2;
      --action-text: #09090b;
      --action-sub: #71717a;
      --icon-bg: rgba(255, 255, 255, 0.05);
      --shadow-hover: 0 12px 24px -10px rgba(0, 0, 0, 0.6);
      --shadow-primary: 0 8px 20px -8px rgba(255, 255, 255, 0.15);
    }
    * { -webkit-tap-highlight-color: transparent !important; }
    button:focus, a:focus, input:focus { outline: none; }
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.5s ease, color 0.5s ease;
    }
    .font-cinzel  { font-family: 'Cinzel', serif; }
    .font-crimson { font-family: 'Crimson Pro', Georgia, serif; }
    .font-mono    { font-family: 'Space Mono', monospace; }
    .grain-overlay::after {
      content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      pointer-events: none; z-index: 9999; opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }
    .hover-card { background-color: var(--bg-card); border-color: var(--border-subtle); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .hover-card:hover { background-color: var(--bg-card-hover); border-color: var(--border-strong); box-shadow: var(--shadow-hover); }
    .primary-action { background-color: var(--action-bg); box-shadow: var(--shadow-primary); transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
    .minimal-scrollbar::-webkit-scrollbar { width: 2px; }
    .minimal-scrollbar::-webkit-scrollbar-track { background: transparent; }
    .minimal-scrollbar::-webkit-scrollbar-thumb { background-color: var(--border-subtle); border-radius: 4px; }

    .name-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-family: 'Crimson Pro', Georgia, serif;
      font-size: 1.875rem;
      font-weight: 500;
      letter-spacing: -0.015em;
      width: 100%;
      padding: 0 0 4px 0;
      transition: border-color 0.3s ease;
    }
    .name-input:focus { border-color: var(--border-strong); }
    .name-input::placeholder { color: var(--text-accent); opacity: 0.5; }

    .photo-overlay { opacity: 0; transition: opacity 0.3s ease; }
    .photo-wrapper:hover .photo-overlay { opacity: 1; }
  `}</style>
);

// ─── Types ─────────────────────────────────────────────────────────────────────
type JournalEntry = {
  id: string;
  cardText: string;
  cardType: string;
  answer: string;
  timestamp: number;
};
type ProfileData = {
  streak: number;
  journalCount: number;
  recentJournal: JournalEntry[];
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
const TYPE_LABELS: Record<string, string> = {
  question: "Question", appreciation: "Appreciation", mission: "Mission",
  secret: "Secret", comfort: "Comfort", future: "Future",
};

// ═══════════════════════════════════════════════════════════════════════════════
export default function ProfilePage() {
  const router = useRouter();

  const [user, setUser]                     = useState<any>(null);
  const [displayName, setDisplayName]       = useState("");
  const [photoURL, setPhotoURL]             = useState<string | null>(null);
  const [memberSince, setMemberSince]       = useState<string | null>(null);
  const [profile, setProfile]               = useState<ProfileData | null>(null);
  const [loading, setLoading]               = useState(true);
  const [editingName, setEditingName]       = useState(false);
  const [nameInput, setNameInput]           = useState("");
  const [saving, setSaving]                 = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [toast, setToast]                   = useState<string | null>(null);
  const [theme, setTheme]                   = useState<"light" | "dark">("light");
  const [mounted, setMounted]               = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const { soundEnabled, trackIndex, trackCount, toggleSound, nextTrack, prevTrack, startIfNeeded } =
    useSoundContext();

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
    setTheme(next);
    localStorage.setItem("theme", next);
    document.documentElement.classList.toggle("dark", next === "dark");
  };

  // ── Auth + data ────────────────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      setDisplayName(u.displayName || "");
      setNameInput(u.displayName || "");

      // Always load photoURL from Firestore — source of truth
      const userDoc = doc(db, "users", u.uid);
      const snap = await getDoc(userDoc);

      if (snap.exists()) {
        const firestorePhoto = snap.data().photoURL;
        setPhotoURL(firestorePhoto || u.photoURL || null);
        if (snap.data().createdAt) {
          const d = snap.data().createdAt.toDate();
          setMemberSince(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
        }
      } else {
        setPhotoURL(u.photoURL || null);
        if (u.metadata.creationTime) {
          const d = new Date(u.metadata.creationTime);
          setMemberSince(d.toLocaleDateString("en-US", { month: "long", year: "numeric" }));
          await setDoc(userDoc, { createdAt: d }, { merge: true });
        }
      }

      await loadProfile(u.uid);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingName]);

  const loadProfile = async (uid: string) => {
    try {
      const streakSnap = await getDoc(doc(db, "users", uid, "streak", "data"));
      const streak = streakSnap.exists() ? (streakSnap.data().count ?? 0) : 0;
      const journalSnap = await getDocs(
        query(collection(db, "users", uid, "journal"), orderBy("timestamp", "desc"), limit(5))
      );
      const recentJournal: JournalEntry[] = journalSnap.docs.map(d => ({
        id: d.id, cardText: d.data().cardText ?? "",
        cardType: d.data().cardType ?? "question",
        answer: d.data().answer ?? "",
        timestamp: d.data().timestamp?.toMillis?.() ?? 0,
      }));
      const allJournalSnap = await getDocs(collection(db, "users", uid, "journal"));
      setProfile({ streak, journalCount: allJournalSnap.size, recentJournal });
    } catch {
      setProfile({ streak: 0, journalCount: 0, recentJournal: [] });
    } finally {
      setLoading(false);
    }
  };

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const handleSaveName = async () => {
    if (!user || !nameInput.trim() || nameInput.trim() === displayName) {
      setEditingName(false); setNameInput(displayName); return;
    }
    setSaving(true);
    try {
      await updateProfile(user, { displayName: nameInput.trim() });
      await setDoc(doc(db, "users", user.uid), { displayName: nameInput.trim() }, { merge: true });
      localStorage.setItem("username", nameInput.trim());
      setDisplayName(nameInput.trim());
      setEditingName(false);
      showToast("Name updated");
    } catch { showToast("Failed to save name"); }
    setSaving(false);
  };

  const handleCancelName = () => { setEditingName(false); setNameInput(displayName); };

  // ── Cloudinary photo upload (replaces Firebase Storage — no CORS issues) ──
  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (!file.type.startsWith("image/")) { showToast("Please select an image"); return; }
    if (file.size > 5 * 1024 * 1024)    { showToast("Image must be under 5MB"); return; }

    setUploadingPhoto(true);

    // Show instant local preview while uploading
    const localPreview = URL.createObjectURL(file);
    setPhotoURL(localPreview);

    try {
      // Upload directly to Cloudinary — no CORS issues, no SDK needed
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET!);
      formData.append("folder", "avatars");
      formData.append("public_id", user.uid); // overwrite same file each time

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      if (!res.ok) throw new Error("Cloudinary upload failed");

      const data = await res.json();
      const url: string = data.secure_url;

      // Save to Firebase Auth + Firestore
      await updateProfile(user, { photoURL: url });
      await setDoc(doc(db, "users", user.uid), { photoURL: url }, { merge: true });

      setPhotoURL(url);
      showToast("Photo updated");
    } catch (err) {
      console.error("Photo upload error:", err);
      // Revert to last saved photo on failure
      const snap = await getDoc(doc(db, "users", user.uid));
      setPhotoURL(snap.data()?.photoURL || user.photoURL || null);
      showToast("Failed to upload photo");
    } finally {
      setUploadingPhoto(false);
      URL.revokeObjectURL(localPreview);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.55, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] as any },
    }),
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson transition-colors duration-500" onClick={startIfNeeded}>
      <GlobalStyles />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md h-16 transition-colors duration-500"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <motion.button
            whileHover={{ x: -2 }} whileTap={{ scale: 0.97 }}
            onClick={() => router.push("/dashboard")}
            className="flex sm:hidden items-center opacity-80 hover:opacity-100 transition-opacity"
            style={{ color: "var(--text-main)" }}
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
          </motion.button>

          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="hidden sm:flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div className="relative w-7 h-7 rounded-md overflow-hidden border" style={{ borderColor: "var(--border-subtle)" }}>
              <Image src="/logo.png" alt="Kamusta Logo" fill className="object-cover" />
            </div>
            <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase" style={{ color: "var(--text-main)" }}>
              Kamusta
            </span>
          </motion.div>

          <div className="flex items-center gap-3 sm:gap-4">
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
              <div className="hidden sm:flex items-center gap-[3px] ml-1">
                {Array.from({ length: trackCount }).map((_, i) => (
                  <span key={i} className="rounded-full transition-all duration-300"
                    style={{ width: i === trackIndex ? 10 : 4, height: 4,
                      backgroundColor: i === trackIndex ? "var(--text-accent)" : "var(--border-strong)",
                      opacity: i === trackIndex ? 1 : 0.4 }} />
                ))}
              </div>
            </div>
            <div className="h-3 w-px bg-[var(--border-subtle)]" />
            <motion.button whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }} whileTap={{ scale: 0.9 }}
              onClick={toggleTheme} style={{ color: "var(--text-sub)" }}>
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>
            <div className="h-3 w-px bg-[var(--border-subtle)]" />

            <motion.button
              whileHover={{ x: -2 }}
              onClick={() => router.push("/dashboard")}
              className="hidden sm:flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] hover:opacity-100 group flex-shrink-0"
              style={{ color: "var(--text-sub)" }}
            >
              <ArrowLeft size={14} strokeWidth={1.5} className="group-hover:text-[var(--text-main)] transition-all" />
              <span className="group-hover:text-[var(--text-main)] transition-colors">Dashboard</span>
            </motion.button>

            <div className="h-3 w-px bg-[var(--border-subtle)] hidden sm:block" />

            <motion.button whileHover={{ x: 2 }}
              onClick={() => auth.signOut().then(() => router.push("/"))}
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] hover:opacity-100 group"
              style={{ color: "var(--text-sub)" }}>
              <span className="hidden sm:inline group-hover:text-[var(--text-main)] transition-colors">Sign out</span>
              <LogOut size={14} strokeWidth={1.5} className="group-hover:text-[var(--text-main)] group-hover:translate-x-0.5 transition-all" />
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <main className="pt-32 pb-20 px-4 sm:px-6 max-w-5xl mx-auto relative z-10">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <motion.div custom={0} variants={itemVariants} initial="hidden" animate="visible"
          className="flex items-end gap-6 mb-12 pb-10 border-b" style={{ borderColor: "var(--border-subtle)" }}>

          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoSelect} />
          <motion.button
            type="button"
            whileTap={{ scale: uploadingPhoto ? 1 : 0.97 }}
            onClick={() => { if (!uploadingPhoto) fileInputRef.current?.click(); }}
            className="photo-wrapper relative w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden shrink-0 border-2"
            style={{ borderColor: "var(--border-strong)", cursor: uploadingPhoto ? "default" : "pointer" }}
            aria-label="Change profile photo"
          >
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="object-cover w-full h-full" />
            ) : (
              <div className="w-full h-full flex items-center justify-center" style={{ background: "var(--icon-bg)" }}>
                <span className="font-cinzel text-lg sm:text-xl font-semibold" style={{ color: "var(--text-accent)" }}>
                  {getInitials(displayName || "U")}
                </span>
              </div>
            )}
            <div
              className={`absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-full transition-opacity duration-300 ${uploadingPhoto ? "" : "photo-overlay"}`}
              style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
            >
              {uploadingPhoto
                ? <div className="w-4 h-4 rounded-full border-t-2 border-white animate-spin" />
                : <>
                    <Camera size={14} strokeWidth={1.5} style={{ color: "#fff" }} />
                    <span className="font-mono text-[7px] uppercase tracking-[0.1em] text-white">Edit</span>
                  </>
              }
            </div>
          </motion.button>

          <div className="flex-1 min-w-0">
            <span className="font-mono text-[9px] uppercase tracking-[0.3em] block mb-2" style={{ color: "var(--text-accent)" }}>
              Your Profile
            </span>

            {editingName ? (
              <div className="flex items-center gap-3">
                <input
                  ref={nameInputRef}
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleSaveName(); if (e.key === "Escape") handleCancelName(); }}
                  className="name-input flex-1"
                  placeholder="Your name"
                  maxLength={40}
                />
                <div className="flex items-center gap-2 shrink-0">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={handleSaveName} disabled={saving}
                    className="w-7 h-7 rounded-full flex items-center justify-center primary-action" aria-label="Save">
                    {saving
                      ? <div className="w-3 h-3 rounded-full border-t border-[var(--action-text)] animate-spin" />
                      : <Check size={12} strokeWidth={2} style={{ color: "var(--action-text)" }} />}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                    onClick={handleCancelName}
                    className="w-7 h-7 rounded-full flex items-center justify-center border"
                    style={{ borderColor: "var(--border-subtle)" }} aria-label="Cancel">
                    <X size={12} strokeWidth={2} style={{ color: "var(--text-sub)" }} />
                  </motion.button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 group/name">
                <h1 className="text-3xl sm:text-4xl font-crimson font-medium tracking-tight truncate" style={{ color: "var(--text-main)" }}>
                  {displayName || "Your Name"}
                </h1>
                <motion.button
                  whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setEditingName(true)}
                  className="shrink-0 opacity-0 group-hover/name:opacity-60 hover:!opacity-100 transition-opacity"
                  style={{ color: "var(--text-accent)" }} aria-label="Edit name">
                  <Pencil size={14} strokeWidth={1.5} />
                </motion.button>
              </div>
            )}

            {memberSince && (
              <p className="font-mono text-[9px] uppercase tracking-[0.2em] mt-1" style={{ color: "var(--text-sub)" }}>
                Member since {memberSince}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Stats row ────────────────────────────────────────────────────── */}
        <motion.div custom={1} variants={itemVariants} initial="hidden" animate="visible"
          className="grid grid-cols-2 gap-4 mb-12">
          <div className="hover-card border rounded-xl p-6 sm:p-8 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <Flame size={14} style={{ color: "#f97316" }} strokeWidth={1.5} />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: "var(--text-sub)" }}>Day Streak</span>
            </div>
            <span className="font-crimson text-5xl sm:text-6xl font-light leading-none" style={{ color: "var(--text-main)" }}>
              {loading ? "—" : (profile?.streak ?? 0)}
            </span>
            <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-accent)" }}>
              {!loading && (profile?.streak ?? 0) > 0 ? "Keep it going" : "Start your streak"}
            </span>
          </div>
          <div className="hover-card border rounded-xl p-6 sm:p-8 flex flex-col gap-2">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen size={14} strokeWidth={1.5} style={{ color: "var(--text-accent)" }} />
              <span className="font-mono text-[9px] uppercase tracking-[0.25em]" style={{ color: "var(--text-sub)" }}>Journal Entries</span>
            </div>
            <span className="font-crimson text-5xl sm:text-6xl font-light leading-none" style={{ color: "var(--text-main)" }}>
              {loading ? "—" : (profile?.journalCount ?? 0)}
            </span>
            <button onClick={() => router.push("/journal")}
              className="font-mono text-[9px] uppercase tracking-[0.2em] flex items-center gap-1 w-fit opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-accent)" }}>
              View journal <ChevronRight size={10} />
            </button>
          </div>
        </motion.div>

        {/* ── Recent Journal ────────────────────────────────────────────────── */}
        <motion.div custom={2} variants={itemVariants} initial="hidden" animate="visible">
          <div className="flex items-end justify-between border-b pb-4 mb-6" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-crimson text-xl sm:text-2xl font-medium" style={{ color: "var(--text-main)" }}>Recent Reflections</h2>
            <motion.button whileHover={{ x: 2 }} onClick={() => router.push("/journal")}
              className="font-mono text-[10px] uppercase tracking-[0.2em] flex items-center gap-1 opacity-70 hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-accent)" }}>
              All entries <ChevronRight size={12} />
            </motion.button>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <div className="w-5 h-5 rounded-full border-t-2 animate-spin" style={{ borderColor: "var(--text-accent)" }} />
            </div>
          )}

          {!loading && profile?.recentJournal.length === 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="hover-card border rounded-xl p-10 flex flex-col items-center text-center gap-3">
              <BookOpen size={22} strokeWidth={1} style={{ color: "var(--text-accent)", opacity: 0.5 }} />
              <p className="font-crimson text-lg font-light" style={{ color: "var(--text-sub)" }}>No reflections yet</p>
              <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-accent)" }}>
                Play a solo session to start journaling
              </p>
            </motion.div>
          )}

          {!loading && profile && profile.recentJournal.length > 0 && (
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border-subtle)" }}>
              <AnimatePresence>
                {profile.recentJournal.map((entry, i) => (
                  <motion.div key={entry.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="py-6 flex flex-col gap-3" style={{ borderColor: "var(--border-subtle)" }}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-[8px] uppercase tracking-[0.2em] border px-2 py-0.5 rounded-full"
                        style={{ borderColor: "var(--border-subtle)", color: "var(--text-sub)" }}>
                        {TYPE_LABELS[entry.cardType] ?? "Prompt"}
                      </span>
                      <span className="font-mono text-[8px] uppercase tracking-[0.15em]" style={{ color: "var(--text-accent)", opacity: 0.6 }}>
                        {relativeTime(entry.timestamp)}
                      </span>
                    </div>
                    <p className="font-crimson text-lg sm:text-xl font-light leading-snug" style={{ color: "var(--text-sub)" }}>
                      {entry.cardText}
                    </p>
                    <div className="border-l-2 pl-4" style={{ borderColor: "var(--border-strong)" }}>
                      <p className="font-crimson text-xl sm:text-2xl font-light leading-relaxed italic" style={{ color: "var(--text-main)" }}>
                        {entry.answer}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        {/* ── Account section ──────────────────────────────────────────────── */}
        <motion.div custom={3} variants={itemVariants} initial="hidden" animate="visible" className="mt-16">
          <div className="flex items-end border-b pb-4 mb-6" style={{ borderColor: "var(--border-subtle)" }}>
            <h2 className="font-crimson text-xl sm:text-2xl font-medium" style={{ color: "var(--text-main)" }}>Account</h2>
          </div>
          <div className="hover-card border rounded-xl overflow-hidden divide-y" style={{ borderColor: "var(--border-subtle)" }}>
            {[
              { label: "Display Name",   value: displayName || "—" },
              { label: "Email",          value: user?.email || "—" },
              { label: "Signed in with", value: user?.providerData?.[0]?.providerId === "google.com" ? "Google" : "Email" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-sub)" }}>{row.label}</span>
                <span className="font-mono text-[9px] uppercase tracking-[0.15em]" style={{ color: "var(--text-accent)" }}>{row.value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderColor: "var(--border-subtle)" }}>
              <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-sub)" }}>Session</span>
              <button onClick={() => auth.signOut().then(() => router.push("/"))}
                className="font-mono text-[9px] uppercase tracking-[0.15em] flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
                style={{ color: "var(--text-main)" }}>
                Sign out <LogOut size={11} strokeWidth={1.5} />
              </button>
            </div>
          </div>
        </motion.div>

      </main>

      {/* ── Toast ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9998] px-5 py-3 rounded-full primary-action">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: "var(--action-text)" }}>
              {toast}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}