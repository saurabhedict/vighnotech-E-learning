import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Short-lived signed URLs — stand-in for CloudFront signed URLs (Doc 2 §5,
 * HLD §9 "short-lived everything"). A leaked link is useless seconds later.
 *
 * Token = base64url(payload).hmacSHA256(payload). Payload binds the storageKey,
 * the owning user, and an expiry. Swap for real CloudFront signed URLs/cookies
 * in production.
 */

function sign(data) {
  return crypto.createHmac('sha256', env.license.signedUrlSecret).update(data).digest('base64url')
}

export function createSignedToken({ contentId, storageKey, userId, ttlSec = env.license.signedUrlTtl }) {
  const payload = {
    c: String(contentId), // bind to the specific content (not just storageKey)
    k: storageKey,
    u: String(userId), // who it was minted for (audit; the URL itself is a short-lived capability)
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  }
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  return `${body}.${sign(body)}`
}

export function verifySignedToken(token) {
  if (!token || !token.includes('.')) return { valid: false, reason: 'malformed' }
  const [body, sig] = token.split('.')
  const expected = sign(body)
  // Constant-time comparison.
  if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected)))
    return { valid: false, reason: 'bad_signature' }

  let payload
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
  } catch {
    return { valid: false, reason: 'malformed' }
  }
  if (payload.exp * 1000 < Date.now()) return { valid: false, reason: 'expired' }
  return { valid: true, payload }
}

// Build the full URL the client should hit to stream the content.
export function buildStreamUrl(req, { contentId, storageKey, userId, ttlSec }) {
  const token = createSignedToken({ contentId, storageKey, userId, ttlSec })
  const base = `${req.protocol}://${req.get('host')}`
  return `${base}/api/files/${contentId}/stream?token=${encodeURIComponent(token)}`
}
