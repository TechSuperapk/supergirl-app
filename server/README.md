# SuperGirl Journal Backend

Express + TypeScript + MongoDB backend for the Journal module. Provides:

- `POST /api/auth/verify` — exchange a Firebase Phone-Auth ID token for a session JWT (creates/updates the Mongo `User` on first login).
- `GET /api/auth/me`, `PATCH /api/auth/me` — profile.
- `GET/POST /api/journal`, `GET/PATCH/DELETE /api/journal/:id`, `PATCH /api/journal/:id/favorite` — journal entries, scoped to the authenticated user. Supports `?search=`, `?category=`, `?mood=`, `?isFavorite=`, `?isDraft=`, `?since=<ISO date>` (for incremental sync), `?limit=`, `?offset=`.
- Same CRUD shape under `/api/notes` for Quick Notes.

Image/video uploads stay on **Firebase Storage** — the app uploads media directly to Firebase Storage as it does today and only sends the resulting URL to this API.

## Setup

```bash
cd server
npm install
cp .env.example .env
```

Fill in `.env`:

- `MONGODB_URI` — your MongoDB Atlas (or self-hosted) connection string.
- `JWT_SECRET` — any long random string (used to sign session tokens).
- `FIREBASE_SERVICE_ACCOUNT_JSON` — paste the full contents of a Firebase service-account key (Firebase Console → Project Settings → Service Accounts → Generate new private key) for the **super-bae** project, as one line. Or set `FIREBASE_SERVICE_ACCOUNT_PATH` to point at the downloaded `.json` file instead (keep it out of git — already in `.gitignore`).

Run it:

```bash
npm run dev      # ts-node-dev, auto-reload
npm run build && npm start   # compiled build
```

Health check: `GET http://localhost:4000/health`

## Auth flow

1. RN app signs the user in with Firebase Phone Auth (native `@react-native-firebase/auth`, since JS-SDK phone auth needs a reCAPTCHA web view that doesn't work well in Expo/dev-client builds).
2. App gets the Firebase ID token (`user.getIdToken()`).
3. App calls `POST /api/auth/verify` with `{ idToken }`.
4. Server verifies the token with Firebase Admin, upserts the Mongo `User`, returns `{ token, user }` — `token` is this backend's own JWT, used as `Authorization: Bearer <token>` on every other endpoint.

## Notes on data model

- `JournalEntry`/`Note` use the **same id the client generates** (uuid) as Mongo's `_id`, so an entry created offline and later synced keeps one consistent id everywhere (RN state, MMKV queue, Mongo).
- Deletes are soft (`deletedAt` timestamp) so a client that was offline during a delete still learns about it via `?since=`.
- `POST /api/journal` and `POST /api/notes` are upserts (safe to retry from an offline queue without creating duplicates).
