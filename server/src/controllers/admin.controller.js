import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound } from '../utils/ApiError.js'
import { slugify } from '../utils/slugify.js'
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
  type: z.enum(['pdf', 'video', '3d', 'game']),
  lane: z.enum(['stream', 'download']).optional(),
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
    lane: body.lane || (body.type === 'game' ? 'download' : 'stream'),
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
