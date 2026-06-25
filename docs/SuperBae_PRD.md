# Super Bae — Product Requirements Document (PRD)

**Product:** Super Bae (codebase: `supergirl`, bundle `com.supergirl.app`)
**Type:** Mobile app (iOS + Android) — React Native / Expo
**Audience:** Girls / young women — a private, all‑in‑one lifestyle companion
**Document status:** Living document · reflects implementation as of this revision
**Owner:** Tech (tech@billiontags.com)

---

## 1. Vision & Summary

Super Bae is a girls‑first lifestyle app that combines journaling, social clubs,
outfit planning, life tracking, and inspiration boards in one private, friendly
space. The first shipped pillar is **Journal** — a rich daily journaling
experience with moods, media, voice notes, stickers, hand‑drawn scribbles,
calendar, search, stats, and a PIN‑locked **Private Vault**. Other pillars
(Club, Fits, Track, Board) are scaffolded and shown as "Coming Soon".

**Primary value:** capture your day beautifully and privately, then grow into a
full personal lifestyle hub.

---

## 2. Goals & Success Metrics

| Goal | Metric |
|------|--------|
| Fast, frictionless onboarding | % users completing phone → OTP → first entry |
| Daily journaling habit | D1/D7/D30 retention; entries per active user per week |
| Trust & privacy | % users who set up the Private Vault; zero unauthorized vault reads |
| Reliable sync | % entries successfully persisted to Firestore; sync error rate |
| Delight | sticker/scribble usage rate; theme customization rate |

---

## 3. Target Users & Personas

- **Aara, 19 — the daily journaler.** Wants a private, pretty place to write,
  add photos and stickers, and lock sensitive entries.
- **The tracker.** Wants moods, habits, periods, and stats over time.
- **The community seeker.** Wants girls‑only clubs and events (future).

---

## 4. Platforms & Tech Stack

- **Framework:** Expo SDK 54, React Native 0.81, React 19, TypeScript (strict).
- **Navigation:** React Navigation (native‑stack + bottom‑tabs).
- **State:** Redux Toolkit (`auth`, `journal`, `club`, `fits`, `trackers`, `boards`, `subscription`, `notifications`).
- **Backend:** Firebase — Auth (phone), Firestore (data), Storage (media). AsyncStorage for auth persistence.
- **Media/UX libs:** react-native-svg, react-native-gesture-handler, react-native-reanimated, expo-av/expo-audio/expo-video, expo-image-picker, expo-file-system, expo-sharing, expo-local-authentication, expo-notifications.
- **Fonts:** DM Sans. **Brand color:** `#2979FF`. **App bg:** `#F4F5F7`.

---

## 5. Scope

**In scope (live):** Onboarding/Auth, Journal (Home, Write/Edit, Entry Detail,
Calendar, Search, Stats, Scribble, Stickers), Private Vault, Firestore sync.

**Scaffolded / Coming Soon:** Club (feed, events, groups, tickets), Fits
(wardrobe, outfits, AI stylist, planner), Track (mood/sleep/habits/period/
health/expenses + AI insights), Board (canvas boards), Profile, Subscription.

**Out of scope (now):** Real SMS OTP delivery (test OTP used), PIN hashing,
web build.

---

## 6. Information Architecture & Navigation

- **App entry:** Splash → Onboarding (carousel + login) → App.
- **Top module row** (inside Journal Home): Club · Journal · Fits · Track · Board (Journal active; others "Soon").
- **Journal bottom tab bar:** Home · Calendar · (+) · Search · Private.
  - The center **+** FAB opens the entry editor (private‑by‑default when on the Private tab).
  - The parent module bar is hidden while in Journal so there is a single, clean bottom bar.
  - The bottom bar is hidden on the Private **lock/PIN** screen and appears only after the PIN is entered.

---

## 7. Functional Requirements

### 7.1 Onboarding & Authentication
- **FR‑A1 Splash:** Show "Super Bae" wordmark (blue on white) ~2s, then continue.
- **FR‑A2 Carousel:** 4 auto‑advancing hero slides (Clubs, My Circle, Track, Wardrobe) with title, subtitle, page dots, swipe, and a Skip action. Hero images load from `assets/onboarding/{clubs,circle,track,wardrobe}.png`.
- **FR‑A3 Phone login:** Persistent bottom form — country code (+91 default, selectable) + mobile number + Continue.
- **FR‑A4 OTP:** 4‑digit code entry (masked as `*`), "Sent to <number>" with edit, Continue, and a "Resend in 00:29" countdown → "Resend OTP". **Test mode:** any 4‑digit code verifies (real SMS to be wired later).
- **FR‑A5 Welcome:** Green check + welcome message, then auto‑proceed into the app.
- **FR‑A6 Keyboard behavior:** When the keyboard opens, the hero carousel collapses so inputs and the primary button stay above the keyboard.
- **FR‑A7 Skip:** Enters the app as a guest (demo user).

### 7.2 Journal — Home
- **FR‑J1:** Header with avatar, "Hi <name>!", Giftable pill, and notification bell with unread dot.
- **FR‑J2:** Month/Year row; reverse‑chronological list of entries.
- **FR‑J3:** Entry card shows big date, mood circle, title, 3‑line body preview, image thumbnails, and time; the most recent card shows a "Top" pill.
- **FR‑J4:** Empty state with "Every Day is a fresh page" and a Start Journaling CTA.
- **FR‑J5:** Only non‑private, non‑draft entries appear here.

### 7.3 Journal — Write / Edit
- **FR‑W1:** Mood picker first, then editor.
- **FR‑W2:** Title + body with inline `#hashtag` auto‑detection and tag chips.
- **FR‑W3:** Toolbar: Photo, Video, Theme, Text style (size/color), Sticker, Scribble, Private/Public toggle, Voice note (record/playback).
- **FR‑W4:** Date selector (calendar), themes, font sizes, text colors.
- **FR‑W5:** Auto‑save drafts; media/voice uploaded to Storage on save.
- **FR‑W6:** Editor layout matches the read‑only preview (WYSIWYG): padding, title size, body line‑height, and sticker size/position are consistent.

### 7.4 Stickers (image)
- **FR‑S1:** 18‑piece starter image set in `assets/stickers/`, registered in `stickers.ts`; extendable by adding a PNG + one registry line.
- **FR‑S2:** Tap to place; **drag** to move anywhere; **pinch** to scale (0.4×–4×). Page scroll is disabled while manipulating a sticker (no freeze).
- **FR‑S3:** Stickers persist with the entry and render identically in the preview. Legacy emoji stickers remain supported.

### 7.5 Scribble pad
- **FR‑SC1:** Full‑screen finger drawing with pen colors, sizes, eraser, undo, clear.
- **FR‑SC2:** Saves into the journal entry as a vector "board" (not an exported image); shown as a thumbnail on the entry and editable later. Auto‑saves to Redux + Firestore.

### 7.6 Calendar, Search, Stats
- **FR‑C1 Calendar:** Month grid with mood/entry markers; tap a day to view its entries; "Day at a glance".
- **FR‑C2 Search:** Query by title/body/tags; filter by mood and top tags; recent searches.
- **FR‑C3 Stats:** Aggregate views over journal data.

### 7.7 Private Vault
- **FR‑P1 Setup (first run):** Create 4‑digit PIN → confirm PIN → set 2 security questions (typed answers) → unlocked. Setup must be completed before access.
- **FR‑P2 Unlock:** Returning users enter the PIN (masked as `*`). The screen reacts to a PIN loaded from the database (shows "Enter" not "Create").
- **FR‑P3 Auto‑lock:** Leaving the Private area locks the vault immediately; re‑entry requires the PIN.
- **FR‑P4 Private entries:** Entries flagged private appear only in the Private journal; the Private FAB creates private entries. Move entries between public/private via PIN confirmation.
- **FR‑P5 Recovery:** Forgot‑PIN via security questions.

### 7.8 Notifications, Profile, Subscription (scaffolded)
- Local/push notification service; profile editing and settings; subscription gating (yearly plan, Razorpay/IAP) — present but not the current focus.

---

## 8. Data & Sync (Firestore)

**Real‑time, per signed‑in user (`userId`):**
- `journal_entries/{id}` — full entry (title, body, mood, tags, mediaUrls, voiceNoteUrl, stickers + stickerPlacements, scribblePages, theme, textColor, fontSize, isPrivate, timestamps). Subscribed live on login; sorted newest‑first **client‑side** to avoid requiring a composite index.
- `vaults/{uid}` — PIN + security questions; owner‑only; subscribed live so the vault persists across sessions/devices.
- Media & voice files → Firebase **Storage** under per‑user paths.

**Security rules (high level):** users can only read/write their own
`journal_entries` and `vaults`; storage writes are owner‑scoped with size limits.
Indexes file includes a `journal_entries (userId, createdAt desc)` entry for
optional server‑side ordering.

**Deployment dependency:** updated `firestore.rules` and `firestore.indexes.json`
must be deployed (`firebase deploy --only firestore:rules,firestore:indexes`),
and the user must be authenticated, for live data to flow.

---

## 9. Non‑Functional Requirements

- **NFR‑1 Privacy/Security:** Private data is owner‑only at the rules layer. (Open: PIN/answers currently stored in plaintext in the owner‑only vault doc — hashing recommended.)
- **NFR‑2 Performance:** Smooth 60fps gestures (stickers via UI‑thread reanimated); lists virtualize where needed.
- **NFR‑3 Reliability:** Live Firestore subscriptions with graceful local fallback; drafts auto‑saved.
- **NFR‑4 Accessibility/Usability:** Keyboard never obscures inputs; tap targets ≥44px; readable contrast.
- **NFR‑5 Theming:** Light/dark via ThemeContext; brand consistency (DM Sans, #2979FF).
- **NFR‑6 Type safety:** TypeScript strict; project compiles clean (except 2 known `imageUtils.ts` errors — see §11).

---

## 10. Key User Flows

1. **First run:** Splash → carousel → enter phone → Continue → OTP → verify → Welcome → (name capture) → Home.
2. **Write an entry:** Home → (+) → mood → write (add photo/sticker/scribble/voice) → Save → appears on Home, synced to Firestore.
3. **Private:** Private tab → set/enter PIN → Private journal → (+) creates a private entry → leaving re‑locks.
4. **Find:** Search/Calendar → tap entry → Detail → Edit.

---

## 11. Current Status & Known Issues

**Implemented:** Onboarding redesign; Journal Home (Figma‑matched); bottom tab
nav + center FAB; image stickers (pinch/drag); scribble→entry; WYSIWYG editor;
Private Vault (lock‑on‑leave, masked PIN, security questions); live Firestore
sync for entries + vault; index‑free entry loading; keyboard‑safe onboarding.

**Known issues / tech debt:**
- `src/shared/utils/imageUtils.ts` — 2 TypeScript errors from expo‑file‑system v19 API change (`cacheDirectory`, `getInfoAsync` `size`). Pre‑existing; not yet fixed.
- OTP is **test mode** (no real SMS).
- Vault PIN/security answers stored in plaintext (owner‑only) — hashing pending.
- Other modules (Club/Fits/Track/Board) are "Coming Soon" stubs.
- A sandbox file‑sync quirk occasionally truncated files during edits; mitigated by integrity checks after each change.

---

## 12. Roadmap / Next Up

1. Capture user name during onboarding (greet "Welcome <name>").
2. Real Firebase Phone Auth (SMS) — requires native dev build (Android SHA, iOS APNs).
3. Hash PIN + security answers (expo‑crypto).
4. Fix `imageUtils.ts` (migrate to new expo‑file‑system API).
5. Build out Track, then Fits, Club, Board.
6. Subscription/paywall polish.

---

## 13. Open Decisions

- Name capture location (onboarding vs profile step).
- Guest/Skip behavior and its limits.
- Whether to require security questions on every device or once per account.
- Server‑side ordering (deploy index) vs client‑side sort.

---

*End of document.*
