import crypto from 'node:crypto'
import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound, paymentRequired, forbidden } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { Content } from '../models/Content.js'
import { Device } from '../models/Device.js'
import { hasActiveLicense, verifyToken } from '../services/licenseAuthority.js'
import { buildStreamUrl, verifySignedToken } from '../services/signedUrl.js'
import { resolveKey, statKey, readStream } from '../services/storage.js'

const MIME = {
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
}
const mimeFor = (key) => MIME[(key.match(/\.[a-z0-9]+$/i) || ['.bin'])[0].toLowerCase()] || 'application/octet-stream'

// Pipe a file read stream to the response with proper error handling so a
// mid-transfer storage failure can never crash the process (unhandled 'error').
function pipeWithErrors(rs, res, next) {
  if (!rs) return next(notFound('File missing from storage'))
  rs.on('error', (e) => {
    if (res.headersSent) res.destroy(e)
    else next(e)
  })
  rs.pipe(res)
}

/**
 * GET /content/:id/stream-url — ownership check → short-lived signed URL
 * (study-material stream lane, Doc 2 §5). Free content is open; paid content
 * requires an active license.
 */
export const getStreamUrl = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content || !content.published) throw notFound('Content not found')
  if (content.lane !== 'stream') throw badRequest('This content uses the download lane')

  if (content.isPaid) {
    const owns = await hasActiveLicense(req.user.id, content._id)
    if (owns === false) throw paymentRequired()
  }
  if (!content.storageKey && content.externalUrl) {
    return res.json({ url: content.externalUrl, external: true })
  }
  if (!content.storageKey) throw notFound('No file uploaded for this content')

  const url = buildStreamUrl(req, {
    contentId: content._id.toString(),
    storageKey: content.storageKey,
    userId: req.user.id,
    ttlSec: env.license.signedUrlTtl,
  })
  audit(req, 'file.stream_url', { targetType: 'Content', targetId: content._id })
  res.json({ url, expiresInSec: env.license.signedUrlTtl })
})

/**
 * GET /files/:contentId/stream?token=... — the actual byte delivery. Validates
 * the signed token (binds storageKey + exp), supports HTTP range for video.
 * Not a static route → files are unreachable without a fresh signed token.
 */
export const streamFile = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.contentId)
  if (!content) throw notFound('Content not found')

  const result = verifySignedToken(req.query.token)
  if (!result.valid) throw forbidden(`Signed URL ${result.reason}`)
  // Bind the token to BOTH the content id and the storage key, so a token can
  // never be replayed for a different content item (even one sharing a file).
  if (result.payload.c !== content._id.toString() || result.payload.k !== content.storageKey)
    throw forbidden('Token does not match content')

  const full = resolveKey(content.storageKey)
  if (!full) throw notFound('File missing from storage')
  const stat = statKey(content.storageKey)
  const type = mimeFor(content.storageKey)

  // Never let secure content be cached by intermediaries.
  res.set('Cache-Control', 'private, no-store')
  res.set('Content-Type', type)

  // Only honor a well-formed byte range; anything else falls through to full file.
  const m = req.headers.range ? /bytes=(\d+)-(\d*)/.exec(req.headers.range) : null
  if (m && stat) {
    const start = Number(m[1])
    const end = m[2] ? Number(m[2]) : stat.size - 1
    res.status(206)
    res.set('Content-Range', `bytes ${start}-${end}/${stat.size}`)
    res.set('Accept-Ranges', 'bytes')
    res.set('Content-Length', String(end - start + 1))
    return pipeWithErrors(readStream(content.storageKey, { start, end }), res, next)
  }

  if (stat) res.set('Content-Length', String(stat.size))
  pipeWithErrors(readStream(content.storageKey), res, next)
})

// ── Download lane (launcher) ─────────────────────────────────────────────────

// GET /content/:id/download?token=licenseToken&deviceId=... — encrypted bytes.
export const downloadEncrypted = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  if (content.lane !== 'download') throw badRequest('This content uses the stream lane')

  const owns = await hasActiveLicense(req.user.id, content._id)
  if (!owns) throw paymentRequired()
  if (!content.storageKey) throw notFound('No file uploaded for this content')

  // In production this object is encrypted at rest (S3 SSE-KMS); the launcher
  // keeps it encrypted on disk and only decrypts in memory after fetching a key.
  res.set('Cache-Control', 'private, no-store')
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', `attachment; filename="${content._id}.enc"`)
  audit(req, 'file.download', { targetType: 'Content', targetId: content._id })
  pipeWithErrors(readStream(content.storageKey), res, next)
})

/**
 * POST /content/:id/key — launcher verifies license + device, gets the
 * decryption key (Doc 2 §6). Patching the launcher's "always true" check is
 * useless because the KEY itself comes from the server only after verification.
 */
export const keySchema = z.object({
  token: z.string().min(10), // the signed license token
  deviceId: z.string().length(24),
})

export const getDecryptionKey = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')

  const { token, deviceId } = req.body
  const device = await Device.findOne({ _id: deviceId, userId: req.user.id })
  if (!device) throw forbidden('Unknown device')

  const result = await verifyToken(token, { deviceId })
  if (!result.valid) {
    audit(req, 'file.key.deny', { targetType: 'Content', targetId: content._id, meta: { reason: result.reason } })
    throw forbidden(`License ${result.reason}`)
  }
  // The license must belong to the calling user (the token is a capability, so
  // never trust it alone) and match this content.
  if (result.license.userId.toString() !== req.user.id.toString())
    throw forbidden('License does not belong to you')
  if (result.license.contentId.toString() !== content._id.toString())
    throw forbidden('License is for different content')

  // First-use device binding for the download lane (console "home device").
  if (result.needsBinding) {
    result.license.deviceId = device._id
    await result.license.save()
  }

  // Per-content key derived from a DEDICATED secret (not the URL-signing one).
  // The key material never leaves the server except this short-lived, license-
  // and device-gated response.
  const key = crypto
    .createHmac('sha256', env.license.contentKeySecret)
    .update(`content-key:${content._id}:${content.storageKey}`)
    .digest('base64')

  device.lastSeenAt = new Date()
  await device.save()
  audit(req, 'file.key.grant', { targetType: 'Content', targetId: content._id })
  res.json({ key, alg: 'aes-256-gcm', expiresInSec: 300 })
})
