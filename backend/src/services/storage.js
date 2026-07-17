import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { customAlphabet } from 'nanoid'
import { env } from '../config/env.js'
import { s3Enabled, putObject, uploadStream, headObject, getObjectStream, getObjectBuffer, deleteObject, presignPutUrl, presignGetUrl } from './s3.js'
import { cloudFrontEnabled, signCloudFrontUrl } from './cloudfront.js'
import { cache } from './cache.js'

/**
 * Object storage for all uploaded media (Doc 2 §1, §8).
 *
 *   • S3 configured (AWS_S3_BUCKET + region + keys) → objects live in S3,
 *     encrypted at rest (SSE-S3/KMS), served only via the signed-URL stream route.
 *   • Not configured → identical behavior backed by local disk (STORAGE_DIR),
 *     so dev/demo needs zero cloud setup.
 *
 * Either way, files live OUTSIDE any static route and are only reachable through
 * the signed-URL-checked stream route. All functions are async so the S3 and
 * local-disk backends share one interface.
 */

const storageDir = path.resolve(process.cwd(), env.storageDir)
const objectsDir = path.join(storageDir, 'objects')
const newName = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 20)

// Content-Type for plain (non-encrypted) uploads, so S3 serves them with the
// right type. Encrypted download-lane objects are always opaque octet-streams.
const MIME = {
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.glb': 'model/gltf-binary',
}
const mimeFor = (key) => MIME[path.extname(key).toLowerCase()] || 'application/octet-stream'

function ensureLocal() {
  fs.mkdirSync(objectsDir, { recursive: true })
}

// Guard against path traversal — keys are flat names only.
function localPath(storageKey) {
  const safe = path.basename(storageKey || '')
  const full = path.join(objectsDir, safe)
  return full.startsWith(objectsDir) ? full : null
}

// ── Writes ───────────────────────────────────────────────────────────────────

// Persist an uploaded buffer; returns a storageKey to put on the Content doc.
export async function saveBuffer(buffer, originalName = '') {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '')
  const key = `obj_${newName()}${ext}`
  if (s3Enabled()) {
    await putObject(key, buffer, mimeFor(key))
  } else {
    ensureLocal()
    fs.writeFileSync(path.join(objectsDir, key), buffer)
  }
  return { storageKey: key, sizeBytes: buffer.length }
}

// Encrypt an object ALREADY in S3 (a raw direct-upload) into a new encrypted
// object, streaming S3 → AES-256-GCM → S3 so a multi-GB game never sits in RAM.
// The GCM tag is captured after the stream drains. S3-only (no local-disk path).
export async function saveEncryptedFromObject(rawKey, keyBuf) {
  if (!s3Enabled()) throw new Error('S3 not configured')
  const src = await getObjectStream(rawKey)
  if (!src) throw new Error('Raw upload not found in storage')
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv)
  const key = `obj_${newName()}.enc`
  // src → cipher (Transform) → multipart upload of the ciphertext.
  await uploadStream(key, src.pipe(cipher), 'application/octet-stream')
  const tag = cipher.getAuthTag() // valid once the cipher has flushed
  const stat = await headObject(key)
  return {
    storageKey: key,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    sizeBytes: stat?.size || 0,
  }
}

// Encrypt a buffer with AES-256-GCM and persist the ciphertext (download lane).
// Returns the storageKey plus the iv/tag needed to decrypt later.
export async function saveEncryptedBuffer(buffer, keyBuf) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv)
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()])
  const tag = cipher.getAuthTag()
  const key = `obj_${newName()}.enc`
  if (s3Enabled()) {
    await putObject(key, ciphertext, 'application/octet-stream')
  } else {
    ensureLocal()
    fs.writeFileSync(path.join(objectsDir, key), ciphertext)
  }
  return {
    storageKey: key,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    sizeBytes: ciphertext.length,
  }
}

// ── Direct browser→S3 upload (presigned) ─────────────────────────────────────

// Only available when S3 is configured (no presigned URLs for local disk).
export const directUploadSupported = () => s3Enabled()

// Mint a storageKey + a presigned PUT URL the browser uploads to directly.
// Keys follow the same `obj_<id><ext>` convention as saveBuffer().
export async function createDirectUpload(originalName = '') {
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '')
  const key = `obj_${newName()}${ext}`
  const url = await presignPutUrl(key, { expiresIn: 3600 }) // 1h — big videos take a while
  return { storageKey: key, url }
}

// A ready-to-play media URL for a stored object, fastest path first:
//   1. CloudFront-signed (edge-cached near the viewer) when CF is configured,
//   2. else a presigned S3 URL (direct from the bucket region),
//   3. else null → the caller streams it through the backend proxy.
// Default TTL comfortably covers a long video (one URL serves all range requests).
export async function createMediaUrl(storageKey, { expiresIn = 14400 } = {}) {
  if (!storageKey) return null
  // Local dev (no CDN/S3) → stable proxy URL, nothing to sign or memoize.
  if (!cloudFrontEnabled() && !s3Enabled()) return `http://localhost:${env.port}/api/files/local/${storageKey}`

  // Memoize the signed URL. Signing bakes a fresh Date.now() expiry into each URL,
  // so without this the SAME image got a brand-new URL on every response and the
  // browser re-downloaded every thumbnail on every page load. Returning a STABLE
  // URL for a window well under its own TTL makes media browser-cacheable and
  // skips the per-item re-signing cost on list endpoints.
  const cacheTtl = Math.max(30, Math.min(3600, Math.floor(expiresIn / 4)))
  const cacheKey = `mediaurl:${expiresIn}:${storageKey}`
  const hit = cache.get(cacheKey)
  if (hit !== undefined) return hit

  const url = cloudFrontEnabled()
    ? signCloudFrontUrl(storageKey, { expiresIn })
    : await presignGetUrl(storageKey, { expiresIn, contentType: mimeFor(storageKey) })
  cache.set(cacheKey, url, cacheTtl)
  return url
}

// ── Reads ────────────────────────────────────────────────────────────────────

// → { size } in bytes, or null if the object is missing.
export async function statObject(storageKey) {
  if (s3Enabled()) return headObject(storageKey)
  const full = localPath(storageKey)
  return full && fs.existsSync(full) ? { size: fs.statSync(full).size } : null
}

// → a Node Readable stream (optionally a byte range for video seeking), or null.
export async function readObjectStream(storageKey, opts = {}) {
  if (s3Enabled()) return getObjectStream(storageKey, opts)
  const full = localPath(storageKey)
  if (!full || !fs.existsSync(full)) return null
  return fs.createReadStream(full, opts)
}

// → the whole object as a Buffer (used for on-the-fly PDF watermarking), or null.
export async function readObjectBuffer(storageKey) {
  if (s3Enabled()) return getObjectBuffer(storageKey)
  const full = localPath(storageKey)
  return full && fs.existsSync(full) ? fs.readFileSync(full) : null
}

// Best-effort delete of a stored object (S3 or local). Never throws.
export async function removeObject(storageKey) {
  if (!storageKey) return
  if (s3Enabled()) return deleteObject(storageKey)
  try {
    const full = localPath(storageKey)
    if (full && fs.existsSync(full)) fs.unlinkSync(full)
  } catch {
    /* best-effort */
  }
}
