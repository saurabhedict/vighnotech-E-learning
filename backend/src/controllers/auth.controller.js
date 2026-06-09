import crypto from 'node:crypto'
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
  sign2faChallenge,
  verify2faChallenge,
  cookieOpts,
  ACCESS_COOKIE,
  REFRESH_COOKIE,
} from '../utils/tokens.js'
import { issueOtp, verifyOtp } from '../services/otpService.js'
import { sendMail, newDeviceEmail } from '../services/mailer.js'
import { normalizePhone } from '../services/sms.js'
import { verifyTotp, consumeBackupCode } from '../services/twoFactor.js'

// Detect a new login device (hash of ip+user-agent). On first sight, email the
// user a "new sign-in" alert. `user` must be loaded with +loginDevices.
async function recordLoginDevice(req, user) {
  const ua = req.headers['user-agent'] || 'unknown'
  const ip = req.ip || 'unknown'
  const hash = crypto.createHash('sha256').update(`${ip}|${ua}`).digest('hex')
  const known = (user.loginDevices || []).find((d) => d.hash === hash)
  const now = new Date()
  if (known) {
    known.lastSeen = now
  } else {
    user.loginDevices.push({ hash, label: ua.slice(0, 80), firstSeen: now, lastSeen: now })
    // Only alert for established accounts (not the very first ever login).
    if (user.loginDevices.length > 1) {
      sendMail(newDeviceEmail(user.email, { ip, ua, when: now.toUTCString() })).catch(() => {})
      audit(req, 'auth.new_device', { targetType: 'User', targetId: user._id })
    }
  }
}

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Issue both cookies AND return the access token in the body so the existing
// Bearer-based frontend keeps working without changes.
function issueSession(res, user) {
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role, email: user.email, tokenVersion: user.tokenVersion })
  const refreshToken = signRefreshToken({ id: user._id.toString(), tokenVersion: user.tokenVersion })
  res.cookie(ACCESS_COOKIE, accessToken, cookieOpts(ms(env.jwt.accessTtl)))
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts(ms(env.jwt.refreshTtl)))
  return accessToken
}

export const signup = asyncHandler(async (req, res) => {
  const { email, password, name, phone } = req.body
  const exists = await User.findOne({ email })
  if (exists) throw conflict('An account with this email already exists')

  const user = new User({ email, name: name || '', phone: phone ? normalizePhone(phone) : '' })
  await user.setPassword(password)
  await recordLoginDevice(req, user)
  await user.save()

  // Auto-login; the client then drives account verification via /send-verification
  // (the user chooses email / SMS / WhatsApp).
  const token = issueSession(res, user)
  audit(req, 'auth.signup', { targetType: 'User', targetId: user._id })
  res.status(201).json({ user: user.toSafeJSON(), token })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+passwordHash +loginDevices')
  if (!user || !(await user.comparePassword(password))) {
    audit(req, 'auth.login.fail', { meta: { email } })
    throw unauthorized('Invalid email or password')
  }

  // 2FA gate: password is correct but we don't issue a session yet.
  if (user.twoFAEnabled) {
    const challenge = sign2faChallenge(user)
    if (user.twoFAMethod === 'email') {
      await issueOtp({ userId: user._id, email: user.email, purpose: 'login_2fa', sendTo: user.email })
    }
    audit(req, 'auth.login.2fa_required', { targetType: 'User', targetId: user._id })
    return res.json({ twoFARequired: true, method: user.twoFAMethod, challenge })
  }

  user.lastLoginAt = new Date()
  await recordLoginDevice(req, user)
  await user.save()
  // Atomically bump tokenVersion (single active session): two concurrent logins
  // can't both survive, and we get the authoritative new value for the tokens.
  const fresh = await User.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } }, { new: true })

  const token = issueSession(res, fresh)
  audit(req, 'auth.login', { targetType: 'User', targetId: fresh._id })
  res.json({ user: fresh.toSafeJSON(), token })
})

// Second step of a 2FA login: exchange the challenge + code for a session.
export const verify2faSchema = z.object({
  challenge: z.string().min(10),
  code: z.string().min(4),
})

export const verify2fa = asyncHandler(async (req, res) => {
  const { challenge, code } = req.body
  let payload
  try {
    payload = verify2faChallenge(challenge)
  } catch {
    throw unauthorized('2FA session expired — please sign in again')
  }
  const user = await User.findById(payload.sub).select('+totpSecret +backupCodes +loginDevices')
  if (!user || !user.twoFAEnabled) throw unauthorized('2FA not active')

  // Per-account lockout: caps TOTP/backup-code brute force regardless of source IP.
  if (user.twoFALockUntil && user.twoFALockUntil > new Date()) {
    audit(req, 'auth.2fa.locked', { targetType: 'User', targetId: user._id })
    throw unauthorized('Too many 2FA attempts — try again in a few minutes')
  }

  let ok = false
  if (user.twoFAMethod === 'totp') {
    ok = verifyTotp(user.totpSecret, code) || (await consumeBackupCode(user, code))
  } else if (user.twoFAMethod === 'email') {
    ok = (await verifyOtp({ userId: user._id, purpose: 'login_2fa', code })).ok
  }
  if (!ok) {
    user.failedTwoFA = (user.failedTwoFA || 0) + 1
    if (user.failedTwoFA >= 5) {
      user.failedTwoFA = 0
      user.twoFALockUntil = new Date(Date.now() + 15 * 60_000)
    }
    await user.save()
    audit(req, 'auth.2fa.fail', { targetType: 'User', targetId: user._id })
    throw unauthorized('Invalid 2FA code')
  }

  user.failedTwoFA = 0
  user.twoFALockUntil = null
  user.lastLoginAt = new Date()
  await recordLoginDevice(req, user)
  await user.save()
  const fresh = await User.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } }, { new: true })

  const token = issueSession(res, fresh)
  audit(req, 'auth.login.2fa_ok', { targetType: 'User', targetId: fresh._id })
  res.json({ user: fresh.toSafeJSON(), token })
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
  const user = await User.findByIdAndUpdate(req.user.id, { $inc: { tokenVersion: 1 } }, { new: true })
  if (!user) throw unauthorized()
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
  await user.save()
  // Sign out OTHER sessions (atomic bump) but keep THIS device in by re-issuing
  // a fresh session carrying the new version.
  const fresh = await User.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } }, { new: true })
  const token = issueSession(res, fresh)
  audit(req, 'auth.password_change', { targetType: 'User', targetId: fresh._id })
  res.json({ ok: true, token })
})

// ── Account verification (multi-channel OTP: email / sms / whatsapp) ──────────
export const sendVerificationSchema = z.object({
  channel: z.enum(['email', 'sms', 'whatsapp']).optional(),
  phone: z.string().trim().max(20).optional(),
})

export const sendEmailVerification = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  const channel = req.body?.channel || 'email'

  let to = user.email
  if (channel === 'sms' || channel === 'whatsapp') {
    // Accept a phone here (verify step) and save it to the account.
    if (req.body?.phone) {
      user.phone = normalizePhone(req.body.phone)
      await user.save()
    }
    if (!user.phone) throw badRequest('Add a phone number to receive an SMS/WhatsApp code')
    to = user.phone
  } else if (user.emailVerified) {
    return res.json({ ok: true, alreadyVerified: true })
  }

  await issueOtp({ userId: user._id, email: user.email, purpose: 'email_verify', channel, to })
  audit(req, 'auth.verify.send', { targetType: 'User', targetId: user._id, meta: { channel } })
  res.json({ ok: true, channel, sentTo: channel === 'email' ? maskEmail(to) : maskPhone(to) })
})

export const verifyEmailSchema = z.object({ code: z.string().min(4) })

export const verifyEmail = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  const result = await verifyOtp({ userId: user._id, purpose: 'email_verify', code: req.body.code })
  if (!result.ok) throw badRequest(`Verification failed: ${result.reason}`)
  // Mark the contact that actually received the code as verified.
  if (result.channel === 'sms' || result.channel === 'whatsapp') user.phoneVerified = true
  else user.emailVerified = true
  await user.save()
  audit(req, 'auth.verified', { targetType: 'User', targetId: user._id, meta: { channel: result.channel } })
  res.json({ ok: true, user: user.toSafeJSON() })
})

const maskEmail = (e = '') => e.replace(/^(.).*(@.*)$/, '$1***$2')
const maskPhone = (p = '') => p.replace(/.(?=.{2})/g, '•')

// ── Password reset (forgot → reset with OTP) ─────────────────────────────────
export const forgotPasswordSchema = z.object({ email: z.string().email() })

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  // Always respond OK — never reveal whether an account exists.
  if (user) {
    await issueOtp({ userId: user._id, email: user.email, purpose: 'password_reset', sendTo: user.email })
    audit(req, 'auth.forgot_password', { targetType: 'User', targetId: user._id })
  }
  res.json({ ok: true, message: 'If that email is registered, a reset code has been sent.' })
})

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  code: z.string().min(4),
  newPassword: z.string().min(8),
})

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body
  const user = await User.findOne({ email })
  if (!user) throw badRequest('Invalid reset request')
  const result = await verifyOtp({ userId: user._id, purpose: 'password_reset', code })
  if (!result.ok) throw badRequest(`Reset failed: ${result.reason}`)
  await user.setPassword(newPassword)
  await user.save()
  await User.findByIdAndUpdate(user._id, { $inc: { tokenVersion: 1 } }) // invalidate all existing sessions
  audit(req, 'auth.password_reset', { targetType: 'User', targetId: user._id })
  res.json({ ok: true })
})
