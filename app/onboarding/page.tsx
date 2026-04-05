"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import { 
  ArrowRight, 
  ArrowLeft, 
  Heart, 
  Globe, 
  Coffee, 
  Sparkles,
  Check
} from "lucide-react";

// ============================================
// CSS VARIABLES & GLOBAL STYLES (Theme)
// ============================================
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
    
    :root {
      --bg-base: #faf8f5;
      --bg-card: transparent;
      --bg-card-hover: rgba(0, 0, 0, 0.02);
      --bg-card-active: rgba(139, 115, 85, 0.08);
      
      --text-main: #2c2825;
      --text-sub: #6b4423;
      --text-accent: #8b7355;
      
      --border-subtle: #d4c8b8;
      --border-strong: #a89070;
      
      --action-bg: #2c2825;
      --action-text: #f5f0e8;
    }
    
    .dark {
      --bg-base: #09090b;
      --bg-card: transparent;
      --bg-card-hover: rgba(255, 255, 255, 0.03);
      --bg-card-active: rgba(168, 144, 112, 0.1);
      
      --text-main: #e4ddd2;
      --text-sub: #a1a1aa;
      --text-accent: #71717a;
      
      --border-subtle: #27272a;
      --border-strong: #52525b;
      
      --action-bg: #e4ddd2;
      --action-text: #09090b;
    }
    
    * {
      -webkit-tap-highlight-color: transparent !important;
    }

    button:focus, a:focus, input:focus { outline: none; }
    
    body {
      background-color: var(--bg-base);
      color: var(--text-main);
      transition: background-color 0.5s ease, color 0.5s ease;
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
      opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
      background-repeat: repeat;
    }

    .primary-action {
      background-color: var(--action-bg);
      color: var(--action-text);
      transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .primary-action:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px -8px rgba(0, 0, 0, 0.3);
    }
    .primary-action:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `}</style>
);

const intentions = [
  { id: "couples", title: "Deepen a Relationship", icon: Heart, desc: "Connect with a partner on a deeper level." },
  { id: "ldr", title: "Bridge the Distance", icon: Globe, desc: "Stay close to someone far away." },
  { id: "friends", title: "Meaningful Hangouts", icon: Coffee, desc: "Skip the small talk with friends." },
  { id: "self", title: "Self Reflection", icon: Sparkles, desc: "Explore your own thoughts and goals." },
];

export default function Onboarding() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [selectedIntention, setSelectedIntention] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Set theme safely on mount
  useEffect(() => {
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      const user = auth.currentUser;
      if (user) {
        await updateProfile(user, { displayName: name });
        // You could also save the selectedIntention to Firestore here
      }
      localStorage.setItem("onboardingCompleted", "true");
      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to update profile", error);
      setIsSubmitting(false);
    }
  };

  // Framer Motion variants for sliding between steps
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 50 : -50,
      opacity: 0,
    })
  };

  const [direction, setDirection] = useState(1);

  const goToStep = (newStep: number) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  return (
    <div className="min-h-screen grain-overlay font-crimson flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden relative">
      <GlobalStyles />
      
      {/* Background ambient light */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] rounded-full blur-3xl pointer-events-none opacity-20" style={{ backgroundColor: 'var(--text-accent)' }} />

      {/* Progress Indicator */}
      <div className="absolute top-8 left-0 right-0 flex justify-center gap-3 z-20">
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            className="h-1 rounded-full transition-all duration-500"
            style={{ 
              width: step === i ? '24px' : '8px',
              backgroundColor: step >= i ? 'var(--text-main)' : 'var(--border-subtle)',
              opacity: step >= i ? 1 : 0.4
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-lg relative z-10">
        <AnimatePresence mode="wait" custom={direction}>
          
          {/* STEP 1: Name */}
          {step === 1 && (
            <motion.div
              key="step1"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center space-y-8"
            >
              <div className="space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--text-accent)' }}>
                  Step 01
                </span>
                <h1 className="text-3xl sm:text-4xl font-crimson font-medium" style={{ color: 'var(--text-main)' }}>
                  What should we call you?
                </h1>
                <p className="text-sm font-crimson" style={{ color: 'var(--text-sub)' }}>
                  This is how you'll appear to your friends and loved ones.
                </p>
              </div>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full max-w-xs text-center text-3xl font-crimson bg-transparent border-b-2 py-3 transition-colors placeholder-opacity-30"
                style={{ 
                  color: 'var(--text-main)',
                  borderColor: name ? 'var(--text-main)' : 'var(--border-subtle)',
                }}
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && name.trim() && goToStep(2)}
              />

              <button
                onClick={() => goToStep(2)}
                disabled={!name.trim()}
                className="primary-action mt-8 h-12 px-8 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 select-none"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 2: Intentions */}
          {step === 2 && (
            <motion.div
              key="step2"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col w-full"
            >
              <div className="text-center mb-8 space-y-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.25em]" style={{ color: 'var(--text-accent)' }}>
                  Step 02
                </span>
                <h1 className="text-3xl sm:text-4xl font-crimson font-medium" style={{ color: 'var(--text-main)' }}>
                  What brings you here?
                </h1>
                <p className="text-sm font-crimson" style={{ color: 'var(--text-sub)' }}>
                  We'll use this to recommend your first deck.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {intentions.map((intent) => {
                  const isSelected = selectedIntention === intent.id;
                  const Icon = intent.icon;
                  return (
                    <button
                      key={intent.id}
                      onClick={() => setSelectedIntention(intent.id)}
                      className="flex flex-col text-left p-5 rounded-xl border transition-all duration-300 relative overflow-hidden group select-none"
                      style={{
                        backgroundColor: isSelected ? 'var(--bg-card-active)' : 'var(--bg-card)',
                        borderColor: isSelected ? 'var(--border-strong)' : 'var(--border-subtle)',
                      }}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <Icon 
                          className="w-5 h-5 transition-transform duration-500 group-hover:scale-110" 
                          style={{ color: isSelected ? 'var(--text-main)' : 'var(--text-accent)' }} 
                          strokeWidth={1.5}
                        />
                        <div 
                          className={`w-5 h-5 rounded-full border flex items-center justify-center transition-all duration-300 ${isSelected ? 'scale-100 opacity-100' : 'scale-75 opacity-0'}`}
                          style={{ borderColor: 'var(--text-main)', backgroundColor: 'var(--text-main)' }}
                        >
                          <Check className="w-3 h-3" style={{ color: 'var(--bg-base)' }} strokeWidth={3} />
                        </div>
                      </div>
                      <h3 className="font-crimson font-medium text-lg mb-1" style={{ color: 'var(--text-main)' }}>
                        {intent.title}
                      </h3>
                      <p className="font-crimson text-xs leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                        {intent.desc}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-between mt-10">
                <button
                  onClick={() => goToStep(1)}
                  className="h-12 px-6 rounded-full font-mono text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 transition-opacity hover:opacity-70 select-none"
                  style={{ color: 'var(--text-sub)' }}
                >
                  <ArrowLeft className="w-4 h-4" /> Back
                </button>
                <button
                  onClick={() => goToStep(3)}
                  disabled={!selectedIntention}
                  className="primary-action h-12 px-8 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 select-none"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Ready */}
          {step === 3 && (
            <motion.div
              key="step3"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col items-center text-center space-y-8 py-8"
            >
              <div 
                className="w-16 h-16 rounded-full border flex items-center justify-center mb-2"
                style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-active)' }}
              >
                <Sparkles className="w-6 h-6" style={{ color: 'var(--text-accent)' }} strokeWidth={1.5} />
              </div>
              
              <div className="space-y-3">
                <h1 className="text-3xl sm:text-4xl font-crimson font-medium" style={{ color: 'var(--text-main)' }}>
                  You're all set, {name}.
                </h1>
                <p className="text-sm font-crimson max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--text-sub)' }}>
                  Your space is ready. Remember, every card is an invitation to be present.
                </p>
              </div>

              <div className="flex w-full justify-between items-center max-w-xs mx-auto mt-12 pt-8">
                <button
                  onClick={() => goToStep(2)}
                  className="text-xs font-mono uppercase tracking-[0.2em] transition-opacity hover:opacity-70 select-none"
                  style={{ color: 'var(--text-sub)' }}
                  disabled={isSubmitting}
                >
                  Back
                </button>
                <button
                  onClick={handleComplete}
                  disabled={isSubmitting}
                  className="primary-action h-12 px-8 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 select-none"
                >
                  {isSubmitting ? "Preparing..." : "Begin Journey"} 
                  {!isSubmitting && <ArrowRight className="w-4 h-4" />}
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}