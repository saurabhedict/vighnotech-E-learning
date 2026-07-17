// ─────────────────────────────────────────────────────────────────────────────
// Shared domain constants — the single source of truth imported by BOTH the
// frontend (@vigno/shared) and the backend. Keeping enums here guarantees the
// API contract and the UI never drift apart.
// ─────────────────────────────────────────────────────────────────────────────

// Account roles (RBAC).
export const ROLES = { USER: 'user', ADMIN: 'admin' }
export const USER_ROLES = Object.values(ROLES)

// Delivery lanes (HLD §6): stream = in-browser/signed-URL, download = launcher.
export const LANES = { STREAM: 'stream', DOWNLOAD: 'download' }
export const CONTENT_LANES = Object.values(LANES)

// Content/file types (must match the secure viewers in the web app).
//   - game → downloadable PC software (.zip), runs via the desktop launcher
//   - apk  → downloadable Android app (.apk) for tablets/phones
// Both are "download lane": encrypted at rest + device-locked via LicenseGuard.
export const CONTENT_TYPES = ['pdf', 'video', '3d', 'game', 'apk']

// License lifecycle states (stored on the License document).
export const LICENSE_STATUS = ['active', 'revoked', 'expired']

// A license token's lane (which lane it grants) — same vocabulary as LANES.
export const LICENSE_TYPES = CONTENT_LANES

// Purchase lifecycle.
export const PURCHASE_STATUS = ['created', 'paid', 'failed', 'refunded']

// Signed license token (JWS / ES256) payload claim names (Doc 2 §2).
export const LICENSE_CLAIMS = {
  id: 'jti', // unique license id (for revocation)
  user: 'sub', // owner account
  content: 'cid', // content id
  lane: 'typ', // 'stream' | 'download'
  device: 'dev', // bound device (download lane)
}

// Downloadable software types use the download lane (encrypted + launcher/
// LicenseGuard); everything else streams in-browser via signed URLs.
export const DOWNLOAD_LANE_TYPES = ['game', 'apk']

// Default lane for a content type (downloadable software → download lane).
export function defaultLaneForType(type) {
  return DOWNLOAD_LANE_TYPES.includes(type) ? LANES.DOWNLOAD : LANES.STREAM
}
