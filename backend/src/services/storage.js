import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { customAlphabet } from 'nanoid'
import { env } from '../config/env.js'
import { s3Enabled, putObject, headObject, getObjectStream, getObjectBuffer, deleteObject } from './s3.js'

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
