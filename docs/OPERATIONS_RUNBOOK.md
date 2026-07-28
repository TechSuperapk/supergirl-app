# Super Bae — Operations Runbook

Everything you need to run, deploy, and recover the app after the Firebase → AWS
migration. Keep this up to date.

---

## 1. Architecture at a glance

| Layer | What / Where |
|---|---|
| **Mobile app** | React Native (Expo SDK 54, TypeScript). Built with EAS. |
| **Backend API** | Express + TypeScript on **EC2** (Ubuntu 24.04, Mumbai `ap-south-1`), run by **PM2**, fronted by **Nginx** with HTTPS. |
| **Public API URL** | `https://api.superbae.app` → Nginx → `localhost:4000` |
| **Database** | **MongoDB Atlas** (Mumbai). DB name: `test`. |
| **File storage** | **Amazon S3** bucket `superbae-media` (`ap-south-1`), public-read objects. |
| **Auth** | Phone **OTP via Amazon SNS** → backend issues a **JWT** session. (Switches to **MSG91** once DLT is approved.) |
| **Monitoring** | **Sentry** (org `space-and-beauty-creations-pri`, project `react-native`). |
| **Backups** | Nightly `mongodump` → `s3://superbae-media/backups/mongo/`. |
| **CI/CD** | GitHub Actions auto-deploys the backend on push to `master`. |

**No Firebase.** (A legacy `/auth/verify` route + `firebase-admin` remain unused; safe to remove later.)

---

## 2. Server access

```
Region:   ap-south-1 (Mumbai)
EC2 IP:   43.205.104.77   (Elastic IP)
SSH:      ssh -i superbae-key-mumbai.pem ubuntu@43.205.104.77
App path: ~/supergirl-app  (backend in ~/supergirl-app/server)
Process:  pm2 (name: superbae-api)
```
Useful PM2 commands:
```
pm2 status
pm2 logs superbae-api --lines 30
pm2 restart superbae-api
```

---

## 3. Deploying

### Backend (automatic)
Just push backend changes to `master` — **GitHub Actions deploys automatically**
(git sync → npm install → build → pm2 restart). Watch the repo's **Actions** tab.
You can also trigger it manually: Actions → "Deploy backend to EC2" → Run workflow.

Manual deploy (if ever needed):
```
cd ~/supergirl-app && git fetch origin master && git reset --hard origin/master
cd server && npm install && npm run build && pm2 restart superbae-api
```

### Mobile app
```
eas build -p android --profile preview      # test APK
eas build -p android --profile production   # Play Store AAB
```
The app reads its API URL + Sentry DSN from `eas.json` env.

---

## 4. Environment variables

### Backend `~/supergirl-app/server/.env` (NOT in git)
```
PORT=4000
NODE_ENV=production
CLIENT_ORIGIN=*
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/test?...
JWT_SECRET=<long random>
JWT_EXPIRES_IN=30d
AWS_REGION=ap-south-1
OTP_TTL_MINUTES=5
S3_BUCKET=superbae-media
# When MSG91 DLT is ready:
# MSG91_AUTHKEY=...   MSG91_TEMPLATE_ID=...   MSG91_SENDER_ID=SUPBAE   MSG91_OTP_VAR=otp
```

### App (`eas.json`, per profile)
```
EXPO_PUBLIC_API_BASE_URL = https://api.superbae.app/api
EXPO_PUBLIC_SENTRY_DSN   = https://...ingest.de.sentry.io/...
```
Build-time secret (EAS): `SENTRY_AUTH_TOKEN` (for source-map upload).

### GitHub Actions secrets
`EC2_HOST`, `EC2_USER`, `EC2_SSH_KEY` (the `.pem` contents).

---

## 5. Auth flow (how login works now)
1. App sends phone → `POST /api/auth/otp/send` → backend generates a 6-digit code, stores it hashed (5-min TTL), texts it via **SNS** (or MSG91).
2. App sends code → `POST /api/auth/otp/verify` → backend checks it, upserts the user in Mongo, returns a **JWT**.
3. App stores the JWT (secure-store) and sends it as `Authorization: Bearer <jwt>` on every call.

Rate limits: OTP send 5 / 15 min, verify 15 / 15 min, global 600 / 15 min (per IP).

---

## 6. Backups & restore

**Backups run nightly at 03:00** (`~/backup-mongo.sh`, cron) → `s3://superbae-media/backups/mongo/`.

Run one manually:
```
~/backup-mongo.sh
```

**Restore into a scratch DB (safe — doesn't touch production):**
```
LATEST=$(aws s3 ls s3://superbae-media/backups/mongo/ --region ap-south-1 | sort | tail -1 | awk '{print $4}')
aws s3 cp "s3://superbae-media/backups/mongo/$LATEST" /tmp/r.gz --region ap-south-1
URI=$(grep '^MONGODB_URI=' ~/supergirl-app/server/.env | cut -d= -f2-)
mongorestore --uri="$URI" --gzip --archive=/tmp/r.gz --nsFrom='test.*' --nsTo='restore_test.*'
```
To restore over production (disaster recovery), drop the `--nsFrom/--nsTo` (⚠️ overwrites live data).

---

## 7. Storage (S3)
- Bucket `superbae-media`, region `ap-south-1`, objects public-read, CORS allows PUT/GET.
- App uploads via presigned URL: `POST /api/media/upload-url` → PUT to S3 → stores the public URL.
- Files are namespaced by user id: `<userId>/journal_media/...`, `<userId>/club/...`, etc.

---

## 8. Monitoring & security
- **Sentry** captures crashes + errors, tagged with user id; source maps make traces readable.
- **fail2ban** bans SSH brute-forcers (`sudo fail2ban-client status sshd`).
- **unattended-upgrades** auto-applies OS security patches.
- **Node 22** on the server.
- SSH is open to the internet (for CI/CD) but **key-only** (no passwords).

---

## 9. Health checks
```
curl https://api.superbae.app/health       # {"ok":true,...}
curl https://api.superbae.app/health/db     # {"ok":true,"mongo":"connected",...}
```

---

## 10. Outstanding TODOs
- **DLT / MSG91** production SMS (needs GST/PAN docs) — until then, add testers as SNS **verified sandbox numbers**.
- **Push notifications** — was Firebase FCM; not yet re-enabled.
- Optionally remove the unused legacy Firebase `/auth/verify` route + `firebase-admin`.
- Optionally tighten SSH (currently open to the internet for CI/CD).
