# SuperGirl — Code Analysis (2026-07-14)

Scope: OTP verification, Scribble tool, Audio recording, Stickers, App crashes.
Stack: Expo SDK 54 · RN 0.81.5 · React 19.1 · react-native-firebase 22 · Reanimated 4.1.

---

## 1. OTP Verification

**Files:** `src/modules/auth/services/authService.ts`, `screens/OnboardingScreen.tsx`, `screens/LoginScreen.tsx`, `screens/PhoneEntryScreen.tsx`

**How it works now:** Native Firebase phone auth (`auth().signInWithPhoneNumber`) → user types code → `confirmation.confirm(code)` → ID token exchanged with the backend for a session JWT.

### Root cause of the "expires in 6–7 seconds" bug
Firebase SMS codes are actually valid for **minutes**, not seconds. The 6–7s symptom is **Android SMS auto-retrieval**: Play Services reads the incoming SMS, Firebase **auto-verifies and signs the user in silently** a few seconds after the SMS lands. That consumes the pending `ConfirmationResult`, so when the user then types the code manually, `confirm()` throws `[auth/session-expired]` — which looks exactly like a 6–7 second expiry.

**Fix (no expiry change needed — there is no server-side 7s window):**
1. After `sendOtp()`, subscribe to `auth().onAuthStateChanged` — if a user appears before the code is entered, auto-verification happened: skip the OTP screen and proceed straight to the backend token exchange.
2. Alternatively use the `auth().verifyPhoneNumber(phone)` listener API and handle the `onVerificationCompleted` event explicitly.
3. Also handle the `auth/session-expired` / `auth/code-expired` error codes with a friendly "already verified — continuing…" path instead of "Verification failed".

### Delivery speed
Delivery latency is Firebase + carrier side, not app code. Options, in order of effort:
- Verify **Play Integrity** is correctly configured (SHA-256 keys in Firebase console) — misconfiguration forces slower fallback flows.
- Set Firebase **SMS region policy** to allow only your target countries (reduces routing hops).
- If India latency remains poor, move OTP to a dedicated provider (MSG91 / Twilio Verify) via your existing backend (`server/src`), keeping Firebase only for session identity.

### Cleanup
Three parallel login implementations exist (`OnboardingScreen`, `LoginScreen`, `PhoneEntryScreen`) with duplicated OTP logic. Only one appears active — consolidate to avoid fixing the same bug three times.

---

## 2. Scribble Tool

**Files:** `screens/ScribbleScreen.tsx`, `scribbleConstants.ts`

### Bugs found
1. **Eraser is fake.** Eraser mode draws **white strokes** (`#FFFFFF`, width 24) — but the canvas background is `#E7E7EA` (grey). "Erasing" leaves visible white smears, and erased areas reappear as white bands in previews rendered on white. Fix options: (a) real erase — hit-test and remove intersecting paths; (b) stroke with the canvas background color everywhere it's rendered; (c) SVG masking. Option (a) is what users expect.
2. **Coordinate/size mismatch.** Strokes are recorded against the canvas `View` (flex:1 → actual height = screen minus header/toolbar/safe-area, varies per device), but all previews assume `SCRIBBLE_CANVAS_HEIGHT = SH * 0.72`. The SVG is `absoluteFill` (top-left anchored) inside a centered container. Result: drawings render offset/scaled wrong on devices where the real canvas ≠ SH*0.72. The measured layout is already captured in `canvasLayout` ref — but never used. Fix: size the canvas to exactly the shared constants, or record the real measured size with each page and use it as the viewBox.
3. **Lag with many strokes.** Every finger move triggers a state update that re-renders **all** saved paths. Fix: memoize the saved-paths layer (`React.memo`), render the in-progress stroke on its own layer. For a real fix, migrate to `@shopify/react-native-skia` (60fps drawing, proper eraser blend modes).
4. **`pageId!` non-null assertion** in `doSave` — journal mode with a missing `pageId` silently saves a page with `id: undefined`.
5. Strokes keep recording when the finger leaves the canvas bounds — no clipping.

---

## 3. Audio Recording

**Files:** `screens/WriteEntryScreen.tsx`, `screens/NoteEditorScreen.tsx`, `components/VoiceWidgets.tsx`, `components/guided/AudioField.tsx`

### Current behavior vs. requested
- **Journal (WriteEntryScreen): only ONE voice note per entry.** `voiceNoteUrl` is a single string; a new recording **silently overwrites** the previous one (`setVoice(u)` at line ~295). This directly blocks "add an additional recording as a new record."
- **Notes (NoteEditorScreen): multiple clips supported**, but always **appended to the end** of `audio[]`, and all clips render in one fixed block above the body — never at the cursor.

### Recommended changes
1. **Journal:** change `voiceNoteUrl: string` → `voiceNotes: NoteAudio[]` (id + uri, same shape Notes uses). Keep reading the legacy field for old entries (migration on load). Each stop-recording appends a new record — never overwrites.
2. **Insert at cursor:** the note body is a WebView rich editor (`react-native-pell-rich-editor`), so position = caret position in HTML. Two viable approaches:
   - *Lighter:* on stop-recording, `richRef.insertHTML()` an audio-chip placeholder element (`<span data-audio-id="…">`) at the caret; render/play via the existing `VoiceWidget` when displaying, keyed by id. Clips whose placeholder is deleted fall back to the top block.
   - *Cleaner (bigger refactor):* move note content to an ordered block model (text / audio / sketch / image blocks) so any attachment can sit at any position. This also fixes sketch/photo placement permanently.
3. `stopRec` in WriteEntryScreen has **no try/catch** — `stopAndUnloadAsync()` throws if the recorder was interrupted (phone call, mic grabbed by another app) → unhandled rejection. Wrap it like NoteEditorScreen already does.
4. `expo-av` is **deprecated** — plan migration to `expo-audio` (SDK 54 supports it) before it's removed in a future SDK.

---

## 4. Stickers (pinch-to-zoom + rotation)

**Files:** `components/guided/StickerLayer.tsx`, `screens/WriteEntryScreen.tsx` (local `Sticker` component, line ~98)

### Finding: the feature already exists — but only on one screen
- `StickerLayer.tsx` (used by **GuidedEntryScreen**) already implements exactly what was requested: 1-finger drag, **2-finger pinch resize (0.4×–4×)**, **rotation gesture**, long-press-to-delete — via `Gesture.Simultaneous(hold, tap, pan, pinch, rotate)`.
- **WriteEntryScreen** (freestyle journal — likely where the issue was reported) has its own **older duplicate** `Sticker` component: pinch ✅ but **no rotation gesture**, and its `onCommit(id, x, y, scale)` signature **drops rotation entirely**, so even a saved rotation can never change.

### Fix (small)
Delete the local `Sticker` component in WriteEntryScreen and render the shared `StickerLayer` instead; extend `onStickerCommit` to accept + persist `rotation`. `StickerPlacement` already has a `rotation` field and `StaticStickerLayer` already renders it read-only — so display code needs no changes. This gives Blur-style smooth two-finger scale+rotate on both screens with less code.

Boards module (`BoardCanvas.tsx`) renders element rotation but has no gesture to change it — same shared-layer approach applies if boards need it too.

---

## 5. App Crashes

### No crash reporting exists today
No Crashlytics, no Sentry. The app-level `ErrorBoundary` only does `console.error` — JS errors vanish, and **native crashes are never captured at all**. Random crashes can't be root-caused without this.

**Step 1 (do first):** add `@react-native-firebase/crashlytics` — you're already on RN-Firebase 22, so it's one dependency + config plugin, no new vendor.
- Report boundary catches: `crashlytics().recordError(error)` in `ErrorBoundary.componentDidCatch`.
- Add a global JS handler (`ErrorUtils.setGlobalHandler`) and log unhandled promise rejections.
- Set `crashlytics().setUserId(userId)` at login for per-user traces.

### Crash-risk findings from the code
1. **Dual Firebase SDKs installed and used**: both `firebase` (JS SDK 11) and `@react-native-firebase/*` (native). Two auth/firestore stacks in one binary — bloat, config drift, and subtle native init conflicts. Consolidate on `@react-native-firebase`.
2. **`expo-av` deprecated** on SDK 54 — known source of native audio session crashes when interrupted; migrate to `expo-audio`.
3. **Unguarded `stopAndUnloadAsync()`** in WriteEntryScreen (see §3.3).
4. **WebView + gesture-handler** on NoteEditorScreen — already patched with a scoped `GestureHandlerRootView` (good), but this combination is fragile; watch it in crash logs.
5. Bleeding-edge combo (React 19.1 + RN 0.81 + Reanimated 4.1 + worklets 0.5) — keep Reanimated/worklets patch versions current; sticker gesture worklets are the most likely native-crash surface.

Once Crashlytics has been live in a build for a few days, prioritize fixes from actual stack traces rather than guessing.

---

## Suggested priority order

| # | Item | Effort | Impact |
|---|------|--------|--------|
| 1 | Crashlytics + global error handlers | S | Unblocks crash diagnosis |
| 2 | OTP auto-verification handling (`onAuthStateChanged`) | S | Fixes "6–7s expiry" |
| 3 | Sticker rotation on WriteEntryScreen (reuse StickerLayer) | S | Feature parity, code deletion |
| 4 | Journal multi-voice-note (array + migration) | M | Requested feature |
| 5 | Scribble eraser (real erase) + canvas size fix | M | Visible bug |
| 6 | Audio insert-at-cursor (insertHTML chip) | M | Requested feature |
| 7 | expo-av → expo-audio migration; drop `firebase` JS SDK | M/L | Crash reduction |
