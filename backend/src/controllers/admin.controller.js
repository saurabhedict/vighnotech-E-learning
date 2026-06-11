import { z } from 'zod'
import { CONTENT_TYPES, CONTENT_LANES, USER_ROLES, ROLES, defaultLaneForType } from '@vigno/shared'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound, forbidden } from '../utils/ApiError.js'
import { slugify } from '../utils/slugify.js'
import { REPORTS, exportReport } from '../services/reports.js'
import { Coupon } from '../models/Coupon.js'
import { creditWallet } from '../services/commerce.js'
import { revokeLicense } from '../services/licenseAuthority.js'
import { cache } from '../services/cache.js'
import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'
import { Purchase } from '../models/Purchase.js'
import { User } from '../models/User.js'
import { AuditLog } from '../models/AuditLog.js'
import { saveBuffer, saveEncryptedBuffer, removeObject, statObject, directUploadSupported, createDirectUpload } from '../services/storage.js'
import { submitHlsJob, mediaConvertEnabled } from '../services/mediaconvert.js'
import { deriveContentKey, newSalt } from '../services/contentCrypto.js'

const KINDS = ['board', 'class', 'course', 'subject', 'module', 'chapter']

// ── Tree nodes (CMS content tree) ────────────────────────────────────────────
export const createNodeSchema = z.object({
  kind: z.enum(KINDS),
  name: z.string().trim().min(1).max(160),
  parentId: z.string().length(24).nullable().optional(),
  slug: z.string().trim().optional(),
  order: z.number().int().optional(),
})

async function resolveCourseKey(parentId, kind, slug) {
  if (kind === 'course') return slug
  if (!parentId) return undefined
  const parent = await TreeNode.findById(parentId)
  return parent?.courseKey
}

export const createNode = asyncHandler(async (req, res) => {
  const { kind, name, parentId = null, order } = req.body
  let { slug } = req.body
  if (kind === 'course') slug = slug || slugify(name)
  if (parentId) {
    const parent = await TreeNode.findById(parentId)
    if (!parent) throw badRequest('Parent node not found')
  }
  const courseKey = await resolveCourseKey(parentId, kind, slug)
  const node = await TreeNode.create({ kind, name, parentId, slug, courseKey, order: order ?? 0 })
  if (kind === 'course') cache.del('courses:slugs')
  audit(req, 'cms.node.create', { targetType: 'TreeNode', targetId: node._id, meta: { kind, name } })
  res.status(201).json(node)
})

export const updateNode = asyncHandler(async (req, res) => {
  const node = await TreeNode.findById(req.params.id)
  if (!node) throw notFound('Node not found')
  const { name, slug, order } = req.body
  if (name !== undefined) node.name = name
  if (slug !== undefined) node.slug = slug
  if (order !== undefined) node.order = order
  await node.save()
  if (node.kind === 'course') cache.del('courses:slugs') // renamed slug must refresh the catalog list
  audit(req, 'cms.node.update', { targetType: 'TreeNode', targetId: node._id })
  res.json(node)
})

// Recursive delete: node + descendants + their content.
export const deleteNode = asyncHandler(async (req, res) => {
  const root = await TreeNode.findById(req.params.id)
  if (!root) throw notFound('Node not found')

  const toDelete = [root._id]
  let frontier = [root._id]
  while (frontier.length) {
    const children = await TreeNode.find({ parentId: { $in: frontier } }).select('_id').lean()
    const ids = children.map((c) => c._id)
    if (!ids.length) break
    toDelete.push(...ids)
    frontier = ids
  }
  await Content.deleteMany({ chapterId: { $in: toDelete } })
  await TreeNode.deleteMany({ _id: { $in: toDelete } })
  cache.del('courses:slugs')
  audit(req, 'cms.node.delete', { targetType: 'TreeNode', targetId: root._id, meta: { removed: toDelete.length } })
  res.json({ ok: true, removed: toDelete.length })
})

// Reorder siblings (drag-drop). Body: { ids: [orderedNodeIds] }
export const reorderSchema = z.object({ ids: z.array(z.string().length(24)).min(1) })
export const reorderNodes = asyncHandler(async (req, res) => {
  const { ids } = req.body
  await Promise.all(ids.map((id, i) => TreeNode.updateOne({ _id: id }, { order: i })))
  audit(req, 'cms.node.reorder', { meta: { count: ids.length } })
  res.json({ ok: true })
})

// ── Content (leaf files) ─────────────────────────────────────────────────────
export const createContentSchema = z.object({
  chapterId: z.string().length(24),
  title: z.string().trim().min(1).max(200),
  description: z.string().max(2000).optional(),
  type: z.enum(CONTENT_TYPES),
  lane: z.enum(CONTENT_LANES).optional(),
  isPaid: z.boolean().optional(),
  price: z.number().min(0).optional(),
  externalUrl: z.string().url().optional(),
  order: z.number().int().optional(),
})

export const createContent = asyncHandler(async (req, res) => {
  const body = req.body
  const chapter = await TreeNode.findOne({ _id: body.chapterId, kind: 'chapter' })
  if (!chapter) throw badRequest('chapterId must reference a chapter node')
  const content = await Content.create({
    ...body,
    courseKey: chapter.courseKey,
    lane: body.lane || defaultLaneForType(body.type),
  })
  audit(req, 'cms.content.create', { targetType: 'Content', targetId: content._id })
  res.status(201).json(content)
})

export const updateContent = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  const allowed = ['title', 'description', 'type', 'lane', 'isPaid', 'price', 'externalUrl', 'order', 'published', 'tags', 'thumbnail']
  for (const k of allowed) if (req.body[k] !== undefined) content[k] = req.body[k]
  await content.save()
  audit(req, 'cms.content.update', { targetType: 'Content', targetId: content._id })
  res.json(content)
})

export const deleteContent = asyncHandler(async (req, res) => {
  const content = await Content.findByIdAndDelete(req.params.id)
  if (!content) throw notFound('Content not found')
  audit(req, 'cms.content.delete', { targetType: 'Content', targetId: req.params.id })
  res.json({ ok: true })
})

// Start an adaptive-HLS transcode for a freshly uploaded video (no-op unless it's
// a video AND MediaConvert is configured). Sets content.hls accordingly. A submit
// failure never blocks the upload — playback simply falls back to progressive MP4.
async function maybeTranscodeVideo(content, storageKey) {
  content.hls = { status: null, jobId: '', masterKey: '', error: '' }
  if (content.type === 'video' && mediaConvertEnabled()) {
    try {
      const { jobId, masterKey } = await submitHlsJob({ inputKey: storageKey, contentId: content._id.toString() })
      content.hls = { status: 'processing', jobId, masterKey, error: '' }
    } catch (e) {
      content.hls = { status: 'failed', jobId: '', masterKey: '', error: e?.message || 'transcode submit failed' }
    }
  }
}

// POST /admin/content/:id/upload — multipart file streamed THROUGH the server.
// Used for the encrypted download lane (games), and as a fallback for the stream
// lane when S3 (and thus direct upload) isn't configured.
export const uploadContentFile = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('No file uploaded (field name: "file")')
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')

  // Re-upload replaces the file — remember the old object so we can free it after.
  const previousKey = content.storageKey

  if (content.lane === 'download') {
    // Encrypt at rest (AES-256-GCM). The launcher fetches the key + iv/tag and
    // decrypts in memory after a license + device check.
    const salt = newSalt()
    const key = deriveContentKey(content._id.toString(), salt)
    const { storageKey, iv, tag, sizeBytes } = await saveEncryptedBuffer(req.file.buffer, key)
    content.storageKey = storageKey
    content.sizeBytes = sizeBytes
    content.enc = { encrypted: true, iv, tag, salt }
  } else {
    const { storageKey, sizeBytes } = await saveBuffer(req.file.buffer, req.file.originalname)
    content.storageKey = storageKey
    content.sizeBytes = sizeBytes
    content.enc = { encrypted: false }
    await maybeTranscodeVideo(content, storageKey)
  }
  content.externalUrl = ''
  await content.save()
  // Free the replaced object (best-effort) so S3/disk doesn't accumulate orphans.
  if (previousKey && previousKey !== content.storageKey) await removeObject(previousKey)
  audit(req, 'cms.content.upload', { targetType: 'Content', targetId: content._id, meta: { encrypted: content.lane === 'download' } })
  res.json({ ok: true, encrypted: content.lane === 'download', hls: content.lane === 'download' ? null : content.hls?.status || null })
})

// POST /admin/content/:id/upload-url — mint a presigned URL for a DIRECT
// browser→S3 upload (stream lane only; the download lane needs server-side
// encryption). Returns { supported:false } when S3 is off or lane is download,
// so the client falls back to the through-the-server upload above.
export const getContentUploadUrl = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  if (content.lane === 'download' || !directUploadSupported()) {
    return res.json({ supported: false })
  }
  const { storageKey, url } = await createDirectUpload(req.body?.filename || '')
  res.json({ supported: true, url, storageKey })
})

// POST /admin/content/:id/upload-complete — record an object the browser just
// PUT directly to S3. We confirm it actually exists before pointing content at it.
export const completeContentUploadSchema = z.object({
  // Must match the obj_<20> key shape minted in createDirectUpload (no traversal).
  storageKey: z.string().regex(/^obj_[a-z0-9]{20}(\.[a-z0-9]+)?$/),
})
export const completeContentUpload = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  if (content.lane === 'download') throw badRequest('Download-lane content must use the encrypted upload')

  const { storageKey } = req.body
  const stat = await statObject(storageKey)
  if (!stat) throw badRequest('Upload not found in storage — did the PUT succeed?')

  const previousKey = content.storageKey
  content.storageKey = storageKey
  content.sizeBytes = stat.size
  content.enc = { encrypted: false }
  content.externalUrl = ''
  await maybeTranscodeVideo(content, storageKey)
  await content.save()
  if (previousKey && previousKey !== storageKey) await removeObject(previousKey)
  audit(req, 'cms.content.upload', { targetType: 'Content', targetId: content._id, meta: { direct: true } })
  res.json({ ok: true, hls: content.hls?.status || null })
})

// ── Dashboard (LLD: Admin Dashboard & Reports) ───────────────────────────────
export const stats = asyncHandler(async (_req, res) => {
  const data = await cache.wrap('admin:stats', 15, async () => {
    const [users, contents, paid, activeLicenses, revenueAgg] = await Promise.all([
      User.countDocuments(),
      Content.countDocuments(),
      Purchase.countDocuments({ status: 'paid' }),
      License.countDocuments({ status: 'active' }),
      Purchase.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
    ])
    return { users, contents, purchases: paid, activeLicenses, revenue: revenueAgg[0]?.total || 0 }
  })
  res.json(data)
})

export const recentAudit = asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const [logs, total] = await Promise.all([
    AuditLog.find().sort({ time: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    AuditLog.estimatedDocumentCount(),
  ])
  res.json({ logs, page, limit, total })
})

// ── Tree / content browse (for the CMS UI) ───────────────────────────────────
export const listNodes = asyncHandler(async (req, res) => {
  const filter = {}
  if (req.query.parentId) filter.parentId = req.query.parentId
  else if (req.query.parentId === 'null' || req.query.root === 'true') filter.parentId = null
  if (req.query.kind) filter.kind = req.query.kind
  const nodes = await TreeNode.find(filter).sort({ order: 1, name: 1 }).lean()
  res.json({ nodes })
})

export const listContentByChapter = asyncHandler(async (req, res) => {
  const items = await Content.find({ chapterId: req.params.chapterId }).sort({ order: 1 }).lean()
  res.json({ items })
})

// ── User management (LLD: Admin Management) ──────────────────────────────────
export const listUsers = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim()
  const rx = q ? { $regex: q, $options: 'i' } : null
  const filter = rx ? { $or: [{ email: rx }, { name: rx }, { phone: rx }] } : {}
  const page = Math.max(1, Number(req.query.page) || 1)
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const [users, total] = await Promise.all([
    User.find(filter)
      .select('email name phone role emailVerified phoneVerified twoFAEnabled createdAt lastLoginAt avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    User.countDocuments(filter),
  ])
  res.json({ users, page, limit, total })
})

export const setUserRoleSchema = z.object({ role: z.enum(USER_ROLES) })

export const setUserRole = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id)
  if (!target) throw notFound('User not found')
  const { role } = req.body

  const roleChanged = target.role !== role
  // Last-admin guard: never leave the system with zero admins.
  if (target.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const admins = await User.countDocuments({ role: ROLES.ADMIN })
    if (admins <= 1) throw forbidden('Cannot demote the last remaining admin')
    if (target._id.toString() === req.user.id) throw forbidden('Admins cannot demote themselves')
  }
  target.role = role
  await target.save()
  // Bump tokenVersion (atomic) so the demoted/promoted user's sessions are invalidated.
  if (roleChanged) await User.findByIdAndUpdate(target._id, { $inc: { tokenVersion: 1 } })
  audit(req, 'admin.user.role', { targetType: 'User', targetId: target._id, meta: { role } })
  res.json({ ok: true, user: { id: target._id, email: target.email, role: target.role } })
})

// DELETE /admin/users/:id — remove a user and their personal records.
export const deleteUser = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id)
  if (!target) throw notFound('User not found')
  if (target._id.toString() === req.user.id) throw forbidden('You cannot delete your own account')
  if (target.role === ROLES.ADMIN) {
    const admins = await User.countDocuments({ role: ROLES.ADMIN })
    if (admins <= 1) throw forbidden('Cannot delete the last remaining admin')
  }
  // Clean up the user's personal data (licenses/purchases/devices/favorites/progress).
  await Promise.all([
    License.deleteMany({ userId: target._id }),
    Purchase.deleteMany({ userId: target._id }),
    import('../models/Device.js').then((m) => m.Device.deleteMany({ userId: target._id })),
    import('../models/Favorite.js').then((m) => m.Favorite.deleteMany({ userId: target._id })).catch(() => {}),
    import('../models/Progress.js').then((m) => m.Progress.deleteMany({ userId: target._id })).catch(() => {}),
  ])
  await target.deleteOne()
  audit(req, 'admin.user.delete', { targetType: 'User', targetId: target._id, meta: { email: target.email } })
  res.json({ ok: true })
})

// ── Reports + export ─────────────────────────────────────────────────────────
export const getReport = asyncHandler(async (req, res) => {
  const fn = REPORTS[req.params.type]
  if (!fn) throw badRequest('Unknown report type')
  res.json(await fn())
})

export const exportReportHandler = asyncHandler(async (req, res) => {
  const fn = REPORTS[req.params.type]
  if (!fn) throw badRequest('Unknown report type')
  const format = ['csv', 'xlsx', 'pdf'].includes(req.query.format) ? req.query.format : 'csv'
  const report = await fn()
  const { buffer, type, ext } = await exportReport(report, format)
  audit(req, 'admin.report.export', { meta: { type: req.params.type, format } })
  res.set('Content-Type', type)
  res.set('Content-Disposition', `attachment; filename="${req.params.type}-report.${ext}"`)
  res.send(buffer)
})

// ── Coupons (LLD: Coupons/Codes) ─────────────────────────────────────────────
export const createCouponSchema = z.object({
  code: z.string().trim().min(3).max(40),
  kind: z.enum(['percent', 'flat']),
  value: z.number().positive(),
  maxRedemptions: z.number().int().min(0).optional(),
  expiresAt: z.string().datetime().optional(),
  active: z.boolean().optional(),
})

export const createCoupon = asyncHandler(async (req, res) => {
  const body = { ...req.body, code: req.body.code.toUpperCase() }
  if (body.expiresAt) body.expiresAt = new Date(body.expiresAt)
  const coupon = await Coupon.create(body)
  audit(req, 'admin.coupon.create', { targetType: 'Coupon', targetId: coupon._id, meta: { code: coupon.code } })
  res.status(201).json(coupon)
})

export const listCoupons = asyncHandler(async (_req, res) => {
  res.json({ coupons: await Coupon.find().sort({ createdAt: -1 }).lean() })
})

export const deleteCoupon = asyncHandler(async (req, res) => {
  const c = await Coupon.findByIdAndDelete(req.params.id)
  if (!c) throw notFound('Coupon not found')
  res.json({ ok: true })
})

// ── Refunds (LLD: Refunds → revoke) ──────────────────────────────────────────
export const refundPurchase = asyncHandler(async (req, res) => {
  const { Purchase } = await import('../models/Purchase.js')
  // Atomically claim the refund so concurrent/duplicate calls can't double-credit.
  const claimed = await Purchase.findOneAndUpdate(
    { _id: req.params.id, status: 'paid' },
    { $set: { status: 'refunded', refundedAt: new Date() } },
    { new: true }
  )
  if (!claimed) throw badRequest('Only a paid, un-refunded purchase can be refunded')

  // 1) Revoke the license so access stops on the next verify.
  if (claimed.licenseId) await revokeLicense(claimed.licenseId, 'refund')
  // 2) Refund to the buyer's wallet as store credit (records a ledger entry).
  const buyer = await User.findById(claimed.userId)
  if (buyer) await creditWallet(buyer, claimed.amount, { type: 'refund', note: 'Refund', ref: String(claimed._id) })
  // 3) Release the coupon redemption slot, if any.
  if (claimed.couponCode) await Coupon.updateOne({ code: claimed.couponCode, redeemed: { $gt: 0 } }, { $inc: { redeemed: -1 } })

  audit(req, 'admin.refund', { targetType: 'Purchase', targetId: claimed._id, meta: { amount: claimed.amount } })
  res.json({ ok: true, refunded: claimed.amount, licenseRevoked: !!claimed.licenseId })
})
