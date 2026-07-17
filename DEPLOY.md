# Deploying Vigno Smart Class to Render

This repo ships a [`render.yaml`](./render.yaml) **Blueprint** that provisions both
services from one file:

| Service | Type | What it runs |
|---|---|---|
| `vigno-smart-class-api` | Node web service | The Express API (`backend/`) |
| `vigno-smart-class-web` | Static site | The Vite/React SPA (`frontend/`) |

> **Current mode:** `NODE_ENV=staging` → the app boots with the **mock payment
> gateway** (no Razorpay needed yet), while JWT/HMAC secrets, HTTPS and secure
> cookies are all still hardened. See [Going fully production](#going-fully-production).

---

## Before you start — what you need

- A **Render** account → <https://render.com> (sign in with GitHub).
- Your **MongoDB Atlas** connection string (`mongodb+srv://user:pass@cluster/vigno_smartclass`).
  - In Atlas → **Network Access**, add `0.0.0.0/0` (Render's free/standard plans use
    dynamic outbound IPs). Without this the API can't reach the DB and the deploy
    fails its health check.
- An **AWS S3 bucket** + an IAM user with access keys (for persistent uploads).
  See [S3 setup](#s3-setup) below.

---

## Step 1 — Push this repo to GitHub

Already done — the code is on **`saurabhedict/vighnotech-E-learning`** (`main`).
Render reads `render.yaml` from the default branch of the connected repo.

## Step 2 — Create the Blueprint

1. Render dashboard → **New → Blueprint**.
2. Connect the **`vighnotech-E-learning`** repo. Render detects `render.yaml`
   and shows the two services.
3. Click **Apply**. Render starts building both.

It will prompt for every `sync: false` variable — you can fill them now or in
Step 3. The four secret keys (`JWT_*`, `SIGNED_URL_SECRET`, `CONTENT_KEY_SECRET`)
are **auto-generated** by Render — leave them alone.

## Step 3 — Fill in environment variables

On the **`vigno-smart-class-api`** service → **Environment**:

| Variable | Value |
|---|---|
| `MONGO_URI` | your Atlas connection string |
| `AWS_REGION` | e.g. `ap-south-1` |
| `AWS_S3_BUCKET` | your bucket name |
| `AWS_ACCESS_KEY_ID` | IAM user key |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret |
| `SEED_ADMIN_EMAIL` | admin login you want, e.g. `admin@vigno.in` |
| `SEED_ADMIN_PASSWORD` | a strong admin password |
| `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` | *(optional)* real email; blank → OTPs print to logs |

Leave `CLIENT_ORIGINS` and `APP_URL` for the next step.

## Step 4 — Wire the two URLs together (one-time)

After the first build, Render assigns each service a URL (e.g.
`https://vigno-smart-class-api.onrender.com` and
`https://vigno-smart-class-web.onrender.com` — **copy the real ones from the dashboard**).

1. **API service** → set:
   - `CLIENT_ORIGINS` = the **frontend** URL (`https://vigno-smart-class-web.onrender.com`)
   - `APP_URL` = the same frontend URL
2. **Web service** → set:
   - `VITE_API_BASE_URL` = the **backend** URL **+ `/api`** (`https://vigno-smart-class-api.onrender.com/api`)
3. **Redeploy both** (the frontend *must* rebuild — `VITE_*` is baked in at build time):
   API → *Manual Deploy → Deploy latest commit*; Web → same.

## Step 5 — Seed the admin account

The DB starts empty. Open the **API** service → **Shell** and run:

```bash
npm run seed
```

This creates the bootstrap admin from `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.

## Step 6 — Verify

- `https://<api>/health` → `{"ok":true,...}`
- `https://<api>/.well-known/vigno-public-key` → a JWKS document
- Open the **frontend** URL, log in as the admin, confirm data loads.

---

## S3 setup

1. **Create a bucket** (S3 console) — block all public access ON (media is served
   only through signed URLs). Note its region.
2. **Create an IAM user** (programmatic access) with a policy granting
   `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` on `arn:aws:s3:::YOUR_BUCKET/*`.
3. Put the region, bucket, and the user's access key / secret into the API env vars
   (Step 3). The app auto-detects S3 and stops using local disk for uploads.
4. **CORS on the bucket** — add a rule allowing `PUT`/`GET` from your frontend origin
   so browser→S3 direct uploads work:
   ```json
   [{ "AllowedOrigins": ["https://vigno-smart-class-web.onrender.com"],
      "AllowedMethods": ["PUT","GET"], "AllowedHeaders": ["*"] }]
   ```

*(Optional later: MediaConvert for adaptive HLS + CloudFront CDN — env slots already
exist in `backend/.env.example`.)*

---

## Known limitations on the free tier

- **Cold starts.** The free web service sleeps after ~15 min idle; the next request
  takes ~50s to wake. Upgrade to a paid instance to keep it warm.
- **Signing keys are ephemeral.** The ES256 license-signing keys are written to local
  disk ([`keystore.js`](./backend/src/services/keystore.js)), which Render wipes on every
  redeploy. Issued licenses/tokens signed by the old key stop verifying after a redeploy.
  Fine for a demo; for production pick one:
  - attach a **Render persistent disk** and set `LICENSE_KEY_DIR` to its mount path, or
  - move signing to **AWS KMS** (the code has a documented seam in `keystore.js`).
  *(Uploaded media is safe once S3 is configured — only the keys are on local disk.)*

---

## Going fully production

Once you have live **Razorpay** credentials, switch the API service to real prod mode:

1. Set `NODE_ENV=production`.
2. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.
3. In the Razorpay dashboard, point the webhook at
   `https://<api>/api/payments/webhook`.
4. Redeploy. The boot-time guard ([`env.js`](./backend/src/config/env.js)) now enforces
   strong secrets + live payments and will refuse to start if anything is missing.

---

## Prefer Railway instead?

The same layout works on Railway: create **two services** from this repo — one with
root `backend` (start `npm start`), one with root `frontend` (static, build
`npm run build`, serve `dist/`) — and set the same env vars. `render.yaml` is
Render-specific, but every variable in it maps 1:1.
