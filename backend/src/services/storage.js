import fs from 'node:fs'
import crypto from 'node:crypto'
import path from 'node:path'
import { customAlphabet } from 'nanoid'
import { env } from '../config/env.js'

/**
 * Local object storage — stand-in for AWS S3 with SSE-KMS (Doc 2 §1, §8).
 * Files live OUTSIDE any static route; they are only reachable through the
 * signed-URL-checked stream route. In production, replace save()/readStream()
 * with S3 putObject/getObject and serve via CloudFront signed URLs.
 */

const storageDir = path.resolve(process.cwd(), env.storageDir)
const objectsDir = path.join(storageDir, 'objects')
const newName = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 20)

function ensure() {
  fs.mkdirSync(objectsDir, { recursive: true })
}

// Persist an uploaded buffer; returns a storageKey to put on the Content doc.
export function saveBuffer(buffer, originalName = '') {
  ensure()
  const ext = path.extname(originalName).toLowerCase().replace(/[^.a-z0-9]/g, '')
  const key = `obj_${newName()}${ext}`
  fs.writeFileSync(path.join(objectsDir, key), buffer)
  return { storageKey: key, sizeBytes: buffer.length }
}

// Encrypt a buffer with AES-256-GCM and persist the ciphertext (download lane).
// Returns the storageKey plus the iv/tag needed to decrypt later.
export function saveEncryptedBuffer(buffer, keyBuf) {
  ensure()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', keyBuf, iv)
  const ciphertext = Buffer.concat([cipher.update(buffer), cipher.final()])
  const tag = cipher.getAuthTag()
  const key = `obj_${newName()}.enc`
  fs.writeFileSync(path.join(objectsDir, key), ciphertext)
  return {
    storageKey: key,
    iv: iv.toString('base64'),
    tag: tag.toString('base64'),
    sizeBytes: ciphertext.length,
  }
}

export function resolveKey(storageKey) {
  // Guard against path traversal — keys are flat names only.
  const safe = path.basename(storageKey || '')
  const full = path.join(objectsDir, safe)
  if (!full.startsWith(objectsDir)) return null
  return fs.existsSync(full) ? full : null
}

export function statKey(storageKey) {
  const full = resolveKey(storageKey)
  return full ? fs.statSync(full) : null
}

export function readStream(storageKey, opts) {
  const full = resolveKey(storageKey)
  return full ? fs.createReadStream(full, opts) : null
}
