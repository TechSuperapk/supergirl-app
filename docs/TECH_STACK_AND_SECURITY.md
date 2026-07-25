# Super Bae — Tech Stack, Storage, Security & Authentication

_Project: **super-bae** · Android package / iOS bundle: **com.supergirl.app** · Repo: github.com/TechSuperapk/supergirl-app_

---

## 1. Technology Stack

### Mobile app (frontend)
| Area | Technology |
|------|-----------|
| Framework | **React Native 0.81.5**, **React 19.1**, **Expo SDK 54**, **TypeScript** |
| Build | Custom dev client (`expo-dev-client`) + native `android/` project; iOS via EAS. **Not** Expo Go for production. |
| Navigation | **React Navigation** — native-stack + bottom-tabs (not Expo Router) |
| State management | **Redux Toolkit** (app/auth/journal state) + **Zustand** + **@tanstack/react-query** |
| UI / animation | react-native-reanimated, react-native-gesture-handler, react-native-svg |
| Media | expo-image, expo-av, expo-image-picker, react-native-webview (Razorpay checkout) |
| Voice | expo-speech-recognition (voice-to-text in journals) |
| Fonts | DM Sans (static weight files + variable font) |
| Notifications | expo-notifications + Firebase Cloud Messaging (FCM) |
| Crash reporting | @react-native-firebase/crashlytics |

### Backend (server/)
| Area | Technology |
|------|-----------|
| Runtime / framework | **Node.js + Express** |
| Database | **MongoDB Atlas** via **Mongoose** |
| Auth | **jsonwebtoken** (session JWTs) + **firebase-admin** (verifies Firebase ID tokens) |
| Validation | **zod** |
| Security middleware | **helmet**, **cors**, **morgan** (logging) |
| Scheduled jobs | **node-cron** (e.g. daily "Outfit of the Day") |
| Hosting | Render — `https://supergirl-journal-api.onrender.com/api` |

### Firebase (project: super-bae)
| Service | Usage |
|---------|-------|
| @react-native-firebase/auth (native) | **Phone OTP** sign-in (real SMS) |
| Firestore (JS SDK) | Realtime sync / mirror for journals, club, trackers, fits, boards |
| Firebase Storage | User & outfit/clothing images (`super-bae.firebasestorage.app`) |
| Cloud Messaging (FCM) | Push notifications |
| Crashlytics | Crash/error monitoring |

### Server-side integrations (keys never in the app)
OpenAI GPT-4o Vision (clothing detection / outfit suggestions), remove.bg / ClipDrop (background removal), OpenWeather, **Razorpay** (payments), FCM — all called **through the backend**, never directly from the client.

---

## 2. Storage Architecture

**Primary data store — MongoDB Atlas (via backend API).**
Journals are saved through `POST /journal` (and `PATCH`/`DELETE`) authenticated by the session JWT. This is the source of truth.

**Firestore (super-bae) — realtime mirror + feature data.**
Collections in use:
- `users` (+ subcollections `journals`, `reminders`, `templates`, `backups`), `journal_entries`, `journal_drafts`, `journal_backups`
- `boards`, `subscriptions`, `vaults`, `admins`
- `trackers_mood / sleep / habits / habit_logs / period / health / expenses / milestones`
- `fits_wardrobe / fits_outfits / fits_planner / fits_trips / fits_settings / fits_analytics_cache / fits_ootd`
- `club_posts / comments / events / tickets / groups / group_messages / communities / community_members / drafts`

**Firebase Storage** — image & media blobs (profile, outfits, journal photos).

**On-device storage:**
| Store | Purpose |
|-------|---------|
| **expo-secure-store** | Session JWT + vault PIN (credentials — encrypted) |
| **MMKV** | Offline-first backup store / sync queue |
| **expo-sqlite** | Local structured data |
| **AsyncStorage** | Firebase Auth persistence, quick notes, misc |
| RichJournals local store | Instant offline hydrate of journals before sync |

The app is **offline-first**: journals hydrate from the local store instantly, then a background sync reconciles with the server; offline edits are queued and retried.

---

## 3. Security Model

- **Transport:** HTTPS/TLS everywhere (Render backend + Firebase SDKs).
- **Backend hardening:** `helmet` security headers, `cors`, request logging (`morgan`), `zod` input validation on every route.
- **Server-verified auth:** the backend uses `firebase-admin` to verify the Firebase phone-OTP **ID token server-side** before minting its own **session JWT**. The client never trusts itself.
- **Session tokens:** stored in **expo-secure-store** (OS keystore/keychain), attached as `Authorization: Bearer <jwt>` by `apiClient`.
- **No secrets in the app:** OpenAI / remove.bg / OpenWeather / Razorpay keys live **only** on the server; the client hits server proxy endpoints.
- **Payments:** Razorpay order is created **and its HMAC signature verified server-side** before a ticket is issued (pay → then create).
- **Firestore Security Rules** (`firestore.rules`): every read/write requires `request.auth != null`; documents are **owner-only** (`request.auth.uid == resource.data.userId`); profile docs are private to the owner; tickets are non-editable after creation; only the default community is client-creatable; club counters are the only fields regular clients may update.
- **Private journals / Vault:** PIN-gated, PIN stored hashed (verified via `verifyVaultSecret`), plus an `isPrivate` flag that hides entries from public lists.
- **Monitoring:** Crashlytics tags reports with the signed-in user id.

---

## 4. Authentication Flow

**Method in use:** Phone number + OTP (SMS). No email/Google/password today.

```
Splash  →  Onboarding (phone entry)  →  OTP screen  →  Profile setup*  →  App
                                                      (*only if no name yet)
```

Step by step:
1. **Splash** shows the SuperBae logo, then checks the persisted login state.
2. **Onboarding / phone entry** — user picks a country code (+91 default) and enters their number, taps **Get OTP**.
3. **Send OTP** — `@react-native-firebase/auth` → `signInWithPhoneNumber(phone)` sends a real SMS. (Android may auto-verify silently; that path logs the user in directly.)
4. **OTP screen** — user enters the 6-digit code → `confirmation.confirm(code)` returns a Firebase user.
5. **Backend exchange** — the app gets the Firebase **ID token** (`getIdToken()`) and calls `POST /auth/verify`. The server verifies it with `firebase-admin` and returns a **backend session JWT** + user profile.
6. **Persist session** — JWT saved to secure-store; `apiClient` now attaches it as a Bearer token on every backend call.
7. **Enter app** — Redux `loginSuccess` sets `isLoggedIn`; the root navigator routes to profile setup (if the user has no name yet) or straight into the app.
8. **Guest "Skip"** — a Skip option signs in a local guest user and enters the app without phone auth (no cloud account).
9. **Logout** — clears the secure-store JWT and resets state back to onboarding.

### Known architectural note (important for cloud sync)
OTP signs in the **native** Firebase SDK, while the app's Firestore realtime layer uses the **JS** Firebase SDK (`db`) — two separate auth sessions. Core data still saves because journals persist through the **backend API (JWT)**. However, the **Firestore realtime mirror** can hit "permission denied" under the security rules until the two sessions are **bridged** (e.g. the backend mints a Firebase custom token and the JS SDK signs in with it). This bridge is optional but recommended if you want full realtime Firestore sync.

---

## 5. To Go Live (Android) — checklist
1. Firebase Console → Authentication → **enable Phone** sign-in.
2. Add the build's **SHA-1 & SHA-256** (from `eas credentials`) to the Android app, then **re-download `google-services.json`** (currently `oauth_client` is empty — OTP won't work until this is done).
3. Enable the **Play Integrity API**.
4. Blaze plan for higher SMS volume (Spark works for low volume).
5. Build: `eas build -p android --profile preview` (APK) or `--profile production` (AAB for Play).
