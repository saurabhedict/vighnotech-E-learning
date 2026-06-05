import { z } from 'zod'
import ms from '../utils/ms.js'
import { User } from '../models/User.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, unauthorized, conflict } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  cookieOpts,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from '../utils/tokens.js'

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().max(80).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Issue both cookies AND return the access token in the body so the existing
// Bearer-based frontend keeps working without changes.
function issueSession(res, user) {
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role, email: user.email })
  const refreshToken = signRefreshToken({ id: user._id.toString(), tokenVersion: user.tokenVersion })
  res.cookie(ACCESS_COOKIE, accessToken, cookieOpts(ms(env.jwt.accessTtl)))
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts(ms(env.jwt.refreshTtl)))
  return accessToken
}

export const signup = asyncHandler(async (req, res) => {
  const { email, password, name } = req.body
  const exists = await User.findOne({ email })
  if (exists) throw conflict('An account with this email already exists')

  const user = new User({ email, name: name || '' })
  await user.setPassword(password)
  await user.save()

  const token = issueSession(res, user)
  audit(req, 'auth.signup', { targetType: 'User', targetId: user._id })
  res.status(201).json({ user: user.toSafeJSON(), token })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+passwordHash')
  if (!user || !(await user.comparePassword(password))) {
    audit(req, 'auth.login.fail', { meta: { email } })
    throw unauthorized('Invalid email or password')
  }

  user.lastLoginAt = new Date()
  await user.save()

  const token = issueSession(res, user)
  audit(req, 'auth.login', { targetType: 'User', targetId: user._id })
  res.json({ user: user.toSafeJSON(), token })
})

export const me = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  res.json({ user: user.toSafeJSON() })
})

export const refresh = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken
  if (!token) throw unauthorized('No refresh token')

  let payload
  try {
    payload = verifyRefreshToken(token)
  } catch {
    throw unauthorized('Invalid refresh token')
  }

  const user = await User.findById(payload.sub)
  if (!user || user.tokenVersion !== payload.ver) throw unauthorized('Session expired')

  const accessToken = issueSession(res, user)
  res.json({ user: user.toSafeJSON(), token: accessToken })
})

export const logout = asyncHandler(async (req, res) => {
  res.clearCookie(ACCESS_COOKIE, cookieOpts(0))
  res.clearCookie(REFRESH_COOKIE, cookieOpts(0))
  audit(req, 'auth.logout')
  res.json({ ok: true })
})

// Invalidate ALL sessions (e.g. after a password change / stolen account).
export const logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  user.tokenVersion += 1
  await user.save()
  res.clearCookie(ACCESS_COOKIE, cookieOpts(0))
  res.clearCookie(REFRESH_COOKIE, cookieOpts(0))
  audit(req, 'auth.logout_all', { targetType: 'User', targetId: user._id })
  res.json({ ok: true })
})

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body
  const user = await User.findById(req.user.id).select('+passwordHash')
  if (!user || !(await user.comparePassword(currentPassword)))
    throw badRequest('Current password is incorrect')
  await user.setPassword(newPassword)
  user.tokenVersion += 1 // log out other sessions
  await user.save()
  audit(req, 'auth.password_change', { targetType: 'User', targetId: user._id })
  res.json({ ok: true })
})
