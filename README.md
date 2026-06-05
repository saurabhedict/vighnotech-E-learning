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
├── shared/     @vigno/shared — domain constants (single source of truth)
└── docs/       ARCHITECTURE.md · STRUCTURE.md · design/ (the HLD/Detailed/LLD PDFs)
```

Full layout in [docs/STRUCTURE.md](docs/STRUCTURE.md); design in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

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

Other root scripts: `npm run seed` (seed a real DB), `npm run test:api` (38-check
end-to-end smoke test), `npm run build` (frontend production build).

**Demo accounts** — Student `cadet@aerolearn.in` / `password` · Admin `admin@vigno.in` / `Admin@12345`

**Try the full flow:** sign in → open a free PDF/video (short-lived signed URL) → open a
**paid** item → **Buy & Unlock** (mock gateway, no real charge) → a license is signed and the
content unlocks → see it in **📚 Library** → as **admin**, revoke it → it stops working on the
next access.

## How it works

```
Pay (Razorpay/mock) → License Authority SIGNS a license (ES256) → stored in DB
   → content delivered → every access VERIFIES the license (public key + DB status)
```

- **Signature** proves authenticity (can't be forged without the private key).
- **DB status** makes **revocation** real (every verify is the freshest answer).
- **Two lanes:** `stream` (PDF/video → 60s content-bound signed URL) and `download`
  (software → device-fingerprint-bound decryption key for the launcher).

## Security highlights (Doc 2 §8)

ES256 public-key licenses · short-lived content-bound signed URLs · Razorpay signature +
webhook verification (idempotent) · device binding · JWT + RBAC · helmet · rate-limit ·
zod validation · mongo-sanitize · audit log · production startup guards (refuses default
secrets / mock payments in prod).

## Cloud services → local stand-ins

Managed services are isolated behind one module each so the stack runs locally with no accounts:
AWS KMS → `backend/src/services/keystore.js` · S3 → `storage.js` · CloudFront → `signedUrl.js` ·
Razorpay → `payments.js` (mock) · Atlas → `config/db.js` (in-memory). To go live, set the env
vars and swap those module bodies for cloud SDK calls.

## Status

✅ Verified end-to-end: **38/38 API smoke tests** pass, frontend builds clean, hardened via a
multi-agent adversarial review (23 confirmed findings fixed).

Documented as future / cloud swap-ins: managed KMS/S3/CloudFront, the Electron/Tauri launcher
binary, Widevine/FairPlay DRM, TOTP 2FA, email receipts.

See [backend/README.md](backend/README.md) for the full API reference and data model.
