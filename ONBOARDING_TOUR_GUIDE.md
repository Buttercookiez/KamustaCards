# Onboarding Tour — Integration Guide

## Files Delivered

| File | What it does |
|------|-------------|
| `components/onboarding-tour.tsx` | The spotlight + tooltip UI component |
| `hooks/useOnboardingTour.ts` | localStorage state management |
| `lib/tourSteps.ts` | All step definitions for every page |
| `app/dashboard/page.tsx` | Dashboard with tour fully wired |
| `app/create-room/page.tsx` | Create-room with tour fully wired |

---

## How to add the tour to any remaining page (3 steps, ~2 minutes each)

### Step 1 — Add imports at the top of the page file

```tsx
import OnboardingTour from "@/components/onboarding-tour";
import { useOnboardingTour } from "@/hooks/useOnboardingTour";
import { friendsSteps } from "@/lib/tourSteps"; // ← use the right steps export
```

### Step 2 — Call the hook inside the component

```tsx
const tour = useOnboardingTour("friends"); // ← unique key per page
```

### Step 3 — Add data-tour attributes + render the component

Add `data-tour="<target>"` to the matching elements (see table below),
then render at the bottom of the JSX (before the closing `</div>`):

```tsx
<OnboardingTour
  steps={friendsSteps}
  isOpen={tour.isOpen}
  stepIndex={tour.stepIndex}
  onNext={() => tour.next(friendsSteps.length)}
  onPrev={tour.prev}
  onSkip={tour.skip}
  onFinish={tour.finish}
/>
```

---

## data-tour targets per page

### friends/page.tsx
| data-tour value | Add to |
|---|---|
| `friends-header` | The page `<h1>` or header section |
| `add-friend-btn` | The "Add Friend" button |
| `friend-card` | The first friend card in the list |

### join/page.tsx
| data-tour value | Add to |
|---|---|
| `room-code-input` | The `<input>` for the room code |
| `join-btn` | The join / submit button |

### ai/page.tsx
| data-tour value | Add to |
|---|---|
| `ai-header` | The page title / header |
| `ai-input` | The message input field |
| `ai-suggestions` | The suggestion chips / buttons container |

### room/page.tsx
| data-tour value | Add to |
|---|---|
| `room-code-display` | The code display element |
| `current-card` | The active question card |
| `next-card-btn` | The "Next" button |
| `leave-room-btn` | The leave/exit button |

### profile/page.tsx
| data-tour value | Add to |
|---|---|
| `profile-avatar` | The avatar / name section |
| `profile-stats` | The stats block |
| `replay-tours-btn` | Add a new button that calls `resetAllTours()` |

### journal/page.tsx
| data-tour value | Add to |
|---|---|
| `journal-header` | The page `<h1>` |
| `new-entry-btn` | The "New Entry" button |
| `entry-card` | The first journal entry card |

---

## Replay Tours button (profile page)

Import and use `resetAllTours` to let users restart all tours:

```tsx
import { resetAllTours } from "@/hooks/useOnboardingTour";

// Inside your profile component JSX:
<button
  data-tour="replay-tours-btn"
  onClick={() => {
    resetAllTours();
    router.push("/dashboard"); // redirect so dashboard tour fires
  }}
>
  Replay App Guide
</button>
```

---

## How localStorage keys work

Each page stores: `kamusta_tour_seen_<pageKey>`

For example, after completing the dashboard tour:
`kamusta_tour_seen_dashboard = "true"`

To test a tour again during development, open DevTools → Application → Local Storage
and delete the relevant key.

---

## z-index stack used

| Layer | z-index |
|---|---|
| Click-blocking overlay | 8999 |
| SVG spotlight mask | 9000 |
| Tooltip | 9100 |
| Grain overlay (existing) | 9999 |

The grain overlay sits on top of everything but is `pointer-events: none`
so it doesn't interfere with tour clicks.