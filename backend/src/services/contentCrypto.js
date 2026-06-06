import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Derive a per-content AES-256 key from a dedicated server secret + a random
 * per-content salt (stored on the Content doc, never exposed). Used to encrypt
 * download-lane objects at rest and handed to the launcher (license-gated) to
 * decrypt in memory. In production this derivation happens inside KMS.
 */
export function deriveContentKey(contentId, salt) {
  return crypto.createHmac('sha256', env.license.contentKeySecret).update(`content-key:${contentId}:${salt}`).digest() // 32 bytes
}

export const newSalt = () => crypto.randomBytes(16).toString('hex')
