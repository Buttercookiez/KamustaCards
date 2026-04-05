"use client";

import { db } from "@/lib/firebase";
import { doc, setDoc, collection, addDoc } from "firebase/firestore";

export default function SetupPage() {
  const createDefaultData = async () => {
    try {
      // =========================
      // FRIENDS DECK
      // =========================
      await setDoc(doc(db, "decks", "friendsDeck"), {
        title: "Barkada Vibes",
        category: "friends",
        isDefault: true,
      });

      const friendsCardsRef = collection(db, "decks", "friendsDeck", "cards");

      await addDoc(friendsCardsRef, {
        text: "What do you appreciate most about our friendship?",
      });

      await addDoc(friendsCardsRef, {
        text: "What memory with me makes you smile?",
      });

      await addDoc(friendsCardsRef, {
        text: "What is one thing we should do together soon?",
      });

      // =========================
      // FAMILY DECK
      // =========================
      await setDoc(doc(db, "decks", "familyDeck"), {
        title: "Family Bonding",
        category: "family",
        isDefault: true,
      });

      const familyCardsRef = collection(db, "decks", "familyDeck", "cards");

      await addDoc(familyCardsRef, {
        text: "What family memory makes you happiest?",
      });

      await addDoc(familyCardsRef, {
        text: "What family tradition should we keep forever?",
      });

      await addDoc(familyCardsRef, {
        text: "What do you appreciate most about our family?",
      });

      // =========================
      // LOVER DECK
      // =========================
      await setDoc(doc(db, "decks", "loverDeck"), {
        title: "Heart to Heart",
        category: "lover",
        isDefault: true,
      });

      const loverCardsRef = collection(db, "decks", "loverDeck", "cards");

      await addDoc(loverCardsRef, {
        text: "What do you love most about our relationship?",
      });

      await addDoc(loverCardsRef, {
        text: "What is your favorite memory of us?",
      });

      await addDoc(loverCardsRef, {
        text: "What dream should we achieve together?",
      });

      // =========================
      // TEST ROOM
      // =========================
      await setDoc(doc(db, "rooms", "test-room"), {
        selectedDeck: "friendsDeck",
        currentCard: null,
        answers: {},
        status: "waiting",
      });

      alert("KamustaCards default data created successfully!");
    } catch (error) {
      console.error(error);
      alert("Something went wrong.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <button
        onClick={createDefaultData}
        className="px-6 py-3 rounded-2xl bg-pink-500 text-white font-semibold"
      >
        Create KamustaCards Default Data
      </button>
    </div>
  );
}