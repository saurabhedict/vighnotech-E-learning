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
export const CONTENT_TYPES = ['pdf', 'video', '3d', 'game']

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

// Default lane for a content type (games are downloadable software).
export function defaultLaneForType(type) {
  return type === 'game' ? LANES.DOWNLOAD : LANES.STREAM
}
