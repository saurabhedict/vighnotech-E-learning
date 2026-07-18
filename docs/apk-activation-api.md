# Vigno — Android (APK) Activation API

Routes the **installed Android app** calls to sign in, prove the app was purchased,
and lock itself to a **single device**. The PC/Windows `.zip` + launcher flow is
unchanged; this is the parallel Android lane.

- **Base URL:** `https://vigno-smart-class-api.onrender.com/api`
- **Content-Type:** `application/json` for all requests below.
- All three activation routes are **public** (the app authenticates in the body — it
  has no web session).

---

## The model (how it fits together)

1. **Admin adds the app in the portal** and assigns it a unique **`identifier`**
   (a product code, e.g. `CFM_ENGINE_V1`). This is set on the APK content item in
   the CMS and is the same for every buyer.
2. A user **buys** the app → it appears in their **library** (a license against that app).
3. User **downloads the `.apk`** from their library (see [Downloading the APK](#downloading-the-apk)).
4. The installed app calls **`POST /activateapp`** with the user's `email` +
   `password` + the app's `identifier` + this device's `deviceId`. The server:
   - authenticates the account,
   - confirms the account **purchased** the app,
   - **binds the app to that one `deviceId`** (single-device lock),
   - stores the device metadata the app sends,
   - returns a **`token`** the app caches.
5. On every launch the app calls **`POST /verifyapp`** with the cached `token` (no
   password re-send) to confirm the license + device are still valid.
6. To move to a new phone/tablet, the user **`POST /deregisterapp`** first (from the
   app or the website), which frees the lock so `/activateapp` can bind a new device.

> **Single-device rule:** one active device per (account, app). Activating on a
> different device while one is active returns **409 CONFLICT** until deregistered.

---

## 1) `POST /activateapp`

Log in + verify purchase + bind this device. Returns a reusable app token.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `email` | string | ✅ | account email |
| `password` | string | ✅ | account password |
| `identifier` | string | ✅ | the app's product code, e.g. `CFM_ENGINE_V1` |
| `deviceId` | string | ✅ | **the single lock key** — the app's stable device id |
| `androidId` | string | ✖ | metadata |
| `installationId` | string | ✖ | metadata |
| `appVersion` | string | ✖ | metadata |
| `deviceModel` | string | ✖ | metadata |
| `osVersion` | string | ✖ | metadata |
| `deviceInfo` | string \| object | ✖ | free-form; stored as-is |
| `license` | string | ✖ | any license/token string the app holds; stored as metadata |

```json
POST /api/activateapp
{
  "email": "abc@test.com",
  "password": "******",
  "identifier": "CFM_ENGINE_V1",
  "deviceId": "82af91eab...",
  "androidId": "9774d56d682e549c",
  "installationId": "b1e2...-uuid",
  "appVersion": "1.0.3",
  "deviceModel": "Samsung SM-G991B",
  "osVersion": "Android 14",
  "deviceInfo": "{\"ram\":\"8GB\",\"abi\":\"arm64-v8a\"}",
  "license": "optional"
}
```

**200 — success**

```json
{
  "success": true,
  "token": "<app token — cache this>",
  "tokenType": "Bearer",
  "user": { "id": "665...", "email": "abc@test.com", "name": "ABC" },
  "app": { "identifier": "CFM_ENGINE_V1", "title": "CFM Engine Sim", "contentId": "665..." },
  "device": { "deviceId": "82af91eab...", "activatedAt": "2026-07-18T09:00:00.000Z" },
  "license": { "status": "active", "expiresAt": "2026-08-18T09:00:00.000Z" }
}
```

**Errors** (shape: `{ "error": { "code": "...", "message": "..." } }`)

| HTTP | code | when |
|---|---|---|
| 400 | `BAD_REQUEST` | missing/invalid fields |
| 401 | `UNAUTHORIZED` | wrong email/password |
| 402 | `PAYMENT_REQUIRED` | account has not purchased this app |
| 404 | `NOT_FOUND` | unknown `identifier` |
| 409 | `CONFLICT` | app already active on another device → deregister first |
| 429 | `RATE_LIMITED` | too many attempts |

---

## 2) `POST /verifyapp`

Launch / heartbeat check. Always returns **200**; read `valid`.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `token` | string | ✅ | the token from `/activateapp` |
| `deviceId` | string | ✅ | must match the bound device |
| `identifier` | string | ✖ | extra sanity check |

```json
POST /api/verifyapp
{ "token": "<app token>", "deviceId": "82af91eab...", "identifier": "CFM_ENGINE_V1" }
```

**200 — valid**
```json
{ "valid": true, "app": { "identifier": "CFM_ENGINE_V1" }, "license": { "status": "active", "expiresAt": "2026-08-18T09:00:00.000Z" } }
```

**200 — invalid** (app should refuse to run)
```json
{ "valid": false, "reason": "device_mismatch" }
```
`reason` ∈ `invalid_token` · `device_mismatch` · `identifier_mismatch` · `not_activated` · `license_inactive`.

---

## 3) `POST /deregisterapp`

Release the bound device so the app can be activated on a new one. Authorize with
**either** the app `token` **or** `email` + `password`.

**Request body**

| Field | Type | Required | Notes |
|---|---|---|---|
| `identifier` | string | ✅ | the app's product code |
| `token` | string | ✖* | app token (preferred) |
| `email` | string | ✖* | required if no `token` |
| `password` | string | ✖* | required if no `token` |

\* provide **either** `token` **or** `email`+`password`.

```json
POST /api/deregisterapp
{ "identifier": "CFM_ENGINE_V1", "token": "<app token>" }
```

**200**
```json
{ "success": true }
```
(`{ "success": true, "alreadyInactive": true }` if nothing was bound.)

---

## Downloading the APK

The installable `.apk` is served **license-gated** from the user's web session
(they're logged into the site when they tap Download in their library):

```
GET /api/content/:contentId/download-apk
Cookie: <web session>   (or Authorization: Bearer <web access token>)
→ 200  Content-Type: application/vnd.android.package-archive   (the .apk bytes)
→ 402 PAYMENT_REQUIRED if not purchased
```

The file is stored **encrypted at rest** and decrypted on the fly for this
download; runtime protection is then the app's own activation (`/activateapp` +
`/verifyapp`) and the single-device lock.

---

## What the server stores per activation

One `AppActivation` row per (account, app): `deviceId` (the lock), `status`
(`active` / `deregistered`), `activatedAt` / `lastSeenAt`, and all the metadata the
app sends (`androidId`, `installationId`, `appVersion`, `deviceModel`, `osVersion`,
`deviceInfo`, `license`). Re-activating the same device updates the row; a different
device is refused until deregister.
