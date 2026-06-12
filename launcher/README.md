# Vigno Launcher (Desktop, download lane)

Electron desktop client for the **download lane** (Doc 2 §7) — the part a website
can't do alone, exactly like the Steam/console client. It downloads an
**encrypted** title, then decrypts and runs it only after the server verifies the
license + this device. The decrypted files exist on disk **only while the game
runs** and are wiped when it exits.

## Flow

1. **Login** (+2FA if enabled) → session.
2. **Register device** → a fingerprint (hash of host/CPU/OS) is bound to the account.
3. **Library** → lists owned download-lane licenses (`/licenses/mine`).
4. **Download** → fetches the AES-256-GCM ciphertext (`/content/:id/download`); it
   stays **encrypted on disk**.
5. **Play** → refreshes the license token, verifies license + device
   (`/licenses/verify`), fetches the server-gated key (`/content/:id/key`),
   **decrypts the ZIP in memory**, **extracts it to a throwaway temp dir**, and
   **launches the game `.exe`**. The decrypted files are **deleted when the game
   exits** (and on launcher quit); at rest only the encrypted `.enc` remains.
6. **Online-only** → the decryption key is fetched fresh on every Play and kept
   **in memory only — never written to disk**. There is no cached key file for
   anyone to read, and the title can't run without a live server check. Revoking
   the license (refund/fraud) stops it immediately on the next Play.

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

## Packaging & code signing

Build a distributable installer with electron-builder:

```bash
cd launcher
npm install
npm run pack     # unpacked app in dist/ (quick sanity check)
npm run dist     # full installer (Windows NSIS / macOS dmg / Linux AppImage)
```

**Code signing (recommended before release).** electron-builder signs Windows
builds automatically when these env vars are present — no secrets go in the repo:

```bash
# Windows Authenticode (.pfx / .p12 certificate)
set CSC_LINK=C:\path\to\codesign.pfx        # or a base64 of the cert
set CSC_KEY_PASSWORD=your-cert-password
npm run dist
```

Signing gives users a **verified publisher** (no SmartScreen "unknown publisher"
warning) and makes the installer **tamper-evident**. It does NOT add DRM strength —
the anti-piracy guarantee comes from the server (license + device-bound key).

## Production notes

- Add OS-keychain storage for the cached grace-window key (the dev build stores it
  in `userData`).
- The decrypted game lives in a temp dir only while running; consider extracting to
  a less-predictable location and add anti-tamper/anti-debug if your threat model
  needs it (the inherent "analog hole" can't be fully closed in any DRM).
