import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { env } from '../config/env.js'

/**
 * Keystore — stand-in for AWS KMS / HashiCorp Vault (Doc 2 §8.1).
 *
 * In this implementation the ES256 (P-256) private key is generated to disk on
 * first run and signing happens in-process. The SECURITY BOUNDARY is preserved:
 * only this module ever touches the private key; everything else calls
 * sign()/getPublicJwks(). In production, swap the body of sign() for a KMS
 * `Sign` API call so the private key never leaves the HSM.
 *
 * Key rotation (Doc 2 §8.1): each key has a `kid`. Old public keys are kept so
 * previously-issued licenses still verify; new licenses use the active kid.
 */

const keyDir = path.resolve(process.cwd(), env.license.keyDir)
const ALG = 'ES256'
const CURVE = 'prime256v1' // NIST P-256

let cache = null // { activeKid, keys: Map<kid, {privatePem, publicPem, jwk}> }

function ensureDir() {
  fs.mkdirSync(keyDir, { recursive: true })
}

function fileFor(kid, kind) {
  return path.join(keyDir, `${kid}.${kind}.pem`)
}

function pemToJwk(publicPem, kid) {
  const keyObj = crypto.createPublicKey(publicPem)
  const jwk = keyObj.export({ format: 'jwk' })
  return { ...jwk, kid, alg: ALG, use: 'sig' }
}

function generateKeyPair(kid) {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: CURVE })
  const privatePem = privateKey.export({ type: 'pkcs8', format: 'pem' })
  const publicPem = publicKey.export({ type: 'spki', format: 'pem' })
  ensureDir()
  fs.writeFileSync(fileFor(kid, 'key'), privatePem, { mode: 0o600 })
  fs.writeFileSync(fileFor(kid, 'pub'), publicPem)
  return { privatePem, publicPem }
}

function loadAll() {
  if (cache) return cache
  ensureDir()
  const activeKid = env.license.activeKid
  const keys = new Map()

  // Load every keypair present in the dir (so rotated/old keys still verify).
  for (const f of fs.readdirSync(keyDir)) {
    const m = /^(.+)\.key\.pem$/.exec(f)
    if (!m) continue
    const kid = m[1]
    const privatePem = fs.readFileSync(path.join(keyDir, f), 'utf8')
    const pubPath = fileFor(kid, 'pub')
    const publicPem = fs.existsSync(pubPath)
      ? fs.readFileSync(pubPath, 'utf8')
      : crypto.createPublicKey(privatePem).export({ type: 'spki', format: 'pem' })
    keys.set(kid, { privatePem, publicPem, jwk: pemToJwk(publicPem, kid) })
  }

  // Bootstrap the active key on first run.
  if (!keys.has(activeKid)) {
    const { privatePem, publicPem } = generateKeyPair(activeKid)
    keys.set(activeKid, { privatePem, publicPem, jwk: pemToJwk(publicPem, activeKid) })
    // eslint-disable-next-line no-console
    console.log(`[keystore] generated new ES256 signing key: ${activeKid}`)
  }

  cache = { activeKid, keys }
  return cache
}

export const keystore = {
  alg: ALG,

  activeKid() {
    return loadAll().activeKid
  },

  // Returns the PEM private key + kid for the active signing key.
  signer() {
    const { activeKid, keys } = loadAll()
    return { kid: activeKid, privatePem: keys.get(activeKid).privatePem }
  },

  // Public PEM for a given kid (used by jsonwebtoken.verify).
  publicPem(kid) {
    const { keys } = loadAll()
    return keys.get(kid)?.publicPem || null
  },

  // JWKS document published at /.well-known/vigno-public-key
  jwks() {
    const { keys } = loadAll()
    return { keys: [...keys.values()].map((k) => k.jwk) }
  },
}
