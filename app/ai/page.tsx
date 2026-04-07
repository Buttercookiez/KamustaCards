"use client";

import { auth, db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { Sparkles, Moon, Sun, ChevronLeft, Loader2, Send, ArrowRight } from "lucide-react";
import OnboardingTour from "@/components/onboarding-tour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { aiSteps } from "@/lib/tourSteps";

const GlobalStyles = () => (
  <style jsx global>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Pro:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap');
    :root {
      --bg-base: #faf8f5; --bg-nav: rgba(250,248,245,0.95); --bg-card: #ffffff;
      --text-main: #2c2825; --text-sub: #6b4423; --text-accent: #8b7355;
      --border-subtle: #d4c8b8; --border-strong: #a89070;
      --action-bg: #2c2825; --action-text: #f5f0e8;
      --bubble-ai: #f0ece6; --bubble-user: #2c2825; --bubble-user-text: #f5f0e8;
    }
    .dark {
      --bg-base: #09090b; --bg-nav: rgba(9,9,11,0.95); --bg-card: #18181b;
      --text-main: #e4ddd2; --text-sub: #a1a1aa; --text-accent: #71717a;
      --border-subtle: #27272a; --border-strong: #52525b;
      --action-bg: #e4ddd2; --action-text: #09090b;
      --bubble-ai: #1c1c1f; --bubble-user: #e4ddd2; --bubble-user-text: #09090b;
    }
    * { -webkit-tap-highlight-color: transparent !important; box-sizing: border-box; }
    body { background-color: var(--bg-base); color: var(--text-main); transition: background-color 0.5s ease; margin: 0; }
    .font-cinzel { font-family: 'Cinzel', serif; }
    .font-crimson { font-family: 'Crimson Pro', Georgia, serif; }
    .font-mono { font-family: 'Space Mono', monospace; }
    .grain-overlay::after {
      content: ''; position: fixed; inset: 0; pointer-events: none; z-index: 9999; opacity: 0.025;
      background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
    }
    .choice-btn {
      padding: 7px 14px; border-radius: 20px; border: 1px solid var(--border-subtle);
      background: var(--bg-card); color: var(--text-main); cursor: pointer;
      font-family: 'Crimson Pro', Georgia, serif; font-size: 14px;
      transition: all 0.2s ease; white-space: nowrap;
    }
    .choice-btn:hover { border-color: var(--border-strong); background: var(--bubble-ai); }
    .confirm-btn {
      padding: 10px 24px; border-radius: 20px; cursor: pointer;
      font-family: 'Space Mono', monospace; font-size: 11px;
      letter-spacing: 0.1em; text-transform: uppercase;
      transition: all 0.2s ease; border: 1px solid var(--border-subtle);
    }
    .confirm-yes {
      background: var(--action-bg); color: var(--action-text); border-color: var(--action-bg);
    }
    .confirm-no {
      background: transparent; color: var(--text-main);
    }
    .confirm-no:hover { border-color: var(--border-strong); }
  `}</style>
);

type Message = { role: "ai" | "user"; text: string; choices?: string[]; isConfirm?: boolean };
type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

export default function AIPage() {
  const [user, setUser] = useState<any>(null);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [groqHistory, setGroqHistory] = useState<GroqMessage[]>([]);
  const [pendingHistory, setPendingHistory] = useState<GroqMessage[] | null>(null);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [waitingConfirm, setWaitingConfirm] = useState(false);
  const [done, setDone] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const tour = useOnboardingTour("ai");

  const SYSTEM_PROMPT = `You are a warm, friendly AI assistant helping users build a custom conversation card deck for the app "Kamusta Cards".

Your job:
1. Have a SHORT, natural conversation to understand what kind of deck they want.
2. Ask ONE question at a time. Keep it conversational and fun.
3. After 3-4 exchanges, when you have enough info (who they're playing with, the vibe, the topic), generate the deck.
4. Always respond to what the user actually says — be playful, warm, and human.

When suggesting choices, always include them at the end of your message in this exact format:
CHOICES: option1 | option2 | option3 | option4

When you have enough info to generate the deck, end your message with exactly:
GENERATE_DECK

Do NOT add CHOICES and GENERATE_DECK in the same message.`;

  useEffect(() => {
    setMounted(true);
    const stored = localStorage.getItem("theme");
    if (stored === "dark" || (!stored && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
    startConversation();
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/"); return; }
      setUser(u);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  const callGroq = async (history: GroqMessage[]): Promise<string> => {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
        max_tokens: 500,
        temperature: 0.8,
      }),
    });
    const data = await res.json();
    return data?.choices?.[0]?.message?.content || "";
  };

  const parseAIMessage = (raw: string): Message => {
    let text = raw;
    let choices: string[] | undefined;
    const choicesMatch = raw.match(/CHOICES:\s*(.+)/);
    if (choicesMatch) {
      choices = choicesMatch[1].split("|").map((c) => c.trim()).filter(Boolean);
      text = raw.replace(/CHOICES:\s*.+/, "").trim();
    }
    text = text.replace("GENERATE_DECK", "").trim();
    return { role: "ai", text, choices };
  };

  const startConversation = async () => {
    setThinking(true);
    const initialHistory: GroqMessage[] = [{ role: "user", content: "Start the conversation." }];
    const raw = await callGroq(initialHistory);
    const aiMsg = parseAIMessage(raw);
    setMessages([aiMsg]);
    setGroqHistory([...initialHistory, { role: "assistant", content: raw }]);
    setThinking(false);
  };

  const handleAnswer = async (answer: string) => {
    if (thinking || generating || done || waitingConfirm) return;
    setMessages((prev) => [...prev, { role: "user", text: answer }]);
    setInput("");
    setThinking(true);

    const newHistory: GroqMessage[] = [...groqHistory, { role: "user", content: answer }];
    const raw = await callGroq(newHistory);
    const updatedHistory: GroqMessage[] = [...newHistory, { role: "assistant", content: raw }];
    setGroqHistory(updatedHistory);

    if (raw.includes("GENERATE_DECK")) {
      const aiMsg = parseAIMessage(raw);
      setMessages((prev) => [
        ...prev,
        { ...aiMsg, isConfirm: false },
        {
          role: "ai",
          text: "Ready to create your deck? I'll generate it now based on our conversation.",
          isConfirm: true,
        },
      ]);
      setPendingHistory(updatedHistory);
      setWaitingConfirm(true);
      setThinking(false);
    } else {
      setMessages((prev) => [...prev, parseAIMessage(raw)]);
      setThinking(false);
    }
  };

  const handleConfirm = async () => {
    if (!pendingHistory) return;
    setWaitingConfirm(false);
    setMessages((prev) => [...prev, { role: "user", text: "Yes, generate it!" }]);
    await generateDeck(pendingHistory);
    setPendingHistory(null);
  };

  const handleDecline = () => {
    setWaitingConfirm(false);
    setPendingHistory(null);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: "Not yet, let me change something." },
      { role: "ai", text: "No problem! What would you like to change?", choices: ["Different topic", "Different vibe", "More cards", "Different audience"] },
    ]);
  };

  const generateDeck = async (history: GroqMessage[]) => {
    setGenerating(true);
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.NEXT_PUBLIC_GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: `Based on this conversation, generate a conversation card deck.
Return ONLY valid JSON, no extra text, no markdown backticks.
FORMAT:
{
  "title": "Deck Title",
  "cards": ["Question 1", "Question 2", ...]
}
Make cards emotional, deep, and meaningful. Generate as many cards as requested.`,
          },
          ...history,
          { role: "user", content: "Now generate the deck as JSON based on our conversation." },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    });

    const data = await res.json();
    let text = data?.choices?.[0]?.message?.content || "";
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    const cleaned = start !== -1 && end !== -1 ? text.substring(start, end + 1) : "";

    try {
      const parsed = JSON.parse(cleaned);
      if (user) {
        const deckRef = await addDoc(collection(db, "decks"), {
          title: parsed.title || "AI Deck",
          category: "ai",
          isDefault: false,
          owner: user.uid,
          description: "Custom AI Generated Deck",
        });
        if (Array.isArray(parsed.cards)) {
          for (const cardText of parsed.cards) {
            if (cardText) await addDoc(collection(db, "decks", deckRef.id, "cards"), { text: cardText });
          }
        }
      }
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: `Your deck "${parsed.title}" is ready with ${parsed.cards?.length || 0} cards! ✨` },
      ]);
      setDone(true);
      // Removed the auto-redirect so user can click the button instead.
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "ai", text: "Something went wrong generating the deck. Want to try again?" },
      ]);
    }
    setGenerating(false);
  };

  const handleSend = () => {
    if (!input.trim() || thinking || generating || waitingConfirm) return;
    handleAnswer(input.trim());
  };

  if (!mounted) return null;

  const lastMessage = messages[messages.length - 1];
  const showChoices = lastMessage?.role === "ai" && lastMessage?.choices && !thinking && !generating && !waitingConfirm && !done;
  const showInput = !thinking && !generating && !waitingConfirm && !done;

  return (
    <div className="min-h-screen grain-overlay font-crimson">
      <GlobalStyles />

      {/* Navbar */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-md h-16"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-2xl mx-auto px-4 h-full flex items-center justify-between">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="flex items-center gap-3 cursor-pointer opacity-90 hover:opacity-100"
            onClick={() => router.push("/dashboard")}
          >
            <div className="relative w-7 h-7 rounded-md overflow-hidden border flex-shrink-0" style={{ borderColor: "var(--border-subtle)" }}>
              <Image src="/logo.png" alt="Kamusta" fill sizes="28px" className="object-cover" />
            </div>
            <span className="font-cinzel font-semibold text-sm tracking-[0.2em] uppercase hidden sm:block" style={{ color: "var(--text-main)" }}>
              Kamusta
            </span>
          </motion.div>

          {/* Right — always visible Kamusta AI label */}
          <div className="flex items-center gap-3">
            <span
              data-tour="ai-header"
              className="font-mono text-[10px] uppercase tracking-[0.15em] flex items-center gap-1.5"
              style={{ color: "var(--text-accent)" }}
            >
              <Sparkles className="w-3 h-3" /> Kamusta AI
            </span>
            <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={toggleTheme} style={{ color: "var(--text-sub)" }}>
              {theme === "light" ? <Moon size={16} strokeWidth={1.5} /> : <Sun size={16} strokeWidth={1.5} />}
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Chat Area */}
      <main className="pt-20 pb-52 px-3 sm:px-4 max-w-2xl mx-auto">
        <motion.button
          initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} whileHover={{ x: -2 }}
          onClick={() => router.push("/dashboard")}
          className="flex items-center gap-2 mt-4 mb-5 font-mono text-[10px] uppercase tracking-[0.15em] opacity-60 hover:opacity-100 transition-opacity"
          style={{ color: "var(--text-main)" }}
        >
          <ChevronLeft size={14} strokeWidth={2} /> Back
        </motion.button>

        <div className="flex flex-col gap-4">
          <AnimatePresence>
            {messages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
              >
                {/* Avatar — bigger */}
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono flex-shrink-0 mt-1 border"
                  style={{
                    background: msg.role === "ai" ? "var(--bubble-ai)" : "var(--bubble-user)",
                    color: msg.role === "ai" ? "var(--text-sub)" : "var(--bubble-user-text)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  {msg.role === "ai" ? "AI" : "Me"}
                </div>

                {/* Bubble — wider on desktop */}
                <div
                  className="px-4 py-3 rounded-2xl font-crimson text-sm sm:text-base leading-relaxed"
                  style={{
                    background: msg.role === "ai" ? "var(--bubble-ai)" : "var(--bubble-user)",
                    color: msg.role === "ai" ? "var(--text-main)" : "var(--bubble-user-text)",
                    borderBottomLeftRadius: msg.role === "ai" ? "4px" : "16px",
                    borderBottomRightRadius: msg.role === "user" ? "4px" : "16px",
                    maxWidth: "min(75%, 480px)",
                  }}
                >
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {(thinking || generating) && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-mono border flex-shrink-0"
                style={{ background: "var(--bubble-ai)", color: "var(--text-sub)", borderColor: "var(--border-subtle)" }}
              >
                AI
              </div>
              <div className="px-4 py-3 rounded-2xl flex items-center gap-2" style={{ background: "var(--bubble-ai)", borderBottomLeftRadius: "4px" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--text-accent)" }} />
                <span className="font-crimson text-sm" style={{ color: "var(--text-sub)" }}>
                  {generating ? "Generating your deck..." : "Thinking..."}
                </span>
              </div>
            </motion.div>
          )}
        </div>
        <div ref={bottomRef} />
      </main>

      {/* Fixed Bottom Area (Always visible so OnboardingTour doesn't break) */}
      <div
        className="fixed bottom-0 left-0 right-0 border-t pb-6 pt-3 px-3 sm:px-4 backdrop-blur-md"
        style={{ backgroundColor: "var(--bg-nav)", borderColor: "var(--border-subtle)" }}
      >
        <div className="max-w-2xl mx-auto flex flex-col gap-2.5">

          {/* ALWAYS rendered for the tour to anchor to safely */}
          <div data-tour="ai-suggestions" className="w-full">
            {showChoices && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-1.5 sm:gap-2">
                {lastMessage.choices!.map((choice) => (
                  <button key={choice} className="choice-btn" onClick={() => handleAnswer(choice)}>
                    {choice}
                  </button>
                ))}
              </motion.div>
            )}
          </div>

          {done ? (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => router.push("/dashboard")}
              className="w-full primary-action h-12 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3"
              style={{ color: "var(--action-text)" }}
            >
              Go to Library <ArrowRight size={16} />
            </motion.button>
          ) : waitingConfirm ? (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
              <button className="confirm-btn confirm-yes flex-1" onClick={handleConfirm}>
                Yes, create it 
              </button>
              <button className="confirm-btn confirm-no flex-1" onClick={handleDecline}>
                Not yet
              </button>
            </motion.div>
          ) : (
            <div data-tour="ai-input" className="flex items-center gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder={showInput ? "Type your answer..." : "AI is thinking..."}
                disabled={!showInput}
                className="flex-1 px-4 py-2.5 rounded-full font-crimson text-sm sm:text-base outline-none border disabled:opacity-50"
                style={{ background: "var(--bg-card)", color: "var(--text-main)", borderColor: "var(--border-subtle)" }}
              />
              <motion.button
                whileHover={{ scale: showInput ? 1.05 : 1 }} whileTap={{ scale: showInput ? 0.95 : 1 }}
                onClick={handleSend}
                disabled={!showInput || !input.trim()}
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 disabled:opacity-40"
                style={{ background: "var(--action-bg)" }}
              >
                <Send size={14} style={{ color: "var(--action-text)" }} />
              </motion.button>
            </div>
          )}
        </div>
      </div>
      
      <OnboardingTour 
        steps={aiSteps} 
        isOpen={tour.isOpen} 
        stepIndex={tour.stepIndex} 
        onNext={() => tour.next(aiSteps.length)} 
        onPrev={tour.prev} 
        onSkip={tour.skip} 
        onFinish={tour.finish} 
      />
    </div>
  );
}