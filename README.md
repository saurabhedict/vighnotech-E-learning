# Vigno Smart Class — License-Based Learning Platform

A full-stack MERN implementation of the **Xbox / PlayStation "account-owns-a-license"** model
applied to an e-learning platform. You don't buy the file — you buy a **cryptographically
signed license** tied to your account, and every access re-verifies it.

> Built to the three design documents: **HLD** (high-level design), **Detailed Technology &
> Implementation**, and the **LLD** (full module/feature tree). The current demo content is the
> "AeroLearn" aviation catalog; the architecture is content-agnostic.

This repo contains both halves of the stack:

| Folder        | What it is                                                              |
| ------------- | ---------------------------------------------------------------------- |
| `./` (`src/`) | **Web app** — React + Vite + Tailwind + React Query + Redux + Axios     |
| `./server/`   | **API + License Authority** — Express + MongoDB + ES256 signed licenses |

---

## Quick start

Two terminals. The web app's Axios is already pointed at `http://localhost:4000/api`.

**1) Backend** (`Project/server/`)
```bash
cd server
copy .env.example .env      # Windows  (cp on macOS/Linux)
npm install
npm run dev                 # → http://localhost:4000
```
On first boot it spins up an **in-memory MongoDB** and **auto-seeds** demo data — zero local
DB setup required. It also generates an ES256 signing keypair into `server/keys/`.

**2) Frontend** (`Project/`)
```bash
npm install
npm run dev                 # → http://localhost:5173
```

**Demo accounts**
- Student — `cadet@aerolearn.in` / `password`
- Admin — `admin@vigno.in` / `Admin@12345`

**Try the full flow:** sign in → open a free PDF/video (streams via a short-lived signed URL) →
open a **paid** item → **Buy & Unlock** (mock gateway, no real charge) → a license is signed and
the content unlocks → see it in **📚 Library** → as **admin**, revoke that license → it stops
working on the next access.

---

## How it works (the license model)

```
Pay (Razorpay/mock) → License Authority SIGNS a license (ES256, private key) → stored in DB
       → content delivered → on every access the license is VERIFIED (public key + DB status)
```

A license is a compact signed token (JWS / ES256):

```jsonc
// header:  { "alg": "ES256", "typ": "JWT", "kid": "vigno-key-2026" }
// payload: { "jti": "lic_…", "sub": "user_…", "cid": "content_…",
//            "typ": "stream|download", "dev": "device_…", "iat": …, "exp": … }
// signature: <ECDSA over header.payload, made with the PRIVATE key>
```

- **Edit any field → signature breaks → rejected.** No private key → no valid signature.
- **Verification is two-layered:** the signature proves authenticity (can't be forged), and the
  database `status` makes **revocation** work — every verify is the freshest answer.
- **Two content lanes** (HLD §6):
  - **Stream** (PDF/video): ownership checked server-side, delivered via a **60-second signed URL**.
  - **Download** (software/games): bound to a **device fingerprint**; the launcher fetches a
    decryption key only after license + device verification.

---

## Security model (Doc 2 §8)

| Threat                     | Mitigation in this code                                                    |
| -------------------------- | ------------------------------------------------------------------------- |
| Forge a license            | ES256 public-key crypto — impossible without the private key               |
| Edit license fields        | Signature verification fails → rejected                                    |
| Replay expired license     | Short `exp` + server re-check + DB revocation list                         |
| Copy file to another PC    | Device-fingerprint binding (download lane)                                 |
| Share a stream link        | 60-second HMAC-signed URL, then dead                                       |
| Tampered payment           | Razorpay HMAC signature + webhook signature both verified before issuing   |
| Privilege escalation       | JWT + RBAC middleware (`requireAuth`, `requireRole('admin')`)              |
| Brute force / abuse        | `helmet`, `express-rate-limit`, `zod` validation, `express-mongo-sanitize` |
| Audit / fraud trail        | `auditlogs` capture auth, license and admin events                         |

**Honest note (from the design docs):** no client-side protection is unbreakable. The realistic
goals — make casual copying useless, bind ownership to the account, and trace leaks — are met.

---

## Cloud services → local stand-ins

So the whole stack runs locally with no accounts, the managed services are implemented as
swap-in stand-ins. Each is isolated behind one module:

| Production (per docs)          | Local stand-in (this repo)                          | Swap point                         |
| ------------------------------ | --------------------------------------------------- | ---------------------------------- |
| AWS KMS / Vault (signing key)  | ES256 keys generated to `server/keys/`              | `server/src/services/keystore.js`  |
| AWS S3 (SSE-KMS) storage       | Local `server/storage/objects/`                     | `server/src/services/storage.js`   |
| CloudFront signed URLs         | HMAC-signed, short-lived URLs                        | `server/src/services/signedUrl.js` |
| Razorpay live gateway          | Deterministic in-process **mock** gateway           | `server/src/services/payments.js`  |
| MongoDB Atlas                  | `mongodb-memory-server` (or set `MONGO_URI`)        | `server/src/config/db.js`          |

To go live: set the real env vars (`MONGO_URI`, `RAZORPAY_*`, `USE_MEMORY_DB=false`) and replace
the four service bodies above with the cloud SDK calls — the rest of the app is unchanged.

---

## API surface (selected)

```
POST /api/auth/signup | /login | /logout | /refresh        GET /api/auth/me
GET  /api/courses                                           GET /api/courses/:slug/tree
GET  /api/contents/:id            (ownership-aware media)
POST /api/payments/order | /verify | /webhook              GET /api/payments/mine
GET  /api/licenses/mine           POST /api/licenses/verify | /:jti/refresh
GET  /api/content/:id/stream-url  GET /api/content/:id/download   POST /api/content/:id/key
POST /api/devices/register        GET /api/devices/mine
GET  /api/admin/stats | /audit    POST /api/admin/nodes | /content | /licenses/:jti/revoke …
GET  /.well-known/vigno-public-key   (the public verify key — JWKS)
```

See `server/README.md` for the full list and the data model.

---

## Tech stack

**Frontend:** React 18, Vite, React Router 6, Tailwind 3, TanStack Query 5, Redux Toolkit, Axios,
Plyr + HLS.js (secure video), PDF.js (in-browser PDF, download disabled).

**Backend:** Node + Express, MongoDB + Mongoose, `jsonwebtoken` (HS256 login + ES256 licenses),
`bcryptjs`, `helmet`, `express-rate-limit`, `zod`, `express-mongo-sanitize`, `multer`, `razorpay`.

---

## Project structure

```
Project/
├── src/                      # web app
│   ├── api/                  # axios client + per-domain API modules
│   ├── store/                # Redux (auth w/ persistence, ui)
│   ├── components/           # layout, players, BuyButton, guards
│   ├── pages/                # Login, Signup, Home, ModuleView, ContentViewer,
│   │   └── admin/            #   Library, Profile, admin/AdminDashboard
│   ├── hooks/ · lib/         # data hooks, buy flow, device fingerprint
└── server/                   # API + License Authority
    └── src/
        ├── config/           # env, db (in-memory fallback)
        ├── models/           # User, TreeNode, Content, Purchase, License, Device, AuditLog
        ├── middleware/       # auth/RBAC, validate, rateLimit, error
        ├── services/         # keystore, licenseAuthority, signedUrl, payments, storage, contentTree
        ├── controllers/      # auth, courses, payments, license, files, devices, admin
        ├── routes/ · utils/  # route definitions, helpers
        └── seed/             # demo data (admin + aviation tree)
```

---

## Build status vs the plan (Doc 2 §9 phases)

✅ Foundation (MERN, auth, JWT cookies, bcrypt, RBAC, content tree, admin CMS) ·
✅ Payments (order + signature + webhook, idempotent) ·
✅ Keys (ES256 keypair + public-key endpoint) ·
✅ License Authority (issue / verify / mine / revoke) ·
✅ Stream lane (ownership → signed URL, in-browser viewer, download disabled) ·
✅ Revocation · ✅ Hardening (helmet, rate-limit, validation, CORS, audit) ·
✅ Download-lane API (device binding, key endpoint).

Documented as future / cloud swap-ins: managed KMS/S3/CloudFront, the Electron/Tauri launcher
binary, Widevine/FairPlay video DRM, TOTP 2FA, email receipts.
