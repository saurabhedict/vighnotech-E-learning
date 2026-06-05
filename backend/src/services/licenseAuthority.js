import jwt from 'jsonwebtoken'
import { customAlphabet } from 'nanoid'
import ms from '../utils/ms.js'
import { env } from '../config/env.js'
import { keystore } from './keystore.js'
import { License } from '../models/License.js'

const newJti = customAlphabet('0123456789abcdef', 16)

/**
 * License Authority (HLD §3, Doc 2 §2–3).
 * Signs short-lived ES256 license tokens and verifies them against the public
 * key AND the database (so revocation/expiry are enforced on every check).
 */

function buildToken(license) {
  const { kid, privatePem } = keystore.signer()
  const payload = {
    jti: license._id,
    sub: license.userId.toString(),
    cid: license.contentId.toString(),
    typ: license.type, // 'stream' | 'download'
    dev: license.deviceId ? license.deviceId.toString() : undefined,
  }
  return jwt.sign(payload, privatePem, {
    algorithm: keystore.alg,
    keyid: kid,
    expiresIn: Math.floor((license.expiresAt.getTime() - Date.now()) / 1000),
  })
}

/**
 * Mint a license after a verified purchase. Reuses an existing active license
 * for the same (user, content) when present, else creates one.
 */
export async function issueLicense({ userId, content, deviceId = null }) {
  const type = content.lane || 'stream'
  const ttlMs = ms(env.license.ttl)
  const now = Date.now()

  // Reuse the freshest existing active row (whether or not it is currently
  // expired) so re-issue/re-purchase refreshes ONE license instead of creating
  // duplicate 'active' rows.
  let license = await License.findOne({ userId, contentId: content._id, status: 'active' }).sort({
    expiresAt: -1,
  })

  if (license) {
    license.expiresAt = new Date(now + ttlMs)
    if (deviceId) license.deviceId = deviceId
    license.kid = keystore.activeKid()
    license.issuedAt = new Date(now)
    await license.save()
  } else {
    license = await License.create({
      _id: `lic_${newJti()}`,
      userId,
      contentId: content._id,
      type,
      status: 'active',
      deviceId: deviceId || null,
      kid: keystore.activeKid(),
      issuedAt: new Date(now),
      expiresAt: new Date(now + ttlMs),
    })
  }

  return { license, token: buildToken(license) }
}

/**
 * Verify a license token end-to-end:
 *  1. signature + exp via the PUBLIC key (crypto — can't be forged)
 *  2. DB status (revocation list) — the freshest answer
 *  3. device binding for the download lane
 * Returns { valid, reason, payload, license }.
 */
export async function verifyToken(token, { deviceId } = {}) {
  let header
  try {
    header = JSON.parse(Buffer.from(token.split('.')[0], 'base64url').toString('utf8'))
  } catch {
    return { valid: false, reason: 'malformed_token' }
  }

  const pub = keystore.publicPem(header.kid)
  if (!pub) return { valid: false, reason: 'unknown_kid' }

  let payload
  try {
    payload = jwt.verify(token, pub, { algorithms: [keystore.alg] })
  } catch (e) {
    return { valid: false, reason: e.name === 'TokenExpiredError' ? 'expired' : 'bad_signature' }
  }

  const license = await License.findById(payload.jti)
  if (!license) return { valid: false, reason: 'not_found', payload }
  if (license.status === 'revoked') return { valid: false, reason: 'revoked', payload, license }
  if (!license.isUsable()) return { valid: false, reason: 'expired', payload, license }

  if (license.type === 'download') {
    if (!license.deviceId) {
      // First-use binding (console-style "home device" activation): the token
      // is valid; the caller binds THIS device. Requires a deviceId to bind to.
      if (!deviceId) return { valid: false, reason: 'device_required', payload, license }
      return { valid: true, payload, license, needsBinding: true }
    }
    if (!deviceId || license.deviceId.toString() !== deviceId.toString())
      return { valid: false, reason: 'device_mismatch', payload, license }
  }

  return { valid: true, payload, license }
}

export async function revokeLicense(jti, reason = 'admin_revoke') {
  const license = await License.findById(jti)
  if (!license) return null
  license.status = 'revoked'
  license.revokedAt = new Date()
  license.revokedReason = reason
  await license.save()
  return license
}

// Re-issue a fresh token for an existing, still-valid license (refresh flow).
export async function reissueToken(license) {
  return buildToken(license)
}

// Does this user currently hold a usable license for this content?
export async function hasActiveLicense(userId, contentId) {
  const license = await License.findOne({ userId, contentId, status: 'active' }).sort({ expiresAt: -1 })
  return !!(license && license.isUsable())
}

export async function listUserLicenses(userId) {
  return License.find({ userId }).sort({ createdAt: -1 }).populate('contentId', 'title type lane')
}
