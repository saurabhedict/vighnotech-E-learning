# Vigno Smart Class — Backend (API + License Authority)

Express + MongoDB API implementing the signed-license system from the design docs.
Issues and verifies **ES256 license tokens**, gates content by ownership, and handles
auth + 2FA, payments + wallet + coupons, the content CMS + reports, discovery, and the
encrypted download lane.

## Run

```bash
cp .env.example .env       # copy on Windows
npm install
npm run dev                # node --watch, http://localhost:4000
npm start                  # production-style boot
npm run seed               # (re)seed a real MONGO_URI database
npm test                   # Vitest unit tests
```

With the default `.env` it uses an **in-memory MongoDB** and **auto-seeds on boot**, so it runs
with zero setup. ES256 signing keys are generated to `keys/` on first run. Emails/OTPs are
printed to the console until `SMTP_*` is set.

## Environment

See `.env.example`. Groups: core (`PORT`, `CLIENT_ORIGINS`), DB (`MONGO_URI`, `USE_MEMORY_DB`),
auth (`JWT_*`, `COOKIE_SECURE`), license (`LICENSE_*`, `SIGNED_URL_SECRET`, `CONTENT_KEY_SECRET`),
email (`SMTP_*`, `OTP_*`), payments (`RAZORPAY_*`), cache (`REDIS_URL`), DRM (`DRM_PROVIDER`,
`MUX_*`, `VDOCIPHER_*`), storage (`STORAGE_DIR`), seed (`SEED_ADMIN_*`). Production boot is
**refused** on default secrets or the mock payment gateway.

## Data model

| Collection    | Purpose                                                                 |
| ------------- | ---------------------------------------------------------------------- |
| `users`       | identity — email, bcrypt hash, role, tokenVersion, 2FA, wallet balance  |
| `treenodes`   | content tree — course/subject/module/chapter (parentId, order)          |
| `contents`    | leaf files — type, lane, isPaid/price, storageKey, AES enc params, DRM  |
| `purchases`   | proof of payment — provider, coupon/discount, status, licenseId         |
| `licenses`    | **source of truth for ownership** — `_id` is the jti, status, expiry     |
| `devices`     | download-lane device fingerprints bound to a user                       |
| `otps`        | hashed email OTPs (verify / reset / login-2fa) with TTL + attempts      |
| `favorites` · `progress` | discovery — favorited content, view/continue-watching state |
| `coupons` · `wallettxns` | commerce — discount codes, wallet ledger                  |
| `auditlogs`   | security trail — auth/license/admin/payment events                      |

## API reference

### Auth & 2FA (`/api/auth`)
`POST /signup` · `POST /login` · `POST /2fa/verify` · `POST /refresh` · `POST /logout` ·
`GET /me` · `POST /logout-all` · `POST /change-password` · `POST /send-verification` ·
`POST /verify-email` · `POST /forgot-password` · `POST /reset-password` ·
`GET /2fa/status` · `POST /2fa/totp/setup` · `POST /2fa/totp/enable` · `POST /2fa/email/enable` ·
`POST /2fa/disable` · `POST /2fa/backup-codes`

### Catalog (`/api`)
`GET /courses` · `GET /courses/:slug/tree` · `GET /courses/:slug/modules/:id` ·
`GET /contents/:id` (ownership-aware; `locked` if unpaid)

### Discovery (`/api`)
`GET /search` · `GET /favorites/mine|ids` · `POST|DELETE /favorites/:id` ·
`GET /progress/mine` · `POST /progress/:id` · `GET /recommended`

### Payments & commerce (`/api/payments`, `/api`)
`POST /payments/order` (coupon-aware) · `POST /payments/verify` · `POST /payments/wallet` ·
`POST /payments/webhook` (raw, signature-verified) · `GET /payments/mine` ·
`GET /payments/:id/invoice` (PDF) · `GET /wallet` · `POST /wallet/topup` · `POST /coupons/validate`

### Licenses (`/api/licenses`)
`GET /mine` · `POST /verify` · `POST /:jti/refresh`

### Content delivery (`/api/content`, `/api/files`)
`GET /content/:id/stream-url` · `GET /content/:id/drm-token` · `GET /content/:id/download` ·
`POST /content/:id/key` (license + device → key/iv/tag) · `GET /files/:id/stream?token=` (range)

### Devices (`/api/devices`)
`POST /register` · `GET /mine`

### Admin (`/api/admin`, role: admin)
`GET /stats` · `GET /audit` · `GET /reports/:type` · `GET /reports/:type/export?format=csv|xlsx|pdf` ·
`GET /users` · `PATCH /users/:id/role` (last-admin guard) · `GET|POST /nodes` · `POST /nodes/reorder` ·
`PATCH|DELETE /nodes/:id` · `GET /chapters/:id/content` · `POST /content` · `PATCH|DELETE /content/:id` ·
`POST /content/:id/upload` · `GET|POST /coupons` · `DELETE /coupons/:id` · `POST /purchases/:id/refund` ·
`POST /licenses/issue` · `POST /licenses/:jti/revoke`

### Public
`GET /health` · `GET /.well-known/vigno-public-key` (JWKS public verify key)

## Tests

- `npm test` — Vitest unit tests (duration parser, signed URLs, content-key + AES round trip, coupons).
- Integration scripts (run against a live server): `src/scripts/{smoketest,test-auth,test-admin,test-discover,test-commerce,test-launcher}.js`.
