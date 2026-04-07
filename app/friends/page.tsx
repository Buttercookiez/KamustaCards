"use client";

import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, getDoc, setDoc, collection, getDocs,
  query, where, addDoc, serverTimestamp, onSnapshot,
  deleteDoc, orderBy, limit, updateDoc, getCountFromServer
} from "firebase/firestore";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft, UserPlus, Users, Copy, Check, Search,
  X, BookOpen, Library, ChevronRight, Moon, Sun,
  Volume2, VolumeX, SkipBack, SkipForward, Send,
  UserCheck, Clock, Trash2, ExternalLink,
} from "lucide-react";
import { useSoundContext } from "@/components/sound-provider";
import OnboardingTour from "@/components/onboarding-tour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { friendsSteps } from "@/lib/tourSteps";

// ─── Global Styles (same theme as your app) ────────────────────────────────────
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

    .friend-search-input {
      background: transparent;
      border: none;
      border-bottom: 1px solid var(--border-subtle);
      color: var(--text-main);
      font-family: 'Space Mono', monospace;
      font-size: 0.75rem;
      letter-spacing: 0.1em;
      width: 100%;
      padding: 6px 0;
      transition: border-color 0.3s ease;
    }
    .friend-search-input:focus { border-color: var(--border-strong); }
    .friend-search-input::placeholder { color: var(--text-accent); opacity: 0.5; font-size: 0.7rem; }

    .uid-display {
      font-family: 'Space Mono', monospace;
      font-size: 0.6rem;
      letter-spacing: 0.12em;
      color: var(--text-accent);
      opacity: 0.7;
      word-break: break-all;
    }

    .tab-active {
      border-bottom: 1px solid var(--text-main);
      color: var(--text-main);
      opacity: 1;
    }
  `}</style>
);

type Friend = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  addedAt: number;
};

type FriendRequest = {
  id: string;
  fromUid: string;
  fromName: string;
  fromPhoto: string | null;
  toUid: string;
  status: "pending" | "accepted" | "declined";
  sentAt: number;
};

type FriendProfile = {
  uid: string;
  displayName: string;
  photoURL: string | null;
  streak: number;
  journalCount: number;
  decks: { id: string; title: string; description: string }[];
  recentJournal: { id: string; cardText: string; answer: string; timestamp: number }[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getInitials(name: string): string {
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function Avatar({ name, photo, size = 40 }: { name: string; photo: string | null; size?: number }) {
  if (photo) {
    return (
      <div className="rounded-full overflow-hidden shrink-0 border" style={{ width: size, height: size, borderColor: "var(--border-subtle)" }}>
        <Image src={photo} alt={name} width={size} height={size} className="object-cover w-full h-full" />
      </div>
    );
  }
  return (
    <div className="rounded-full shrink-0 flex items-center justify-center border font-cinzel font-semibold"
      style={{ width: size, height: size, borderColor: "var(--border-subtle)", backgroundColor: "var(--icon-bg)", color: "var(--text-accent)", fontSize: size * 0.3 }}>
      {getInitials(name)}
    </div>
  );
}

// ─── Friend Profile Modal ─────────────────────────────────────────────────────
function FriendProfileModal({
  profile, currentUser, onClose, onShareDeck,
}: {
  profile: FriendProfile;
  currentUser: any;
  onClose: () => void;
  onShareDeck: (deckId: string, deckTitle: string, toUid: string) => void;
}) {
  const [tab, setTab] = useState<"journal" | "decks">("journal");
  const [myDecks, setMyDecks] = useState<{ id: string; title: string; description: string }[]>([]);
  const [sharing, setSharing] = useState<string | null>(null);
  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    getDocs(query(collection(db, "decks"), where("owner", "==", currentUser.uid))).then(snap => {
      setMyDecks(snap.docs.map(d => ({ id: d.id, title: d.data().title, description: d.data().description })));
    });
  }, [currentUser]);

  const handleShare = async (deckId: string, deckTitle: string) => {
    setSharing(deckId);
    await onShareDeck(deckId, deckTitle, profile.uid);
    setSharing(null);
    setShareSuccess(deckId);
    setTimeout(() => setShareSuccess(null), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 40, scale: 0.96 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-lg rounded-2xl border overflow-hidden"
        style={{ backgroundColor: "var(--bg-base)", borderColor: "var(--border-subtle)", maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-start justify-between" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-center gap-4">
            <Avatar name={profile.displayName} photo={profile.photoURL} size={52} />
            <div>
              <h2 className="font-crimson text-2xl font-medium" style={{ color: "var(--text-main)" }}>{profile.displayName}</h2>
              <div className="flex items-center gap-4 mt-1">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-sub)" }}>
                  🔥 {profile.streak} streak
                </span>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-sub)" }}>
                  {profile.journalCount} entries
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ color: "var(--text-accent)" }} className="opacity-60 hover:opacity-100 transition-opacity mt-1">
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b px-6" style={{ borderColor: "var(--border-subtle)" }}>
          {(["journal", "decks"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`font-mono text-[9px] uppercase tracking-[0.2em] py-3 mr-6 transition-all ${tab === t ? "tab-active" : "opacity-40 hover:opacity-70"}`}
              style={{ color: "var(--text-main)" }}>
              {t === "journal" ? "Reflections" : "Share Deck"}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto minimal-scrollbar" style={{ maxHeight: "50vh" }}>
          <AnimatePresence mode="wait">
            {tab === "journal" && (
              <motion.div key="journal" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                {profile.recentJournal.length === 0 ? (
                  <div className="text-center py-8">
                    <BookOpen size={22} strokeWidth={1} style={{ color: "var(--text-accent)", opacity: 0.4 }} className="mx-auto mb-3" />
                    <p className="font-crimson text-base font-light" style={{ color: "var(--text-sub)" }}>No public reflections yet</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    {profile.recentJournal.map(entry => (
                      <div key={entry.id} className="flex flex-col gap-2">
                        <p className="font-crimson text-base font-light" style={{ color: "var(--text-sub)" }}>{entry.cardText}</p>
                        <div className="border-l-2 pl-4" style={{ borderColor: "var(--border-strong)" }}>
                          <p className="font-crimson text-lg font-light italic" style={{ color: "var(--text-main)" }}>{entry.answer}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {tab === "decks" && (
              <motion.div key="decks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-6">
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: "var(--text-accent)" }}>
                  Send one of your decks to {profile.displayName.split(" ")[0]}
                </p>
                {myDecks.length === 0 ? (
                  <p className="font-crimson text-base font-light" style={{ color: "var(--text-sub)" }}>You have no decks to share yet.</p>
                ) : (
                  <div className="flex flex-col gap-3">
                    {myDecks.map(deck => (
                      <div key={deck.id} className="hover-card border rounded-xl p-4 flex items-center justify-between"
                        style={{ borderColor: "var(--border-subtle)" }}>
                        <div className="flex-1 min-w-0 pr-4">
                          <p className="font-crimson text-base font-medium leading-tight" style={{ color: "var(--text-main)" }}>{deck.title}</p>
                          <p className="font-crimson text-sm opacity-60 leading-tight line-clamp-1 mt-0.5" style={{ color: "var(--text-sub)" }}>{deck.description}</p>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => handleShare(deck.id, deck.title)}
                          disabled={sharing === deck.id}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] primary-action"
                          style={{ color: "var(--action-text)", opacity: sharing === deck.id ? 0.5 : 1 }}>
                          {shareSuccess === deck.id ? <Check size={11} /> : <Send size={11} />}
                          {shareSuccess === deck.id ? "Sent!" : sharing === deck.id ? "..." : "Share"}
                        </motion.button>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function FriendsPage() {
  const router = useRouter();
  const tour = useOnboardingTour("friends");
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const [tab, setTab] = useState<"friends" | "requests" | "add">("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<{ uid: string; displayName: string; photoURL: string | null } | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [viewingProfile, setViewingProfile] = useState<FriendProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState<string | null>(null);
  const [sendingRequest, setSendingRequest] = useState(false);
  
  // State for Remove Friend Confirmation Modal
  const [friendToRemove, setFriendToRemove] = useState<{ uid: string; displayName: string } | null>(null);

  const { soundEnabled, trackIndex, trackCount, toggleSound, nextTrack, prevTrack, startIfNeeded } =
    useSoundContext();

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

  // ── Auth + realtime listeners ────────────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
      // Ensure user doc exists with public fields
      await setDoc(doc(db, "users", u.uid), {
        displayName: u.displayName || "",
        photoURL: u.photoURL || "",
        uid: u.uid,
      }, { merge: true });
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    if (!user) return;
    // Friends listener
    const unsubFriends = onSnapshot(collection(db, "users", user.uid, "friends"), snap => {
      setFriends(snap.docs.map(d => ({
        uid: d.data().uid,
        displayName: d.data().displayName,
        photoURL: d.data().photoURL || null,
        addedAt: d.data().addedAt?.toMillis?.() ?? 0,
      })));
    });
    // Incoming requests listener
    const unsubRequests = onSnapshot(
      query(collection(db, "friendRequests"), where("toUid", "==", user.uid), where("status", "==", "pending")),
      snap => {
        setRequests(snap.docs.map(d => ({
          id: d.id,
          fromUid: d.data().fromUid,
          fromName: d.data().fromName,
          fromPhoto: d.data().fromPhoto || null,
          toUid: d.data().toUid,
          status: d.data().status,
          sentAt: d.data().sentAt?.toMillis?.() ?? 0,
        })));
      }
    );
    return () => { unsubFriends(); unsubRequests(); };
  }, [user]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  };

  const copyUID = () => {
    if (!user) return;
    navigator.clipboard.writeText(user.uid);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  // ── Search user by UID ───────────────────────────────────────────────────────
  const handleSearch = async () => {
    const trimmed = searchId.trim();
    if (!trimmed) return;
    if (trimmed === user?.uid) { setSearchError("That's your own ID!"); return; }
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const snap = await getDoc(doc(db, "users", trimmed));
      if (!snap.exists()) { setSearchError("No user found with that ID."); }
      else {
        setSearchResult({
          uid: trimmed,
          displayName: snap.data().displayName || "Unknown",
          photoURL: snap.data().photoURL || null,
        });
      }
    } catch {
      setSearchError("Something went wrong. Check the ID and try again.");
    }
    setSearchLoading(false);
  };

  // ── Send friend request ──────────────────────────────────────────────────────
  const sendRequest = async (toUid: string, toName: string) => {
    if (!user) return;
    // Check if already friends
    const alreadyFriend = friends.some(f => f.uid === toUid);
    if (alreadyFriend) { showToast("Already friends!"); return; }
    setSendingRequest(true);
    try {
      // Check if request already pending
      const existing = await getDocs(query(
        collection(db, "friendRequests"),
        where("fromUid", "==", user.uid),
        where("toUid", "==", toUid),
        where("status", "==", "pending")
      ));
      if (!existing.empty) { showToast("Request already sent!"); setSendingRequest(false); return; }

      await addDoc(collection(db, "friendRequests"), {
        fromUid: user.uid,
        fromName: user.displayName || "Someone",
        fromPhoto: user.photoURL || "",
        toUid,
        status: "pending",
        sentAt: serverTimestamp(),
      });
      showToast("Friend request sent!");
      setSearchResult(null);
      setSearchId("");
    } catch {
      showToast("Failed to send request.");
    }
    setSendingRequest(false);
  };

  // ── Accept / Decline request ─────────────────────────────────────────────────
  const acceptRequest = async (req: FriendRequest) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, "friendRequests", req.id), { status: "accepted" });
      // Add to both users' friends subcollection
      await setDoc(doc(db, "users", user.uid, "friends", req.fromUid), {
        uid: req.fromUid, displayName: req.fromName, photoURL: req.fromPhoto || "",
        addedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "users", req.fromUid, "friends", user.uid), {
        uid: user.uid, displayName: user.displayName || "", photoURL: user.photoURL || "",
        addedAt: serverTimestamp(),
      });
      showToast(`${req.fromName.split(" ")[0]} is now your friend!`);
    } catch { showToast("Failed to accept request."); }
  };

  const declineRequest = async (req: FriendRequest) => {
    try {
      await updateDoc(doc(db, "friendRequests", req.id), { status: "declined" });
      showToast("Request declined.");
    } catch { showToast("Failed to decline request."); }
  };

  // ── Remove Friend with Confirmation ──────────────────────────────────────────
  const confirmRemoveFriend = async (friendUid: string) => {
    if (!user) return;
    try {
      await deleteDoc(doc(db, "users", user.uid, "friends", friendUid));
      await deleteDoc(doc(db, "users", friendUid, "friends", user.uid));
      showToast("Friend removed.");
    } catch { 
      showToast("Failed to remove friend."); 
    }
    setFriendToRemove(null);
  };

  // ── View friend profile (OPTIMIZED: Fast Concurrent Fetching) ────────────────
  const viewProfile = async (friendUid: string) => {
    setProfileLoading(friendUid);
    try {
      // Execute all 5 Firebase requests at the exact same time instead of waiting sequentially.
      // Used getCountFromServer to avoid downloading entire journal collection just to count size.
      const [userSnap, streakSnap, journalSnap, countSnap, decksSnap] = await Promise.all([
        getDoc(doc(db, "users", friendUid)),
        getDoc(doc(db, "users", friendUid, "streak", "data")),
        getDocs(query(collection(db, "users", friendUid, "journal"), orderBy("timestamp", "desc"), limit(3))),
        getCountFromServer(collection(db, "users", friendUid, "journal")),
        getDocs(query(collection(db, "decks"), where("owner", "==", friendUid)))
      ]);

      setViewingProfile({
        uid: friendUid,
        displayName: userSnap.data()?.displayName || "Friend",
        photoURL: userSnap.data()?.photoURL || null,
        streak: streakSnap.exists() ? (streakSnap.data().count ?? 0) : 0,
        journalCount: countSnap.data().count, // Lightning fast count
        decks: decksSnap.docs.map(d => ({ id: d.id, title: d.data().title, description: d.data().description })),
        recentJournal: journalSnap.docs.map(d => ({
          id: d.id, cardText: d.data().cardText ?? "",
          answer: d.data().answer ?? "",
          timestamp: d.data().timestamp?.toMillis?.() ?? 0,
        })),
      });
    } catch { 
      showToast("Could not load profile."); 
    }
    setProfileLoading(null);
  };

  // ── Share deck to friend ─────────────────────────────────────────────────────
  const shareDeck = async (deckId: string, deckTitle: string, toUid: string) => {
    if (!user) return;
    try {
      const deckSnap = await getDoc(doc(db, "decks", deckId));
      if (!deckSnap.exists()) return;
      const deckData = deckSnap.data();
      // Get cards
      const cardsSnap = await getDocs(collection(db, "decks", deckId, "cards"));
      // Write notification to recipient
      await addDoc(collection(db, "users", toUid, "notifications"), {
        type: "deck_share",
        fromUid: user.uid,
        fromName: user.displayName || "Someone",
        fromPhoto: user.photoURL || "",
        deckId,
        deckTitle,
        deckDescription: deckData.description || "",
        cardCount: cardsSnap.size,
        sentAt: serverTimestamp(),
        read: false,
      });
    } catch {
      throw new Error("Failed to share deck");
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({
      opacity: 1, y: 0,
      transition: { duration: 0.5, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] as any },
    }),
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson transition-colors duration-500" onClick={startIfNeeded}>
      <GlobalStyles />

      {/* ── Navbar ─────────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md h-16 transition-colors duration-500"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ x: -2 }} onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: "var(--text-main)" }}>
              <ArrowLeft size={16} strokeWidth={1.5} />
            </motion.button>
            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-subtle)" }} />
            <motion.div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/dashboard")}>
              <div className="relative w-7 h-7 rounded-md overflow-hidden border" style={{ borderColor: "var(--border-subtle)" }}>
                <Image src="/logo.png" alt="Kamusta Logo" fill className="object-cover" sizes="28px" />
              </div>
              <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block" style={{ color: "var(--text-main)" }}>
                Friends
              </span>
            </motion.div>
          </div>

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
            </div>
            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-subtle)" }} />
            <motion.button whileHover={{ scale: 1.1, rotate: theme === "light" ? 15 : -15 }} whileTap={{ scale: 0.9 }}
              onClick={toggleTheme} style={{ color: "var(--text-sub)" }}>
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* ── Main ──────────────────────────────────────────────────────────────── */}
      <main className="pt-28 pb-20 px-4 sm:px-6 max-w-2xl mx-auto relative z-10">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mb-10">
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] block mb-2" style={{ color: "var(--text-accent)" }}>
            {friends.length} {friends.length === 1 ? "connection" : "connections"}
          </span>
          <h1 data-tour="friends-header" className="text-4xl sm:text-5xl font-crimson font-medium tracking-tight" style={{ color: "var(--text-main)" }}>
            Friends
          </h1>
        </motion.div>

        {/* Your User ID card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.05 }}
          className="hover-card border rounded-xl p-5 mb-8" style={{ borderColor: "var(--border-subtle)" }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <span className="font-mono text-[9px] uppercase tracking-[0.2em] block mb-2" style={{ color: "var(--text-accent)" }}>
                Your User ID:
              </span>
              <p className="uid-display break-all">{user?.uid || "Loading..."}</p>
            </div>
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={copyUID}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full border font-mono text-[9px] uppercase tracking-[0.15em] transition-all"
              style={{ borderColor: "var(--border-subtle)", color: "var(--text-accent)" }}>
              {copiedId ? <Check size={11} /> : <Copy size={11} />}
              {copiedId ? "Copied!" : "Copy"}
            </motion.button>
          </div>
        </motion.div>

        {/* Tabs */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.1 }}
          className="flex border-b mb-8" style={{ borderColor: "var(--border-subtle)" }}>
          {([
            { key: "friends", label: "Friends", count: friends.length },
            { key: "requests", label: "Requests", count: requests.length },
            { key: "add", label: "Add Friend", count: 0 },
          ] as const).map(t => (
            <button key={t.key} 
              data-tour={t.key === "add" ? "add-friend-btn" : undefined}
              onClick={() => setTab(t.key)}
              className={`font-mono text-[9px] uppercase tracking-[0.2em] py-3 mr-6 flex items-center gap-2 transition-all ${tab === t.key ? "tab-active" : "opacity-40 hover:opacity-70"}`}
              style={{ color: "var(--text-main)" }}>
              {t.label}
              {t.count > 0 && (
                <span className="w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
                  style={{ backgroundColor: tab === t.key ? "var(--text-main)" : "var(--border-strong)", color: tab === t.key ? "var(--bg-base)" : "var(--text-main)" }}>
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </motion.div>

        {/* ── Tab: Friends ── */}
        <AnimatePresence mode="wait">
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {friends.length === 0 ? (
                <div className="text-center py-20">
                  <Users size={28} strokeWidth={1} style={{ color: "var(--text-accent)", opacity: 0.4 }} className="mx-auto mb-4" />
                  <p className="font-crimson text-xl font-light mb-2" style={{ color: "var(--text-sub)" }}>No friends yet</p>
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em]" style={{ color: "var(--text-accent)" }}>
                    Share your ID or add someone by theirs
                  </p>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => setTab("add")}
                    className="mt-6 px-6 py-2.5 rounded-full font-mono text-[9px] uppercase tracking-[0.2em] primary-action mx-auto flex items-center gap-2"
                    style={{ color: "var(--action-text)" }}>
                    <UserPlus size={12} /> Add a Friend
                  </motion.button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {friends.map((friend, i) => (
                    <motion.div key={friend.uid} 
                      data-tour={i === 0 ? "friend-card" : undefined}
                      custom={i} variants={itemVariants} initial="hidden" animate="visible"
                      className="hover-card border rounded-xl p-4 flex items-center gap-4 group"
                      style={{ borderColor: "var(--border-subtle)" }}>
                      <Avatar name={friend.displayName} photo={friend.photoURL} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="font-crimson text-lg font-medium leading-tight" style={{ color: "var(--text-main)" }}>{friend.displayName}</p>
                        <p className="uid-display mt-0.5 truncate">{friend.uid}</p>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => viewProfile(friend.uid)}
                          disabled={profileLoading === friend.uid}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] border transition-all"
                          style={{ borderColor: "var(--border-subtle)", color: "var(--text-accent)", opacity: profileLoading === friend.uid ? 0.6 : 1 }}>
                          {profileLoading === friend.uid ? (
                            <span className="w-3 h-3 rounded-full border-t border-r animate-spin" style={{ borderColor: "var(--text-accent)" }} />
                          ) : <ExternalLink size={11} />}
                          {profileLoading === friend.uid ? "Loading" : "View"}
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => setFriendToRemove({ uid: friend.uid, displayName: friend.displayName })}
                          className="p-1.5 rounded-full opacity-40 hover:opacity-80 hover:bg-red-500/10 hover:text-red-500 transition-all"
                          style={{ color: "var(--text-sub)" }}>
                          <Trash2 size={13} strokeWidth={1.5} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab: Requests ── */}
          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {requests.length === 0 ? (
                <div className="text-center py-20">
                  <Clock size={28} strokeWidth={1} style={{ color: "var(--text-accent)", opacity: 0.4 }} className="mx-auto mb-4" />
                  <p className="font-crimson text-xl font-light" style={{ color: "var(--text-sub)" }}>No pending requests</p>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {requests.map((req, i) => (
                    <motion.div key={req.id} custom={i} variants={itemVariants} initial="hidden" animate="visible"
                      className="hover-card border rounded-xl p-4 flex items-center gap-4"
                      style={{ borderColor: "var(--border-subtle)" }}>
                      <Avatar name={req.fromName} photo={req.fromPhoto} size={44} />
                      <div className="flex-1 min-w-0">
                        <p className="font-crimson text-lg font-medium leading-tight" style={{ color: "var(--text-main)" }}>{req.fromName}</p>
                        <p className="font-mono text-[9px] uppercase tracking-[0.15em] mt-0.5 opacity-60" style={{ color: "var(--text-sub)" }}>
                          Wants to be your friend
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => acceptRequest(req)}
                          className="px-3 py-1.5 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] primary-action flex items-center gap-1"
                          style={{ color: "var(--action-text)" }}>
                          <Check size={11} /> Accept
                        </motion.button>
                        <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                          onClick={() => declineRequest(req)}
                          className="p-1.5 rounded-full border opacity-50 hover:opacity-100 transition-opacity"
                          style={{ borderColor: "var(--border-subtle)", color: "var(--text-sub)" }}>
                          <X size={13} strokeWidth={1.5} />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Tab: Add Friend ── */}
          {tab === "add" && (
            <motion.div key="add" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-6">
              <div>
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] block mb-4" style={{ color: "var(--text-accent)" }}>
                  Enter their User ID
                </span>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <input
                      className="friend-search-input"
                      placeholder="Paste User ID here..."
                      value={searchId}
                      onChange={e => { setSearchId(e.target.value); setSearchError(""); setSearchResult(null); }}
                      onKeyDown={e => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleSearch}
                    disabled={!searchId.trim() || searchLoading}
                    className="shrink-0 px-4 py-2 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] primary-action flex items-center gap-1.5"
                    style={{ color: "var(--action-text)", opacity: !searchId.trim() || searchLoading ? 0.5 : 1 }}>
                    {searchLoading ? (
                      <span className="w-3 h-3 rounded-full border-t border-r animate-spin" style={{ borderColor: "var(--action-text)" }} />
                    ) : <Search size={11} />}
                    Find
                  </motion.button>
                </div>

                {searchError && (
                  <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    className="font-mono text-[9px] uppercase tracking-[0.15em] mt-3" style={{ color: "#ef4444" }}>
                    {searchError}
                  </motion.p>
                )}
              </div>

              <AnimatePresence>
                {searchResult && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    className="hover-card border rounded-xl p-5 flex items-center gap-4"
                    style={{ borderColor: "var(--border-subtle)" }}>
                    <Avatar name={searchResult.displayName} photo={searchResult.photoURL} size={48} />
                    <div className="flex-1 min-w-0">
                      <p className="font-crimson text-xl font-medium" style={{ color: "var(--text-main)" }}>{searchResult.displayName}</p>
                      <p className="uid-display mt-0.5 truncate">{searchResult.uid}</p>
                      {friends.some(f => f.uid === searchResult.uid) && (
                        <span className="font-mono text-[8px] uppercase tracking-[0.15em] flex items-center gap-1 mt-1" style={{ color: "var(--text-accent)" }}>
                          <UserCheck size={10} /> Already friends
                        </span>
                      )}
                    </div>
                    {!friends.some(f => f.uid === searchResult.uid) && (
                      <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                        onClick={() => sendRequest(searchResult.uid, searchResult.displayName)}
                        disabled={sendingRequest}
                        className="shrink-0 px-4 py-2 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] primary-action flex items-center gap-1.5"
                        style={{ color: "var(--action-text)", opacity: sendingRequest ? 0.5 : 1 }}>
                        <UserPlus size={11} /> Add
                      </motion.button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Tips */}
              <div className="border-t pt-6 mt-2" style={{ borderColor: "var(--border-subtle)" }}>
                <p className="font-mono text-[9px] uppercase tracking-[0.2em] mb-4" style={{ color: "var(--text-accent)" }}>How it works</p>
                <div className="flex flex-col gap-3">
                  {[
                    "Share your User ID from the card above",
                    "Ask your friend to paste it in this search",
                    "Accept the request on the Requests tab",
                    "View their journal and share decks with each other",
                  ].map((tip, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <span className="font-mono text-[8px] shrink-0 mt-0.5 w-4 text-right opacity-40" style={{ color: "var(--text-sub)" }}>
                        0{i + 1}
                      </span>
                      <p className="font-crimson text-base font-light leading-snug" style={{ color: "var(--text-sub)" }}>{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <OnboardingTour 
        steps={friendsSteps} 
        isOpen={tour.isOpen} 
        stepIndex={tour.stepIndex} 
        onNext={() => tour.next(friendsSteps.length)} 
        onPrev={tour.prev} 
        onSkip={tour.skip} 
        onFinish={tour.finish} 
      />

      {/* ── Friend Profile Modal ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {viewingProfile && (
          <FriendProfileModal
            profile={viewingProfile}
            currentUser={user}
            onClose={() => setViewingProfile(null)}
            onShareDeck={shareDeck}
          />
        )}
      </AnimatePresence>

      {/* ── Remove Friend Confirmation Modal ───────────────────────────────────── */}
      <AnimatePresence>
        {friendToRemove && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)" }}
            onClick={(e) => { if (e.target === e.currentTarget) setFriendToRemove(null); }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-sm rounded-2xl border p-6 text-center"
              style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)", boxShadow: "var(--shadow-primary)" }}
            >
              <div className="w-12 h-12 rounded-full mx-auto mb-4 flex items-center justify-center bg-red-500/10 text-red-500 border border-red-500/20">
                <Trash2 size={20} strokeWidth={1.5} />
              </div>
              <h3 className="font-crimson text-xl font-medium mb-2" style={{ color: "var(--text-main)" }}>
                Remove Friend?
              </h3>
              <p className="font-mono text-[9px] uppercase tracking-[0.15em] mb-6" style={{ color: "var(--text-sub)", lineHeight: 1.6 }}>
                Are you sure you want to remove <br/>
                <span style={{ color: "var(--text-accent)", fontSize: "10px", fontWeight: "bold" }}>{friendToRemove.displayName}</span><br/>
                from your friends list?
              </p>
              
              <div className="flex gap-3">
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => setFriendToRemove(null)}
                  className="flex-1 py-2.5 rounded-full border font-mono text-[9px] uppercase tracking-[0.2em]"
                  style={{ borderColor: "var(--border-subtle)", color: "var(--text-sub)" }}
                >
                  Cancel
                </motion.button>
                <motion.button 
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => confirmRemoveFriend(friendToRemove.uid)}
                  className="flex-1 py-2.5 rounded-full font-mono text-[9px] uppercase tracking-[0.2em] flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#ef4444", color: "#fff", boxShadow: "0 4px 12px -4px rgba(239, 68, 68, 0.4)", border: "none" }}
                >
                  Remove
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Toast (Centered Responsive Layout) ────────────────────────────────── */}
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
    </div>
  );
}