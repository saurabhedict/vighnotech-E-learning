# Vigno Smart Class — License-Based Learning Platform

A full-stack MERN implementation of the **Xbox / PlayStation "account-owns-a-license"**
model applied to an e-learning platform. You don't buy the file — you buy a
**cryptographically signed license** tied to your account, and every access re-verifies it.

> Built to the design docs in [`docs/design/`](docs/design) (HLD, Detailed Technology, LLD).
> The demo catalog is the "AeroLearn" aviation content; the architecture is content-agnostic.

## Structure

```
Project/
├── frontend/   React + Vite web app                    (depends on @vigno/shared)
├── backend/    Express API + License Authority          (depends on @vigno/shared)
├── launcher/   Electron desktop app (download lane)     — encrypted titles
├── shared/     @vigno/shared — domain constants (single source of truth)
└── docs/       ARCHITECTURE · STRUCTURE · DEPLOYMENT · design/ (HLD/Detailed/LLD PDFs)
```

Full layout in [docs/STRUCTURE.md](docs/STRUCTURE.md); design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md);
go-live in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Quick start

Two terminals. The web app's Axios is already pointed at `http://localhost:4000/api`.

```bash
# from Project/
npm run install:all     # installs backend + frontend (links @vigno/shared)

# terminal 1 — API on :4000 (auto-seeds an in-memory DB, zero setup)
npm run dev:backend

# terminal 2 — web app on :5173
npm run dev:frontend
```

Other root scripts: `npm run seed` (seed a real DB), `npm run test:api` (end-to-end smoke
test), `npm run build` (frontend production build). Backend unit tests: `npm test --prefix backend`.

**Demo accounts** — Student `cadet@aerolearn.in` / `password` · Admin `admin@vigno.in` / `Admin@12345`

**Try the full flow:** sign in → open a free PDF/video (short-lived signed URL) → open a
**paid** item → **Buy & Unlock** (mock gateway / coupon / wallet) → a license is signed and the
content unlocks → see it in **📚 Library** (download a PDF invoice) → as **admin**, revoke it →
it stops working on the next access.

## Features (mapped to the LLD)

- **Auth & access** — email/password (bcrypt), JWT in httpOnly cookies + refresh, RBAC,
  **2FA** (authenticator-app TOTP + backup codes, or email OTP), email verification,
  password reset, new-device sign-in alerts.
- **License system** — ES256 signed licenses (issue/verify/mine/revoke/refresh), DB-backed
  revocation, published public key (JWKS), key rotation via `kid`.
- **Content** — two lanes: **stream** (in-browser PDF.js / Plyr-HLS / Three.js 3D, watermarked,
  60s content-bound signed URLs) and **download** (AES-256-GCM encrypted, device-bound, via the
  desktop launcher). Optional Widevine/FairPlay DRM integration point.
- **Admin CMS** — content-tree manager (create/rename/delete/reorder/upload), user roles
  (promote/demote + last-admin guard), reports (sales/content/users) with **CSV/Excel/PDF**
  export, coupons & refunds, audit log.
- **Discovery** — search + filters, favorites, continue-watching / recently-viewed, recommended.
- **Commerce** — Razorpay order/verify/webhook (idempotent), **wallet/credits**, **coupons**,
  PDF **invoices** + email receipts, **refund → revoke + wallet credit**.
- **Performance** — route code-splitting, gzip/brotli, response caching, pagination, indexes.
- **Ops** — Vitest unit tests, GitHub Actions CI, Dockerfile, PM2, deployment guide.

## How it works

```
Pay (Razorpay/mock/wallet) → License Authority SIGNS a license (ES256) → stored in DB
   → content delivered → every access VERIFIES the license (public key + DB status)
```

- **Signature** proves authenticity (can't be forged without the private key).
- **DB status** makes **revocation** real (every verify is the freshest answer).
- **Download lane** keeps the file **encrypted on disk**; the launcher only decrypts in memory
  after the server verifies license + device and returns the key (cached for a 7-day offline grace).

## Security highlights (Doc 2 §8)

ES256 public-key licenses · AES-256-GCM encryption-at-rest for downloads · short-lived
content-bound signed URLs · device binding · Razorpay signature + webhook (idempotent) ·
OTP/2FA (hashed, TTL, attempt-capped) · JWT + RBAC + last-admin guard · helmet · rate-limit ·
zod validation · mongo-sanitize · audit log · production startup guards (refuses default
secrets / mock payments in prod).

## Cloud services → local stand-ins

Managed services are isolated behind one module each so the stack runs locally with no accounts:
AWS KMS → `backend/src/services/keystore.js` · S3 → `storage.js` · CloudFront → `signedUrl.js` ·
Razorpay → `payments.js` (mock) · Redis → `cache.js` · SMTP → `mailer.js` (console) ·
Atlas → `config/db.js` (in-memory). To go live, set the env vars and swap those module bodies.

## Status

✅ Verified: backend test suites (smoke 39, auth 19, admin 15, discovery 12, commerce 17,
launcher 6) + Vitest unit tests (11) all green; frontend builds clean; hardened via
multi-agent adversarial reviews.

Documented as cloud swap-ins (need accounts to go live): managed KMS/S3/CloudFront/Atlas,
Razorpay live, SMTP, Redis, Widevine/FairPlay DRM provider.

See [backend/README.md](backend/README.md) for the full API reference and [launcher/README.md](launcher/README.md) for the desktop app.
