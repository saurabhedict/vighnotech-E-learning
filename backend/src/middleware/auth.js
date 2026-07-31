import { verifyAccessToken, ACCESS_COOKIE } from '../utils/tokens.js'
import { unauthorized, forbidden } from '../utils/ApiError.js'
import { User } from '../models/User.js'

/**
 * Resolve the access token from either the httpOnly cookie (web app) or an
 * Authorization: Bearer header (launcher / API clients / the current frontend).
 */
function readToken(req) {
  const fromCookie = req.cookies?.[ACCESS_COOKIE]
  if (fromCookie) return fromCookie
  const h = req.headers.authorization
  if (h && h.startsWith('Bearer ')) return h.slice(7)
  return null
}

/**
 * Verify the access token and enforce the per-session gate: the token's `sid`
 * must still be a live login "place" in user.sessions (evicted-by-cap / revoked /
 * logged-out sessions are rejected). Legacy tokens with no `sid` (minted before
 * multi-session) fall back to the single-session tokenVersion check so nobody is
 * force-logged-out on deploy. Returns { id, role, email, sid? } or null.
 */
async function resolveUser(req) {
  const token = readToken(req)
  if (!token) return null
  let p
  try {
    p = verifyAccessToken(token)
  } catch {
    return null
  }
  if (p.typ !== 'access') return null
  const user = await User.findById(p.sub).select('tokenVersion role email sessions blocked').lean()
  if (!user) return null
  if (user.blocked) return null // hard-banned — deny every authed request

  if (p.sid) {
    const sess = (user.sessions || []).find((s) => s.sid === p.sid)
    if (!sess) return null // evicted by the cap / revoked / logged out
    if (sess.expiresAt && new Date(sess.expiresAt).getTime() < Date.now()) {
      pruneSession(user._id, p.sid) // 72h hard lifetime reached
      return null
    }
    touchSession(user._id, p.sid, sess.lastSeenAt)
    return { id: String(user._id), role: user.role, email: user.email, sid: p.sid }
  }
  if ((user.tokenVersion || 0) !== (p.ver || 0)) return null // legacy single-session gate
  return { id: String(user._id), role: user.role, email: user.email }
}

// Throttled (~60s) last-active bump — fire-and-forget so auth stays fast.
function touchSession(userId, sid, lastSeenAt) {
  if (lastSeenAt && Date.now() - new Date(lastSeenAt).getTime() < 60_000) return
  User.updateOne({ _id: userId, 'sessions.sid': sid }, { $set: { 'sessions.$.lastSeenAt': new Date() } }).catch(() => {})
}

// Drop an expired session so it stops counting toward the cap (fire-and-forget).
function pruneSession(userId, sid) {
  User.updateOne({ _id: userId }, { $pull: { sessions: { sid } } }).catch(() => {})
}

// Hard gate — 401 if not authenticated (or the session was superseded).
export async function requireAuth(req, _res, next) {
  try {
    const user = await resolveUser(req)
    if (!user) return next(unauthorized())
    req.user = user
    next()
  } catch (e) {
    next(e)
  }
}

// Soft gate — attaches req.user when present, never blocks.
export async function optionalAuth(req, _res, next) {
  try {
    const user = await resolveUser(req)
    if (user) req.user = user
  } catch {
    /* ignore — anonymous */
  }
  next()
}

// Role gate — use after requireAuth. requireRole('admin')
export function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized())
    if (!roles.includes(req.user.role)) return next(forbidden('Insufficient role'))
    next()
  }
}

// Inverse role gate — reject specific roles. Use after requireAuth.
// e.g. blockRole('client') so client accounts (which receive access via admin
// grants only) can never hit the purchase endpoints.
export function blockRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(unauthorized())
    if (roles.includes(req.user.role))
      return next(forbidden('This action is not available for your account type'))
    next()
  }
}
