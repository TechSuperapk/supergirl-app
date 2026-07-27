# Super Bae — OTP SMS for Public Launch (India DLT + MSG91)

**Goal:** send login OTP SMS to **any** Indian number (not just test numbers).
**Reality:** India (TRAI) legally requires **DLT registration** for all business SMS.
No provider — AWS SNS, MSG91, Twilio — can skip it. MSG91 just makes it easier.

**Timeline:** ~3–7 working days (DLT approvals are the slow part).
**You need:** business docs — **GST certificate, PAN, and an authorised-person ID**.

While this is pending, keep testing with **AWS SNS sandbox verified numbers**
(already working) — no DLT needed for those.

---

## Phase 1 — DLT registration (the legal part, done once)

Do this on **one** DLT operator portal (they share a common registry):
- Airtel — https://dltconnect.airtel.in
- Jio — https://trueconnect.jio.com
- Vi (Vodafone-Idea) — https://www.vilpower.in

### 1.1 Register as a Principal Entity (PE)
- Sign up → choose **Enterprise / Principal Entity**.
- Enter business name, **GST**, **PAN**.
- Add the authorised person + upload documents (GST cert, PAN, authorisation letter).
- Pay the registration fee (varies by operator; often a small refundable deposit).
- On approval you get your **Entity ID (PE ID)** — a ~19-digit number. **Save it.**

### 1.2 Register a Header (Sender ID)
- In the portal → **Headers** → **Register new header**.
- Type: **Transactional / Service** (for OTP).
- Enter a 6-character header, e.g. **`SUPBAE`**.
- Submit → operator approves (~1–2 days). **Save the approved header.**

### 1.3 Register a Content Template
- Portal → **Content Templates** → **Register new**.
- Category: **Service Implicit** (OTP) or **Transactional**.
- Link it to your header (`SUPBAE`).
- Content (paste exactly — the `{#var#}` is where the code goes):
  ```
  Your Super Bae verification code is {#var#}. It expires in 5 minutes.
  ```
- Submit → on approval you get a **DLT Template ID (TE ID)**. **Save it.**

> The SMS the server sends must match this template word-for-word (only the code
> changes). Our backend already sends exactly this text.

---

## Phase 2 — Set it up in MSG91

### 2.1 Add your Sender ID
- MSG91 → **Sender Id** → add **`SUPBAE`** with your **Entity ID (PE ID)**.

### 2.2 Create the template in MSG91
- MSG91 → **Templates** → **Create Template**.
- Paste the same content, with one variable:
  ```
  Your Super Bae verification code is ##otp##. It expires in 5 minutes.
  ```
  (MSG91's variable syntax — name the variable **`otp`**.)
- Link it to your DLT header + DLT Template ID.
- On save you get an **MSG91 Template ID**. **Save it.**

### 2.3 Get your Auth Key
- MSG91 → top-right menu / **Settings → API** → copy the **Auth Key**. **Save it.**

You should now have **4 values**:
1. MSG91 **Auth Key**
2. MSG91 **Template ID**
3. **Sender ID** (`SUPBAE`)
4. Variable name (`otp`)

---

## Phase 3 — Plug it into the backend

The code is already written; it uses MSG91 automatically once these env vars exist.

**a) Add the values on the server** (SSH in, then):
```bash
cd ~/supergirl-app/server
printf 'MSG91_AUTHKEY=YOUR_AUTH_KEY\nMSG91_TEMPLATE_ID=YOUR_TEMPLATE_ID\nMSG91_SENDER_ID=SUPBAE\nMSG91_OTP_VAR=otp\n' >> .env
```

**b) Pull the latest code + rebuild + restart:**
```bash
cd ~/supergirl-app
git checkout -- server/src/services/weatherService.ts
git pull
cd server
npm install
npm run build
pm2 restart superbae-api
```

**c) Test to a REAL (non-sandbox) number:**
```bash
curl -s -X POST https://api.superbae.app/api/auth/otp/send -H "Content-Type: application/json" -d "{\"phone\":\"+91XXXXXXXXXX\"}"
```
→ `{"ok":true}` and the SMS arrives via MSG91.

---

## Phase 4 — Go live
- Test login end-to-end in the app with a few real numbers.
- Watch **MSG91 → Logs** for delivery status.
- Rebuild the app if needed and ship.

---

## Quick reference — what goes in `.env`
```
# MSG91 (India OTP)
MSG91_AUTHKEY=...
MSG91_TEMPLATE_ID=...
MSG91_SENDER_ID=SUPBAE
MSG91_OTP_VAR=otp
```
When `MSG91_AUTHKEY` is set, OTP texts go through MSG91; otherwise the backend
falls back to AWS SNS (sandbox) automatically.

---

## Costs & notes
- DLT: one-time registration; small per-operator fee/deposit.
- MSG91: pay per SMS (roughly ₹0.15–0.25 per transactional SMS in India).
- Approvals (Entity, Header, Template) take a few days — start Phase 1 today.
- MSG91 **Support** (bottom-left of their panel) will help with DLT + templates.
