"use client";

import { useState, useEffect, useCallback } from "react";

const TOUR_PREFIX = "kamusta_tour_seen_";

export function useOnboardingTour(pageKey: string) {
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Small delay so page elements have time to mount
    const timer = setTimeout(() => {
      const seen = localStorage.getItem(`${TOUR_PREFIX}${pageKey}`);
      if (!seen) setIsOpen(true);
      setReady(true);
    }, 800);
    return () => clearTimeout(timer);
  }, [pageKey]);

  const next = useCallback((totalSteps: number) => {
    if (stepIndex < totalSteps - 1) {
      setStepIndex((s) => s + 1);
    } else {
      finish();
    }
  }, [stepIndex]);

  const prev = useCallback(() => {
    setStepIndex((s) => Math.max(0, s - 1));
  }, []);

  const finish = useCallback(() => {
    localStorage.setItem(`${TOUR_PREFIX}${pageKey}`, "true");
    setIsOpen(false);
    setStepIndex(0);
  }, [pageKey]);

  const skip = finish;

  // Expose a reset function so users can replay from profile/settings
  const resetTour = useCallback(() => {
    localStorage.removeItem(`${TOUR_PREFIX}${pageKey}`);
    setStepIndex(0);
    setIsOpen(true);
  }, [pageKey]);

  return { isOpen, stepIndex, ready, next, prev, finish, skip, resetTour };
}

// Helper to reset ALL tours at once (for profile page)
export function resetAllTours() {
  Object.keys(localStorage).forEach((key) => {
    if (key.startsWith(TOUR_PREFIX)) localStorage.removeItem(key);
  });
}