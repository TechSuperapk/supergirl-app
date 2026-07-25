# Super Bae — Full Migration to AWS (off Firebase)

**Target architecture**
- **Compute:** Express backend on **EC2** (Ubuntu, Node + PM2 + Nginx + HTTPS)
- **Database:** **MongoDB Atlas** (kept as-is)
- **Auth / OTP:** **Amazon SNS SMS** + your own backend OTP + JWT (replaces Firebase Phone Auth)
- **File storage:** **Amazon S3** + **CloudFront** (replaces Firebase Storage)
- **Realtime:** **Socket.IO on EC2** (replaces Firestore realtime listeners)
- **Push:** **Amazon SNS Mobile Push** (or keep FCM — see notes)
- **Crash/monitoring:** **Sentry + CloudWatch** (replaces Crashlytics)

> Reality check: Android push notifications still ultimately go through Google's FCM transport even when wrapped by SNS — there is no way around that on Android. Everything else moves fully to AWS.

---

## What replaces what

| Firebase service (today) | AWS replacement | Client change needed |
|---|---|---|
| Phone OTP (`@react-native-firebase/auth`) | Backend `/auth/otp/send` + `/auth/otp/verify` using **Amazon SNS** | Rewrite OTP screen to call your API instead of Firebase |
| Firebase ID-token verify (`firebase-admin`) | Backend issues & verifies its **own JWT** | None (already uses a session JWT) |
| Firestore (realtime mirror) | **MongoDB Atlas** + **Socket.IO** | Replace `onSnapshot` listeners with socket events / polling |
| Firebase Storage | **S3** via backend **presigned URLs** + CloudFront | Upload via presigned URL instead of Firebase SDK |
| FCM push | **SNS Mobile Push** (or keep FCM) | Register device token with backend → SNS |
| Crashlytics | **Sentry** | Swap SDK |

---

## Phase 0 — Prerequisites
- An AWS account (with a payment method).
- A domain name (for HTTPS on the API, e.g. `api.superbae.app`).
- Your MongoDB Atlas connection string.
- Local tools: AWS CLI v2, SSH client, Node 20.

---

## Phase 1 — AWS account foundations
1. **Create the account**, then **do not use the root user** for daily work.
2. **IAM** → create an admin IAM user for yourself, enable **MFA** on root + your user.
3. **Billing → Budgets** → create a monthly budget + alert (e.g. $50) so costs never surprise you.
4. Pick a **region** close to your users (e.g. `ap-south-1` Mumbai for India) and use it everywhere.
5. Install & configure the CLI:
   ```bash
   aws configure          # paste the IAM user's access key + region
   ```

---

## Phase 2 — Backend on EC2

### 2.1 Launch the instance
1. EC2 → **Launch instance**:
   - AMI: **Ubuntu Server 22.04 LTS**
   - Type: **t3.small** (start small; resize later)
   - **Key pair**: create one, download the `.pem`
   - **Security group** inbound rules:
     - SSH `22` → **My IP** only
     - HTTP `80` → Anywhere
     - HTTPS `443` → Anywhere
2. Allocate an **Elastic IP** and associate it (so the IP never changes).

### 2.2 Server setup (SSH in)
```bash
ssh -i superbae.pem ubuntu@<ELASTIC_IP>

# Node 20 + tools
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo npm i -g pm2

# App
git clone https://github.com/TechSuperapk/supergirl-app.git
cd supergirl-app/server
npm install
cp .env.example .env      # then edit (next step)
```

### 2.3 Backend `.env`
```
PORT=4000
MONGODB_URI=<your Mongo Atlas SRV string>
JWT_SECRET=<long random string>
AWS_REGION=ap-south-1
S3_BUCKET=superbae-media
SNS_SMS_SENDER_ID=SuperBae
SENTRY_DSN=<from Sentry>
RAZORPAY_KEY_ID=...
RAZORPAY_KEY_SECRET=...
# (OpenAI / weather keys stay here, server-side only)
```

### 2.4 Run with PM2
```bash
pm2 start dist/server.js --name superbae-api   # or: pm2 start npm --name superbae-api -- run start
pm2 save
pm2 startup systemd        # run the printed command so it survives reboot
```

### 2.5 Nginx reverse proxy + HTTPS
```bash
sudo nano /etc/nginx/sites-available/superbae
```
```nginx
server {
  server_name api.superbae.app;
  location / {
    proxy_pass http://localhost:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;      # needed for Socket.IO
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
  }
}
```
```bash
sudo ln -s /etc/nginx/sites-available/superbae /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Point your domain's A record → the Elastic IP first, then:
sudo snap install --classic certbot
sudo certbot --nginx -d api.superbae.app     # free auto-renewing SSL
```
Your API is now at `https://api.superbae.app`. Update the app's `EXPO_PUBLIC_API_BASE_URL` (in `eas.json`) to this.

---

## Phase 3 — Database (keep MongoDB Atlas)
1. Atlas → **Network Access** → add the EC2 **Elastic IP** to the allow-list (avoid `0.0.0.0/0`).
2. Confirm the `MONGODB_URI` in `.env` connects (check `pm2 logs superbae-api`).

---

## Phase 4 — File storage: S3 + CloudFront
1. **S3** → create bucket `superbae-media` → **Block all public access = ON** (serve via signed URLs only).
2. **IAM** → create a role for the EC2 instance with an inline policy allowing `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on that bucket; attach the role to the instance.
3. **CloudFront** → create a distribution with the S3 bucket as origin (Origin Access Control) for fast, cached image delivery.
4. **Backend**: add endpoints:
   - `POST /media/upload-url` → returns a **presigned PUT URL** (`@aws-sdk/s3-request-presigner`).
   - Client uploads the file straight to S3 with that URL, then stores the resulting CloudFront URL on the record.
5. **Client change**: replace Firebase Storage uploads (`getStorage`, `uploadBytes`) with: request a presigned URL → `fetch(PUT)` the file → save the CDN URL.

---

## Phase 5 — Auth / OTP with SNS (replaces Firebase Phone Auth)

### 5.1 Enable SMS
1. **Amazon SNS** → **Text messaging (SMS)** → move out of the **SMS sandbox** (request production access; for testing, add verified numbers).
2. Set a **monthly SMS spend limit** and a **sender ID** where supported.
3. Give the EC2 instance role `sns:Publish` permission.

### 5.2 Backend OTP endpoints (new)
- `POST /auth/otp/send { phone }`
  1. Generate a 6-digit code.
  2. Store `{ phone, codeHash, expiresAt (5 min), attempts:0 }` in a Mongo `otps` collection (hash the code).
  3. `SNS.publish({ PhoneNumber: phone, Message: "Your Super Bae code is 123456" })`.
- `POST /auth/otp/verify { phone, code }`
  1. Look up the record, check not expired, compare hash, limit attempts.
  2. On success: find-or-create the user in Mongo, **issue your JWT** (same as today), return `{ token, user }`.
  3. Delete the OTP record.

> This removes `firebase-admin` and the `/auth/verify` Firebase-token exchange entirely — your JWT stays exactly as the app already uses it, so the rest of the API is unchanged.

### 5.3 Client change (OTP screen)
Replace the `@react-native-firebase/auth` calls in `OnboardingScreen.tsx`:
- `Get OTP` → `POST /auth/otp/send`
- `Verify` → `POST /auth/otp/verify` → save the returned JWT (already in `sessionService`) → `loginSuccess`.
- Remove `@react-native-firebase/*`, `google-services.json`, and the Firebase plugins from `app.json` — **no more SHA fingerprints or Play Integrity needed.**

---

## Phase 6 — Realtime (replaces Firestore listeners)
The Club feed, comments, and journal sync currently use Firestore `onSnapshot`. Replace with **Socket.IO** on the same EC2 server:
1. Add `socket.io` to the backend; authenticate sockets with the JWT.
2. Emit events on writes (`post:new`, `comment:new`, `journal:update`) to the relevant rooms.
3. **Client**: replace `subscribeToJournalEntries` / club listeners with socket listeners.
4. Simpler fallback if you want less work first: **poll** the REST endpoints every few seconds instead of sockets, and add Socket.IO later.

---

## Phase 7 — Push notifications
- **Option A (fastest):** keep **FCM** just for transport — it's free and standard on Android.
- **Option B (AWS-native):** **SNS Mobile Push** / **Pinpoint** — register the device token with your backend, create an SNS platform endpoint, publish notifications. (Android still needs an FCM server key configured inside SNS.)

---

## Phase 8 — Monitoring & crash reporting
- **Sentry** in the RN app + backend (replaces Crashlytics).
- **CloudWatch** for EC2 metrics, Nginx/PM2 logs (`pm2 logs`), and alarms (CPU, disk, 5xx).
- `pm2 install pm2-logrotate` so logs don't fill the disk.

---

## Phase 9 — Deploy pipeline & ops
- **CI/CD:** GitHub Actions → on push to `main`, SSH to EC2, `git pull`, `npm ci`, `pm2 reload superbae-api`.
- **Backups:** MongoDB Atlas has automated backups; S3 versioning on the media bucket.
- **Security:** keep the SSH port locked to your IP, rotate the JWT secret, run `sudo unattended-upgrades`, put secrets in **AWS Secrets Manager** (not plain `.env`) once stable.
- **Scaling later:** front EC2 with an **Application Load Balancer** + Auto Scaling Group, move SSL to **ACM** on the ALB.

---

## Client-app change checklist (RN)
1. Remove `@react-native-firebase/app|auth|crashlytics`, `firebase`, `google-services.json`, and the Firebase entries in `app.json` plugins.
2. Rewrite the OTP screen to call `/auth/otp/*`.
3. Swap Firestore data/realtime for REST + Socket.IO.
4. Swap Firebase Storage uploads for S3 presigned URLs.
5. Swap Crashlytics for Sentry.
6. Point `EXPO_PUBLIC_API_BASE_URL` to `https://api.superbae.app`.
7. Rebuild with EAS (now with **no** Firebase native config to worry about).

---

## Rough effort & cost
- **Effort:** ~2–4 weeks of focused work (auth + storage + realtime rewrites are the bulk).
- **Cost (small scale):** EC2 t3.small ~$15/mo, S3+CloudFront a few $, SNS SMS per-message (~$0.02–0.05/SMS in India, varies), Atlas your current tier, Sentry free tier. Roughly **$25–40/mo** + SMS usage to start.

---

### Recommended order of execution
1. EC2 + Nginx + HTTPS + Mongo Atlas (get the current API running on AWS first).
2. Point the app at the new API, confirm everything still works **with Firebase still in place**.
3. S3 storage migration.
4. SNS OTP migration (remove Firebase auth).
5. Socket.IO realtime (remove Firestore).
6. Push + Sentry.
7. Remove all Firebase remnants, rebuild, ship.

Do it in that order so the app keeps working at every step instead of a risky big-bang cut-over.
