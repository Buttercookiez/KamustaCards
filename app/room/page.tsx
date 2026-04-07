"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import RoomClient from "./RoomClient";

function RoomContent() {
  const searchParams = useSearchParams();
  const roomId = searchParams.get("id");

  if (!roomId) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm">
        No room found
      </div>
    );
  }

  return <RoomClient roomId={roomId} />;
}

export default function RoomPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center text-sm">
          Loading...
        </div>
      }
    >
      <RoomContent />
    </Suspense>
  );
}