"use client";  // <-- Add this at the very top
import { useState } from "react";
import Card from "./Card";

export default function Deck() {
  const [cards, setCards] = useState(["Hello!", "How are you?", "You matter!"]);
  const [newCard, setNewCard] = useState("");

  const addCard = () => {
    if (newCard.trim() !== "") {
      setCards([...cards, newCard]);
      setNewCard("");
    }
  };

  return (
    <div className="flex flex-col items-center">
      {cards.map((c, i) => <Card key={i} text={c} />)}
      <input
        value={newCard}
        onChange={(e) => setNewCard(e.target.value)}
        placeholder="Add a new card"
        className="border p-2 rounded mb-2"
      />
      <button className="button" onClick={addCard}>Add Card</button>
    </div>
  );
}