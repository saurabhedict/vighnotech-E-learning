import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { notFound } from '../utils/ApiError.js'
import { slugify } from '../utils/slugify.js'
import { FilterCategory } from '../models/FilterCategory.js'

// Shape a category doc for the client (stringify ids).
function shape(c) {
  return {
    id: String(c._id),
    name: c.name,
    slug: c.slug,
    order: c.order || 0,
    options: (c.options || [])
      .slice()
      .sort((a, b) => (a.order || 0) - (b.order || 0))
      .map((o) => ({ id: String(o._id), label: o.label, slug: o.slug || '' })),
  }
}

// GET /filters (public) — the categories + options used to build the filter UI.
export const list = asyncHandler(async (req, res) => {
  const cats = await FilterCategory.find({ active: true }).sort({ order: 1, createdAt: 1 }).lean()
  res.json({ categories: cats.map(shape) })
})

// ── Admin: manage categories ─────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().trim().min(1).max(60),
  options: z.array(z.string().trim().min(1).max(60)).optional(),
})

export const createCategory = asyncHandler(async (req, res) => {
  const { name, options = [] } = req.body
  const cat = await FilterCategory.create({
    name,
    slug: slugify(name),
    order: await FilterCategory.countDocuments(),
    options: options.map((label, i) => ({ label, slug: slugify(label), order: i })),
  })
  audit(req, 'filter.category.create', { targetType: 'FilterCategory', targetId: cat._id, meta: { name } })
  res.status(201).json(shape(cat.toObject()))
})

export const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(60).optional(),
  order: z.number().optional(),
  active: z.boolean().optional(),
})

export const updateCategory = asyncHandler(async (req, res) => {
  const cat = await FilterCategory.findById(req.params.id)
  if (!cat) throw notFound('Filter category not found')
  const { name, order, active } = req.body
  if (name !== undefined) { cat.name = name; cat.slug = slugify(name) }
  if (order !== undefined) cat.order = order
  if (active !== undefined) cat.active = active
  await cat.save()
  audit(req, 'filter.category.update', { targetType: 'FilterCategory', targetId: cat._id })
  res.json(shape(cat.toObject()))
})

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await FilterCategory.findByIdAndDelete(req.params.id)
  if (!cat) throw notFound('Filter category not found')
  audit(req, 'filter.category.delete', { targetType: 'FilterCategory', targetId: req.params.id })
  res.json({ ok: true })
})

// ── Admin: manage options within a category ──────────────────────────────────

export const addOptionSchema = z.object({ label: z.string().trim().min(1).max(60) })

export const addOption = asyncHandler(async (req, res) => {
  const cat = await FilterCategory.findById(req.params.id)
  if (!cat) throw notFound('Filter category not found')
  const { label } = req.body
  cat.options.push({ label, slug: slugify(label), order: cat.options.length })
  await cat.save()
  audit(req, 'filter.option.add', { targetType: 'FilterCategory', targetId: cat._id, meta: { label } })
  res.status(201).json(shape(cat.toObject()))
})

export const removeOption = asyncHandler(async (req, res) => {
  const cat = await FilterCategory.findById(req.params.id)
  if (!cat) throw notFound('Filter category not found')
  const opt = cat.options.id(req.params.optionId)
  if (!opt) throw notFound('Option not found')
  opt.deleteOne()
  await cat.save()
  audit(req, 'filter.option.remove', { targetType: 'FilterCategory', targetId: cat._id, meta: { optionId: req.params.optionId } })
  res.json(shape(cat.toObject()))
})

// Seed the two default categories the first time the app boots with none.
export async function ensureDefaultFilters(log = () => {}) {
  if (await FilterCategory.countDocuments()) return
  await FilterCategory.create([
    {
      name: 'Content Type', slug: 'content-type', order: 0,
      options: [
        { label: 'PDF', slug: 'pdf', order: 0 },
        { label: 'Video', slug: 'video', order: 1 },
        { label: '3D', slug: '3d', order: 2 },
        { label: 'Game', slug: 'game', order: 3 },
      ],
    },
    { name: 'Training Program', slug: 'training-program', order: 1, options: [] },
  ])
  log('[seed] created default filter categories (Content Type, Training Program)')
}
