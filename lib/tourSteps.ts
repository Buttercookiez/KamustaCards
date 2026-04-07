// lib/tourSteps.ts
// Each step targets an element via a data-tour="<id>" attribute.
// title + description appear in the tooltip.
// placement: where the tooltip appears relative to the element.

export type TourStep = {
  target: string; // matches data-tour="<target>"
  title: string;
  description: string;
  placement?: "top" | "bottom" | "left" | "right" | "center";
};

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
export const dashboardSteps: TourStep[] = [
  {
    target: "logo",
    title: "Welcome to Kamusta",
    description: "A space for meaningful conversations. Click the logo anytime to return home.",
    placement: "bottom",
  },
  {
    target: "create-room",
    title: "Create a Room",
    description: "Start a new game session. You'll choose a mode and a deck, then share a code with your players.",
    placement: "bottom",
  },
  {
    target: "join-room",
    title: "Join a Room",
    description: "Have a room code? Enter it here to join a session someone else created.",
    placement: "bottom",
  },
  {
    target: "kamusta-ai",
    title: "Kamusta AI",
    description: "Chat one-on-one with our AI companion for solo reflection, journaling prompts, or just a heart-to-heart.",
    placement: "top",
  },
  {
    target: "your-library",
    title: "Your Library",
    description: "All your question decks live here. Browse, manage, or create new ones.",
    placement: "top",
  },
  {
    target: "friends-nav",
    title: "Friends",
    description: "Add friends, see who's online, and invite them directly into a room.",
    placement: "bottom",
  },
  {
    target: "sound-controls",
    title: "Soundtrack",
    description: "Toggle ambient music on or off, and skip between tracks while you play.",
    placement: "bottom",
  },
  {
    target: "theme-toggle",
    title: "Light & Dark Mode",
    description: "Switch between light and dark themes — your preference is saved automatically.",
    placement: "bottom",
  },
];

// ─── CREATE ROOM ──────────────────────────────────────────────────────────────
export const createRoomSteps: TourStep[] = [
  {
    target: "step-indicator",
    title: "Two Quick Steps",
    description: "Creating a room takes just two steps: pick a mode, then choose a deck.",
    placement: "bottom",
  },
  {
    target: "mode-solo",
    title: "Solo Reflection",
    description: "A private space for self-care, journaling, and personal growth. Just you and your thoughts.",
    placement: "right",
  },
  {
    target: "mode-friend",
    title: "Friend Mode",
    description: "Up to 8 players. Share the room code and let the deep conversations begin.",
    placement: "right",
  },
  {
    target: "mode-couple",
    title: "Couple Mode",
    description: "Designed for two — vulnerable, intimate questions to strengthen your connection.",
    placement: "right",
  },
  {
    target: "mode-family",
    title: "Family Mode",
    description: "From 2 to 10 players. A safe, warm space for family bonding and storytelling.",
    placement: "right",
  },
  {
    target: "continue-cta",
    title: "Continue When Ready",
    description: "Select a mode above, then tap this button to choose your deck.",
    placement: "top",
  },
];

// ─── DECKS ────────────────────────────────────────────────────────────────────
export const decksSteps: TourStep[] = [
  {
    target: "decks-header",
    title: "Your Decks",
    description: "Every deck is a curated collection of questions or prompts for a specific vibe.",
    placement: "bottom",
  },
  {
    target: "new-deck-btn",
    title: "Create a Deck",
    description: "Write your own questions and craft a completely custom experience.",
    placement: "bottom",
  },
  {
    target: "deck-card",
    title: "Open a Deck",
    description: "Tap any deck to preview, edit, or play with its cards.",
    placement: "bottom",
  },
];

// ─── FRIENDS ──────────────────────────────────────────────────────────────────
export const friendsSteps: TourStep[] = [
  {
    target: "friends-header",
    title: "Your Friends",
    description: "People you've connected with on Kamusta. Invite them into rooms directly.",
    placement: "bottom",
  },
  {
    target: "add-friend-btn",
    title: "Add a Friend",
    description: "Search by username or share your code to connect with someone new.",
    placement: "bottom",
  },
  {
    target: "friend-card",
    title: "Friend Card",
    description: "See who's online, send a room invite, or remove a friend here.",
    placement: "bottom",
  },
];

// ─── JOIN ─────────────────────────────────────────────────────────────────────
export const joinSteps: TourStep[] = [
  {
    target: "room-code-input",
    title: "Enter Your Room Code",
    description: "Type the 6-character code shared by the room creator to jump right in.",
    placement: "bottom",
  },
  {
    target: "join-btn",
    title: "Join!",
    description: "Tap this once your code is entered. You'll be taken to the room instantly.",
    placement: "top",
  },
];

// ─── AI ───────────────────────────────────────────────────────────────────────
export const aiSteps: TourStep[] = [
  {
    target: "ai-header",
    title: "Kamusta AI",
    description: "Your personal companion for solo reflection. Ask anything, journal your thoughts, or explore a prompt.",
    placement: "bottom",
  },
  {
    target: "ai-input",
    title: "Start the Conversation",
    description: "Type a question, a feeling, or just 'hi' — the AI will meet you where you are.",
    placement: "top",
  },
  {
    target: "ai-suggestions",
    title: "Prompt Suggestions",
    description: "Not sure what to say? Tap a suggestion to get the conversation going.",
    placement: "top",
  },
];

// ─── ROOM (Game) ──────────────────────────────────────────────────────────────
export const roomSteps: TourStep[] = [
  {
    target: "room-code-display",
    title: "Your Room Code",
    description: "Share this code with friends so they can join your session.",
    placement: "bottom",
  },
  {
    target: "current-card",
    title: "The Question",
    description: "Take turns reading and answering. There are no wrong answers here.",
    placement: "bottom",
  },
  {
    target: "next-card-btn",
    title: "Next Card",
    description: "When everyone's ready, tap this to draw the next question.",
    placement: "top",
  },
  {
    target: "leave-room-btn",
    title: "Leave Room",
    description: "Tap here when your session is done. Your progress in this deck is saved.",
    placement: "bottom",
  },
];

// ─── PROFILE ──────────────────────────────────────────────────────────────────
export const profileSteps: TourStep[] = [
  {
    target: "profile-avatar",
    title: "Your Profile",
    description: "Your public identity on Kamusta. Tap to edit your display name or avatar.",
    placement: "bottom",
  },
  {
    target: "profile-stats",
    title: "Your Stats",
    description: "See how many sessions you've played, decks you own, and friends you've connected with.",
    placement: "bottom",
  },
  {
    target: "replay-tours-btn",
    title: "Replay Guides",
    description: "Want a refresher? Tap this to reset all onboarding tours so they show again.",
    placement: "top",
  },
];

// ─── JOURNAL ──────────────────────────────────────────────────────────────────
export const journalSteps: TourStep[] = [
  {
    target: "journal-header",
    title: "Your Journal",
    description: "A private space for your reflections. Only you can see what's written here.",
    placement: "bottom",
  },
  {
    target: "new-entry-btn",
    title: "New Entry",
    description: "Start a fresh journal entry — freeform or guided by a prompt.",
    placement: "bottom",
  },
  {
    target: "entry-card",
    title: "Past Entries",
    description: "Tap any entry to read, continue, or delete it.",
    placement: "bottom",
  },
];