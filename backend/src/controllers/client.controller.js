import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound, conflict } from '../utils/ApiError.js'
import { ROLES } from '@vigno/shared'
import { User } from '../models/User.js'
import { TreeNode } from '../models/TreeNode.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'
import { issueLicense } from '../services/licenseAuthority.js'

/**
 * Client accounts — admin-provisioned, no payment. A client sees ONLY the courses
 * the admin grants it, each with a validity (expiry) date. Grants reuse the normal
 * License model (one active license per granted lesson), so all the existing
 * access checks + expiry apply unchanged.
 */

const norm = (e) => String(e || '').toLowerCase().trim()

// Parse the admin-picked validity into a future Date (null = default TTL).
function parseExpiry(v) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d.getTime())) throw badRequest('Invalid validity date')
  if (d.getTime() <= Date.now()) throw badRequest('Validity date must be in the future')
  return d
}

// ── POST /admin/clients — create a client login (email + password) ──────────
export const createClientSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6).max(200),
  name: z.string().trim().max(120).optional(),
})
export const createClient = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body
  if (await User.findOne({ email: norm(email) })) throw conflict('A user with this email already exists')
  const user = new User({ email: norm(email), name: name || '', role: ROLES.CLIENT, emailVerified: true })
  await user.setPassword(password)
  await user.save()
  audit(req, 'client.create', { targetType: 'User', targetId: user._id, meta: { email: user.email } })
  res.status(201).json({ id: user._id, email: user.email, name: user.name, role: user.role })
})

// ── GET /admin/clients — list client accounts (+ active grant count) ────────
export const listClients = asyncHandler(async (req, res) => {
  const clients = await User.find({ role: ROLES.CLIENT }).sort({ createdAt: -1 }).select('_id email name createdAt').lean()
  const items = await Promise.all(
    clients.map(async (c) => ({
      id: c._id,
      email: c.email,
      name: c.name,
      createdAt: c.createdAt,
      activeLicenses: await License.countDocuments({ userId: c._id, status: 'active' }),
    }))
  )
  res.json({ items })
})

// ── DELETE /admin/clients/:id — remove a client + all their grants ──────────
export const deleteClient = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT })
  if (!client) throw notFound('Client not found')
  await License.deleteMany({ userId: client._id })
  await client.deleteOne()
  audit(req, 'client.delete', { targetType: 'User', targetId: req.params.id })
  res.json({ ok: true })
})

// ── POST /admin/clients/:id/grant — grant a whole course with a validity date ─
export const grantCourseSchema = z.object({
  courseSlug: z.string().trim().min(1),
  expiresAt: z.string().trim().min(1).optional(), // ISO date/datetime; blank = default TTL
})
export const grantCourse = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT })
  if (!client) throw notFound('Client not found')

  const { courseSlug } = req.body
  const exp = parseExpiry(req.body.expiresAt)

  const course = await TreeNode.findOne({ kind: 'course', slug: courseSlug })
  if (!course) throw notFound('Course not found')
  const lessons = await Content.find({ courseKey: courseSlug, published: true })
  if (lessons.length === 0) throw badRequest('This course has no published content to grant')

  for (const lesson of lessons) {
    await issueLicense({ userId: client._id, content: lesson, expiresAt: exp || undefined })
  }
  audit(req, 'client.grant', { targetType: 'User', targetId: client._id, meta: { courseSlug, lessons: lessons.length, expiresAt: exp } })
  res.json({ ok: true, courseSlug, courseName: course.name, grantedLessons: lessons.length, expiresAt: exp })
})

// ── GET /admin/clients/:id/grants — courses AND standalone resources granted to a client ─────
export const listClientGrants = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT })
  if (!client) throw notFound('Client not found')

  const licenses = await License.find({ userId: client._id, status: 'active' }).populate('contentId', 'title courseKey type').lean()

  // Group by courseKey (non-empty = course content, empty = standalone resource)
  const byCourse = {}
  const resourceGrants = []

  for (const l of licenses) {
    const courseKey = l.contentId?.courseKey
    if (!courseKey) {
      // Standalone resource grant — one license per resource content doc
      resourceGrants.push({
        licenseId: l._id,
        contentId: l.contentId?._id,
        title: l.contentId?.title || '(deleted)',
        type: l.contentId?.type,
        expiresAt: l.expiresAt,
        expired: new Date(l.expiresAt).getTime() <= Date.now(),
      })
    } else {
      if (!byCourse[courseKey]) byCourse[courseKey] = { courseSlug: courseKey, lessons: 0, expiresAt: l.expiresAt }
      byCourse[courseKey].lessons++
      if (new Date(l.expiresAt) < new Date(byCourse[courseKey].expiresAt)) byCourse[courseKey].expiresAt = l.expiresAt
    }
  }

  const courseGrants = await Promise.all(
    Object.values(byCourse).map(async (g) => {
      const course = await TreeNode.findOne({ kind: 'course', slug: g.courseSlug }).select('name').lean()
      return { ...g, courseName: course?.name || g.courseSlug, expired: new Date(g.expiresAt).getTime() <= Date.now() }
    })
  )
  res.json({ items: courseGrants, resourceGrants })
})

// ── POST /admin/clients/:id/revoke — revoke a granted course ────────────────
export const revokeGrantSchema = z.object({ courseSlug: z.string().trim().min(1) })
export const revokeGrant = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT })
  if (!client) throw notFound('Client not found')
  const { courseSlug } = req.body
  const lessonIds = (await Content.find({ courseKey: courseSlug }).select('_id')).map((l) => l._id)
  const r = await License.updateMany(
    { userId: client._id, contentId: { $in: lessonIds }, status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: 'client_grant_revoked' } }
  )
  audit(req, 'client.revoke', { targetType: 'User', targetId: client._id, meta: { courseSlug, revoked: r.modifiedCount } })
  res.json({ ok: true, courseSlug, revoked: r.modifiedCount })
})

// ── POST /admin/clients/:id/grant-resource — grant a standalone resource to a client ─
export const grantResourceSchema = z.object({
  contentId: z.string().trim().min(1),
  expiresAt: z.string().trim().min(1).optional(),
})
export const grantResource = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT })
  if (!client) throw notFound('Client not found')

  const { contentId } = req.body
  const exp = parseExpiry(req.body.expiresAt)

  const content = await Content.findById(contentId)
  if (!content) throw notFound('Resource not found')
  // Must be a standalone resource (empty courseKey)
  if (content.courseKey) throw badRequest('This content belongs to a course — use the course grant instead')

  await issueLicense({ userId: client._id, content, expiresAt: exp || undefined })

  audit(req, 'client.grantResource', { targetType: 'User', targetId: client._id, meta: { contentId, title: content.title, expiresAt: exp } })
  res.json({ ok: true, contentId, title: content.title, expiresAt: exp })
})

// ── POST /admin/clients/:id/revoke-resource — revoke a standalone resource grant ─────
export const revokeResourceSchema = z.object({ contentId: z.string().trim().min(1) })
export const revokeResource = asyncHandler(async (req, res) => {
  const client = await User.findOne({ _id: req.params.id, role: ROLES.CLIENT })
  if (!client) throw notFound('Client not found')
  const { contentId } = req.body
  const r = await License.updateMany(
    { userId: client._id, contentId, status: 'active' },
    { $set: { status: 'revoked', revokedAt: new Date(), revokedReason: 'client_resource_grant_revoked' } }
  )
  audit(req, 'client.revokeResource', { targetType: 'User', targetId: client._id, meta: { contentId, revoked: r.modifiedCount } })
  res.json({ ok: true, contentId, revoked: r.modifiedCount })
})
