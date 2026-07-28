import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { notFound } from '../utils/ApiError.js'
import { Notification } from '../models/Notification.js'
import { User } from '../models/User.js'

// ── User-facing: the notification bell ───────────────────────────────────────

// GET /notifications — active broadcasts, newest first, + how many are unread
// for this user (created after they last opened the bell).
export const mine = asyncHandler(async (req, res) => {
  const items = await Notification.find({ active: true }).sort({ createdAt: -1 }).limit(50).lean()
  // req.user is the JWT payload (no read-state) — read the current seen mark from DB.
  const u = await User.findById(req.user.id).select('notificationsSeenAt').lean()
  const seenAt = u?.notificationsSeenAt ? new Date(u.notificationsSeenAt).getTime() : 0
  const unread = items.filter((n) => new Date(n.createdAt).getTime() > seenAt).length
  res.json({
    items: items.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      link: n.link || '',
      level: n.level || 'info',
      createdAt: n.createdAt,
      unread: new Date(n.createdAt).getTime() > seenAt,
    })),
    unread,
  })
})

// POST /notifications/seen — mark everything up to now as read for this user.
export const markSeen = asyncHandler(async (req, res) => {
  await User.updateOne({ _id: req.user.id }, { $set: { notificationsSeenAt: new Date() } })
  res.json({ ok: true })
})

// ── Admin: compose / manage broadcasts ───────────────────────────────────────

export const createSchema = z.object({
  title: z.string().trim().min(1).max(140),
  body: z.string().trim().min(1).max(2000),
  link: z.string().trim().max(500).optional(),
  level: z.enum(['info', 'success', 'warning']).optional(),
})

// POST /admin/notifications — broadcast to everyone.
export const create = asyncHandler(async (req, res) => {
  const { title, body, link, level } = req.body
  const n = await Notification.create({
    title,
    body,
    link: link || '',
    level: level || 'info',
    createdBy: req.user.id,
  })
  audit(req, 'notification.create', { targetType: 'Notification', targetId: n._id, meta: { title } })
  res.status(201).json({ id: n._id.toString(), title: n.title, body: n.body, link: n.link, level: n.level, active: n.active, createdAt: n.createdAt })
})

// GET /admin/notifications — full history (admin view).
export const list = asyncHandler(async (req, res) => {
  const items = await Notification.find({}).sort({ createdAt: -1 }).limit(200).lean()
  res.json({
    items: items.map((n) => ({
      id: n._id.toString(),
      title: n.title,
      body: n.body,
      link: n.link || '',
      level: n.level || 'info',
      active: n.active,
      createdAt: n.createdAt,
    })),
  })
})

// DELETE /admin/notifications/:id — retract a broadcast.
export const remove = asyncHandler(async (req, res) => {
  const n = await Notification.findByIdAndDelete(req.params.id)
  if (!n) throw notFound('Notification not found')
  audit(req, 'notification.delete', { targetType: 'Notification', targetId: req.params.id })
  res.json({ ok: true })
})
