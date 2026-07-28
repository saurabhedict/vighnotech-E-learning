import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound } from '../utils/ApiError.js'
import { Content } from '../models/Content.js'
import { Device } from '../models/Device.js'
import {
  issueLicense,
  verifyToken,
  revokeLicense,
  listUserLicenses,
  reissueToken,
} from '../services/licenseAuthority.js'
import { License } from '../models/License.js'
import { User } from '../models/User.js'

// GET /licenses/mine — the user's library.
export const mine = asyncHandler(async (req, res) => {
  const licenses = await listUserLicenses(req.user.id)
  res.json({
    licenses: licenses.map((l) => ({
      jti: l._id,
      content: l.contentId && { id: l.contentId._id, title: l.contentId.title, type: l.contentId.type, courseKey: l.contentId.courseKey },
      type: l.type,
      // Effective status: time-expired licenses keep status='active' in the DB,
      // so derive 'expired' for display.
      status: l.status === 'revoked' ? 'revoked' : l.isUsable() ? 'active' : 'expired',
      issuedAt: l.issuedAt,
      expiresAt: l.expiresAt,
      usable: l.isUsable(),
    })),
  })
})

export const verifySchema = z.object({
  token: z.string().min(10),
  deviceId: z.string().optional(),
})

// POST /licenses/verify — re-check a license is active + not expired (+device).
export const verify = asyncHandler(async (req, res) => {
  const { token, deviceId } = req.body
  const result = await verifyToken(token, { deviceId })
  if (!result.valid) {
    audit(req, 'license.verify.fail', { targetType: 'License', targetId: result.payload?.jti, meta: { reason: result.reason } })
    return res.status(200).json({ valid: false, reason: result.reason })
  }
  res.json({
    valid: true,
    license: { jti: result.license._id, type: result.license.type, expiresAt: result.license.expiresAt },
  })
})

// POST /licenses/:jti/refresh — issue a fresh token for a still-valid license.
export const refresh = asyncHandler(async (req, res) => {
  const license = await License.findOne({ _id: req.params.jti, userId: req.user.id })
  if (!license) throw notFound('License not found')
  if (!license.isUsable()) throw badRequest('License is not active')
  const token = await reissueToken(license)
  res.json({ token, expiresAt: license.expiresAt })
})

// POST /admin/licenses/issue — admin grant (e.g. free content / comp access).
export const adminIssueSchema = z.object({
  userId: z.string().length(24),
  contentId: z.string().length(24),
  deviceId: z.string().length(24).optional(),
})

export const adminIssue = asyncHandler(async (req, res) => {
  const { userId, contentId, deviceId } = req.body
  const content = await Content.findById(contentId)
  if (!content) throw notFound('Content not found')
  if (deviceId) {
    const device = await Device.findOne({ _id: deviceId, userId })
    if (!device) throw badRequest('Device does not belong to user')
  }
  const { license, token } = await issueLicense({ userId, content, deviceId })
  audit(req, 'license.admin_issue', { targetType: 'License', targetId: license._id, meta: { userId, contentId } })
  res.status(201).json({ jti: license._id, token, expiresAt: license.expiresAt })
})

// POST /admin/licenses/:jti/revoke
export const revoke = asyncHandler(async (req, res) => {
  const reason = req.body?.reason || 'admin_revoke'
  const license = await revokeLicense(req.params.jti, reason)
  if (!license) throw notFound('License not found')
  audit(req, 'license.revoke', { targetType: 'License', targetId: license._id, meta: { reason } })
  res.json({ ok: true, jti: license._id, status: license.status })
})

// POST /admin/licenses/:jti/unflag — clear an anti-sharing fraud flag.
export const unflag = asyncHandler(async (req, res) => {
  const license = await License.findByIdAndUpdate(
    req.params.jti,
    { $set: { flagged: false, flaggedReason: '', deniedDevices: [] } },
    { new: true }
  )
  if (!license) throw notFound('License not found')
  audit(req, 'license.unflag', { targetType: 'License', targetId: license._id })
  res.json({ ok: true, jti: license._id })
})

// GET /admin/licenses — every license on the platform, with the owning user and
// content resolved, so admins can audit and act on them. Filter by ?status=
// active|revoked|expired|flagged and search users with ?q=.
export const adminList = asyncHandler(async (req, res) => {
  const { status = 'all', q = '', limit } = req.query
  const cap = Math.min(Number(limit) || 200, 500)
  const filter = {}
  if (status === 'active') filter.status = 'active'
  else if (status === 'revoked') filter.status = 'revoked'
  else if (status === 'flagged') filter.flagged = true

  if (q.trim()) {
    const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    const users = await User.find({ $or: [{ email: rx }, { name: rx }] }).select('_id').limit(300).lean()
    filter.userId = { $in: users.map((u) => u._id) }
  }

  const rows = await License.find(filter)
    .sort({ createdAt: -1 })
    .limit(cap)
    .populate('userId', 'email name role')
    .populate('contentId', 'title type courseKey')
    .lean()

  const now = Date.now()
  let items = rows.map((l) => {
    const expired = new Date(l.expiresAt).getTime() <= now
    return {
      jti: l._id,
      status: l.status === 'revoked' ? 'revoked' : expired ? 'expired' : 'active',
      flagged: !!l.flagged,
      flaggedReason: l.flaggedReason || '',
      type: l.type,
      issuedAt: l.issuedAt,
      expiresAt: l.expiresAt,
      revokedReason: l.revokedReason || '',
      user: l.userId ? { id: l.userId._id, email: l.userId.email, name: l.userId.name, role: l.userId.role } : null,
      content: l.contentId ? { id: l.contentId._id, title: l.contentId.title, type: l.contentId.type, courseKey: l.contentId.courseKey } : null,
    }
  })
  if (status === 'expired') items = items.filter((i) => i.status === 'expired')

  res.json({ items, count: items.length })
})
