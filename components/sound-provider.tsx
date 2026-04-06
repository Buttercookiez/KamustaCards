"use client";

// ============================================
// GLOBAL SOUND PROVIDER
// Wrap your root layout with <SoundProvider> so music
// never stops on page navigation.
//
// Add your tracks to /public/sounds/:
//   track-1.mp3, track-2.mp3, track-3.mp3 … (any count)
//   Then list them in the TRACKS array below.
//
// Usage in layout.tsx:
//   import { SoundProvider } from "@/components/sound-provider";
//   <SoundProvider>{children}</SoundProvider>
// ============================================

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";

// ── Add / remove tracks here ──────────────────────────────
const TRACKS = [
  "/sounds/track-1.mp3",
  "/sounds/track-2.mp3",
  "/sounds/track-3.mp3",
];
// ─────────────────────────────────────────────────────────

type SoundContextValue = {
  soundEnabled: boolean;
  isPlaying: boolean;
  trackIndex: number;
  trackCount: number;
  toggleSound: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  /** Call once on first user interaction to satisfy browser autoplay policy */
  startIfNeeded: () => void;
};

const SoundContext = createContext<SoundContextValue>({
  soundEnabled: true,
  isPlaying: false,
  trackIndex: 0,
  trackCount: TRACKS.length,
  toggleSound: () => {},
  nextTrack: () => {},
  prevTrack: () => {},
  startIfNeeded: () => {},
});

export function useSoundContext() {
  return useContext(SoundContext);
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const howlRef = useRef<any>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [trackIndex, setTrackIndex] = useState(0);
  const [HowlClass, setHowlClass] = useState<any>(null);
  const startedRef = useRef(false); // has the user interacted yet?

  // Load Howler once on mount
  useEffect(() => {
    import("howler").then(({ Howl }) => {
      setHowlClass(() => Howl);
      const stored = localStorage.getItem("soundEnabled");
      if (stored === "false") setSoundEnabled(false);
    });
  }, []);

  // Build / rebuild the Howl instance whenever track or Howl class changes
  useEffect(() => {
    if (!HowlClass) return;

    // Tear down previous instance
    if (howlRef.current) {
      howlRef.current.off();
      howlRef.current.stop();
      howlRef.current.unload();
    }

    howlRef.current = new HowlClass({
      src: [TRACKS[trackIndex]],
      loop: false,
      volume: 0.25,
      html5: true,
      onend: () => {
        // Auto-advance to next track
        setTrackIndex((i) => (i + 1) % TRACKS.length);
      },
      onplay: () => setIsPlaying(true),
      onpause: () => setIsPlaying(false),
      onstop: () => setIsPlaying(false),
    });

    // If we were already playing (e.g. user hit next/prev), resume
    if (startedRef.current && soundEnabled) {
      howlRef.current.play();
    }

    return () => {
      howlRef.current?.off();
      howlRef.current?.stop();
      howlRef.current?.unload();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [HowlClass, trackIndex]);

  // Kick off playback on first user interaction (browser autoplay policy)
  const startIfNeeded = useCallback(() => {
    if (startedRef.current || !howlRef.current || !soundEnabled) return;
    startedRef.current = true;
    howlRef.current.play();
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("soundEnabled", String(next));

    if (!howlRef.current) return;
    if (next) {
      startedRef.current = true;
      howlRef.current.play();
    } else {
      howlRef.current.pause();
    }
  }, [soundEnabled]);

  const nextTrack = useCallback(() => {
    startedRef.current = true; // user explicitly pressed next = interaction
    setTrackIndex((i) => (i + 1) % TRACKS.length);
  }, []);

  const prevTrack = useCallback(() => {
    startedRef.current = true;
    setTrackIndex((i) => (i - 1 + TRACKS.length) % TRACKS.length);
  }, []);

  return (
    <SoundContext.Provider
      value={{
        soundEnabled,
        isPlaying,
        trackIndex,
        trackCount: TRACKS.length,
        toggleSound,
        nextTrack,
        prevTrack,
        startIfNeeded,
      }}
    >
      {children}
    </SoundContext.Provider>
  );
}