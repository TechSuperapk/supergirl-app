# Milestone 1 — AI Digital Wardrobe · Architecture

_Feature built by **extending the existing `src/modules/fits` module**, adapted to the app's real
stack, with **zero changes to other features** (journal, club, trackers, boards, profile, auth)._

---

## 0. Decisions locked (from you)

| Decision | Choice |
|---|---|
| Foundation | **Adapt to the app's stack** — React Navigation, Redux Toolkit + Zustand, `@tanstack/react-query`, Firestore + Firebase Storage, `expo-image`. No Expo Router, no NativeWind, no MMKV. |
| Module | **Extend `src/modules/fits`** — the wardrobe/AI-stylist module that already exists. |
| Design | You will **fix Figma access** (currently `tech@billiontags.com` is a View-only seat; Dev Mode needs editor access). UI work waits for that; this milestone is stack/architecture only. |

---

## 1. ⚠️ The one architecture fork that changes everything: Storage + Backend

Your spec asks for **MongoDB Atlas + AWS S3 + an Express backend**. But the existing `fits` module
**already persists to Firestore** (`fits_wardrobe`, `fits_outfits`, `fits_planner`) and uploads
images to **Firebase Storage** (via `services/storageService` → `uploadFileToFirebase`). The
Express server in `server/` exists but currently serves **only journal/notes** — the wardrobe has
never touched it.

Since you chose **"adapt to the app's stack"** and **"extend fits"**, there are two coherent paths:

| | **Path A — Firestore + Firebase Storage (recommended)** | **Path B — Mongo + S3 + Express (as-specced)** |
|---|---|---|
| Matches existing fits | ✅ yes, already live | ❌ requires migrating fits' data layer |
| New infra to provision | none | AWS account + S3 bucket + IAM, extend `server/`, Mongo collections |
| Offline-first | ✅ built-in (Firestore cache) | ⚠️ must be built |
| Risk to "don't disturb other features" | ✅ none | ⚠️ shared `server/` + `firebase` config changes |
| Effort | Milestones ship faster | +1–2 milestones of pure infra |

**My recommendation: Path A.** It's the app's real stack, needs no new cloud accounts, keeps fits
offline-first, and won't disturb anything else. The one place a server is genuinely required is the
**AI proxy** (see §7) — a thin serverless function, not a full Mongo/S3 backend.

> **Please confirm Path A or Path B before Milestone 2** — the backend milestone depends entirely on this.

---

## 2. Folder structure (feature-based, inside `src/modules/fits`)

```
src/modules/fits/
├── screens/
│   ├── home/                 FitsHomeScreen (dashboard) + sections
│   ├── closet/               Wardrobe grid, AddClothing, ClothingDetail, filters
│   ├── builder/              OutfitBuilder canvas, OutfitsList, OutfitDetail
│   ├── suggestions/          AI Outfit Suggestions
│   ├── calendar/             Monthly/Weekly/Daily planner
│   ├── trip/                 Trip list, create, packing checklist
│   ├── analytics/            Wardrobe analytics dashboard
│   └── settings/             Wardrobe settings
├── components/
│   ├── ui/                   Skeletons, EmptyState, Chip, Card primitives (feature-local)
│   ├── cards/                ClothingCard, OutfitCard, AISuggestionCard (existing) …
│   ├── builder/              Draggable item, layer panel, canvas toolbar
│   ├── calendar/             Day cell, month grid, planner row
│   ├── trip/                 Packing row, progress bar
│   └── analytics/            Charts (react-native-svg), stat tiles
├── hooks/                    useWardrobe, useOutfits, usePlanner, useTrips,
│                             useAnalytics, useAISuggestions, useWeather (react-query)
├── services/
│   ├── data/                 fitsDbService (extended), tripService, calendarService,
│   │                         analyticsService, settingsService
│   ├── ai/                   visionDetectService, backgroundRemovalService, aiStylistService
│   ├── weather/              weatherService
│   └── storage/              imageProcessing (crop/compress), storageService wrapper
├── repositories/             Firestore/HTTP abstraction (Repository Pattern) per collection
├── store/                    fitsSlice (Redux, normalized) + builderStore (zustand, canvas)
├── types/                    domain types (extended — see §4)
├── utils/                    color, cost-per-wear, date, packing helpers
├── config/                   endpoints, AI model config, category taxonomy
└── __tests__/                unit tests (services, hooks, utils)
```

Navigation stays in `src/navigation/FitsNavigator.tsx` (existing 4-tab shell), extended with the
new stacks (Trip, Analytics, Settings) — **no other navigator touched**.

---

## 3. Dependencies

**Already installed (reuse):** `@tanstack/react-query`, `zustand`, `@reduxjs/toolkit`,
`react-native-reanimated`, `react-native-gesture-handler`, `expo-image`,
`expo-image-manipulator`, `expo-image-picker`, `firebase`, `react-native-svg`, `dayjs`,
`expo-file-system`, `expo-notifications`, `expo-secure-store`.

**To add (additive, scoped to fits, low risk):**

| Package | Why | Milestone |
|---|---|---|
| `react-native-view-shot` | Rasterize the outfit-builder canvas → PNG thumbnail for save/share | 5 |
| `@shopify/flash-list` | Virtualized wardrobe grid (large closets) — you listed FlashList | 3 |
| `react-hook-form` | The clothing edit + trip forms (you listed it) | 3 |
| `expo-print` / `expo-sharing` | Trip packing checklist → PDF export | 7 |

**Explicitly NOT adding** (per your "adapt to stack" choice): `expo-router`, `nativewind`,
`react-native-mmkv`. Skia is deferred — the builder ships with Reanimated + Gesture Handler + SVG
first; we only add Skia if a specific effect demands it.

---

## 4. Domain model (extends existing types)

`ClothingItem` gains the full AI-detected metadata set:

```ts
interface ClothingItem {
  // existing: id, userId, name, category, colorTags, brand, imageUri, s3Key,
  //           notes, isFavourite, createdAt
  subCategory?: string;
  colors: string[];                 // detected palette (hex + name)
  pattern?: string;                 // solid | striped | floral | checked | …
  material?: string;                // cotton | denim | wool | …
  seasons: Season[];                // ['summer','all']
  occasions: string[];              // ['casual','office',…]
  gender?: 'male' | 'female' | 'unisex';
  sleeveLength?: 'sleeveless'|'short'|'half'|'full';
  fitType?: 'slim'|'regular'|'loose'|'oversized';
  transparentUri?: string;          // background-removed PNG (local)
  transparentKey?: string;          // storage key
  timesWorn: number;
  lastWornAt?: string;
  purchasePrice?: number;
  costPerWear?: number;             // derived
  isArchived: boolean;
  source: 'ai' | 'manual';
  aiConfidence?: number;
  updatedAt: string;
}
```

`Outfit` gains a **canvas layer model** (for the builder) + wear tracking:

```ts
interface OutfitLayer { itemId: string; x: number; y: number; scale: number;
  rotation: number; zIndex: number; flipped?: boolean; }
interface Outfit { /* existing */ layers: OutfitLayer[]; collection?: string;
  thumbnailUri?: string; timesWorn: number; lastWornAt?: string; }
```

**New types:** `Trip` (destination, country, dates, days, weatherSummary, packingList,
dailyOutfits, progress), `CalendarEntry` (extends PlannerEntry: `status: 'planned'|'completed'|'missed'`,
`reminderAt?`, `recurrence?`), `WardrobeAnalytics` (derived, cached), `WardrobeSettings`.

**Collections (Path A):** existing `fits_wardrobe`, `fits_outfits`, `fits_planner` +
`fits_trips`, `fits_settings`, `fits_analytics_cache`. New security rules are **owner-only**,
appended to `firestore.rules` (additive — existing rules untouched).

---

## 5. Layered architecture & cross-cutting concerns

```
Screen (UI, dumb)  →  Hook (react-query + redux, feature logic)
                   →  Service (data / ai / weather / storage)
                   →  Repository (Firestore or HTTP abstraction)
                   →  External (Firestore · Firebase Storage · OpenAI Vision · remove.bg · Weather)
```

- **Server cache:** `react-query` (wardrobe, outfits, trips, weather) with persistence for offline.
- **Global state:** Redux `fitsSlice` (normalized entities, already present).
- **Ephemeral UI state:** `zustand` `builderStore` + Reanimated shared values for canvas gestures
  (drag/zoom/rotate) — never re-renders the tree per frame.
- **Offline:** Firestore offline cache + optimistic updates + queued writes (same pattern as journaling).
- **Perf:** FlashList, `expo-image` disk caching, lazy screen loading, memoized selectors, `InteractionManager` for heavy AI calls.
- **Resilience:** per-stack **Error Boundaries**, skeleton loaders, empty states, retry/backoff on AI + network.
- **A11y & theming:** `accessibilityLabel`/roles on interactive elements; **dark mode** via existing `ThemeContext`.

---

## 6. AI pipeline (upload → catalogued item)

```
pick/take photo → crop (expo-image-manipulator) → compress
   → background removal (remove.bg / ClipDrop)  → transparent PNG
   → upload original + PNG (Firebase Storage)
   → GPT-4o Vision detect { category, subCategory, colors, pattern, material,
        seasons, occasions, gender, sleeveLength, fitType, brand?, confidence }
   → prefill editable form (user can correct every field)
   → save ClothingItem (Firestore) + cache
```

Every AI step is **fail-soft**: if background removal or vision fails, the flow falls back to the
original image + manual entry, never blocking the user. Retries with backoff; results cached.

---

## 7. 🔐 Non-negotiable security note (affects Milestone 2 & 4)

**AI keys must not ship in the client.** Any `EXPO_PUBLIC_OPENAI_API_KEY` / remove.bg key is bundled
into the app and trivially extractable. The current `aiStylistService` reads
`EXPO_PUBLIC_OPENAI_API_KEY` — fine for a prototype, **not** for production.

→ Milestone 2 will add a **thin AI proxy** (an endpoint that holds the keys server-side and forwards
requests). This is the minimal backend even on Path A, implemented either by extending the existing
`server/` (Express) with `/api/ai/*` + `/api/weather` routes, or a Firebase Cloud Function. The
scheduled **"Outfit of the Day"** + FCM push also live here.

---

## 8. What each remaining milestone delivers

- **M2 — Backend/infra:** AI proxy (+ weather proxy), Firestore rules for `fits_*`, scheduled OOTD + FCM, `config/endpoints`. (Path B additionally: Mongo models + S3 presigned upload + full REST.)
- **M3 — Digital Closet:** upload/crop/compress, wardrobe grid (FlashList), filters/sort/search, multi-select (delete/archive/restore/favorite/share/duplicate), detail + manual edit form.
- **M4 — AI:** background-removal + GPT-4o Vision detection wired into upload; AI outfit suggestions with "why".
- **M5 — Outfit Builder:** gesture canvas (drag/zoom/rotate/resize), layers, undo/redo, save/share/duplicate, collections.
- **M6 — Calendar:** month/week/day, assign/replace/delete outfit, recurring, reminders, history, completed/missed, stats.
- **M7 — Trip Planner:** create trip, weather-based AI packing, checklist + progress, daily outfits, PDF export, duplicate/delete/history.
- **M8 — Analytics:** most/least/unused worn, favorite colors/brands, season/category usage, cost-per-wear, insights, shopping recs.
- **M9 — Testing:** unit tests (services/hooks/utils), error boundaries pass, a11y & dark-mode audit, perf pass.

---

## 9. Open decisions to confirm before Milestone 2

1. **Storage/backend:** Path A (Firestore + Firebase Storage, recommended) or Path B (Mongo + S3 + Express)?
2. **AI proxy host:** extend the existing Express `server/`, or a Firebase Cloud Function?
3. **Background-removal provider:** remove.bg or ClipDrop? (need an API key either way)
4. **Weather provider:** OpenWeather / WeatherAPI? (need a key)

Reply with your answers (or "Path A, Express proxy, remove.bg, OpenWeather" etc.) and approval to
start **Milestone 2**, and I'll proceed. No feature code has been written yet — this milestone is
architecture only.
```
