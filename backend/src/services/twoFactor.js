import otplib from 'otplib'
import QRCode from 'qrcode'

// otplib is CommonJS — import the default and destructure (ESM named imports
// aren't reliably detected).
const { authenticator } = otplib
import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'
import { env } from '../config/env.js'

// Authenticator-app 2FA (TOTP, RFC 6238) + one-time backup codes.

const rand = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 10)

export function generateTotpSecret() {
  return authenticator.generateSecret()
}

export function totpAuthUrl(email, secret) {
  return authenticator.keyuri(email, env.app.name, secret)
}

export function totpQrDataUrl(email, secret) {
  return QRCode.toDataURL(totpAuthUrl(email, secret))
}

export function verifyTotp(secret, token) {
  try {
    return authenticator.verify({ token: String(token).replace(/\s/g, ''), secret })
  } catch {
    return false
  }
}

// Produce N recovery codes: plaintext (shown once) + hashed (persisted).
export async function generateBackupCodes(n = 10) {
  const plain = Array.from({ length: n }, () => {
    const r = rand()
    return `${r.slice(0, 5)}-${r.slice(5, 10)}`
  })
  const hashed = await Promise.all(
    plain.map(async (c) => ({ codeHash: await bcrypt.hash(c, 10), usedAt: null }))
  )
  return { plain, hashed }
}

// Try to consume a backup code (mutates the user's backupCodes; caller saves).
export async function consumeBackupCode(user, code) {
  const norm = String(code).trim().toUpperCase()
  for (const bc of user.backupCodes || []) {
    if (!bc.usedAt && (await bcrypt.compare(norm, bc.codeHash))) {
      bc.usedAt = new Date()
      return true
    }
  }
  return false
}
