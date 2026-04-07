"use client";

import { useState, useEffect } from "react";
import { auth, provider } from "@/lib/firebase";
import {
  FirebaseAuthentication,
} from "@capacitor-firebase/authentication";
import {
  signInWithRedirect,
  signInWithCredential,
  GoogleAuthProvider,
  onAuthStateChanged,
} from "firebase/auth";
import { Capacitor } from "@capacitor/core";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2, Moon, Sun } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

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

    button:focus, a:focus { outline: none; }

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
  `}</style>
);

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isProcessingClick, setIsProcessingClick] = useState(false);
  const [theme, setTheme] = useState("light");
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
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && !isProcessingClick) {
        router.push("/dashboard");
      }
    });
    return () => unsub();
  }, [router, isProcessingClick]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setIsProcessingClick(true);
      setError("");

      if (Capacitor.isNativePlatform()) {
        // Android/iOS — native Google Sign-In sheet (no popup/redirect needed)
        const result = await FirebaseAuthentication.signInWithGoogle();

        const credential = GoogleAuthProvider.credential(
          result.credential?.idToken,
          result.credential?.accessToken
        );

        const userCredential = await signInWithCredential(auth, credential);

        // getAdditionalUserInfo is unreliable on native — use metadata timestamps instead
        const { creationTime, lastSignInTime } = userCredential.user.metadata;
        const isNewUser =
          creationTime === lastSignInTime ||
          Math.abs(new Date(creationTime!).getTime() - new Date(lastSignInTime!).getTime()) < 5000;

        router.push(isNewUser ? "/onboarding" : "/dashboard");

      } else {
        // Web browser — redirect works fine
        await signInWithRedirect(auth, provider);
      }

    } catch (err) {
      const error = err as any;
      console.error("Sign-in error:", error.code, error.message);
      setError(`Failed: ${error.code || error.message}`);
      setIsLoading(false);
      setIsProcessingClick(false);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col transition-colors duration-500">
      <GlobalStyles />

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 h-20 backdrop-blur-md" style={{ backgroundColor: 'var(--bg-nav)' }}>
        <div className="max-w-5xl mx-auto px-6 h-full flex items-center justify-between">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
            onClick={() => router.push("/")}
          >
            <div className="relative w-6 h-6 rounded-md overflow-hidden border" style={{ borderColor: 'var(--border-line)' }}>
              <Image src="/logo.png" alt="Kamusta Logo" fill className="object-cover" />
            </div>
            <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block" style={{ color: 'var(--text-main)' }}>
              Kamusta
            </span>
          </motion.div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="opacity-60 hover:opacity-100 transition-opacity"
              style={{ color: 'var(--text-sub)' }}
            >
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </button>
            <div className="h-3 w-px" style={{ backgroundColor: "var(--border-line)" }} />
            <Link
              href="/"
              className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.15em] opacity-60 hover:opacity-100 transition-all group"
              style={{ color: 'var(--text-sub)' }}
            >
              <ArrowLeft size={14} strokeWidth={1.5} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="hidden sm:inline hover:text-[var(--text-main)] transition-colors">Home</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center pt-24 pb-12 px-6 relative z-10 w-full">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-sm flex flex-col items-center text-center"
        >
          {/* Header */}
          <div className="mb-14 flex flex-col items-center">
            <div className="relative w-12 h-12 mb-8 opacity-90">
              <Image src="/logo.png" alt="Logo" fill className="object-contain" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[0.25em] block mb-4" style={{ color: 'var(--text-sub)' }}>
              Authentication
            </span>
            <h1 className="text-4xl sm:text-5xl font-light tracking-tight mb-4" style={{ color: 'var(--text-main)' }}>
              Sign In
            </h1>
            <p className="font-crimson text-lg italic opacity-80" style={{ color: 'var(--text-sub)' }}>
              Open your vault and continue the conversation.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-8 font-mono text-[10px] uppercase tracking-widest text-red-500/90 w-full"
            >
              {error}
            </motion.div>
          )}

          {/* Action Button */}
          <div className="w-full">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-4 font-mono text-[11px] uppercase tracking-[0.2em] border px-6 py-4 rounded-full transition-all hover:border-[var(--border-strong)] disabled:opacity-50 disabled:cursor-not-allowed group"
              style={{ borderColor: 'var(--border-line)', color: 'var(--text-main)' }}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--text-sub)' }} />
              ) : (
                <div className="group-hover:scale-110 transition-transform duration-300">
                  <GoogleIcon />
                </div>
              )}
              <span className="pt-[2px] font-semibold">
                {isLoading ? "Authenticating..." : "Continue with Google"}
              </span>
            </button>
          </div>

          {/* Footer */}
          <div className="mt-16 text-center">
            <p className="text-[9px] font-mono uppercase tracking-[0.2em] opacity-40" style={{ color: 'var(--text-sub)' }}>
              Kamusta Cards © {new Date().getFullYear()}
            </p>
          </div>
        </motion.div>
      </main>
    </div>
  );
}