"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import DeckEditorClient from "./DeckEditorClient";

function EditorWrapper() {
  // Read the URL parameters on the client side
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono text-sm opacity-50">
        No Deck ID provided.
      </div>
    );
  }

  // Pass the ID to your actual editor component
  return <DeckEditorClient deckId={id} />;
}

export default function DeckEditorPage() {
  // Next.js requires useSearchParams to be wrapped in Suspense during static exports
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center font-mono text-sm opacity-50">
        Loading editor...
      </div>
    }>
      <EditorWrapper />
    </Suspense>
  );
}