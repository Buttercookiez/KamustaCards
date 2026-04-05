"use client";

import { useState, useEffect } from "react";
import { auth } from "@/lib/firebase";
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Loader2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";

// Google Logo SVG Component
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" xmlns="http://www.w3.org/2000/svg">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export default function SignInPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) router.push("/dashboard");
    });
    return () => unsub();
  }, [router]);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error("Sign-in error:", err);
      setError("Failed to sign in. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] flex items-center justify-center relative font-crimson text-[#2c2825]">
      
      {/* Background Noise/Grain */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03] mix-blend-overlay z-0" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")` }} />

      {/* Top Navigation */}
      <Link href="/" className="absolute top-6 left-6 z-20 flex items-center gap-2 text-[#6b4423] hover:text-[#2c2825] transition-colors font-mono text-[10px] uppercase tracking-widest">
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-[400px] px-6"
      >
        {/* The Paper Card */}
        <div className="bg-[#f5f0e8] rounded-sm shadow-xl border border-[#d4c8b8] relative overflow-hidden min-h-[450px] flex flex-col">
          
          {/* Paper styling: Ruled horizontal lines */}
          <div className="absolute inset-0 pointer-events-none" 
               style={{ 
                 backgroundImage: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 27px, rgba(0,0,0,0.06) 27px, rgba(0,0,0,0.06) 28px)',
                 backgroundPositionY: '12px'
               }} 
          />
          
          {/* Paper styling: Red vertical margin line */}
          <div className="absolute left-8 top-0 bottom-0 w-px bg-[rgba(180,80,80,0.15)] pointer-events-none" />
          <div className="absolute left-[34px] top-0 bottom-0 w-px bg-[rgba(180,80,80,0.05)] pointer-events-none" />

          {/* Content inside the margin */}
          <div className="relative z-10 pl-16 pr-8 py-12 flex flex-col h-full flex-1">
            
            {/* Header */}
            <div className="mb-12 mt-4">
              {/* Logo without background */}
              <div className="relative w-12 h-12 mb-6">
                <Image src="/logo.png" alt="Logo" fill className="object-contain" />
              </div>
              
              <h1 className="font-cinzel text-2xl text-[#2c2825] mb-2 font-bold tracking-wide">
                Sign In
              </h1>
              <p className="text-[#6b4423] text-sm italic font-crimson">
                Open your vault and continue the conversation.
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 py-2 px-3 bg-red-50/80 border border-red-200 text-red-600 text-[11px] font-mono rounded-sm">
                {error}
              </div>
            )}

            {/* Google Button */}
            <div className="mt-auto pb-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-[#d4c8b8] hover:border-[#8b7355] text-[#2c2825] px-4 py-3 rounded-md shadow-sm transition-all duration-200 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-[#8b7355]" />
                ) : (
                  <GoogleIcon />
                )}
                <span className="font-mono text-[11px] uppercase tracking-widest font-bold">
                  {isLoading ? "Signing in..." : "Google"}
                </span>
              </button>
            </div>

            <div className="mt-4 text-center">
              <p className="text-[9px] text-[#a89070] font-mono uppercase tracking-[0.2em]">
                Kamusta Cards © 2026
              </p>
            </div>

          </div>
        </div>
      </motion.div>
    </div>
  );
}