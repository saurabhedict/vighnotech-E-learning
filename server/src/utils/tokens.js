import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'

// ── Login tokens (HS256 JWT in httpOnly cookies) ─────────────────────────────
// These prove *who is logged in*. Distinct from LICENSE tokens (ES256), which
// prove *what you may access* and are handled by the License Authority.

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role, email: user.email, typ: 'access' },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessTtl }
  )
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id, ver: user.tokenVersion, typ: 'refresh' },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshTtl }
  )
}

export function verifyAccessToken(token) {
  return jwt.verify(token, env.jwt.accessSecret)
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret)
}

// Cookie options shared by login/refresh/logout.
export function cookieOpts(maxAgeMs) {
  return {
    httpOnly: true,
    secure: env.jwt.cookieSecure,
    sameSite: env.jwt.cookieSecure ? 'none' : 'lax',
    path: '/',
    maxAge: maxAgeMs,
  }
}

export const ACCESS_COOKIE = 'vigno_at'
export const REFRESH_COOKIE = 'vigno_rt'
