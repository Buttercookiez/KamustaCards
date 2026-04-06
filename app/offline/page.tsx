"use client";

// app/offline/page.tsx
export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100svh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        background: "var(--bg-base, #faf8f5)",
        fontFamily: "'Crimson Pro', Georgia, serif",
        textAlign: "center",
      }}
    >
      <p
        style={{
          fontFamily: "'Cinzel Decorative', serif",
          fontSize: "11px",
          letterSpacing: "0.2em",
          opacity: 0.5,
          color: "var(--text-main, #1a1a1a)",
        }}
      >
        Kamusta
      </p>

      <h1
        style={{
          fontSize: "clamp(1.5rem, 6vw, 2.5rem)",
          fontWeight: 300,
          color: "var(--text-main, #1a1a1a)",
          margin: 0,
        }}
      >
        You're offline.
      </h1>

      <p
        style={{
          fontSize: "1.1rem",
          fontStyle: "italic",
          color: "var(--text-sub, #8c8c8c)",
          maxWidth: "22rem",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        Some of the best conversations happen without a signal. Come back when
        you're connected.
      </p>

      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: "0.5rem",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          fontFamily: "'Space Mono', monospace",
          fontSize: "9px",
          letterSpacing: "0.3em",
          textTransform: "uppercase",
          color: "var(--text-main, #1a1a1a)",
          opacity: 0.6,
          padding: "0.5rem 0",
        }}
      >
        Try again →
      </button>
    </div>
  );
}