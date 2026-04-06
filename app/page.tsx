"use client";

import { auth } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import Lenis from '@studio-freight/lenis';
import { 
  Sparkles, 
  Users, 
  Heart, 
  MessageCircle, 
  Zap, 
  Shield, 
  Coffee,
  ArrowRight,
  Play,
  Plus,
  Mic,
  Image as ImageIcon,
  Send,
  Menu,
  X,
  ChevronUp,
  Mail,
  Copy,
  RotateCcw
} from "lucide-react";

// ============================================
// CSS VARIABLES & GLOBAL STYLES
// ============================================
const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
    
    html.lenis {
      height: auto;
    }
    .lenis.lenis-smooth {
      scroll-behavior: auto !important;
    }
    .lenis.lenis-smooth [data-lenis-prevent] {
      overscroll-behavior: contain;
    }
    .lenis.lenis-stopped {
      overflow: hidden;
    }
    .lenis.lenis-scrolling iframe {
      pointer-events: none;
    }
    
    :root {
      --zinc-950: #09090b;
      --zinc-900: #18181b;
      --zinc-800: #27272a;
      --zinc-700: #3f3f46;
      --zinc-600: #52525b;
      --zinc-500: #71717a;
      --zinc-400: #a1a1aa;
      --zinc-300: #d4d4d8;
      --leather: #8b7355;
      --leather-dark: #6b5840;
      --leather-light: #a89070;
      --parchment: #f5f0e8;
      --parchment-dark: #ede8df;
      --ink: #2c2825;
      --warm-50: #faf8f5;
    }
    
    .font-cinzel { font-family: 'Cinzel Decorative', serif; }
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
    
    .god-rays {
      background: conic-gradient(from 180deg at 50% 0%, transparent 40%, rgba(180,160,130,0.015) 45%, transparent 50%, rgba(180,160,130,0.02) 55%, transparent 60%);
      filter: blur(30px);
      animation: rays-drift 12s ease-in-out infinite alternate;
    }
    
    @keyframes rays-drift {
      0% { transform: translateX(-5%) rotate(-2deg); opacity: 0.6; }
      100% { transform: translateX(5%) rotate(2deg); opacity: 1; }
    }
    
    .dust-particle {
      position: absolute;
      width: 2px;
      height: 2px;
      background: rgba(200, 180, 150, 0.25);
      border-radius: 50%;
      animation: dust-float linear infinite;
    }
    
    @keyframes dust-float {
      0% { transform: translateY(0) translateX(0); opacity: 0; }
      20% { opacity: 1; }
      80% { opacity: 1; }
      100% { transform: translateY(-200px) translateX(40px); opacity: 0; }
    }
    
    .page-ruled {
      background-image: repeating-linear-gradient(
        to bottom,
        transparent 0px,
        transparent 27px,
        rgba(0,0,0,0.06) 27px,
        rgba(0,0,0,0.06) 28px
      );
    }
  `}</style>
);

// Scroll to Top Button
const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);
  const { scrollY } = useScroll();

  useEffect(() => {
    return scrollY.on("change", (latest) => {
      setIsVisible(latest > 400);
    });
  }, [scrollY]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-50 w-10 h-10 bg-[#3d3128] text-[#f5f0e8] rounded-full shadow-lg flex items-center justify-center border border-[#8b7355]/30 transition-colors hover:bg-[#5a4a38]"
        >
          <ChevronUp className="w-5 h-5" />
        </motion.button>
      )}
    </AnimatePresence>
  );
};

// Fade in animation
const FadeInUp = ({ 
  children, 
  delay = 0, 
  className = "",
  duration = 0.6
}: { 
  children: React.ReactNode; 
  delay?: number;
  className?: string;
  duration?: number;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// Stagger container
const StaggerContainer = ({ children, className = "", staggerDelay = 0.1 }: { children: React.ReactNode; className?: string; staggerDelay?: number }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      variants={{
        hidden: { opacity: 0 },
        visible: { opacity: 1, transition: { staggerChildren: staggerDelay } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

const FadeInItem = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] } }
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

// 3D Notebook Hero with Parallax
const NotebookHero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState({ x: 4, y: -12 });
  const { scrollY } = useScroll();
  
  // Parallax transform: moves down subtly as user scrolls down
  const yParallax = useTransform(scrollY, [0, 800], [0, 120]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || window.innerWidth < 1024) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      setRotation({ y: -12 + x * 16, x: 4 - y * 8 });
    };

    const handleMouseLeave = () => setRotation({ x: 4, y: -12 });

    const el = containerRef.current;
    if (el) {
      el.addEventListener('mousemove', handleMouseMove);
      el.addEventListener('mouseleave', handleMouseLeave);
    }
    return () => {
      if (el) {
        el.removeEventListener('mousemove', handleMouseMove);
        el.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  useEffect(() => {
    const visual = containerRef.current;
    if (!visual) return;
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.className = 'dust-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = 60 + Math.random() * 40 + '%';
      particle.style.animationDuration = 6 + Math.random() * 8 + 's';
      particle.style.animationDelay = Math.random() * 8 + 's';
      visual.appendChild(particle);
    }
    return () => visual.querySelectorAll('.dust-particle').forEach(el => el.remove());
  }, []);

  return (
    <motion.div 
      ref={containerRef} 
      style={{ perspective: '1200px', y: yParallax }} 
      className="relative w-full h-full flex items-center justify-center lg:items-center"
    >
      <div className="absolute inset-0 god-rays pointer-events-none opacity-60" />
      
      <motion.div 
        className="relative w-56 h-72 sm:w-64 sm:h-80 lg:w-80 lg:h-96 cursor-grab active:cursor-grabbing -mt-8 sm:-mt-12 lg:mt-0"
        animate={{ rotateY: rotation.y, rotateX: rotation.x }}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div className="absolute inset-0 rounded-l-sm rounded-r-xl bg-gradient-to-br from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] shadow-[0_2px_8px_rgba(0,0,0,0.3),0_20px_60px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.06)]"
             style={{ transform: 'translateZ(8px)' }}>
          <div className="absolute inset-0 rounded-l-sm rounded-r-xl opacity-[0.08] mix-blend-overlay"
               style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='6' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")` }} />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center" style={{ transform: 'translateZ(10px) translate(-50%, -50%)' }}>
            <div className="font-cinzel text-lg md:text-xl font-normal tracking-[0.25em] text-[#f5f0e8] uppercase drop-shadow-md">
              Kamusta
            </div>
            <div className="w-12 h-px bg-[rgba(245,240,232,0.3)] my-3 mx-auto" />
            <div className="font-mono text-[10px] tracking-[0.4em] text-[#f5f0e8]/70">
              CARDS
            </div>
          </div>
        </div>
        
        <div className="absolute left-[-8px] top-0 w-4 h-full bg-gradient-to-r from-[#2e251e] via-[#3d3128] to-[#2e251e] rounded-l-sm" 
             style={{ transform: 'rotateY(-90deg) translateZ(0px)', transformOrigin: 'right center' }} />
        
        <div className="absolute right-1 top-2 bottom-2 w-2 bg-[repeating-linear-gradient(to_bottom,#f5f0e8_0px,#f5f0e8_1.5px,#e0d8cc_1.5px,#e0d8cc_2px)] rounded-r-sm shadow-sm"
             style={{ transform: 'translateZ(4px)' }} />
      </motion.div>
      
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] bg-[#8b7355]/10 rounded-full blur-3xl pointer-events-none" />
    </motion.div>
  );
};

// Simple Auth Button
import { signInWithPopup, GoogleAuthProvider, getAdditionalUserInfo } from "firebase/auth";

const AuthButton = ({ variant = "primary", className = "" }: { variant?: "primary" | "secondary" | "white"; className?: string }) => {
  const router = useRouter();

  const handleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      const details = getAdditionalUserInfo(result);

      if (details?.isNewUser) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const baseStyles = "px-6 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.15em] transition-all duration-200 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-[#3d3128] text-[#f5f0e8] hover:bg-[#5a4a38] shadow-md hover:shadow-lg",
    secondary: "bg-transparent border border-[#3d3128] text-[#3d3128] hover:bg-[#3d3128] hover:text-[#f5f0e8]",
    white: "bg-[#f5f0e8] text-[#3d3128] hover:bg-white shadow-md hover:shadow-lg"
  };

  return (
    <button onClick={handleSignIn} className={`${baseStyles} ${variants[variant]} ${className}`}>
      Get Started
      <ArrowRight className="w-4 h-4" />
    </button>
  );
};

// Mobile Menu
const MobileMenu = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
  const menuItems = [
    { name: "Features", id: "features" },
    { name: "AI Creator", id: "ai-creator" },
    { name: "Modes", id: "modes" }
  ];

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setIsOpen(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[#09090b]/80 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setIsOpen(false)}
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-[75%] max-w-sm bg-[#f5f0e8] z-50 md:hidden shadow-2xl border-l border-[#d4c8b8]"
          >
            <div className="flex flex-col h-full p-6">
              <div className="flex justify-between items-center mb-8">
                <span className="font-cinzel font-semibold text-[#2c2825]">Menu</span>
                <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-[#e8e0d4] rounded-full">
                  <X className="w-5 h-5 text-[#3d3128]" />
                </button>
              </div>
              <nav className="flex flex-col gap-2">
                {menuItems.map((item, idx) => (
                  <motion.button
                    key={item.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    onClick={() => scrollToSection(item.id)}
                    className="flex items-center justify-between p-3 text-left text-[#2c2825] font-crimson font-medium rounded-lg hover:bg-[#e8e0d4] transition-colors"
                  >
                    {item.name}
                    <ArrowRight className="w-4 h-4 text-[#8b7355]" />
                  </motion.button>
                ))}
              </nav>
              <div className="mt-auto space-y-3 pt-6 border-t border-[#d4c8b8]">
                <Link 
                  href="/signin" 
                  onClick={() => setIsOpen(false)}
                  className="w-full flex justify-center py-2.5 text-[#6b4423] font-mono text-xs uppercase tracking-wider hover:bg-[#e8e0d4] rounded-lg"
                >
                  Sign In
                </Link>
                <AuthButton className="w-full" />
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Interactive AI Deck Creator
const AISimulation = () => {
  const [messages, setMessages] = useState<Array<{type: 'ai' | 'user', content: string, cards?: any[], selectedType?: string}>>([]);
  const [displayedText, setDisplayedText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState<'initial' | 'selecting' | 'typing' | 'result'>('initial');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });
  
  const fullText = "Create a cozy date night deck for couples who love coffee and deep conversations...";
  const deckTypes = ["Date Night", "Family", "Friends", "Self", "LDR"];

  useEffect(() => {
    if (isInView && currentStep === 'initial') {
      setTimeout(() => {
        setMessages([{
          type: 'ai',
          content: "Hi! I can help you create a custom deck. What kind of cards would you like to make?"
        }]);
        setCurrentStep('selecting');
      }, 600);
    }
  }, [isInView]);

  useEffect(() => {
    if (currentStep === 'typing' && selectedType) {
      setIsTyping(true);
      let i = 0;
      const timer = setInterval(() => {
        if (i <= fullText.length) {
          setDisplayedText(fullText.slice(0, i));
          i++;
        } else {
          clearInterval(timer);
          setIsTyping(false);
          setTimeout(() => {
            setMessages(prev => [...prev, {
              type: 'user',
              content: fullText,
              selectedType: selectedType
            }]);
            setTimeout(() => {
              setMessages(prev => [...prev, {
                type: 'ai',
                content: `Great! Here are some cards for your ${selectedType} deck:`,
                cards: [
                  { type: "Question", text: getCardText(selectedType, 0), icon: MessageCircle },
                  { type: "Mission", text: getCardText(selectedType, 1), icon: Zap },
                  { type: "Deep Talk", text: getCardText(selectedType, 2), icon: Heart }
                ]
              }]);
              setCurrentStep('result');
            }, 400);
          }, 200);
        }
      }, 35);
      return () => clearInterval(timer);
    }
  }, [currentStep, selectedType]);

  const getCardText = (type: string, index: number) => {
    const cards: Record<string, string[]> = {
      "Date Night": [
        "What's your favorite coffee memory we've shared?",
        "Visit a new café together and rate their ambiance",
        "If our relationship was a coffee blend, what would it taste like?"
      ],
      "Family": [
        "What's a tradition you want to start this year?",
        "Cook a meal together using only ingredients you already have",
        "What does 'home' mean to you?"
      ],
      "Friends": [
        "What's the most ridiculous thing we've done together?",
        "Send each other voice memos describing your day",
        "How have I impacted your life without knowing it?"
      ],
      "Self": [
        "What's something you're proud of this week?",
        "Write yourself a letter to open in 6 months",
        "What would you tell your younger self?"
      ],
      "LDR": [
        "What's your favorite virtual date memory?",
        "Send a photo of your current view right now",
        "What are you most looking forward to doing together in person?"
      ]
    };
    return cards[type]?.[index] || cards["Date Night"][index];
  };

  const handleTypeSelect = (type: string) => {
    setSelectedType(type);
    setCurrentStep('typing');
  };

  const reset = () => {
    setMessages([]);
    setDisplayedText("");
    setIsTyping(false);
    setCurrentStep('initial');
    setSelectedType(null);
    setTimeout(() => {
      setMessages([{
        type: 'ai',
        content: "Hi! I can help you create a custom deck. What kind of cards would you like to make?"
      }]);
      setCurrentStep('selecting');
    }, 300);
  };

  return (
    <div ref={containerRef} className="w-full max-w-2xl mx-auto mt-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.6 }}
        className="bg-[#f5f0e8] rounded-lg shadow-xl border border-[#d4c8b8] overflow-hidden relative"
      >
        <div className="bg-gradient-to-r from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] px-4 py-3 border-b border-[#3d3128] flex items-center justify-between relative">
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='6' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")` }} />
          <div className="flex items-center gap-1.5 relative z-10">
            <div className="w-2.5 h-2.5 rounded-full bg-[#8b7355]/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#8b7355]/60" />
            <div className="w-2.5 h-2.5 rounded-full bg-[#8b7355]/60" />
          </div>
          <div className="flex items-center gap-1.5 text-[#e8e0d4] relative z-10">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-[10px] font-mono tracking-[0.2em] uppercase">AI Deck Creator</span>
          </div>
          <button onClick={reset} className="relative z-10 p-1.5 hover:bg-[#5a4a38] rounded-md transition-colors">
            <RotateCcw className="w-3.5 h-3.5 text-[#a89070]" />
          </button>
        </div>

        <div className="p-5 bg-[#f5f0e8] relative page-ruled min-h-[320px] max-h-[500px] overflow-y-auto">
          <div className="absolute left-10 top-0 bottom-0 w-px bg-[rgba(180,80,80,0.08)]" />
          
          <div className="space-y-4 pl-6">
            {messages.map((msg, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2 ${msg.type === 'user' ? 'justify-end' : ''}`}
              >
                {msg.type === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-[#3d3128] flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-[#f5f0e8]" />
                  </div>
                )}
                <div className={`max-w-[85%] ${msg.type === 'ai' ? 'bg-[#faf8f5] rounded-2xl rounded-tl-none' : 'bg-[#3d3128] text-[#f5f0e8] rounded-2xl rounded-tr-none'} px-4 py-3 border border-[#d4c8b8] shadow-sm`}>
                  <p className="text-sm font-crimson">{msg.content}</p>
                  
                  {msg.cards && (
                    <div className="mt-3 space-y-2">
                      {msg.cards.map((card: any, cidx: number) => (
                        <motion.div
                          key={cidx}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: cidx * 0.1 }}
                          className="bg-[#faf8f5] border border-[#d4c8b8] rounded-lg p-2.5 flex items-start gap-2 hover:border-[#8b7355] transition-colors cursor-pointer"
                        >
                          <div className="w-7 h-7 rounded bg-[#f5f0e8] flex items-center justify-center flex-shrink-0">
                            <card.icon className="w-3.5 h-3.5 text-[#3d3128]" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] font-mono font-bold text-[#8b7355] uppercase tracking-wider block">{card.type}</span>
                            <p className="text-[#2c2825] text-xs mt-0.5 leading-relaxed font-crimson">{card.text}</p>
                          </div>
                        </motion.div>
                      ))}
                      <motion.button
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="mt-2 w-full py-2 bg-[#3d3128] text-[#f5f0e8] rounded-lg text-xs font-mono uppercase tracking-wider hover:bg-[#5a4a38] transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" /> Create This Deck
                      </motion.button>
                    </div>
                  )}
                </div>
                {msg.type === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-[#8b7355] flex items-center justify-center flex-shrink-0">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                )}
              </motion.div>
            ))}

            {isTyping && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-2 justify-end"
              >
                <div className="bg-[#3d3128] text-[#f5f0e8] rounded-2xl rounded-tr-none px-4 py-3">
                  <p className="text-sm font-crimson">
                    {displayedText}<span className="animate-pulse">|</span>
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-[#8b7355] flex items-center justify-center flex-shrink-0">
                  <Users className="w-4 h-4 text-white" />
                </div>
              </motion.div>
            )}

            {currentStep === 'selecting' && !isTyping && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex gap-2 flex-wrap ml-8"
              >
                {deckTypes.map((type) => (
                  <button
                    key={type}
                    onClick={() => handleTypeSelect(type)}
                    className="px-4 py-2 rounded-full text-xs font-mono uppercase tracking-wider transition-all border bg-[#faf8f5] text-[#3d3128] border-[#8b7355] hover:bg-[#3d3128] hover:text-[#f5f0e8]"
                  >
                    {type}
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        </div>

        <div className="p-4 bg-[#faf8f5] border-t border-[#d4c8b8] flex items-center gap-2">
          <button className="p-2 hover:bg-[#f5f0e8] rounded-md transition-colors text-[#8b7355]">
            <ImageIcon className="w-4 h-4" />
          </button>
          <button className="p-2 hover:bg-[#f5f0e8] rounded-md transition-colors text-[#8b7355]">
            <Mic className="w-4 h-4" />
          </button>
          <input 
            type="text" 
            placeholder="Or type your own description..."
            className="flex-1 bg-transparent border-none outline-none text-[#2c2825] text-sm font-crimson placeholder-[#8b7355]/50"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && currentStep === 'selecting') {
                handleTypeSelect('Custom');
              }
            }}
          />
          <button 
            onClick={() => currentStep === 'selecting' && handleTypeSelect('Custom')}
            className="p-2 bg-[#3d3128] rounded-md text-[#f5f0e8] hover:bg-[#5a4a38] transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// Feature Card
const FeatureCard = ({ icon: Icon, title, description, index }: { icon: any; title: string; description: string; index: string }) => {
  return (
    <div className="bg-[#18181b] rounded-sm p-6 border border-[#27272a] hover:border-[#52525b] transition-all duration-300 group h-full flex flex-col relative">
      <div className="absolute top-4 right-4">
        <span className="text-[10px] font-mono text-[#52525b] tracking-widest">{index}</span>
      </div>
      <div className="w-10 h-10 rounded-sm bg-[#27272a] flex items-center justify-center mb-4 group-hover:bg-[#3d3128] transition-colors duration-300">
        <Icon className="w-5 h-5 text-[#a89070]" />
      </div>
      <h3 className="text-sm font-crimson font-semibold text-[#d4d4d8] mb-2">{title}</h3>
      <p className="text-[#71717a] text-xs leading-relaxed flex-1 font-crimson">{description}</p>
    </div>
  );
};

// How It Works Card
const StepCard = ({ number, title, description, icon: Icon, isLast }: { number: string; title: string; description: string; icon: any; isLast?: boolean }) => {
  return (
    <div className="flex gap-4 items-start relative">
      <div className="flex-shrink-0 flex flex-col items-center">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-[#5a4a38] to-[#3d3128] flex items-center justify-center border border-[#5a4a38] shadow-md relative z-10">
          <Icon className="w-5 h-5 text-[#f5f0e8]" />
        </div>
        {!isLast && (
          <div className="w-0.5 flex-1 bg-gradient-to-b from-[#d4c8b8] to-transparent mt-2 min-h-[60px]" />
        )}
      </div>
      <div className="flex-1 pb-8 pt-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-mono text-[10px] text-[#8b7355] uppercase tracking-[0.2em]">Step {number}</span>
          <div className="h-px flex-1 bg-[#d4c8b8]/50" />
        </div>
        <h3 className="font-crimson text-lg font-semibold text-[#2c2825] mb-1">{title}</h3>
        <p className="text-[#6b4423] text-sm leading-relaxed font-crimson">{description}</p>
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { scrollY } = useScroll();

  // ✅ FIXED BUG: Properly cancel requestAnimationFrame to prevent double loops
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
    });

    let rafId: number;

    function raf(time: number) {
      lenis.raf(time);
      rafId = requestAnimationFrame(raf);
    }

    rafId = requestAnimationFrame(raf);

    return () => {
      cancelAnimationFrame(rafId);
      lenis.destroy();
    };
  }, []);
  
  const headerBg = useTransform(scrollY, [0, 50], ["rgba(250, 247, 240, 0)", "rgba(250, 247, 240, 0.95)"]);
  const headerBorder = useTransform(scrollY, [0, 50], ["rgba(212, 200, 184, 0)", "rgba(212, 200, 184, 1)"]);
  
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      // Handled by AuthButton
    });
    return () => unsub();
  }, []);

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMobileMenuOpen(false);
  };

  const heroTextVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.9, 
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  const heroSubtextVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { 
        duration: 0.8, 
        delay: 0.2,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] text-[#2c2825] grain-overlay font-crimson">
      <GlobalStyles />
      <ScrollToTop />
      
      {/* Navigation */}
      <motion.nav 
        style={{ backgroundColor: headerBg, borderBottomColor: headerBorder }}
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md"
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <motion.div 
            className="flex items-center gap-2 cursor-pointer"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <div className="relative w-8 h-8 rounded-md overflow-hidden shadow-md">
              <Image 
                src="/logo.png" 
                alt="Kamusta Logo" 
                fill 
                className="object-cover"
              />
            </div>
            <span className="font-cinzel font-semibold text-sm sm:text-base tracking-[0.15em] text-[#3d3128] uppercase hidden sm:block">Kamusta</span>
          </motion.div>
          
          <div className="hidden md:flex items-center gap-8">
            {['Features', 'AI Creator', 'Modes'].map((item) => (
              <button 
                key={item}
                onClick={() => scrollToSection(item.toLowerCase().replace(' ', '-'))}
                className="text-xs text-[#6b4423] hover:text-[#3d3128] transition-colors font-mono uppercase tracking-[0.12em]"
              >
                {item}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link href="/signin" className="hidden md:block text-xs font-mono uppercase tracking-[0.12em] text-[#6b4423] hover:text-[#3d3128] transition-colors">
              Sign In
            </Link>
            <div className="hidden md:block">
              <AuthButton />
            </div>
            <button
              className="md:hidden p-2 hover:bg-[#e8e0d4] rounded-lg transition-colors"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="w-5 h-5 text-[#3d3128]" />
            </button>
          </div>
        </div>
      </motion.nav>

      <MobileMenu isOpen={mobileMenuOpen} setIsOpen={setMobileMenuOpen} />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-start justify-center pt-32 sm:pt-36 lg:pt-40 pb-20 overflow-hidden bg-[#27272a]">
        <div className="absolute inset-0 bg-gradient-to-br from-[#3a322a] via-[#5c4f3f] to-[#3a322a]" />
        
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
          <div className="h-[300px] sm:h-[380px] lg:h-[420px] relative order-2 lg:order-1 flex items-center justify-center lg:mt-8">
            <NotebookHero />
          </div>
          
          <div className="text-left order-1 lg:order-2 mt-4 lg:mt-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f0e8]/10 backdrop-blur-sm rounded-full border border-[#8b7355]/30 text-[#a89070] text-[10px] font-mono uppercase tracking-[0.2em] mb-4 sm:mb-5"
            >
              <Sparkles className="w-3 h-3" />
              <span>AI-Powered Deck Creation</span>
            </motion.div>

            <motion.h1 
              variants={heroTextVariants}
              initial="hidden"
              animate="visible"
              className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl font-cinzel font-bold text-[#f5f0e8] leading-[1.1] mb-4 sm:mb-5 tracking-tight"
            >
              Every card starts a{" "}
              <span className="relative inline-block text-[#a89070]">
                meaningful
                <motion.svg 
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1, delay: 0.6, ease: "easeInOut" }}
                  className="absolute -bottom-1 left-0 w-full h-2 text-[#8b7355]/40" 
                  viewBox="0 0 200 8" 
                  fill="none" 
                  preserveAspectRatio="none"
                >
                  <path d="M2 6C25 2 120 -2 198 6" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </motion.svg>
              </span>{" "}
              conversation
            </motion.h1>

            <motion.p
              variants={heroSubtextVariants}
              initial="hidden"
              animate="visible"
              className="text-sm sm:text-base text-[#a89070] max-w-md mb-5 sm:mb-6 leading-relaxed font-crimson"
            >
              Strengthen your relationships through interactive comfort cards, deep-talk prompts, and shared memories.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-col sm:flex-row items-center gap-3"
            >
              <AuthButton variant="white" />
              <button
                onClick={() => scrollToSection('ai-creator')}
                className="h-10 px-6 bg-transparent text-[#f5f0e8] rounded-full font-mono text-[11px] uppercase tracking-[0.15em] border border-[#8b7355] hover:bg-[#8b7355]/10 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" /> Watch Demo
              </button>
            </motion.div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 py-6 sm:py-8 bg-[#faf8f5]">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="font-cinzel text-xl sm:text-2xl md:text-3xl font-normal text-[#2c2825] tracking-[0.04em] text-center sm:text-left">
              Write. Share. Connect. Remember.
            </h2>
          </div>
        </div>
      </section>

      {/* AI Creator Section */}
      <section id="ai-creator" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#f5f0e8] relative min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto w-full relative">
          <div className="text-center mb-12">
            <FadeInUp>
              <span className="text-[10px] font-mono font-bold text-[#8b7355] uppercase tracking-[0.25em] mb-3 block">
                AI-Powered Creation
              </span>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-[#2c2825] mb-3 tracking-tight">
                Create decks with a simple chat
              </h2>
            </FadeInUp>
            <FadeInUp delay={0.2}>
              <p className="text-[#6b4423] text-sm max-w-md mx-auto font-crimson">
                Describe your ideal deck and our AI will generate personalized cards for your specific relationship.
              </p>
            </FadeInUp>
          </div>

          <AISimulation />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#09090b] relative overflow-hidden min-h-screen flex items-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_50%,rgba(90,74,56,0.08)_0%,transparent_70%)]" />
        
        <div className="max-w-6xl mx-auto w-full relative">
          <div className="max-w-lg mb-12 sm:mb-16">
            <FadeInUp>
              <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-[0.25em] mb-4 block">
                Philosophy
              </span>
            </FadeInUp>
            <FadeInUp delay={0.1}>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-[#d4d4d8] leading-[1.3] tracking-[0.02em]">
                Crafted for those who believe connections deserve intention.
              </h2>
            </FadeInUp>
          </div>

          <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" staggerDelay={0.1}>
            {[
              { icon: Copy, title: "Multiple Card Types", desc: "Questions, Appreciations, Missions, Secrets, and Future Plans — each designed to deepen your bond." },
              { icon: Users, title: "Real-time Multiplayer", desc: "Create rooms, invite with a code, and play together in real-time. Perfect for virtual hangouts." },
              { icon: Heart, title: "Shared Memory Vault", desc: "Save your favorite answers and photos. Build a timeline of your relationship's special moments." },
              { icon: Shield, title: "Safe & Private", desc: "End-to-end encrypted rooms. Your intimate conversations stay between you and your loved ones." },
              { icon: Zap, title: "Gamification", desc: "Earn XP, unlock badges, and maintain streaks with your favorite people." },
              { icon: Sparkles, title: "AI Deck Builder", desc: "Generate custom cards tailored to your unique relationship dynamics." }
            ].map((feature, idx) => (
              <FadeInItem key={idx}>
                <FeatureCard
                  icon={feature.icon}
                  title={feature.title}
                  description={feature.desc}
                  index={String(idx + 1).padStart(2, '0')}
                />
              </FadeInItem>
            ))}
          </StaggerContainer>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="modes" className="py-20 sm:py-24 px-4 sm:px-6 bg-[#faf8f5] min-h-screen flex items-center">
        <div className="max-w-6xl mx-auto w-full">
          <div className="grid lg:grid-cols-5 gap-12 lg:gap-16 items-start">
            <div className="lg:col-span-3">
              <FadeInUp>
                <span className="text-[10px] font-mono text-[#8b7355] uppercase tracking-[0.25em] mb-4 block">
                  How It Works
                </span>
                <h2 className="text-2xl sm:text-3xl md:text-4xl font-cinzel font-bold text-[#2c2825] mb-8 sm:mb-12 tracking-tight">
                  The ritual of connection
                </h2>
              </FadeInUp>
              
              <div className="space-y-0">
                <FadeInUp delay={0.1}>
                  <StepCard
                    number="01"
                    title="Open the deck"
                    description="Choose your relationship type. Each deck is crafted with intention for meaningful interactions."
                    icon={Copy}
                  />
                </FadeInUp>
                <FadeInUp delay={0.2}>
                  <StepCard
                    number="02"
                    title="Draw your card"
                    description="Swipe through with momentum. Each prompt carries weight and invites genuine reflection."
                    icon={MessageCircle}
                  />
                </FadeInUp>
                <FadeInUp delay={0.3}>
                  <StepCard
                    number="03"
                    title="Share deeply"
                    description="Respond with voice, text, or image. No distractions, just presence and authentic connection."
                    icon={Heart}
                  />
                </FadeInUp>
                <FadeInUp delay={0.4}>
                  <StepCard
                    number="04"
                    title="Keep the memory"
                    description="Save meaningful moments to your vault. Build a timeline of your relationship's special moments."
                    icon={Shield}
                    isLast={true}
                  />
                </FadeInUp>
              </div>
            </div>
            
            <div className="lg:col-span-2">
              <FadeInUp className="lg:sticky lg:top-24">
                <div className="relative bg-gradient-to-br from-[#3a322a] to-[#2e251e] rounded-xl p-6 sm:p-8 aspect-[4/5] flex items-center justify-center overflow-hidden shadow-2xl">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_60%_40%,rgba(180,160,130,0.1)_0%,transparent_60%)]" />
                  
                  <div className="relative w-full max-w-[240px]">
                    <div className="absolute top-4 left-4 right-0 aspect-[3/4] bg-[#4a3c2e] rounded-lg shadow-lg transform rotate-3" />
                    <div className="absolute top-2 left-2 right-0 aspect-[3/4] bg-[#5a4a38] rounded-lg shadow-xl transform -rotate-2" />
                    <div className="relative aspect-[3/4] bg-[#f5f0e8] rounded-lg shadow-2xl p-6 flex flex-col items-center justify-center text-center border border-[#d4c8b8]">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#5a4a38] to-[#3d3128] flex items-center justify-center mb-4">
                        <Heart className="w-8 h-8 text-[#f5f0e8]" />
                      </div>
                      <h4 className="font-cinzel text-lg text-[#2c2825] mb-2">Deep Connection</h4>
                      <p className="text-xs text-[#6b4423] font-crimson leading-relaxed">
                        "What is a moment with me that you'll never forget?"
                      </p>
                      <div className="mt-6 pt-4 border-t border-[#d4c8b8] w-full">
                        <span className="text-[10px] font-mono text-[#8b7355] uppercase tracking-wider">Question Card</span>
                      </div>
                    </div>
                  </div>
                </div>
              </FadeInUp>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 sm:py-24 px-4 sm:px-6 bg-[#e8e0d4] min-h-[60vh] flex items-center">
        <div className="w-full max-w-2xl mx-auto">
          <FadeInUp>
            <div className="bg-gradient-to-br from-[#5a4a38] via-[#4a3c2e] to-[#3d3128] rounded-xl p-8 sm:p-12 text-center text-[#f5f0e8] relative overflow-hidden shadow-2xl">
              <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='200' height='200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='l'%3E%3CfeTurbulence type='turbulence' baseFrequency='0.4' numOctaves='6' seed='2'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23l)'/%3E%3C/svg%3E")` }} />
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-0 left-0 w-64 h-64 bg-[#8b7355] rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-0 w-64 h-64 bg-[#5a4a38] rounded-full blur-3xl" />
              </div>
              
              <div className="relative z-10">
                <h2 className="text-xl sm:text-2xl md:text-3xl font-cinzel font-bold mb-3 tracking-tight">
                  Ready to start your first conversation?
                </h2>
                <p className="text-[#a89070] text-sm mb-8 max-w-sm mx-auto font-crimson">
                  Join thousands of people strengthening their relationships one card at a time.
                </p>
                <div className="flex justify-center">
                  <AuthButton variant="white" />
                </div>
              </div>
            </div>
          </FadeInUp>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#18181b] border-t border-[#27272a] pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 mb-8">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="relative w-6 h-6 rounded-md overflow-hidden">
                  <Image 
                    src="/logo.png" 
                    alt="Kamusta Logo" 
                    fill 
                    className="object-cover"
                  />
                </div>
                <span className="font-cinzel font-semibold text-[#f5f0e8] text-sm tracking-[0.15em] uppercase">Kamusta</span>
              </div>
              <p className="text-xs text-[#71717a] leading-relaxed mb-4 font-crimson">
                Strengthening relationships through meaningful conversations.
              </p>
            </div>

            <div>
              <h4 className="font-mono font-semibold text-[#d4d4d8] text-[10px] mb-3 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Features</a></li>
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Pricing</a></li>
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Security</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-semibold text-[#d4d4d8] text-[10px] mb-3 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">About</a></li>
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Blog</a></li>
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Careers</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-mono font-semibold text-[#d4d4d8] text-[10px] mb-3 uppercase tracking-wider">Legal</h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Privacy</a></li>
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Terms</a></li>
                <li><a href="#" className="text-xs text-[#71717a] hover:text-[#a89070] transition-colors font-crimson">Cookie Policy</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-[#27272a] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[10px] text-[#52525b] font-mono">
              © 2026 KamustaCards. Stay close, kahit malayo.
            </p>
            <a href="mailto:hello@kamustacards.com" className="flex items-center gap-1.5 text-[10px] text-[#71717a] hover:text-[#a89070] transition-colors font-mono">
              <Mail className="w-3 h-3" />
              hello@kamustacards.com
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}