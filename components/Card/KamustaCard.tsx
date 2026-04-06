"use client";

import { motion } from "framer-motion";
import { Heart } from "lucide-react";

export default function KamustaCard({
  title = "Deep Connection",
  text = "What is a moment with me that you'll never forget?",
  type = "Question Card",
  icon: Icon = Heart,
  isFlipped = false,
  onClick,
  isDrawer = false,
  status = "playing"
}: {
  title?: string;
  text?: string;
  type?: string;
  icon?: any;
  isFlipped?: boolean;
  onClick?: () => void;
  isDrawer?: boolean;
  status?: string;
}) {
  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`relative w-64 sm:w-72 aspect-[3/4] ${isDrawer && status === 'playing' ? 'cursor-pointer group' : ''}`}
      style={{ perspective: "1200px" }}
      onClick={isDrawer && status === 'playing' ? onClick : undefined}
    >
      <motion.div
        className="w-full h-full relative"
        style={{ transformStyle: "preserve-3d" }}
        initial={false}
        animate={{ rotateY: isFlipped ? 180 : 0 }}
        transition={{ duration: 0.8, type: "spring", stiffness: 200, damping: 20 }}
      >

        {/* ========================================
            BACK OF CARD (Original Notebook Aesthetic)
            ======================================== */}
        <div
          className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] rounded-2xl flex flex-col items-center justify-center border border-[#8b7355]/30 transition-transform duration-500 group-hover:scale-[1.02]"
          style={{
            backfaceVisibility: "hidden",
            boxShadow: "0 2px 8px rgba(0,0,0,0.3), 0 20px 60px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          {/* SVG Noise Overlay */}
          <div
            className="absolute inset-0 rounded-2xl opacity-[0.08] mix-blend-overlay"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='6' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")`,
            }}
          />

          <div className="relative text-center w-full px-4">
            <div className="font-cinzel text-2xl font-normal tracking-[0.25em] text-[#f5f0e8] uppercase drop-shadow-md">
              Kamusta
            </div>
            <div className="w-16 h-px bg-[rgba(245,240,232,0.3)] my-4 mx-auto" />
            <div className="font-mono text-[10px] tracking-[0.4em] text-[#f5f0e8]/70 uppercase">
              Cards
            </div>
          </div>

          {isDrawer && status === 'playing' && (
            <div className="absolute bottom-6 left-0 right-0 text-center animate-pulse">
              <span className="font-mono text-[9px] text-[#a89070] tracking-widest uppercase">Tap to Draw</span>
            </div>
          )}
        </div>

        {/* ========================================
            FRONT OF CARD
            ======================================== */}
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
          {/* Top strip — type label + icon */}
          <div className="flex items-center justify-between px-5 pt-5 pb-0">
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.35em",
                textTransform: "uppercase",
                color: "#a89070",
              }}
            >
              {type}
            </span>

            <div
              className="flex items-center justify-center"
              style={{
                width: "28px",
                height: "28px",
                borderRadius: "50%",
                border: "1px solid rgba(90,74,56,0.2)",
                background: "transparent",
              }}
            >
              <Icon
                style={{
                  width: "13px",
                  height: "13px",
                  color: "#5a4a38",
                  strokeWidth: 1.25,
                }}
              />
            </div>
          </div>

          {/* Center — prompt text */}
          <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
            <p
              style={{
                fontFamily: "'Crimson Pro', Georgia, serif",
                fontSize: "19px",
                fontWeight: 300,
                lineHeight: 1.55,
                color: "#2c2318",
                letterSpacing: "0.01em",
              }}
            >
              {text}
            </p>
          </div>

          {/* Bottom strip — title */}
          <div className="px-5 pb-5 pt-0 flex items-center justify-center">
            <span
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: "8px",
                letterSpacing: "0.3em",
                textTransform: "uppercase",
                color: "rgba(90,74,56,0.4)",
              }}
            >
              {title}
            </span>
          </div>
        </div>

      </motion.div>
    </motion.div>
  );
}