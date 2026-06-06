import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { Favorite } from '../models/Favorite.js'
import { Progress } from '../models/Progress.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'

const card = (c) => ({
  id: c._id.toString(),
  title: c.title,
  type: c.type,
  lane: c.lane,
  paid: c.isPaid,
  price: c.price,
  courseKey: c.courseKey,
})

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
  const favs = await Favorite.find({ userId: req.user.id }).sort({ createdAt: -1 }).populate('contentId').lean()
  res.json({ items: favs.filter((f) => f.contentId).map((f) => card(f.contentId)) })
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
  const items = await Content.find(filter).sort({ createdAt: -1 }).limit(60).lean()
  res.json({ items: items.map(card), count: items.length })
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
  // Only ever PROMOTE completion — never auto-demote a finished item.
  if (completed === true || (duration > 0 && position / duration > 0.95)) update.completed = true
  await Progress.updateOne(
    { userId: req.user.id, contentId: req.params.contentId },
    { $set: update, $setOnInsert: { userId: req.user.id, contentId: req.params.contentId } },
    { upsert: true }
  )
  res.json({ ok: true })
})

export const myProgress = asyncHandler(async (req, res) => {
  const limit = Math.min(Number(req.query.limit) || 12, 50)
  const rows = await Progress.find({ userId: req.user.id }).sort({ lastViewedAt: -1 }).limit(limit).populate('contentId').lean()
  const items = rows
    .filter((r) => r.contentId)
    .map((r) => ({ ...card(r.contentId), position: r.position, duration: r.duration, completed: r.completed, lastViewedAt: r.lastViewedAt }))
  res.json({ items })
})

// ── Recommended ──────────────────────────────────────────────────────────────
export const recommended = asyncHandler(async (req, res) => {
  const owned = (await License.find({ userId: req.user.id, status: 'active' }).distinct('contentId')).map((i) => i.toString())
  // Popularity by licenses issued.
  const popular = await License.aggregate([
    { $group: { _id: '$contentId', n: { $sum: 1 } } },
    { $sort: { n: -1 } },
    { $limit: 30 },
  ])
  const popularIds = popular.map((p) => p._id).filter(Boolean)
  let items = await Content.find({ _id: { $in: popularIds }, published: true }).lean()
  // order by popularity
  const rank = Object.fromEntries(popular.map((p, i) => [p._id?.toString(), i]))
  items.sort((a, b) => (rank[a._id.toString()] ?? 99) - (rank[b._id.toString()] ?? 99))
  items = items.filter((c) => !owned.includes(c._id.toString()))

  // Fallback: newest paid content the user doesn't own.
  if (items.length < 6) {
    const more = await Content.find({ published: true, isPaid: true, _id: { $nin: [...owned, ...items.map((i) => i._id)] } })
      .sort({ createdAt: -1 })
      .limit(8)
      .lean()
    items = [...items, ...more]
  }
  res.json({ items: items.slice(0, 8).map(card) })
})
