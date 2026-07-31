import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * Reversible encryption for CLIENT passwords ONLY.
 *
 * Client accounts are admin-provisioned managed logins, and the product requires
 * an admin to be able to VIEW and RESET a client's password. Normal user/admin
 * passwords are NEVER stored this way — only the one-way bcrypt hash.
 *
 * Security note: anyone with CLIENT_PW_SECRET *and* the database can read every
 * client password. Keep the secret out of the repo, set it per-deployment, and
 * keep it STABLE (rotating it makes previously-stored passwords unreadable).
 *
 * Blob format:  v1:<iv>:<tag>:<ciphertext>   (all base64url, AES-256-GCM)
 */

// 32-byte key derived from the secret (any secret length works).
const KEY = crypto.createHash('sha256').update(env.security.clientPwSecret || '').digest()

export function encryptClientPassword(plain) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ct.toString('base64url')}`
}

// Returns the plaintext, or null if the blob is missing/corrupt or the key changed.
export function decryptClientPassword(blob) {
  if (!blob || typeof blob !== 'string') return null
  const [ver, ivB64, tagB64, ctB64] = blob.split(':')
  if (ver !== 'v1' || !ivB64 || !tagB64 || !ctB64) return null
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, Buffer.from(ivB64, 'base64url'))
    decipher.setAuthTag(Buffer.from(tagB64, 'base64url'))
    return Buffer.concat([decipher.update(Buffer.from(ctB64, 'base64url')), decipher.final()]).toString('utf8')
  } catch {
    return null
  }
}
