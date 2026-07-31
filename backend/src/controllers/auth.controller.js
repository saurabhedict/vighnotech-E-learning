import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import ms from '../utils/ms.js'
import { User } from '../models/User.js'
import { PendingSignup } from '../models/PendingSignup.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, unauthorized, conflict, forbidden } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
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
import { addSessionAndReconcile, revokeSession, revokeAllSessions, sessionInfoFromReq } from '../services/sessions.js'

// Native clients (launcher / apk) can't hold an httpOnly cookie, so we also hand
// them the refresh token in the response body to persist + refresh with. Browsers
// get it only as the httpOnly cookie (never exposed to JS).
const isNativeClient = (req) => {
  const h = String(req.headers['x-vigno-client'] || '').toLowerCase()
  if (h === 'launcher' || h === 'apk') return true
  return /electron|vigno[- ]?launcher/i.test(String(req.headers['user-agent'] || ''))
}

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

// Emails are stored lowercased+trimmed (User schema `lowercase:true`), but
// Mongoose only normalizes on SAVE — never on queries. So normalize every inbound
// email here, otherwise a lookup like findOne({ email }) silently misses when the
// user types any capital (e.g. "Me@Gmail.com" ≠ stored "me@gmail.com"). This was
// why password-reset OTPs "weren't coming": no account matched, so nothing sent.
const emailField = z.string().trim().toLowerCase().pipe(z.string().email())

export const signupSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(20).optional(),
  channel: z.enum(['email', 'sms']).optional(), // how to deliver the registration OTP
})

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1),
})

// Issue both cookies AND return the access token in the body so the existing
// Bearer-based frontend keeps working without changes.
function issueSession(res, user, sid) {
  const accessToken = signAccessToken({ id: user._id.toString(), role: user.role, email: user.email, tokenVersion: user.tokenVersion, sid })
  const refreshToken = signRefreshToken({ id: user._id.toString(), tokenVersion: user.tokenVersion, sid })
  res.cookie(ACCESS_COOKIE, accessToken, cookieOpts(ms(env.jwt.accessTtl)))
  res.cookie(REFRESH_COOKIE, refreshToken, cookieOpts(ms(env.jwt.refreshTtl)))
  return { accessToken, refreshToken }
}

// Registration is a two-step OTP flow: /signup stashes the details + sends a code
// (NO account or session yet), then /verify-signup confirms the code and actually
// creates the account + logs the user in. This guarantees every new account has a
// verified email/phone and leaves no unverified users lying around.
export const signup = asyncHandler(async (req, res) => {
  const { email, password, name, phone, channel = 'email' } = req.body
  if (await User.findOne({ email })) throw conflict('An account with this email already exists')

  const normPhone = phone ? normalizePhone(phone) : ''
  if (channel === 'sms' && !normPhone) throw badRequest('Enter your phone number to receive an SMS code')

  const passwordHash = await bcrypt.hash(password, 12)
  const expiresAt = new Date(Date.now() + 30 * 60_000) // 30 min to complete registration
  await PendingSignup.findOneAndUpdate(
    { email },
    { email, passwordHash, name: name || '', phone: normPhone, channel, expiresAt },
    { upsert: true, setDefaultsOnInsert: true }
  )

  const to = channel === 'sms' ? normPhone : email
  const { code, delivered } = await issueOtp({ email, purpose: 'signup', channel, to })
  const devCode = !delivered && !env.isProd ? code : undefined
  audit(req, 'auth.signup.start', { meta: { email, channel } })
  res.status(200).json({
    verificationRequired: true,
    email,
    channel,
    sentTo: channel === 'sms' ? maskPhone(to) : maskEmail(email),
    ...(devCode ? { devCode } : {}),
  })
})

// Step 2 of registration: confirm the OTP → create the account → issue a session.
export const verifySignupSchema = z.object({ email: emailField, code: z.string().min(4) })

export const verifySignup = asyncHandler(async (req, res) => {
  const { email, code } = req.body
  const pending = await PendingSignup.findOne({ email })
  if (!pending) throw badRequest('No pending registration found — please sign up again.')

  const result = await verifyOtp({ email, purpose: 'signup', code })
  if (!result.ok) throw badRequest(`Verification failed: ${result.reason}`)

  // Guard the (tiny) race where the same email got created between OTP send + verify.
  if (await User.findOne({ email })) {
    await PendingSignup.deleteOne({ email })
    throw conflict('An account with this email already exists')
  }

  const viaSms = pending.channel === 'sms'
  const user = new User({
    email,
    name: pending.name || '',
    phone: pending.phone || '',
    emailVerified: !viaSms,
    phoneVerified: viaSms,
  })
  user.passwordHash = pending.passwordHash // already bcrypt-hashed at /signup
  await recordLoginDevice(req, user)
  const sid = await addSessionAndReconcile(user, sessionInfoFromReq(req))
  await user.save()
  await PendingSignup.deleteOne({ email })

  const { accessToken: token, refreshToken } = issueSession(res, user, sid)
  audit(req, 'auth.signup.verify', { targetType: 'User', targetId: user._id })
  res.status(201).json({ user: user.toSafeJSON(), token, ...(isNativeClient(req) ? { refreshToken } : {}) })
})

// Resend the registration OTP (same channel the user picked at /signup).
export const resendSignupOtpSchema = z.object({ email: emailField })

export const resendSignupOtp = asyncHandler(async (req, res) => {
  const { email } = req.body
  const pending = await PendingSignup.findOne({ email })
  if (!pending) throw badRequest('No pending registration found — please sign up again.')
  const channel = pending.channel || 'email'
  const to = channel === 'sms' ? pending.phone : email
  const { code, delivered } = await issueOtp({ email, purpose: 'signup', channel, to })
  const devCode = !delivered && !env.isProd ? code : undefined
  res.json({ ok: true, channel, sentTo: channel === 'sms' ? maskPhone(to) : maskEmail(email), ...(devCode ? { devCode } : {}) })
})

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body
  const user = await User.findOne({ email }).select('+passwordHash +loginDevices +sessions')
  if (!user || !(await user.comparePassword(password))) {
    audit(req, 'auth.login.fail', { meta: { email } })
    throw unauthorized('Invalid email or password')
  }
  if (user.blocked) {
    audit(req, 'auth.login.blocked', { targetType: 'User', targetId: user._id })
    throw forbidden('Your account has been blocked. Please contact the administrator.')
  }

  // 2FA gate: password is correct but we don't issue a session yet.
  if (user.twoFAEnabled) {
    const challenge = sign2faChallenge(user)
    let devCode
    if (user.twoFAMethod === 'email') {
      const { code, delivered } = await issueOtp({ userId: user._id, email: user.email, purpose: 'login_2fa', channel: 'email' })
      // If the email actually went out, the user reads it from their inbox. Only if
      // delivery failed (non-prod) do we surface the code so sign-in isn't blocked.
      if (!delivered && !env.isProd) devCode = code
    }
    audit(req, 'auth.login.2fa_required', { targetType: 'User', targetId: user._id })
    return res.json({ twoFARequired: true, method: user.twoFAMethod, challenge, ...(devCode ? { devCode } : {}) })
  }

  user.lastLoginAt = new Date()
  await recordLoginDevice(req, user)
  // Register this login as one of up to maxSessionsPerUser concurrent "places";
  // a login past the cap evicts the least-recently-active one.
  const sid = await addSessionAndReconcile(user, sessionInfoFromReq(req))
  await user.save()

  const { accessToken: token, refreshToken } = issueSession(res, user, sid)
  audit(req, 'auth.login', { targetType: 'User', targetId: user._id })
  res.json({ user: user.toSafeJSON(), token, ...(isNativeClient(req) ? { refreshToken } : {}) })
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
  const user = await User.findById(payload.sub).select('+totpSecret +backupCodes +loginDevices +sessions')
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
  const sid = await addSessionAndReconcile(user, sessionInfoFromReq(req))
  await user.save()

  const { accessToken: token, refreshToken } = issueSession(res, user, sid)
  audit(req, 'auth.login.2fa_ok', { targetType: 'User', targetId: user._id })
  res.json({ user: user.toSafeJSON(), token, ...(isNativeClient(req) ? { refreshToken } : {}) })
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

  const user = await User.findById(payload.sub).select('+sessions')
  if (!user) throw unauthorized('Session expired')
  if (user.blocked) throw forbidden('Your account has been blocked.')

  let sid = payload.sid
  if (sid) {
    // Per-session: the sid must still be live and within its 72h lifetime.
    const sess = (user.sessions || []).find((s) => s.sid === sid)
    if (!sess) throw unauthorized('Session expired')
    if (sess.expiresAt && new Date(sess.expiresAt).getTime() < Date.now()) {
      user.removeSession(sid)
      await user.save()
      throw unauthorized('Session expired')
    }
    user.touchSession(sid)
    await user.save()
  } else {
    // Legacy refresh token (pre-multi-session): honour the single-session gate,
    // then upgrade this client to a real tracked session going forward.
    if (user.tokenVersion !== payload.ver) throw unauthorized('Session expired')
    sid = await addSessionAndReconcile(user, sessionInfoFromReq(req))
    await user.save()
  }

  const { accessToken, refreshToken } = issueSession(res, user, sid)
  res.json({ user: user.toSafeJSON(), token: accessToken, ...(isNativeClient(req) ? { refreshToken } : {}) })
})

export const logout = asyncHandler(async (req, res) => {
  // Remove ONLY this place from the registry. logout isn't behind requireAuth, so
  // read the sid straight from the presented access token (cookie or Bearer).
  const token = req.cookies?.[ACCESS_COOKIE] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null)
  if (token) {
    try {
      const p = verifyAccessToken(token)
      if (p?.sub && p?.sid) {
        const user = await User.findById(p.sub).select('+sessions')
        if (user) { await revokeSession(user, p.sid); await user.save() }
      }
    } catch { /* expired/invalid — still clear cookies below */ }
  }
  res.clearCookie(ACCESS_COOKIE, cookieOpts(0))
  res.clearCookie(REFRESH_COOKIE, cookieOpts(0))
  audit(req, 'auth.logout')
  res.json({ ok: true })
})

// Invalidate ALL sessions/places (e.g. after a password change / stolen account).
export const logoutAll = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+sessions')
  if (!user) throw unauthorized()
  await revokeAllSessions(user)
  user.tokenVersion = (user.tokenVersion || 0) + 1 // also kills any legacy tokens
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
  const user = await User.findById(req.user.id).select('+passwordHash +sessions')
  if (!user || !(await user.comparePassword(currentPassword)))
    throw badRequest('Current password is incorrect')
  await user.setPassword(newPassword)
  // Sign out every OTHER place, then keep THIS device signed in with a fresh session.
  await revokeAllSessions(user)
  user.tokenVersion = (user.tokenVersion || 0) + 1
  const sid = await addSessionAndReconcile(user, sessionInfoFromReq(req))
  await user.save()
  const { accessToken: token, refreshToken } = issueSession(res, user, sid)
  audit(req, 'auth.password_change', { targetType: 'User', targetId: user._id })
  res.json({ ok: true, token, ...(isNativeClient(req) ? { refreshToken } : {}) })
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

  const { code, delivered } = await issueOtp({ userId: user._id, email: user.email, purpose: 'email_verify', channel, to })
  audit(req, 'auth.verify.send', { targetType: 'User', targetId: user._id, meta: { channel } })
  // If it actually went out, the user reads it from their inbox/phone. Only if
  // delivery failed (non-prod) do we surface the code so they aren't blocked.
  const devCode = !delivered && !env.isProd ? code : undefined
  res.json({ ok: true, channel, sentTo: channel === 'email' ? maskEmail(to) : maskPhone(to), ...(devCode ? { devCode } : {}) })
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
export const forgotPasswordSchema = z.object({ email: emailField })

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body
  const user = await User.findOne({ email })
  // Always respond OK — never reveal whether an account exists.
  if (user) {
    await issueOtp({ userId: user._id, email: user.email, purpose: 'password_reset', to: user.email })
    audit(req, 'auth.forgot_password', { targetType: 'User', targetId: user._id })
    if (!env.isProd) console.log(`[forgot-password] reset OTP dispatched to ${email}`)
  } else if (!env.isProd) {
    // Dev aid: this silent "no match" path is the usual reason an OTP never arrives.
    console.log(`[forgot-password] no account for "${email}" — nothing sent (is that email registered?)`)
  }
  res.json({ ok: true, message: 'If that email is registered, a reset code has been sent.' })
})

export const resetPasswordSchema = z.object({
  email: emailField,
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
  await revokeAllSessions(user) // sign out every place — user signs in fresh
  user.tokenVersion = (user.tokenVersion || 0) + 1
  await user.save()
  audit(req, 'auth.password_reset', { targetType: 'User', targetId: user._id })
  res.json({ ok: true })
})
