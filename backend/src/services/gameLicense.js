import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { env } from '../config/env.js'

/**
 * In-game device-license signer. A small token the launcher writes INTO the
 * extracted game; the game's LicenseGuard verifies it at startup and quits if the
 * machine doesn't match. This stops a copied game folder from running elsewhere.
 *
 * Uses a DEDICATED RSA keypair (not the EC License Authority) because
 * RSA-SHA256 / PKCS#1 v1.5 verifies identically in .NET / Unity — no ECDSA
 * DER-vs-P1363 interop traps. Token = base64url(payloadJSON).base64url(signature),
 * where the signature is over the base64url(payload) string bytes.
 */
const KEY_DIR = path.resolve(process.cwd(), env.license.keyDir)
const PRIV = path.join(KEY_DIR, 'game-license-private.pem')
const PUB = path.join(KEY_DIR, 'game-license-public.pem')

let keys = null
function loadKeys() {
  if (keys) return keys
  fs.mkdirSync(KEY_DIR, { recursive: true })
  if (!fs.existsSync(PRIV)) {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    })
    fs.writeFileSync(PRIV, privateKey)
    fs.writeFileSync(PUB, publicKey)
  }
  keys = { privateKey: fs.readFileSync(PRIV, 'utf8'), publicKey: fs.readFileSync(PUB, 'utf8') }
  return keys
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

// Sign a device-bound token. `machineId` is the player's stable machine GUID,
// which the game re-reads locally and compares — so a copied token won't validate.
export function signGameToken({ contentId, machineId, userId, ttlDays = env.security.gameLicenseTtlDays }) {
  const { privateKey } = loadKeys()
  const now = Math.floor(Date.now() / 1000)
  const payload = { c: String(contentId), m: String(machineId), u: String(userId), iat: now, exp: now + ttlDays * 86400 }
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.sign('RSA-SHA256', Buffer.from(body), privateKey)
  return `${body}.${b64url(sig)}`
}

// The public key the game embeds to verify tokens (served at a well-known URL).
export function gameLicensePublicKey() {
  return loadKeys().publicKey
}

// Self-check used in tests: verify a token the way the game will.
export function verifyGameToken(token) {
  try {
    const { publicKey } = loadKeys()
    const [body, sig] = token.split('.')
    const ok = crypto.verify('RSA-SHA256', Buffer.from(body), publicKey, Buffer.from(sig, 'base64url'))
    if (!ok) return { valid: false, reason: 'bad_signature' }
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'))
    if (payload.exp * 1000 < Date.now()) return { valid: false, reason: 'expired' }
    return { valid: true, payload }
  } catch {
    return { valid: false, reason: 'malformed' }
  }
}
