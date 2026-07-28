# Vigno Smart Class — Architecture

Implements the Xbox/PlayStation **account-owns-a-license** model on a MERN stack.
This maps the implementation to the design docs in [`design/`](./design) (HLD,
Detailed Technology, LLD).

## Components

```
                         ┌────────────────────────────────────────────┐
  Browser (React) ──────▶│  Express API  +  License Authority          │
  Launcher (future) ─────│  auth · ownership · sign/verify licenses     │
                         └───────┬───────────────┬───────────┬─────────┘
                                 │               │           │
                       MongoDB (Mongoose)   Keystore     Storage + signed URLs
                       users·content·       (ES256,      (objects, short-lived
                       purchases·licenses·  KMS stand-in) capability URLs —
                       devices·auditlogs                  CloudFront stand-in)
                                 ▲
                          Razorpay (or mock) — payment → triggers license issue
```

## The license (signed JWS / ES256)

A purchase triggers the **License Authority** to sign a short-lived license token.
Two layers of trust:

1. **Signature** (public-key crypto) — proves authenticity; can't be forged without the private key.
2. **Database status** — every verify re-checks the `licenses` row, which is what makes **revocation** work.

Claim names live in `@vigno/shared` (`LICENSE_CLAIMS`): `jti`, `sub`, `cid`, `typ`, `dev`, `iat`, `exp`.

## Two delivery lanes (HLD §6)

| Lane       | Content       | Verified…                              | Delivery                          |
| ---------- | ------------- | -------------------------------------- | --------------------------------- |
| `stream`   | PDF / video   | server-side, before each access        | 60s content-bound signed URL      |
| `download` | software/game | by the launcher, before it decrypts    | encrypted file + device-bound key |

## Request flows

**Buy → unlock (stream):** `POST /payments/order` → (mock or Razorpay) → `POST /payments/verify`
(signature check, atomic claim) → License Authority signs license → `GET /contents/:id` now returns
a signed stream URL → `GET /files/:id/stream?token=…` serves bytes (token bound to content id + key).

**Play (download):** `POST /devices/register` → `POST /payments/verify` → `POST /content/:id/key`
with the license token + device → license verified (signature + DB + first-use device binding) →
per-content decryption key returned (derived from a dedicated secret).

**Revocation:** `POST /admin/licenses/:jti/revoke` flips DB status → next verify fails.

## Trust boundaries & cloud stand-ins

| Production         | Local stand-in (isolated module)            |
| ------------------ | ------------------------------------------- |
| AWS KMS / Vault    | `backend/src/services/keystore.js`          |
| AWS S3 (SSE-KMS)   | `backend/src/services/storage.js`           |
| CloudFront signed  | `backend/src/services/signedUrl.js`         |
| Razorpay live      | `backend/src/services/payments.js` (mock)   |
| MongoDB Atlas      | `mongodb-memory-server` (`config/db.js`)    |

See [`../README.md`](../README.md) to run it and [`../backend/README.md`](../backend/README.md)
for the full API reference.
