# Vigno Smart Class — Backend (API + License Authority)

Express + MongoDB API implementing the signed-license system from the design docs.
Issues and verifies **ES256 license tokens**, gates content by ownership, and handles
auth, payments, the content CMS, and admin tooling.

## Run

```bash
copy .env.example .env     # cp on macOS/Linux
npm install
npm run dev                # node --watch, http://localhost:4000
npm start                  # production-style boot
npm run seed               # (re)seed a real MONGO_URI database
```

With the default `.env` it uses an **in-memory MongoDB** and **auto-seeds on boot**, so it runs
with zero setup. ES256 signing keys are generated to `keys/` on first run.

## Environment

See `.env.example`. Key vars: `PORT`, `CLIENT_ORIGINS`, `MONGO_URI` + `USE_MEMORY_DB`,
`JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET`, `LICENSE_*` (signing key dir/kid/TTL, signed-URL
secret), `RAZORPAY_*` (blank → mock gateway), `STORAGE_DIR`, `SEED_ADMIN_*`.

## Data model

| Collection  | Purpose                                                                |
| ----------- | --------------------------------------------------------------------- |
| `users`     | identity — email, bcrypt hash, role (user/admin), tokenVersion, 2FA    |
| `treenodes` | content tree — board/class/course/subject/module/chapter (parentId)   |
| `contents`  | leaf files — type (pdf/video/3d/game), lane, isPaid/price, storageKey  |
| `purchases` | proof of payment — Razorpay ids, status, issued licenseId             |
| `licenses`  | **source of truth for ownership** — `_id` is the jti, status, expiry   |
| `devices`   | download-lane device fingerprints bound to a user                     |
| `auditlogs` | security trail — auth/license/admin/payment events                    |

## API reference

### Auth (`/api/auth`)
| Method | Path               | Auth   | Notes                               |
| ------ | ------------------ | ------ | ----------------------------------- |
| POST   | `/signup`          | —      | creates user, sets cookies + token  |
| POST   | `/login`           | —      | email + password                    |
| POST   | `/refresh`         | cookie | rotates the access token            |
| POST   | `/logout`          | —      | clears cookies                      |
| GET    | `/me`              | user   | current profile                     |
| POST   | `/logout-all`      | user   | invalidate all sessions             |
| POST   | `/change-password` | user   | bumps tokenVersion                  |

### Catalog (`/api`)
| Method | Path                                   | Auth     | Notes                                 |
| ------ | -------------------------------------- | -------- | ------------------------------------- |
| GET    | `/courses`                             | —        | course slugs                          |
| GET    | `/courses/:slug/tree`                  | —        | nested subjects → modules → chapters  |
| GET    | `/courses/:slug/modules/:moduleId`     | —        | one module                            |
| GET    | `/contents/:id`                        | optional | ownership-aware; `locked` if unpaid   |

### Payments (`/api/payments`)
| Method | Path       | Auth | Notes                                            |
| ------ | ---------- | ---- | ------------------------------------------------ |
| POST   | `/order`   | user | create order (mock returns payment+signature)    |
| POST   | `/verify`  | user | verify signature → issue license (idempotent)    |
| POST   | `/webhook` | sig  | raw-body Razorpay webhook, signature-verified    |
| GET    | `/mine`    | user | purchase history / receipts                      |

### Licenses (`/api/licenses`)
| Method | Path           | Auth | Notes                              |
| ------ | -------------- | ---- | ---------------------------------- |
| GET    | `/mine`        | user | the user's library                 |
| POST   | `/verify`      | —    | verify a token (sig + DB + device) |
| POST   | `/:jti/refresh`| user | new token for a valid license      |

### Content delivery (`/api/content`, `/api/files`)
| Method | Path                          | Auth  | Notes                                       |
| ------ | ----------------------------- | ----- | ------------------------------------------- |
| GET    | `/content/:id/stream-url`     | user  | ownership → short-lived signed URL          |
| GET    | `/files/:id/stream?token=`    | token | byte delivery (HTTP range), token-checked   |
| GET    | `/content/:id/download`       | user  | encrypted bytes (download lane)             |
| POST   | `/content/:id/key`            | user  | license + device verify → decryption key    |

### Devices (`/api/devices`)
`POST /register` · `GET /mine`

### Admin (`/api/admin`, role: admin)
`GET /stats` · `GET /audit` · `POST /nodes` · `PATCH/DELETE /nodes/:id` · `POST /nodes/reorder` ·
`POST /content` · `PATCH/DELETE /content/:id` · `POST /content/:id/upload` ·
`POST /licenses/issue` · `POST /licenses/:jti/revoke`

### Public
`GET /health` · `GET /.well-known/vigno-public-key` (JWKS public verify key)

## Tests

`node src/scripts/smoketest.js` runs a 28-check end-to-end pass against a running server
(auth, RBAC, ownership gating, pay→license→unlock, verify/tamper/revoke, idempotency, devices).
