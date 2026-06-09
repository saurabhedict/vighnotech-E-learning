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
 * Verify the access token AND enforce a single active session: the token's
 * version must match the user's current tokenVersion, which is bumped on every
 * login (so logging in elsewhere invalidates this token), password change and
 * logout-all. Returns { id, role, email } or null.
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
  if (p.typ && p.typ !== 'access') return null
  const user = await User.findById(p.sub).select('tokenVersion role email').lean()
  if (!user) return null
  if ((user.tokenVersion || 0) !== (p.ver || 0)) return null // signed in elsewhere / revoked
  return { id: String(user._id), role: user.role, email: user.email }
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
