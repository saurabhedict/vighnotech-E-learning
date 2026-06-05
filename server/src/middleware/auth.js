import { verifyAccessToken, ACCESS_COOKIE } from '../utils/tokens.js'
import { unauthorized, forbidden } from '../utils/ApiError.js'

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

function decode(req) {
  const token = readToken(req)
  if (!token) return null
  try {
    const p = verifyAccessToken(token)
    if (p.typ && p.typ !== 'access') return null
    return { id: p.sub, role: p.role, email: p.email }
  } catch {
    return null
  }
}

// Hard gate — 401 if not authenticated.
export function requireAuth(req, _res, next) {
  const user = decode(req)
  if (!user) return next(unauthorized())
  req.user = user
  next()
}

// Soft gate — attaches req.user when present, never blocks.
export function optionalAuth(req, _res, next) {
  const user = decode(req)
  if (user) req.user = user
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
