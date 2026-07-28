import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, unauthorized } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import {
  generateTotpSecret,
  totpQrDataUrl,
  verifyTotp,
  generateBackupCodes,
} from '../services/twoFactor.js'

// GET /auth/2fa/status
export const status = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  res.json({ enabled: user.twoFAEnabled, method: user.twoFAMethod })
})

// POST /auth/2fa/totp/setup — create a pending secret + QR (not enabled yet).
export const setupTotp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+totpSecret')
  if (!user) throw unauthorized()
  const secret = generateTotpSecret()
  user.totpSecret = secret
  await user.save()
  const qr = await totpQrDataUrl(user.email, secret)
  audit(req, '2fa.totp.setup', { targetType: 'User', targetId: user._id })
  res.json({ qr, secret }) // secret shown for manual entry fallback
})

// POST /auth/2fa/totp/enable { code } — verify the first code, enable, return backup codes.
export const enableSchema = z.object({ code: z.string().min(6) })

export const enableTotp = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+totpSecret +backupCodes')
  if (!user) throw unauthorized()
  if (!user.totpSecret) throw badRequest('Run setup first')
  if (!verifyTotp(user.totpSecret, req.body.code)) throw badRequest('Invalid authenticator code')

  const { plain, hashed } = await generateBackupCodes(10)
  user.twoFAEnabled = true
  user.twoFAMethod = 'totp'
  user.backupCodes = hashed
  await user.save()
  audit(req, '2fa.enabled', { targetType: 'User', targetId: user._id, meta: { method: 'totp' } })
  res.json({ ok: true, method: 'totp', backupCodes: plain })
})

// POST /auth/2fa/email/enable — enable email-OTP 2FA (requires a verified email).
export const enableEmail2fa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+backupCodes')
  if (!user) throw unauthorized()
  if (!user.emailVerified) throw badRequest('Verify your email before enabling email 2FA')

  const { plain, hashed } = await generateBackupCodes(10)
  user.twoFAEnabled = true
  user.twoFAMethod = 'email'
  user.backupCodes = hashed
  await user.save()
  audit(req, '2fa.enabled', { targetType: 'User', targetId: user._id, meta: { method: 'email' } })
  res.json({ ok: true, method: 'email', backupCodes: plain })
})

// POST /auth/2fa/disable { password } — re-auth with password, then turn off.
export const disableSchema = z.object({ password: z.string().min(1) })

export const disable2fa = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+passwordHash')
  if (!user) throw unauthorized()
  if (!(await user.comparePassword(req.body.password))) throw badRequest('Password is incorrect')
  user.twoFAEnabled = false
  user.twoFAMethod = null
  user.totpSecret = null
  user.backupCodes = []
  await user.save()
  audit(req, '2fa.disabled', { targetType: 'User', targetId: user._id })
  res.json({ ok: true })
})

// POST /auth/2fa/backup-codes { password } — regenerate (invalidates old).
export const regenerateBackupCodes = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+passwordHash +backupCodes')
  if (!user) throw unauthorized()
  if (!user.twoFAEnabled) throw badRequest('2FA is not enabled')
  if (!(await user.comparePassword(req.body.password))) throw badRequest('Password is incorrect')
  const { plain, hashed } = await generateBackupCodes(10)
  user.backupCodes = hashed
  await user.save()
  audit(req, '2fa.backup_codes.regenerated', { targetType: 'User', targetId: user._id })
  res.json({ ok: true, backupCodes: plain })
})
