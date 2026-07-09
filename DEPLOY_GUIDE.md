# Deploying the backend + building real Android/iOS apps

Every account you need, from scratch, with exactly what to click and exactly
what to paste where. Do these in order — later steps need values from earlier
ones.

---

## 1. MongoDB Atlas (the database) — free

1. Go to https://www.mongodb.com/cloud/atlas/register and sign up (Google sign-in is fastest).
2. It asks to create an organization/project — accept the defaults, click through.
3. **Deploy a cluster** → choose the **M0 Free** tier → pick any region close to you → **Create**. Takes 1–3 minutes to provision.
4. A "Security Quickstart" panel appears:
   - **Username/Password** auth → set a username and password (or click generate) → **SAVE THIS PASSWORD**, you need it in step 5.
   - **Where would you like to connect from?** → choose **Allow access from anywhere** (`0.0.0.0/0`) → **Add Entry**. (Required — Render's servers don't have a fixed IP.)
   - Click **Finish and Close**.
5. Once the cluster shows "Active": click **Connect** on the cluster → **Drivers** → language **Node.js**. It shows a string like:
   ```
   mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
6. Copy it, replace `<username>` and `<password>` with your real ones from step 4, and insert a database name right after `.net/`:
   ```
   mongodb+srv://myuser:mypassword@cluster0.xxxxx.mongodb.net/supergirl_journal?retryWrites=true&w=majority
   ```
   **This full string is your `MONGODB_URI`** — paste it in Render (step 6 below).

---

## 2. Firebase service account key (lets the backend verify OTP logins)

Your app already uses a Firebase project called **super-bae** — you're not
creating a new one, just pulling a key out of it.

1. Go to https://console.firebase.google.com and open the **super-bae** project.
2. Click the ⚙️ gear icon (top-left, next to "Project Overview") → **Project settings**.
3. Click the **Service accounts** tab.
4. Click **Generate new private key** → confirm in the popup → a `.json` file downloads (e.g. `super-bae-firebase-adminsdk-xxxxx.json`).
5. Open that file in any text editor, select all, copy the entire contents.
   **This is your `FIREBASE_SERVICE_ACCOUNT_JSON`** — paste it in Render (step 6 below), as one block (keep it exactly as downloaded, don't reformat it).

Keep the downloaded file somewhere safe and never commit it to git (it already can't be, via `.gitignore`).

---

## 3. Firebase iOS config file (missing — blocks iOS builds until added)

1. Same Firebase console, **super-bae** project → **Project settings** → **General** tab.
2. Scroll to **Your apps**. Look for an iOS app.
   - **If none exists:** click **Add app** → iOS icon → for "Apple bundle ID" enter exactly `com.supergirl.app` → **Register app**.
   - **If one already exists:** click it.
3. Click **Download GoogleService-Info.plist**.
4. Put that downloaded file at the root of the project folder — same folder as `app.json`, i.e.:
   `D:\SuperGirl_Production\supergirl_prod\GoogleService-Info.plist`
   (If you drop it in the outputs/uploads area instead and tell me, I'll move it into place for you.)

---

## 4. GitHub (so Render can pull your code)

1. Go to https://github.com and sign up if you don't have an account.
2. Click **+** (top right) → **New repository**. Name it (e.g. `supergirl-app`), keep it **Private**, do **not** check "Add a README" → **Create repository**.
3. GitHub shows a repo URL like `https://github.com/<you>/supergirl-app.git` — copy it.
4. On your own computer (not in this chat — this needs to run on your real machine's terminal, it was too slow through my sandbox), inside the project folder:
   ```bash
   cd D:\SuperGirl_Production\supergirl_prod
   git rm -r --cached node_modules
   git add .
   git commit -m "Stop tracking node_modules; add deploy config"
   git remote add origin https://github.com/<you>/supergirl-app.git
   git branch -M master
   git push -u origin master
   ```
5. If `git push` asks for a password and rejects it: GitHub no longer accepts your account password there. Either install **GitHub Desktop** (github.com/desktop) and push through its UI instead (easiest), or create a Personal Access Token: GitHub → your profile photo → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token** (check the `repo` box) → use that token as the password when prompted.

---

## 5. Render (hosts the backend) — free

1. Go to https://render.com → **Get Started** → sign up with **GitHub** (simplest — it grants repo access automatically).
2. Dashboard → **New** → **Blueprint**.
3. Pick the `supergirl-app` repo from step 4. Render reads `render.yaml` (already in the repo) and shows one service to create: `supergirl-journal-api`.
4. It'll prompt you for two values it can't guess — this is where steps 1 and 2 go:
   | Field in Render | What to paste |
   |---|---|
   | `MONGODB_URI` | the full connection string from step 1.6 |
   | `FIREBASE_SERVICE_ACCOUNT_JSON` | the entire file contents from step 2.5 |
5. Click **Apply** / **Create Web Service**. Wait for the build log to finish and the status dot to turn green ("Live") — a few minutes.
6. Copy the URL shown at the top of the service page, e.g. `https://supergirl-journal-api.onrender.com`.
7. Check it worked: open `https://supergirl-journal-api.onrender.com/health` in a browser — you should see `{"ok":true,...}`.

Free tier note: it sleeps after 15 minutes idle and takes ~30–60s to wake up on the next request — the first request after a lull will feel slow, that's normal.

---

## 6. Point the app at your backend

Open `eas.json` in the project and replace all three occurrences of
`https://REPLACE-WITH-YOUR-RENDER-URL.onrender.com/api` with your real URL
from step 5.6 + `/api`, e.g.:
```
https://supergirl-journal-api.onrender.com/api
```
(Paste me your Render URL and I'll make this edit for you.)

---

## 7. EAS build (you said you already have an Expo account)

On your computer:
```bash
npm install -g eas-cli
eas login
```
Log in with your existing Expo account. The project is already linked to an
EAS project (id is already in `app.json`), so no extra setup needed.

Android (installable APK, works on any Android phone):
```bash
eas build --profile development --platform android
```

iOS (Simulator build — no paid Apple Developer account needed):
```bash
eas build --profile development --platform ios
```

(A real iOS *device* build instead of Simulator needs a paid Apple Developer
account, $99/year, for provisioning — say the word if/when you want that.)

When each build finishes, EAS prints a link/QR code:
- **Android**: open the link on the phone itself → it downloads and lets you install the APK directly.
- **iOS**: downloads a Simulator build → drag the file onto a running iOS Simulator window (needs a Mac with Xcode's Simulator installed).

---

## 8. Test end-to-end

1. Open the installed app → enter a real phone number → you should get a real SMS code.
2. Enter the code → app exchanges the Firebase token for a session with your Render backend, creating a `User` in MongoDB.
3. Create a journal entry with a photo → check it shows up in MongoDB Atlas (Browse Collections → `supergirl_journal` → `journalentries`) and the photo lands in Firebase Storage.
4. Airplane mode → edit/create another entry → turn WiFi back on → it should sync within ~30s.
5. Close and reopen the app → entries should still be there, pulled from the backend, not just local cache.

---

## Quick reference — what goes where

| Value | Comes from | Goes into |
|---|---|---|
| MongoDB connection string | Atlas → Connect → Drivers | Render env var `MONGODB_URI` |
| Firebase service account JSON | Firebase Console → Project settings → Service accounts | Render env var `FIREBASE_SERVICE_ACCOUNT_JSON` |
| `GoogleService-Info.plist` | Firebase Console → Project settings → iOS app | Project root folder (next to `app.json`) |
| Render backend URL | Render service page, after first deploy | `eas.json`, all 3 `EXPO_PUBLIC_API_BASE_URL` placeholders |
