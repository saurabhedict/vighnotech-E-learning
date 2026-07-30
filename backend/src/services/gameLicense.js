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
  // 1) Prefer a key injected via env (deployment-friendly; survives an ephemeral
  //    filesystem). This is REQUIRED in the cloud: the file below is gitignored, so
  //    without an env key each deploy would generate its own throwaway keypair and
  //    the game — built against ONE fixed public key — rejects every token.
  const envPriv = env.security.gameLicensePrivateKey
  if (envPriv) {
    const privateKey = envPriv
    // Derive the public half from the private key when not supplied, so the two
    // can never drift apart.
    const publicKey =
      env.security.gameLicensePublicKey ||
      crypto.createPublicKey(privateKey).export({ type: 'spki', format: 'pem' })
    keys = { privateKey, publicKey, source: 'env' }
    logKeyInfo()
    return keys
  }
  // 2) Fall back to a file at LICENSE_KEY_DIR (dev/local), generating one if absent.
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
  keys = { privateKey: fs.readFileSync(PRIV, 'utf8'), publicKey: fs.readFileSync(PUB, 'utf8'), source: 'file' }
  logKeyInfo()
  return keys
}

// Log the active signing key's source + public modulus prefix on first use. This
// makes a key mismatch (game "Invalid license signature") diagnosable at a glance:
// compare the modulus here with the one baked into the game / served at
// /.well-known/game-license-public-key.
function logKeyInfo() {
  try {
    const mod = crypto.createPublicKey(keys.publicKey).export({ format: 'jwk' }).n
    // eslint-disable-next-line no-console
    console.log(`[gameLicense] signing key source=${keys.source} modulus=${mod.slice(0, 16)}…`)
  } catch { /* non-fatal */ }
}

const b64url = (buf) => Buffer.from(buf).toString('base64url')

// Sign a device-bound token. `machineId` is the player's stable machine GUID,
// which the game re-reads locally and compares — so a copied token won't validate.
export function signGameToken({ contentId, machineId, userId, ttlMinutes = env.security.gameLicenseTtlMinutes }) {
  const { privateKey } = loadKeys()
  const now = Math.floor(Date.now() / 1000)
  const payload = { c: String(contentId), m: String(machineId), u: String(userId), iat: now, exp: now + ttlMinutes * 60 }
  const body = b64url(JSON.stringify(payload))
  const sig = crypto.sign('RSA-SHA256', Buffer.from(body), privateKey)
  return `${body}.${b64url(sig)}`
}

// The public key the game embeds to verify tokens (served at a well-known URL).
export function gameLicensePublicKey() {
  return loadKeys().publicKey
}

// Public key as raw modulus/exponent (base64url). Unity's Mono runtime can't
// import a PEM, so the in-game LicenseGuard imports these via RSAParameters.
export function gameLicenseJwk() {
  const jwk = crypto.createPublicKey(loadKeys().publicKey).export({ format: 'jwk' })
  return { modulus: jwk.n, exponent: jwk.e }
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
