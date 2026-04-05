import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";

const defaultDecks = [
  {
    title: "Friends Deck",
    description: "Deep talks and fun prompts for you and your barkada.",
    category: "friends",
    visibility: "private",
    cards: [
      { text: "What's one thing you've never told me but always wanted to?", type: "secret" },
      { text: "If we could go anywhere together right now, where would you pick?", type: "question" },
      { text: "What's your favorite memory of us?", type: "question" },
      { text: "Tell me one thing you genuinely appreciate about me.", type: "appreciation" },
      { text: "What's something you're currently struggling with?", type: "comfort" },
      { text: "If you could change one thing about how we are as friends, what would it be?", type: "question" },
      { text: "What's a dream you've never told anyone?", type: "secret" },
      { text: "What's something you think I'm really good at?", type: "appreciation" },
      { text: "Where do you see our friendship in 10 years?", type: "future" },
      { text: "What's one thing on your bucket list you want us to do together?", type: "mission" },
    ],
  },
  {
    title: "Lover Deck",
    description: "Intimate and heartfelt prompts for couples.",
    category: "couples",
    visibility: "private",
    cards: [
      { text: "What was the moment you knew you liked me?", type: "question" },
      { text: "What's something I do that makes you feel most loved?", type: "appreciation" },
      { text: "Describe our relationship in 3 words.", type: "question" },
      { text: "What's one thing you want us to work on together?", type: "future" },
      { text: "What's your favorite thing about who we are as a couple?", type: "appreciation" },
      { text: "If you could relive one moment with me, what would it be?", type: "question" },
      { text: "What's a dream future you imagine for us?", type: "future" },
      { text: "Tell me something you've been afraid to say.", type: "secret" },
      { text: "What's one small thing I could do to make your day better?", type: "mission" },
      { text: "When do you feel closest to me?", type: "question" },
    ],
  },
  {
    title: "Family Deck",
    description: "Meaningful conversations to bring your family closer.",
    category: "family",
    visibility: "private",
    cards: [
      { text: "What's your favorite family memory?", type: "question" },
      { text: "What's one thing you appreciate most about our family?", type: "appreciation" },
      { text: "If our family could have a tradition, what would you want it to be?", type: "future" },
      { text: "What's something you've always wanted to ask someone in this family?", type: "secret" },
      { text: "What's a lesson this family has taught you that you'll never forget?", type: "question" },
      { text: "Tell someone in this room one thing you love about them.", type: "appreciation" },
      { text: "What's a challenge you think our family handled really well?", type: "question" },
      { text: "If you could plan the perfect family day, what would it look like?", type: "mission" },
      { text: "What's something you wish we talked about more as a family?", type: "comfort" },
      { text: "Where do you see our family in 5 years?", type: "future" },
    ],
  },
];

export const seedDefaultDecks = async (userId: string, displayName: string) => {
  for (const deck of defaultDecks) {
    const { cards, ...deckData } = deck;

    const deckRef = await addDoc(collection(db, "decks"), {
      ...deckData,
      owner: userId,
      ownerName: displayName,
      likes: 0,
      isDefault: true,
      createdAt: Date.now(),
    });

    for (const card of cards) {
      await addDoc(collection(db, "decks", deckRef.id, "cards"), {
        ...card,
        createdAt: Date.now(),
      });
    }
  }
};