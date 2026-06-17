import crypto from 'node:crypto'
import { z } from 'zod'
import { PDFDocument } from 'pdf-lib'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound, paymentRequired, forbidden } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { Content } from '../models/Content.js'
import { Device } from '../models/Device.js'
import { License } from '../models/License.js'
import { hasActiveLicense, verifyToken } from '../services/licenseAuthority.js'
import { buildStreamUrl, verifySignedToken, createSignedToken, hlsBundlePrefix } from '../services/signedUrl.js'
import { statObject, readObjectStream, readObjectBuffer, createMediaUrl } from '../services/storage.js'
import { cloudFrontEnabled, cloudFrontBundleBase, signCloudFrontWildcardQuery } from '../services/cloudfront.js'
import { getDrmPlayback } from '../services/drm.js'
import { deriveContentKey } from '../services/contentCrypto.js'
import { signGameToken } from '../services/gameLicense.js'

// GET /content/:id/drm-token — ownership-gated DRM playback descriptor.
// Returns { drm:false } when no provider/asset is configured (HLS fallback).
export const getDrmToken = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content || !content.published) throw notFound('Content not found')
  if (content.isPaid && !(await hasActiveLicense(req.user.id, content._id))) throw paymentRequired()
  const playback = await getDrmPlayback(content)
  res.json(playback ? { drm: true, ...playback } : { drm: false })
})

const MIME = {
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.glb': 'model/gltf-binary',
  '.bin': 'application/octet-stream',
}
const mimeFor = (key) => MIME[(key.match(/\.[a-z0-9]+$/i) || ['.bin'])[0].toLowerCase()] || 'application/octet-stream'

// Add watermark with user email to PDF
async function addPdfWatermark(pdfBuffer, email) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBuffer)
    const pages = pdfDoc.getPages()
    const helveticaFont = await pdfDoc.embedFont('Helvetica')

    for (const page of pages) {
      const { width, height } = page.getSize()

      // Add diagonal watermark text with user email
      page.drawText(email, {
        x: width / 6,
        y: height / 2,
        size: 48,
        font: helveticaFont,
        color: { red: 0.7, green: 0.7, blue: 0.7 },
        opacity: 0.25,
      })

      // Add footer with email
      page.drawText(`Licensed to: ${email}`, {
        x: 50,
        y: 20,
        size: 10,
        font: helveticaFont,
        color: { red: 0.5, green: 0.5, blue: 0.5 },
        opacity: 0.4,
      })
    }

    const watermarkedBytes = await pdfDoc.save()
    return Buffer.from(watermarkedBytes)
  } catch (error) {
    console.error('Error adding watermark to PDF:', error)
    throw error
  }
}

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

  const stat = await statObject(content.storageKey)
  if (!stat) throw notFound('File missing from storage')
  const type = mimeFor(content.storageKey)

  // Never let secure content be cached by intermediaries.
  res.set('Cache-Control', 'private, no-store')
  res.set('Content-Type', type)

  // Check if this is a PDF file - if so, add watermark with user email
  const isPdf = content.storageKey.toLowerCase().endsWith('.pdf')
  if (isPdf && req.user && req.user.email) {
    try {
      // Read the entire PDF object (from S3 or local disk)
      const pdfBuffer = await readObjectBuffer(content.storageKey)
      if (!pdfBuffer) throw notFound('File missing from storage')
      // Add watermark with user's email
      const watermarkedPdf = await addPdfWatermark(pdfBuffer, req.user.email)
      // Send watermarked PDF
      res.set('Content-Length', String(watermarkedPdf.length))
      res.set('Content-Disposition', `inline; filename="${content.storageKey}"`)
      audit(req, 'file.stream', { targetType: 'Content', targetId: content._id })
      return res.send(watermarkedPdf)
    } catch (error) {
      console.error('Error watermarking PDF:', error)
      // Fall through to regular streaming if watermarking fails
    }
  }

  // Only honor a well-formed byte range; anything else falls through to full file.
  const m = req.headers.range ? /bytes=(\d+)-(\d*)/.exec(req.headers.range) : null
  if (m && stat) {
    const start = Number(m[1])
    let end = m[2] ? Number(m[2]) : stat.size - 1
    end = Math.min(end, stat.size - 1)
    // Unsatisfiable range → 416 with the valid size, per RFC 7233.
    if (start >= stat.size || start > end) {
      res.set('Content-Range', `bytes */${stat.size}`)
      return res.status(416).end()
    }
    res.status(206)
    res.set('Content-Range', `bytes ${start}-${end}/${stat.size}`)
    res.set('Accept-Ranges', 'bytes')
    res.set('Content-Length', String(end - start + 1))
    return pipeWithErrors(await readObjectStream(content.storageKey, { start, end }), res, next)
  }

  if (stat) res.set('Content-Length', String(stat.size))
  pipeWithErrors(await readObjectStream(content.storageKey), res, next)
})

// ── Adaptive HLS proxy (private playback of MediaConvert output) ──────────────

/**
 * Rewrite an .m3u8 so every child URI is an absolute, authorized URL. MediaConvert
 * writes relative filenames; we turn each into:
 *   • a CloudFront-signed URL for heavy SEGMENTS (.ts) when CloudFront is on, so
 *     they stream edge-cached near the viewer (one wildcard signature covers all);
 *   • a backend signed-proxy URL for nested PLAYLISTS (.m3u8) — they're tiny and
 *     must pass back through here to get their own children rewritten.
 * Without CloudFront, everything flows through the backend proxy (token-signed).
 */
function rewriteHlsPlaylist(text, req, contentId, userId) {
  const backendBase = `${req.protocol}://${req.get('host')}/api/files/${contentId}/hls/`
  const token = createSignedToken({
    contentId,
    bundlePrefix: hlsBundlePrefix(contentId),
    userId,
    ttlSec: env.license.hlsTokenTtl,
  })
  const useCf = cloudFrontEnabled()
  const cfBase = useCf ? cloudFrontBundleBase(hlsBundlePrefix(contentId)) : null
  const cfQuery = useCf ? signCloudFrontWildcardQuery(hlsBundlePrefix(contentId), { expiresIn: env.license.hlsTokenTtl }) : null

  const signUri = (uri) => {
    if (/^https?:\/\//i.test(uri)) return uri
    if (useCf && !uri.endsWith('.m3u8')) return `${cfBase}${uri}?${cfQuery}` // segment → CDN
    return `${backendBase}${uri}?token=${encodeURIComponent(token)}` // playlist → backend
  }
  return text
    .split(/\r?\n/)
    .map((line) => {
      const t = line.trim()
      if (!t) return line
      // Tag lines: rewrite any URI="..." attribute (EXT-X-MEDIA / I-FRAME / KEY).
      if (t.startsWith('#')) return line.replace(/URI="([^"]+)"/g, (_, u) => `URI="${signUri(u)}"`)
      // Plain line: a variant-playlist or segment URI.
      return signUri(t)
    })
    .join('\n')
}

/**
 * GET /files/:contentId/hls/:asset?token=... — serves one object of an HLS bundle.
 * Playlists (.m3u8) are rewritten so child URIs stay signed; segments stream with
 * HTTP range support. The token is bound to the content + bundle prefix, so it can
 * only ever reach objects inside that one video's hls/<id>/ folder.
 */
export const streamHlsAsset = asyncHandler(async (req, res, next) => {
  const { contentId, asset } = req.params
  const content = await Content.findById(contentId)
  if (!content) throw notFound('Content not found')

  const result = verifySignedToken(req.query.token)
  if (!result.valid) throw forbidden(`Signed URL ${result.reason}`)
  if (result.payload.c !== contentId || result.payload.b !== hlsBundlePrefix(contentId))
    throw forbidden('Token does not match this HLS bundle')

  // Assets are flat filenames inside the bundle dir — reject anything else.
  if (!/^[a-zA-Z0-9._-]+$/.test(asset || '')) throw forbidden('Bad asset name')
  const key = `${hlsBundlePrefix(contentId)}${asset}`

  res.set('Cache-Control', 'private, no-store')

  if (asset.endsWith('.m3u8')) {
    const buf = await readObjectBuffer(key)
    if (!buf) throw notFound('Playlist not found')
    res.set('Content-Type', 'application/vnd.apple.mpegurl')
    return res.send(rewriteHlsPlaylist(buf.toString('utf8'), req, contentId, result.payload.u))
  }

  // Segment bytes (.ts) — range-enabled so the player can seek.
  const stat = await statObject(key)
  if (!stat) throw notFound('Segment not found')
  res.set('Content-Type', mimeFor(asset))
  const m = req.headers.range ? /bytes=(\d+)-(\d*)/.exec(req.headers.range) : null
  if (m) {
    const start = Number(m[1])
    let end = m[2] ? Number(m[2]) : stat.size - 1
    end = Math.min(end, stat.size - 1)
    if (start >= stat.size || start > end) {
      res.set('Content-Range', `bytes */${stat.size}`)
      return res.status(416).end()
    }
    res.status(206)
    res.set('Content-Range', `bytes ${start}-${end}/${stat.size}`)
    res.set('Accept-Ranges', 'bytes')
    res.set('Content-Length', String(end - start + 1))
    return pipeWithErrors(await readObjectStream(key, { start, end }), res, next)
  }
  res.set('Content-Length', String(stat.size))
  pipeWithErrors(await readObjectStream(key), res, next)
})

// ── Download lane (launcher) ─────────────────────────────────────────────────

// GET /content/:id/download?token=licenseToken&deviceId=... — encrypted bytes.
export const downloadEncrypted = asyncHandler(async (req, res, next) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  if (content.lane !== 'download') throw badRequest('This content uses the stream lane')

  const owns = await hasActiveLicense(req.user.id, content._id)
  if (!owns) throw paymentRequired()
  if (!content.storageKey) {
    if (content.enc?.status === 'encrypting') throw badRequest('This title is still being prepared — try again in a few minutes')
    throw notFound('No file uploaded for this content')
  }

  // In production this object is encrypted at rest (S3 SSE-KMS); the launcher
  // keeps it encrypted on disk and only decrypts in memory after fetching a key.
  res.set('Cache-Control', 'private, no-store')
  res.set('Content-Type', 'application/octet-stream')
  res.set('Content-Disposition', `attachment; filename="${content._id}.enc"`)
  audit(req, 'file.download', { targetType: 'Content', targetId: content._id })
  pipeWithErrors(await readObjectStream(content.storageKey), res, next)
})

// POST /content/:id/game-license — issue a device-bound, signed token the launcher
// writes into the extracted game. The game's LicenseGuard re-reads the local
// machine id and verifies our signature, so a copied game folder won't run on
// another PC. Ownership + device are checked before signing.
export const gameLicenseSchema = z.object({
  deviceId: z.string().length(24),
  machineId: z.string().min(4).max(256), // stable per-machine GUID from the launcher
})
export const getGameLicense = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  if (content.lane !== 'download') throw badRequest('Not a download-lane title')
  const { deviceId, machineId } = req.body
  const device = await Device.findOne({ _id: deviceId, userId: req.user.id })
  if (!device) throw forbidden('Unknown device')
  if (!(await hasActiveLicense(req.user.id, content._id))) throw paymentRequired()
  const token = signGameToken({ contentId: content._id.toString(), machineId, userId: req.user.id })
  audit(req, 'file.game_license', { targetType: 'Content', targetId: content._id })
  res.json({ token, fileName: env.security.licenseGuardFile, ttlMinutes: env.security.gameLicenseTtlMinutes })
})

// GET /content/:id/download-url — license-gated direct download. Returns a
// CDN/presigned URL to the ENCRYPTED object so the launcher streams it straight
// from S3 (fast, with progress, no backend proxy). The bytes stay encrypted; the
// decryption key is still gated separately by license + device.
export const getDownloadUrl = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  if (content.lane !== 'download') throw badRequest('This content uses the stream lane')
  const owns = await hasActiveLicense(req.user.id, content._id)
  if (!owns) throw paymentRequired()
  if (!content.storageKey) {
    if (content.enc?.status === 'encrypting') throw badRequest('This title is still being prepared — try again in a few minutes')
    throw notFound('No file uploaded for this content')
  }
  const url = await createMediaUrl(content.storageKey, { expiresIn: 3600 })
  if (!url) throw badRequest('Direct download unavailable (storage not configured)')
  const stat = await statObject(content.storageKey)
  audit(req, 'file.download_url', { targetType: 'Content', targetId: content._id })
  res.json({ url, sizeBytes: stat?.size || content.sizeBytes || 0 })
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

// Anti-sharing telemetry: if this user owns a download license for the content but
// it's bound to a DIFFERENT device than the requester, record the offending device
// and flag the license once too many distinct ones hit it. Non-destructive (the
// denial already blocks access) — the flag just surfaces sharing for admin review.
async function flagIfShared(req, contentId, userId, device) {
  const lic = await License.findOne({ userId, contentId, type: 'download', status: 'active' })
  if (!lic || !lic.deviceId || lic.deviceId.toString() === device._id.toString()) return
  if (lic.deniedDevices.includes(device.fingerprint)) return
  lic.deniedDevices.push(device.fingerprint)
  if (lic.deniedDevices.length >= env.security.licenseFlagThreshold && !lic.flagged) {
    lic.flagged = true
    lic.flaggedReason = `Key requested from ${lic.deniedDevices.length} unauthorized devices`
    audit(req, 'license.flagged', { targetType: 'License', targetId: lic._id, meta: { devices: lic.deniedDevices.length } })
  }
  await lic.save()
}

export const getDecryptionKey = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id).select('+enc.salt +enc.iv +enc.tag')
  if (!content) throw notFound('Content not found')

  const { token, deviceId } = req.body
  const device = await Device.findOne({ _id: deviceId, userId: req.user.id })
  if (!device) throw forbidden('Unknown device')

  const result = await verifyToken(token, { deviceId })
  if (!result.valid) {
    await flagIfShared(req, content._id, req.user.id, device)
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

  // Per-content key derived from a DEDICATED secret + per-content salt. The key
  // material never leaves the server except this short-lived, license- and
  // device-gated response. iv/tag let the launcher decrypt the GCM ciphertext.
  if (!content.enc?.encrypted) throw badRequest('Content is not encrypted (upload a file first)')
  const key = deriveContentKey(content._id.toString(), content.enc.salt).toString('base64')

  device.lastSeenAt = new Date()
  await device.save()
  audit(req, 'file.key.grant', { targetType: 'Content', targetId: content._id })
  // graceDays = server-controlled offline window the launcher caches the key for.
  res.json({ key, iv: content.enc.iv, tag: content.enc.tag, alg: 'aes-256-gcm', expiresInSec: 300, graceDays: env.license.graceDays })
})
