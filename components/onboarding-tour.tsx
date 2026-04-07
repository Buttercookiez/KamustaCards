"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { TourStep } from "@/lib/tourSteps";

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpotlightRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TooltipPosition {
  top: number;
  left: number;
  transformOrigin: string;
  arrowSide: "top" | "bottom" | "left" | "right" | "none";
  arrowOffset: number;
}

interface OnboardingTourProps {
  steps: TourStep[];
  isOpen: boolean;
  stepIndex: number;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
  onFinish: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PADDING = 10; // spotlight padding around target element
const TOOLTIP_WIDTH = 300;
const TOOLTIP_OFFSET = 16; // gap between spotlight edge and tooltip

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getTargetRect(target: string): DOMRect | null {
  const el = document.querySelector(`[data-tour="${target}"]`);
  if (!el) return null;
  return el.getBoundingClientRect();
}

function computeSpotlight(rect: DOMRect): SpotlightRect {
  return {
    top: rect.top - PADDING + window.scrollY,
    left: rect.left - PADDING,
    width: rect.width + PADDING * 2,
    height: rect.height + PADDING * 2,
  };
}

function computeTooltipPosition(
  rect: DOMRect,
  placement: TourStep["placement"]
): TooltipPosition {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const tooltipHeight = 200; // estimated
  const scrollY = window.scrollY;

  const spotTop    = rect.top - PADDING + scrollY;
  const spotLeft   = rect.left - PADDING;
  const spotRight  = rect.right + PADDING;
  const spotBottom = rect.bottom + PADDING + scrollY;
  const spotCenterX = rect.left + rect.width / 2;
  const spotCenterY = rect.top + rect.height / 2 + scrollY;

  // Clamp X so tooltip doesn't escape viewport
  const clampX = (x: number) =>
    Math.max(12, Math.min(vw - TOOLTIP_WIDTH - 12, x));

  let top = 0, left = 0, transformOrigin = "top left";
  let arrowSide: TooltipPosition["arrowSide"] = "none";
  let arrowOffset = 0;

  if (placement === "center" || !placement) {
    top  = scrollY + vh / 2 - tooltipHeight / 2;
    left = vw / 2 - TOOLTIP_WIDTH / 2;
    transformOrigin = "center center";
    return { top, left, transformOrigin, arrowSide: "none", arrowOffset: 0 };
  }

  if (placement === "bottom") {
    top  = spotBottom + TOOLTIP_OFFSET;
    left = clampX(spotCenterX - TOOLTIP_WIDTH / 2);
    transformOrigin = "top center";
    arrowSide = "top";
    arrowOffset = spotCenterX - left;
  } else if (placement === "top") {
    top  = spotTop - tooltipHeight - TOOLTIP_OFFSET;
    left = clampX(spotCenterX - TOOLTIP_WIDTH / 2);
    transformOrigin = "bottom center";
    arrowSide = "bottom";
    arrowOffset = spotCenterX - left;
  } else if (placement === "right") {
    top  = clampX(spotCenterY - tooltipHeight / 2);
    left = spotRight + TOOLTIP_OFFSET;
    if (left + TOOLTIP_WIDTH > vw - 12) {
      // Fall back to bottom if no room on right
      top  = spotBottom + TOOLTIP_OFFSET;
      left = clampX(spotCenterX - TOOLTIP_WIDTH / 2);
      arrowSide = "top";
      arrowOffset = spotCenterX - left;
      transformOrigin = "top center";
    } else {
      transformOrigin = "top left";
      arrowSide = "left";
      arrowOffset = spotCenterY - top;
    }
  } else if (placement === "left") {
    top  = clampX(spotCenterY - tooltipHeight / 2);
    left = spotLeft - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
    if (left < 12) {
      // Fall back to bottom
      top  = spotBottom + TOOLTIP_OFFSET;
      left = clampX(spotCenterX - TOOLTIP_WIDTH / 2);
      arrowSide = "top";
      arrowOffset = spotCenterX - left;
      transformOrigin = "top center";
    } else {
      transformOrigin = "top right";
      arrowSide = "right";
      arrowOffset = spotCenterY - top;
    }
  }

  return { top, left, transformOrigin, arrowSide, arrowOffset };
}

// ─── Spotlight SVG mask ───────────────────────────────────────────────────────
function SpotlightOverlay({
  spotlight,
}: {
  spotlight: SpotlightRect | null;
}) {
  const vw = typeof window !== "undefined" ? window.innerWidth : 1440;
  const vh = typeof window !== "undefined" ? window.innerHeight : 900;
  const docH = typeof document !== "undefined"
    ? document.documentElement.scrollHeight
    : 5000;

  if (!spotlight) {
    return (
      <div
        className="fixed inset-0 z-[9000]"
        style={{ backgroundColor: "rgba(0,0,0,0.65)" }}
      />
    );
  }

  const { top, left, width, height } = spotlight;
  const r = 12; // border-radius of cutout

  // SVG path: full page rect minus rounded-rect cutout
  const path = [
    `M 0 0 H ${vw} V ${docH} H 0 Z`,
    `M ${left + r} ${top}`,
    `H ${left + width - r} Q ${left + width} ${top} ${left + width} ${top + r}`,
    `V ${top + height - r} Q ${left + width} ${top + height} ${left + width - r} ${top + height}`,
    `H ${left + r} Q ${left} ${top + height} ${left} ${top + height - r}`,
    `V ${top + r} Q ${left} ${top} ${left + r} ${top} Z`,
  ].join(" ");

  return (
    <svg
      className="fixed inset-0 z-[9000] pointer-events-none"
      style={{ width: vw, height: docH, top: 0, left: 0 }}
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d={path} fill="rgba(0,0,0,0.65)" fillRule="evenodd" />
      {/* Spotlight border glow */}
      <rect
        x={left}
        y={top}
        width={width}
        height={height}
        rx={r}
        fill="none"
        stroke="rgba(255,255,255,0.15)"
        strokeWidth={1.5}
      />
    </svg>
  );
}

// ─── Tooltip Arrow ────────────────────────────────────────────────────────────
function Arrow({
  side,
  offset,
}: {
  side: TooltipPosition["arrowSide"];
  offset: number;
}) {
  if (side === "none") return null;

  const size = 8;
  const clampedOffset = Math.max(size * 2, Math.min(TOOLTIP_WIDTH - size * 2, offset));

  const base: React.CSSProperties = {
    position: "absolute",
    width: 0,
    height: 0,
    borderStyle: "solid",
  };

  if (side === "top") {
    return (
      <div
        style={{
          ...base,
          top: -size,
          left: clampedOffset - size,
          borderWidth: `0 ${size}px ${size}px ${size}px`,
          borderColor: `transparent transparent var(--bg-nav) transparent`,
        }}
      />
    );
  }
  if (side === "bottom") {
    return (
      <div
        style={{
          ...base,
          bottom: -size,
          left: clampedOffset - size,
          borderWidth: `${size}px ${size}px 0 ${size}px`,
          borderColor: `var(--bg-nav) transparent transparent transparent`,
        }}
      />
    );
  }
  if (side === "left") {
    return (
      <div
        style={{
          ...base,
          left: -size,
          top: clampedOffset - size,
          borderWidth: `${size}px ${size}px ${size}px 0`,
          borderColor: `transparent var(--bg-nav) transparent transparent`,
        }}
      />
    );
  }
  if (side === "right") {
    return (
      <div
        style={{
          ...base,
          right: -size,
          top: clampedOffset - size,
          borderWidth: `${size}px 0 ${size}px ${size}px`,
          borderColor: `transparent transparent transparent var(--bg-nav)`,
        }}
      />
    );
  }
  return null;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function OnboardingTour({
  steps,
  isOpen,
  stepIndex,
  onNext,
  onPrev,
  onSkip,
  onFinish,
}: OnboardingTourProps) {
  const [spotlight, setSpotlight]         = useState<SpotlightRect | null>(null);
  const [tooltipPos, setTooltipPos]       = useState<TooltipPosition | null>(null);
  const [clickGuardRect, setClickGuardRect] = useState<SpotlightRect | null>(null);
  const rafRef = useRef<number>(0);

  const currentStep = steps[stepIndex];
  const isLast = stepIndex === steps.length - 1;

  // Recalculate positions whenever step changes or window resizes
  const recalc = useCallback(() => {
    if (!currentStep) return;
    const rect = getTargetRect(currentStep.target);
    if (!rect) {
      setSpotlight(null);
      setTooltipPos({
        top: window.scrollY + window.innerHeight / 2 - 100,
        left: window.innerWidth / 2 - TOOLTIP_WIDTH / 2,
        transformOrigin: "center center",
        arrowSide: "none",
        arrowOffset: 0,
      });
      return;
    }
    setSpotlight(computeSpotlight(rect));
    setTooltipPos(computeTooltipPosition(rect, currentStep.placement));
    setClickGuardRect(computeSpotlight(rect));

    // Scroll element into view if needed
    const pad = 80;
    const elTop = rect.top + window.scrollY;
    const elBot = rect.bottom + window.scrollY;
    const viewTop = window.scrollY + pad;
    const viewBot = window.scrollY + window.innerHeight - pad;
    if (elTop < viewTop) window.scrollTo({ top: elTop - pad, behavior: "smooth" });
    else if (elBot > viewBot) window.scrollTo({ top: elBot - window.innerHeight + pad, behavior: "smooth" });
  }, [currentStep]);

  useEffect(() => {
    if (!isOpen) return;
    // Wait for any scroll/layout then measure
    rafRef.current = requestAnimationFrame(() => {
      setTimeout(recalc, 100);
    });
    window.addEventListener("resize", recalc);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", recalc);
    };
  }, [isOpen, recalc]);

  if (!isOpen || !currentStep) return null;

  return (
    <>
      {/* ── Click-blocking overlay (lets spotlight area through) ── */}
      <div
        className="fixed inset-0 z-[8999]"
        style={{ cursor: "default" }}
        onClick={(e) => {
          // Allow clicks inside the spotlight area to pass through
          if (clickGuardRect) {
            const { top, left, width, height } = clickGuardRect;
            const scrollY = window.scrollY;
            const x = e.clientX;
            const y = e.clientY + scrollY;
            if (
              x >= left && x <= left + width &&
              y >= top && y <= top + height
            ) return;
          }
          onSkip();
        }}
      />

      {/* ── SVG Spotlight ── */}
      <SpotlightOverlay spotlight={spotlight} />

      {/* ── Tooltip ── */}
      <AnimatePresence mode="wait">
        {tooltipPos && (
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.92 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed z-[9100] font-crimson"
            style={{
              top:  tooltipPos.top,
              left: tooltipPos.left,
              width: TOOLTIP_WIDTH,
              transformOrigin: tooltipPos.transformOrigin,
            }}
          >
            <div
              className="relative rounded-xl border backdrop-blur-md p-5 shadow-2xl"
              style={{
                backgroundColor: "var(--bg-nav)",
                borderColor: "var(--border-subtle)",
                color: "var(--text-main)",
              }}
            >
              <Arrow side={tooltipPos.arrowSide} offset={tooltipPos.arrowOffset} />

              {/* Step counter */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                  <Sparkles
                    size={12}
                    strokeWidth={1.5}
                    style={{ color: "var(--text-accent)" }}
                  />
                  <span
                    className="font-mono text-[9px] uppercase tracking-[0.2em]"
                    style={{ color: "var(--text-accent)" }}
                  >
                    {stepIndex + 1} / {steps.length}
                  </span>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onSkip}
                  style={{ color: "var(--text-accent)" }}
                  aria-label="Skip tour"
                >
                  <X size={14} strokeWidth={1.5} />
                </motion.button>
              </div>

              {/* Progress dots */}
              <div className="flex items-center gap-1 mb-4">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    className="rounded-full transition-all duration-300"
                    style={{
                      width:           i === stepIndex ? 16 : 4,
                      height:          4,
                      backgroundColor: i === stepIndex
                        ? "var(--text-accent)"
                        : "var(--border-strong)",
                      opacity: i === stepIndex ? 1 : 0.4,
                    }}
                  />
                ))}
              </div>

              {/* Content */}
              <h3
                className="font-cinzel font-semibold text-sm tracking-wide mb-2"
                style={{ color: "var(--text-main)" }}
              >
                {currentStep.title}
              </h3>
              <p
                className="font-crimson text-sm leading-relaxed mb-5"
                style={{ color: "var(--text-sub)" }}
              >
                {currentStep.description}
              </p>

              {/* Navigation buttons */}
              <div className="flex items-center justify-between gap-2">
                <motion.button
                  whileHover={{ x: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onPrev}
                  disabled={stepIndex === 0}
                  className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-[0.15em] transition-opacity"
                  style={{
                    color: "var(--text-sub)",
                    opacity: stepIndex === 0 ? 0.25 : 0.7,
                    cursor: stepIndex === 0 ? "not-allowed" : "pointer",
                  }}
                >
                  <ArrowLeft size={12} strokeWidth={1.5} />
                  Back
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={isLast ? onFinish : onNext}
                  className="flex items-center gap-2 h-8 px-5 rounded-full font-mono text-[9px] uppercase tracking-[0.15em] select-none primary-action"
                  style={{ color: "var(--action-text)" }}
                >
                  {isLast ? "Done" : "Next"}
                  {!isLast && <ArrowRight size={12} strokeWidth={1.5} />}
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}