import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Favorite } from '../models/Favorite.js'
import { Progress } from '../models/Progress.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'
import { cache } from '../services/cache.js'
import { TreeNode } from '../models/TreeNode.js'
import { createMediaUrl } from '../services/storage.js'

// Only the fields resolveCard() needs — keeps list payloads small and avoids
// pulling heavy/secret-ish content fields (hls, drm, storageKey, tags…). Includes
// thumbnail + preview fields so the redesigned cards still render their imagery.
const CARD_FIELDS = 'title type lane isPaid price courseKey thumbnail thumbnailStorageKey previewText description'

const resolveCard = async (c) => {
  let thumbnailStorageKey = c.thumbnailStorageKey || ''
  let thumbnail = c.thumbnail || ''

  if (!thumbnailStorageKey && thumbnail) {
    const match = thumbnail.match(/(obj_[a-z0-9]{20}(?:\.[a-z0-9]+)?)/i)
    if (match) {
      thumbnailStorageKey = match[1]
      await Content.updateOne({ _id: c._id }, { $set: { thumbnailStorageKey } })
    }
  }

  if (thumbnailStorageKey) {
    thumbnail = await createMediaUrl(thumbnailStorageKey)
  }

  return {
    id: c._id.toString(),
    title: c.title,
    type: c.type,
    lane: c.lane,
    paid: c.isPaid,
    price: c.price,
    courseKey: c.courseKey,
    thumbnailUrl: thumbnail || '',
    previewText: c.previewText || '',
    description: c.description || '',
  }
}

// ── Favorites ────────────────────────────────────────────────────────────────
export const addFavorite = asyncHandler(async (req, res) => {
  await Favorite.updateOne(
    { userId: req.user.id, contentId: req.params.contentId },
    { $setOnInsert: { userId: req.user.id, contentId: req.params.contentId } },
    { upsert: true }
  )
  res.status(201).json({ ok: true })
})

export const removeFavorite = asyncHandler(async (req, res) => {
  await Favorite.deleteOne({ userId: req.user.id, contentId: req.params.contentId })
  res.json({ ok: true })
})

// Lightweight: just the favorited content ids (for toggling UI state).
export const myFavoriteIds = asyncHandler(async (req, res) => {
  const ids = await Favorite.find({ userId: req.user.id }).distinct('contentId')
  res.json({ ids: ids.map((i) => i.toString()) })
})

export const myFavorites = asyncHandler(async (req, res) => {
  const favs = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean()
  const items = []
  for (const f of favs) {
    let item = await Content.findById(f.contentId).select(CARD_FIELDS).lean()
    if (item) {
      const resolved = await resolveCard(item)
      items.push({ ...resolved, type: item.type || 'resource' })
    } else {
      let course = await TreeNode.findOne({ _id: f.contentId, kind: 'course' }).lean()
      if (course) {
        let thumbnailStorageKey = course.meta?.thumbnailStorageKey || ''
        let thumbnail = course.meta?.thumbnail || ''
        if (thumbnailStorageKey) {
          thumbnail = await createMediaUrl(thumbnailStorageKey)
        }
        items.push({
          id: course.slug,
          _id: course._id.toString(),
          slug: course.slug,
          title: course.name,
          instructor: course.meta?.instructor || 'AeroLearn Expert',
          price: course.meta?.price || '499',
          oldPrice: course.meta?.oldPrice || '999',
          thumbnail,
          isCourse: true,
          type: 'course'
        })
      }
    }
  }
  res.json({ items })
})

// ── Search ───────────────────────────────────────────────────────────────────
export const searchSchema = z.object({
  q: z.string().trim().max(100).optional(),
  type: z.enum(['pdf', 'video', '3d', 'game']).optional(),
  tag: z.string().trim().max(50).optional(),
})

export const search = asyncHandler(async (req, res) => {
  const { q, type, tag } = req.query
  const filter = { published: true }
  if (type) filter.type = type
  if (tag) filter.tags = tag
  if (q) {
    const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }]
  }
  const items = await Content.find(filter).sort({ createdAt: -1 }).limit(60).select(CARD_FIELDS).lean()
  const resolvedItems = await Promise.all(items.map(resolveCard))
  res.json({ items: resolvedItems, count: items.length })
})

// ── Progress (recently viewed / continue watching) ───────────────────────────
export const progressSchema = z.object({
  position: z.number().min(0).optional(),
  duration: z.number().min(0).optional(),
  completed: z.boolean().optional(),
})

export const upsertProgress = asyncHandler(async (req, res) => {
  const { position = 0, duration = 0, completed } = req.body
  const update = { lastViewedAt: new Date(), position, duration }
  if (duration > 0) {
    update.completed = position / duration >= 0.95
  } else if (completed !== undefined) {
    update.completed = completed
  }
  await Progress.updateOne(
    { userId: req.user.id, contentId: req.params.contentId },
    { $set: update, $setOnInsert: { userId: req.user.id, contentId: req.params.contentId } },
    { upsert: true }
  )
  res.json({ ok: true })
})

export const myProgress = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 12, 50)
  const rows = await Progress.find({ userId: req.user.id }).sort({ lastViewedAt: -1 }).limit(limit).populate('contentId', CARD_FIELDS).lean()
  const validRows = rows.filter((r) => r.contentId)
  const items = await Promise.all(validRows.map(async (r) => {
    const resolved = await resolveCard(r.contentId)
    return {
      ...resolved,
      position: r.position,
      duration: r.duration,
      completed: r.completed,
      lastViewedAt: r.lastViewedAt
    }
  }))
  res.json({ items })
})

// ── Recommended ──────────────────────────────────────────────────────────────
export const recommended = asyncHandler(async (req, res) => {
  const owned = (await License.find({ userId: req.user.id, status: 'active' }).distinct('contentId')).map((i) => i.toString())
  // Popularity by licenses issued. This is GLOBAL (not per-user) and scans the
  // whole License collection, so cache it for 60s instead of recomputing per request.
  const popular = await cache.wrap('recommended:popular', 60, () =>
    License.aggregate([
      { $group: { _id: '$contentId', n: { $sum: 1 } } },
      { $sort: { n: -1 } },
      { $limit: 30 },
    ])
  )
  const popularIds = popular.map((p) => p._id).filter(Boolean)
  let items = await Content.find({ _id: { $in: popularIds }, published: true }).select(CARD_FIELDS).lean()
  // order by popularity
  const rank = Object.fromEntries(popular.map((p, i) => [p._id?.toString(), i]))
  items.sort((a, b) => (rank[a._id.toString()] ?? 99) - (rank[b._id.toString()] ?? 99))
  items = items.filter((c) => !owned.includes(c._id.toString()))

  // Fallback: newest paid content the user doesn't own.
  if (items.length < 6) {
    const more = await Content.find({ published: true, isPaid: true, _id: { $nin: [...owned, ...items.map((i) => i._id)] } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select(CARD_FIELDS)
      .lean()
    items = [...items, ...more]
  }
  const sliced = items.slice(0, 8)
  const resolvedItems = await Promise.all(sliced.map(resolveCard))
  res.json({ items: resolvedItems })
})

export const listStandaloneResources = asyncHandler(async (req, res) => {
  const chapters = await TreeNode.find({ kind: 'chapter', courseKey: 'Individual_Resources' }).select('_id').lean()
  if (!chapters.length) {
    return res.json({ items: [] })
  }
  const chapterIds = chapters.map((c) => c._id)
  const items = await Content.find({ chapterId: { $in: chapterIds }, published: true }).sort({ order: 1, createdAt: -1 }).lean()
  const resolvedItems = await Promise.all(items.map(resolveCard))
  res.json({ items: resolvedItems })
})