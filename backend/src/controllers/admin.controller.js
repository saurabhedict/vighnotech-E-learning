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
import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'
import { Purchase } from '../models/Purchase.js'
import { User } from '../models/User.js'
import { AuditLog } from '../models/AuditLog.js'
import { saveBuffer } from '../services/storage.js'

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

// POST /admin/content/:id/upload — multipart file → storage (S3 stand-in).
export const uploadContentFile = asyncHandler(async (req, res) => {
  if (!req.file) throw badRequest('No file uploaded (field name: "file")')
  const content = await Content.findById(req.params.id)
  if (!content) throw notFound('Content not found')
  const { storageKey, sizeBytes } = saveBuffer(req.file.buffer, req.file.originalname)
  content.storageKey = storageKey
  content.sizeBytes = sizeBytes
  content.externalUrl = '' // now served from our storage
  await content.save()
  audit(req, 'cms.content.upload', { targetType: 'Content', targetId: content._id, meta: { sizeBytes } })
  res.json({ ok: true, storageKey, sizeBytes })
})

// ── Dashboard (LLD: Admin Dashboard & Reports) ───────────────────────────────
export const stats = asyncHandler(async (_req, res) => {
  const [users, contents, paid, activeLicenses, revenueAgg] = await Promise.all([
    User.countDocuments(),
    Content.countDocuments(),
    Purchase.countDocuments({ status: 'paid' }),
    License.countDocuments({ status: 'active' }),
    Purchase.aggregate([{ $match: { status: 'paid' } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
  ])
  res.json({
    users,
    contents,
    purchases: paid,
    activeLicenses,
    revenue: revenueAgg[0]?.total || 0,
  })
})

export const recentAudit = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 50, 200)
  const logs = await AuditLog.find().sort({ time: -1 }).limit(limit).lean()
  res.json({ logs })
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
  const filter = q ? { email: { $regex: q, $options: 'i' } } : {}
  const users = await User.find(filter).select('email name role emailVerified twoFAEnabled createdAt lastLoginAt').sort({ createdAt: -1 }).limit(200).lean()
  res.json({ users })
})

export const setUserRoleSchema = z.object({ role: z.enum(USER_ROLES) })

export const setUserRole = asyncHandler(async (req, res) => {
  const target = await User.findById(req.params.id)
  if (!target) throw notFound('User not found')
  const { role } = req.body

  // Last-admin guard: never leave the system with zero admins.
  if (target.role === ROLES.ADMIN && role !== ROLES.ADMIN) {
    const admins = await User.countDocuments({ role: ROLES.ADMIN })
    if (admins <= 1) throw forbidden('Cannot demote the last remaining admin')
    if (target._id.toString() === req.user.id) throw forbidden('Admins cannot demote themselves')
  }
  target.role = role
  if (role !== target.role) target.tokenVersion += 1
  await target.save()
  audit(req, 'admin.user.role', { targetType: 'User', targetId: target._id, meta: { role } })
  res.json({ ok: true, user: { id: target._id, email: target.email, role: target.role } })
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
  const purchase = await Purchase.findById(req.params.id)
  if (!purchase) throw notFound('Purchase not found')
  if (purchase.status !== 'paid') throw badRequest('Only paid purchases can be refunded')

  // 1) Revoke the license so access stops on the next verify.
  if (purchase.licenseId) await revokeLicense(purchase.licenseId, 'refund')
  // 2) Refund to the buyer's wallet as store credit (records a ledger entry).
  const buyer = await User.findById(purchase.userId)
  if (buyer) await creditWallet(buyer, purchase.amount, { type: 'refund', note: 'Refund', ref: String(purchase._id) })
  // 3) Mark refunded. (For Razorpay payments, also call the gateway refund API in prod.)
  purchase.status = 'refunded'
  purchase.refundedAt = new Date()
  await purchase.save()

  audit(req, 'admin.refund', { targetType: 'Purchase', targetId: purchase._id, meta: { amount: purchase.amount } })
  res.json({ ok: true, refunded: purchase.amount, licenseRevoked: !!purchase.licenseId })
})
