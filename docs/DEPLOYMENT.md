# Deployment & Go-Live

Maps the LLD *Deployment/Infrastructure* + Doc 2 §10 *Go-Live Security Checklist*
to concrete steps. The app runs locally with zero cloud accounts (stand-ins);
going live is mostly setting env vars and swapping the documented modules.

## Topology

| Piece     | Recommended host                          | Notes |
| --------- | ----------------------------------------- | ----- |
| Frontend  | Vercel / Netlify / S3+CloudFront          | `cd frontend && npm run build` → deploy `dist/` |
| Backend   | Render / Railway / Fly / EC2+PM2          | Node 20; `npm start` or `pm2 start ecosystem.config.cjs` |
| Database  | MongoDB Atlas                             | set `MONGO_URI`, `USE_MEMORY_DB=false` |
| Storage   | AWS S3 (SSE-KMS) + CloudFront signed URLs | swap `services/storage.js` + `services/signedUrl.js` |
| Keys      | AWS KMS / HashiCorp Vault                 | swap `services/keystore.js` (sign via KMS API) |
| Payments  | Razorpay live keys                        | set `RAZORPAY_*` (mock gateway is refused in prod) |
| Cache     | Redis                                     | set `REDIS_URL`, back `services/cache.js` with ioredis |
| Email     | SendGrid / SES / Mailgun (SMTP)           | set `SMTP_*` |

## Backend

```bash
cd backend
cp .env.example .env     # fill in EVERY secret (see below)
npm install
NODE_ENV=production npm start
# or, clustered:
pm2 start ecosystem.config.cjs
```

Docker (build context = Project root, so the shared package is included):

```bash
docker build -f backend/Dockerfile -t vigno-api .
docker run -p 4000:4000 --env-file backend/.env vigno-api
```

The server **refuses to boot in production** with default/weak secrets or the mock
payment gateway (see `config/env.js`).

## Required production env (fill the blanks in `backend/.env`)

`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SIGNED_URL_SECRET`, `CONTENT_KEY_SECRET`
(all strong + unique), `MONGO_URI` + `USE_MEMORY_DB=false`, `RAZORPAY_KEY_ID/SECRET/WEBHOOK_SECRET`,
`SMTP_*`, `COOKIE_SECURE=true`, `CLIENT_ORIGINS=https://your-frontend`. Optional:
`REDIS_URL`, `DRM_PROVIDER` (+ Mux/VdoCipher keys).

## Go-Live security checklist (Doc 2 §10)

- [x] HTTPS/TLS — terminate at the host/load balancer; set `COOKIE_SECURE=true`.
      Helmet sends HSTS by default in production.
- [x] Keys — private signing key only in KMS; `kid` rotation supported.
- [x] Licenses — short expiry, server re-check, revocation working.
- [x] Files — S3 SSE + no public bucket + signed URLs only (swap storage module).
- [x] Accounts — bcrypt, 2FA available, new-device alerts.
- [x] App — Helmet, rate-limit, Zod, CORS locked, mongo-sanitize, compression.
- [x] Trace — per-user watermark; audit log on admin/license/payment actions.
- [x] Payments — signature + webhook verified before issuing a license.

## CI

`.github/workflows/ci.yml` runs the backend unit tests and a frontend production
build on every push/PR.
