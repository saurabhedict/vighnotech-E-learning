import { z } from 'zod'
import { CONTENT_TYPES } from '@vigno/shared'
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
  type: z.enum(CONTENT_TYPES).optional(),
  tag: z.string().trim().max(50).optional(),
})

// Shape a course TreeNode into the object <CourseCard/> expects (slug/name/meta).
const resolveCourseCard = async (node) => {
  const meta = { ...(node.meta || {}) }
  const key = node.meta?.thumbnailStorageKey
  if (key) meta.thumbnail = await createMediaUrl(key)
  return {
    kind: 'course',
    id: node.slug || node.courseKey, // stable React key
    _id: node._id.toString(),
    slug: node.slug || node.courseKey,
    name: node.name,
    title: node.name,
    type: 'course',
    meta,
  }
}

// Universal catalog search — returns EVERYTHING that matches: whole courses
// (TreeNode) plus every kind of media/content item (pdf, video, 3d, game and
// standalone resources). Courses are omitted when a specific content `type`
// filter is set, since a course isn't a single media type.
export const search = asyncHandler(async (req, res) => {
  const { q, type, tag } = req.query
  const rx = q ? new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null

  // ── Content items (lessons + standalone resources) ──────────────────────────
  const filter = { published: true }
  if (type) filter.type = type
  if (tag) filter.tags = tag
  if (rx) filter.$or = [{ title: rx }, { description: rx }, { tags: rx }]
  const contents = await Content.find(filter).sort({ createdAt: -1 }).limit(60).select(CARD_FIELDS).lean()
  const contentItems = await Promise.all(
    contents.map(async (c) => ({ ...(await resolveCard(c)), kind: 'content' }))
  )

  // ── Courses (skipped when narrowing to a single media type) ─────────────────
  let courseItems = []
  if (!type) {
    // Exclude the hidden 'Individual_Resources' bucket — it's a container for
    // standalone resources, not a real, browsable course.
    const courseFilter = { kind: 'course', slug: { $ne: 'Individual_Resources' } }
    if (rx) {
      courseFilter.$or = [
        { name: rx },
        { slug: rx },
        { courseKey: rx },
        { 'meta.instructor': rx },
        { 'meta.tags': rx },
        { 'meta.description': rx },
      ]
    } else if (tag) {
      courseFilter['meta.tags'] = tag
    }
    const courses = await TreeNode.find(courseFilter).limit(24).lean()
    courseItems = await Promise.all(courses.map(resolveCourseCard))
  }

  // Courses first (the bigger entities), then individual media items.
  const items = [...courseItems, ...contentItems]
  res.json({ items, count: items.length, courses: courseItems.length, contents: contentItems.length })
})

// ── Autocomplete / keyword suggestions ───────────────────────────────────────
// Lightweight "type-ahead" for the search bar (Google-style). Returns a small,
// de-duplicated list of keyword strings — matching course names, content titles
// and tags — WITHOUT the heavy per-item thumbnail resolution the card list does.
// Matching is a case-insensitive regex over the (currently small) catalog, capped
// and cached per query for 60s. NOTE: a substring regex can't use the title text
// index, so at large catalog sizes swap this for a prefix/collation index or an
// Atlas Search autocomplete index.
export const suggestSchema = z.object({
  q: z.string().trim().max(100).optional(),
})

export const suggest = asyncHandler(async (req, res) => {
  const q = (req.query.q || '').trim()
  if (q.length < 1) return res.json({ suggestions: [] })

  const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const suggestions = await cache.wrap(`suggest:${q.toLowerCase()}`, 60, async () => {
    const [contents, courses] = await Promise.all([
      Content.find({ published: true, $or: [{ title: rx }, { tags: rx }] })
        .sort({ createdAt: -1 })
        .limit(24)
        .select('title tags')
        .lean(),
      TreeNode.find({ kind: 'course', slug: { $ne: 'Individual_Resources' }, name: rx }).limit(6).select('name').lean(),
    ])

    const out = []
    const seen = new Set()
    const push = (text, kind) => {
      const t = (text || '').trim()
      const key = t.toLowerCase()
      if (!t || seen.has(key)) return
      seen.add(key)
      out.push({ text: t, kind })
    }

    courses.forEach((c) => push(c.name, 'course')) // whole courses first
    // Only titles that actually match — a content row can be pulled in by a tag
    // match alone, and its (non-matching) title would be a confusing suggestion.
    contents.forEach((c) => rx.test(c.title) && push(c.title, 'title'))
    contents.forEach((c) => (c.tags || []).forEach((tag) => rx.test(tag) && push(tag, 'tag'))) // then related keywords
    return out.slice(0, 8)
  })

  res.json({ suggestions })
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
  // Non-personalized (same for everyone) — cache the whole resolved payload for
  // 60s so we don't re-query + re-resolve on every visit/back-navigation.
  const items = await cache.wrap('resources:standalone', 60, async () => {
    const chapters = await TreeNode.find({ kind: 'chapter', courseKey: 'Individual_Resources' }).select('_id').lean()
    if (!chapters.length) return []
    const chapterIds = chapters.map((c) => c._id)
    const rows = await Content.find({ chapterId: { $in: chapterIds }, published: true }).sort({ order: 1, createdAt: -1 }).lean()
    return Promise.all(rows.map(resolveCard))
  })
  res.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
  res.json({ items })
})