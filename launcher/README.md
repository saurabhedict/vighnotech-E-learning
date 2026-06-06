# Vigno Launcher (Desktop, download lane)

Electron desktop client for the **download lane** (Doc 2 §7) — the part a website
can't do alone, exactly like the Steam/console client. It downloads an
**encrypted** title, and only decrypts it **in memory** after the server verifies
the license + this device.

## Flow

1. **Login** (+2FA if enabled) → session.
2. **Register device** → a fingerprint (hash of host/CPU/OS) is bound to the account.
3. **Library** → lists owned download-lane licenses (`/licenses/mine`).
4. **Download** → fetches the AES-256-GCM ciphertext (`/content/:id/download`); it
   stays **encrypted on disk**.
5. **Play** → refreshes the license token, verifies license + device
   (`/licenses/verify`), fetches the server-gated key (`/content/:id/key`),
   **decrypts in memory**, and "launches". The plaintext is never written to disk.
6. **Offline grace** → the key is cached for 7 days so the title still runs offline
   on this home device; after that, you must reconnect to re-verify. Revoking the
   license (refund/fraud) stops it on the next online check.

> Why patching the launcher's "always true" check is useless: the decryption
> **key** comes from the server only after the license + device pass — without it
> the bytes stay encrypted.

## Run

The API must be running first (see `../backend`). Then:

```bash
cd launcher
npm install
npm start          # opens the Electron window
# point at a non-default API: VIGNO_API=https://api.example.com/api npm start
```

Sign in (e.g. `cadet@aerolearn.in` / `password`), buy a **game**/software item in
the web app (it's download-lane), then Download → Play here.

## Production notes

- Real builds: package with `electron-builder` (Win/Mac/Linux installers).
- Add anti-tamper / integrity checks and OS keychain storage for cached
  entitlements; the dev build caches the key in `userData` for the grace window.
