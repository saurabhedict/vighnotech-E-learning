import otplib from 'otplib'
import QRCode from 'qrcode'

// otplib is CommonJS — import the default and destructure (ESM named imports
// aren't reliably detected).
const { authenticator } = otplib
import bcrypt from 'bcryptjs'
import { customAlphabet } from 'nanoid'
import { env } from '../config/env.js'
import { User } from '../models/User.js'

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

// Try to consume a backup code ATOMICALLY (only one concurrent request wins).
export async function consumeBackupCode(user, code) {
  const norm = String(code).trim().toUpperCase()
  const codes = user.backupCodes || []
  for (let i = 0; i < codes.length; i++) {
    const bc = codes[i]
    if (!bc.usedAt && (await bcrypt.compare(norm, bc.codeHash))) {
      // Mark this exact slot used iff it is still unused — atomic single-use.
      const r = await User.updateOne(
        { _id: user._id, [`backupCodes.${i}.usedAt`]: null },
        { $set: { [`backupCodes.${i}.usedAt`]: new Date() } }
      )
      return r.modifiedCount === 1
    }
  }
  return false
}
