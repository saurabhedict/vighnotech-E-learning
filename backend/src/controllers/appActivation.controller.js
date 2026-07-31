import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, unauthorized, notFound, paymentRequired, conflict, forbidden } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { User } from '../models/User.js'
import { Content } from '../models/Content.js'
import { License } from '../models/License.js'
import { AppActivation } from '../models/AppActivation.js'
import { hasActiveLicense } from '../services/licenseAuthority.js'
import { addSessionAndReconcile, sessionInfoFromReq } from '../services/sessions.js'

/**
 * Android (APK) activation API — the routes the installed app (built by the app
 * team) calls to log in, prove the app is purchased, and lock to ONE device.
 * The PC/.zip launcher flow is untouched.
 */

const APP_TOKEN_TTL = '30d' // the app caches this and reuses it for /verifyapp

function signAppToken({ userId, contentId, deviceId, identifier, sid }) {
  return jwt.sign(
    { sub: String(userId), cid: String(contentId), did: deviceId, idn: identifier, ...(sid ? { sid } : {}), typ: 'app' },
    env.jwt.accessSecret,
    { expiresIn: APP_TOKEN_TTL }
  )
}

function verifyAppToken(token) {
  try {
    const p = jwt.verify(token, env.jwt.accessSecret)
    return p && p.typ === 'app' ? p : null
  } catch {
    return null
  }
}

const normEmail = (e) => String(e || '').toLowerCase().trim()

// Coerce the free-form deviceInfo into a stored string (accepts a string or object).
const asDeviceInfo = (v) => (typeof v === 'string' ? v : v ? JSON.stringify(v) : '')

function metaFrom(body) {
  return {
    androidId: body.androidId || '',
    installationId: body.installationId || '',
    appVersion: body.appVersion || '',
    deviceModel: body.deviceModel || '',
    osVersion: body.osVersion || '',
    deviceInfo: asDeviceInfo(body.deviceInfo),
    license: body.license || '',
  }
}

// ── POST /activateapp ────────────────────────────────────────────────────────
// Public: the app authenticates via email+password in the body. Verifies purchase
// by `identifier`, binds to ONE `deviceId`, stores device metadata, returns a
// reusable app token.
export const activateAppSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(200),
  identifier: z.string().min(1).max(200),
  deviceId: z.string().min(1).max(256),
  // Optional device metadata the app reports.
  androidId: z.string().max(256).optional(),
  installationId: z.string().max(256).optional(),
  appVersion: z.string().max(64).optional(),
  deviceModel: z.string().max(200).optional(),
  osVersion: z.string().max(100).optional(),
  deviceInfo: z.any().optional(),
  license: z.string().max(4000).optional(),
})

export const activateApp = asyncHandler(async (req, res) => {
  const { email, password, identifier, deviceId } = req.body

  // Diagnostic: log EXACTLY what the installed APK reports so identifier mismatches
  // (whitespace / case / wrong build) are visible in the server logs.
  // eslint-disable-next-line no-console
  console.log(`[activateapp] email=${normEmail(email)} identifier=${JSON.stringify(identifier)} device=${String(deviceId).slice(0, 12)}`)

  // 1) Authenticate the account.
  const user = await User.findOne({ email: normEmail(email) }).select('+passwordHash +sessions')
  if (!user || !(await user.comparePassword(password))) {
    // eslint-disable-next-line no-console
    console.warn(`[activateapp] 401 bad credentials for ${normEmail(email)}`)
    throw unauthorized('Invalid email or password')
  }
  if (user.blocked) {
    // eslint-disable-next-line no-console
    console.warn(`[activateapp] 403 blocked account ${normEmail(email)}`)
    throw forbidden('Your account has been blocked. Please contact the administrator.')
  }

  // 2) Resolve the app by its admin-assigned identifier.
  const content = await Content.findOne({ identifier: identifier.trim(), type: 'apk', published: true })
  if (!content) {
    const apks = await Content.find({ type: 'apk', published: true }).select('title identifier').lean()
    // eslint-disable-next-line no-console
    console.warn(`[activateapp] 404 no published apk with identifier ${JSON.stringify(identifier.trim())}. Existing apk identifiers: ${JSON.stringify(apks.map((a) => ({ title: a.title, identifier: a.identifier })))}`)
    throw notFound('Unknown app identifier')
  }

  // 3) Confirm this account owns (purchased) the app.
  if (!(await hasActiveLicense(user._id, content._id))) {
    // eslint-disable-next-line no-console
    console.warn(`[activateapp] 402 ${normEmail(email)} has no active license for "${content.title}" (${content._id})`)
    throw paymentRequired('This app is not purchased on your account')
  }

  // 4) Single-device lock: block a DIFFERENT device while one is active.
  let act = await AppActivation.findOne({ userId: user._id, contentId: content._id })
  if (act && act.status === 'active' && act.deviceId !== deviceId) {
    throw conflict('This app is already activated on another device. Deregister it first to use a new device.')
  }

  const meta = metaFrom(req.body)
  const now = new Date()

  // Register this APK as one of the account's concurrent "places". Reuse the
  // existing live session if this activation already has one; otherwise mint a new
  // session (which may evict the least-recently-active place, per the cap).
  let sid = act?.sid && (user.sessions || []).some((s) => s.sid === act.sid) ? act.sid : ''
  if (sid) user.touchSession(sid)
  else sid = await addSessionAndReconcile(user, sessionInfoFromReq(req, { kind: 'apk', deviceModel: meta.deviceModel, label: meta.deviceModel || 'Android device' }))
  await user.save()

  if (!act) {
    act = await AppActivation.create({
      userId: user._id, contentId: content._id, identifier: content.identifier,
      deviceId, status: 'active', sid, activatedAt: now, lastSeenAt: now, ...meta,
    })
  } else {
    // Same device (re-activate/refresh) or re-binding after a deregister.
    const rebind = act.deviceId !== deviceId || act.status !== 'active'
    act.deviceId = deviceId
    act.identifier = content.identifier
    act.status = 'active'
    act.lastSeenAt = now
    if (rebind) act.activatedAt = now
    act.deregisteredAt = null
    Object.assign(act, meta)
    act.sid = sid
    await act.save()
  }

  const license = await License.findOne({ userId: user._id, contentId: content._id, status: 'active' }).sort({ expiresAt: -1 })
  const token = signAppToken({ userId: user._id, contentId: content._id, deviceId, identifier: content.identifier, sid })
  audit(req, 'app.activate', { targetType: 'Content', targetId: content._id, meta: { userId: user._id.toString(), deviceId } })

  res.json({
    success: true,
    token,
    tokenType: 'Bearer',
    user: { id: user._id, email: user.email, name: user.name },
    app: { identifier: content.identifier, title: content.title, contentId: content._id },
    device: { deviceId, activatedAt: act.activatedAt },
    license: { status: 'active', expiresAt: license ? license.expiresAt : null },
  })
})

// ── POST /verifyapp ──────────────────────────────────────────────────────────
// The app's launch/heartbeat check. Uses the token from /activateapp (no password
// re-send). Always 200; `valid` tells the app whether to run.
export const verifyAppSchema = z.object({
  token: z.string().min(10),
  deviceId: z.string().min(1).max(256),
  identifier: z.string().min(1).max(200).optional(),
})

export const verifyApp = asyncHandler(async (req, res) => {
  const { token, deviceId, identifier } = req.body
  const payload = verifyAppToken(token)
  if (!payload) return res.json({ valid: false, reason: 'invalid_token' })
  if (payload.did !== deviceId) return res.json({ valid: false, reason: 'device_mismatch' })
  if (identifier && payload.idn !== identifier) return res.json({ valid: false, reason: 'identifier_mismatch' })

  // Hard account ban — the app must stop everywhere.
  const owner = await User.findById(payload.sub).select('blocked')
  if (!owner || owner.blocked) return res.json({ valid: false, reason: 'blocked' })

  const act = await AppActivation.findOne({ userId: payload.sub, contentId: payload.cid })
  if (!act || act.status !== 'active') return res.json({ valid: false, reason: 'not_activated' })
  if (act.deviceId !== deviceId) return res.json({ valid: false, reason: 'device_mismatch' })
  if (!(await hasActiveLicense(payload.sub, payload.cid))) return res.json({ valid: false, reason: 'license_inactive' })

  // Unified session gate (tokens minted after multi-session carry a `sid`): the
  // place must still be live and within its 72h lifetime. Legacy tokens (no sid)
  // skip this and rely on the AppActivation checks above.
  if (payload.sid) {
    const uDoc = await User.findById(payload.sub).select('sessions')
    const sess = (uDoc?.sessions || []).find((s) => s.sid === payload.sid)
    if (!sess || (sess.expiresAt && new Date(sess.expiresAt).getTime() < Date.now())) {
      return res.json({ valid: false, reason: 'not_activated' })
    }
    // Keep this apk place "recently active" so a new login doesn't evict it.
    User.updateOne({ _id: payload.sub, 'sessions.sid': payload.sid }, { $set: { 'sessions.$.lastSeenAt': new Date() } }).catch(() => {})
  }

  act.lastSeenAt = new Date()
  await act.save()
  const license = await License.findOne({ userId: payload.sub, contentId: payload.cid, status: 'active' }).sort({ expiresAt: -1 })
  res.json({ valid: true, app: { identifier: act.identifier }, license: { status: 'active', expiresAt: license ? license.expiresAt : null } })
})

// ── POST /deregisterapp ──────────────────────────────────────────────────────
// Free the bound device so the app can be activated on a new one. Authorize with
// EITHER the app token OR email+password (so a lost device can be freed from the web).
export const deregisterAppSchema = z.object({
  identifier: z.string().min(1).max(200),
  token: z.string().optional(),
  email: z.string().email().optional(),
  password: z.string().max(200).optional(),
  deviceId: z.string().max(256).optional(),
})

export const deregisterApp = asyncHandler(async (req, res) => {
  const { identifier, token, email, password } = req.body

  let userId
  let contentId
  if (token) {
    const payload = verifyAppToken(token)
    if (!payload) throw unauthorized('Invalid token')
    userId = payload.sub
    contentId = payload.cid
  } else {
    if (!email || !password) throw badRequest('Provide either a token, or email + password')
    const user = await User.findOne({ email: normEmail(email) }).select('+passwordHash')
    if (!user || !(await user.comparePassword(password))) throw unauthorized('Invalid email or password')
    const content = await Content.findOne({ identifier: identifier.trim(), type: 'apk' })
    if (!content) throw notFound('Unknown app identifier')
    userId = user._id
    contentId = content._id
  }

  const act = await AppActivation.findOne({ userId, contentId })
  if (!act || act.status !== 'active') return res.json({ success: true, alreadyInactive: true })

  act.status = 'deregistered'
  act.deregisteredAt = new Date()
  await act.save()
  // Also drop the linked login "place" so it stops counting toward the cap.
  if (act.sid) {
    const u = await User.findById(userId).select('+sessions')
    if (u) { u.removeSession(act.sid); await u.save() }
  }
  audit(req, 'app.deregister', { targetType: 'Content', targetId: contentId, meta: { userId: String(userId) } })
  res.json({ success: true })
})
