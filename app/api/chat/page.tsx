"use client";

import { useState } from "react";

export default function ChatPage() {
  const [msg, setMsg] = useState("");
  const [reply, setReply] = useState("");

  const send = async () => {
    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ message: msg }),
    });

    const data = await res.json();
    setReply(data.reply);
  };

  return (
    <div className="p-10 flex flex-col gap-4 max-w-md">
      <h1 className="text-xl font-bold">AI Assistant</h1>

      <input
        value={msg}
        onChange={(e) => setMsg(e.target.value)}
        className="border p-2"
      />

      <button onClick={send} className="bg-blue-500 text-white p-2">
        Ask
      </button>

      <p>{reply}</p>
    </div>
  );
}