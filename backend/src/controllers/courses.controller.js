import { asyncHandler } from '../utils/asyncHandler.js'
import { notFound } from '../utils/ApiError.js'
import { Content } from '../models/Content.js'
import { listCourseSlugs, getCourseTree, getModule } from '../services/contentTree.js'
import { hasActiveLicense } from '../services/licenseAuthority.js'
import { buildStreamUrl, buildHlsUrl } from '../services/signedUrl.js'
import { createMediaUrl } from '../services/storage.js'
import { cache } from '../services/cache.js'

// GET /courses → ["PPL_Ground", ...] (matches frontend fetchClasses). Cached.
// The course catalog/tree is non-personalized (same for everyone — only paid
// flags, no per-user ownership), so let browsers cache it briefly and skip the
// revalidation round-trip on back-and-forth browsing.
const CATALOG_CACHE = 'public, max-age=30, stale-while-revalidate=60'

export const listCourses = asyncHandler(async (_req, res) => {
  res.set('Cache-Control', CATALOG_CACHE)
  res.json(await cache.wrap('courses:slugs', 30, listCourseSlugs))
})

// GET /courses/:className/tree
export const courseTree = asyncHandler(async (req, res) => {
  const tree = await getCourseTree(req.params.className)
  if (!tree) throw notFound('Course not found')
  res.set('Cache-Control', CATALOG_CACHE)
  res.json(tree)
})

// GET /courses/:className/modules/:moduleId
export const moduleView = asyncHandler(async (req, res) => {
  const mod = await getModule(req.params.className, req.params.moduleId)
  if (!mod) throw notFound('Module not found')
  res.set('Cache-Control', CATALOG_CACHE)
  res.json(mod)
})

/**
 * GET /contents/:contentId
 * Returns viewer-ready media for FREE or OWNED content; for paid-and-unowned
 * content returns catalog info + `locked:true` (no media) so the UI can prompt
 * to buy. This is the server-side ownership check of the stream lane (Doc 1 §6).
 */
export const getContent = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.contentId)
  if (!content || !content.published) throw notFound('Content not found')

  const owned = content.isPaid && req.user ? await hasActiveLicense(req.user.id, content._id) : false
  const accessible = !content.isPaid || owned

  const base = {
    id: content._id.toString(),
    title: content.title,
    type: content.type,
    lane: content.lane,
    paid: content.isPaid,
    price: content.price,
  }

  if (!accessible) {
    return res.json({ ...base, locked: true })
  }

  // Download lane: no inline media — the launcher fetches an encrypted file + key.
  if (content.lane === 'download') {
    return res.json({ ...base, locked: false, requiresLauncher: true })
  }

  // Stream lane: external demo stream, or a short-lived signed URL to our storage.
  if (content.externalUrl) {
    return res.json({
      ...base,
      locked: false,
      ...(content.type === 'video' ? { src: content.externalUrl } : { url: content.externalUrl }),
    })
  }

  const userId = req.user?.id || 'anon'

  // Adaptive HLS ready → serve the multi-bitrate master playlist (proxied + signed).
  // While transcoding/failed, fall through to the progressive MP4 below so the
  // video still plays immediately.
  if (content.type === 'video' && content.hls?.status === 'ready' && content.hls.masterKey) {
    const src = buildHlsUrl(req, { contentId: content._id.toString(), userId })
    return res.json({ ...base, locked: false, src, hls: true })
  }

  // Progressive video → hand a CDN/direct media URL (CloudFront edge-cache when
  // configured, else presigned S3) so the player gets fast, native byte-range
  // seeking with no backend proxy hop (which was causing constant re-buffering).
  // The drifting email watermark still applies; ownership was verified above.
  if (content.type === 'video' && content.storageKey) {
    const direct = await createMediaUrl(content.storageKey)
    if (direct) {
      return res.json({
        ...base,
        locked: false,
        src: direct,
        ...(content.hls?.status === 'processing' ? { transcoding: true } : {}),
      })
    }
  }

  const signed = buildStreamUrl(req, {
    contentId: content._id.toString(),
    storageKey: content.storageKey,
    userId,
  })
  res.json({
    ...base,
    locked: false,
    ...(content.type === 'video' ? { src: signed } : { url: signed }),
    ...(content.type === 'video' && content.hls?.status === 'processing' ? { transcoding: true } : {}),
  })
})
