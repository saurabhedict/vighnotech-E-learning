import { z } from 'zod'
import { ROLES } from '@vigno/shared'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { unauthorized, badRequest, forbidden } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { License } from '../models/License.js'
import { Purchase } from '../models/Purchase.js'
import { cookieOpts, ACCESS_COOKIE, REFRESH_COOKIE } from '../utils/tokens.js'
import { cloudinaryEnabled, uploadAvatar as cloudUploadAvatar, destroyAvatar } from '../services/cloudinary.js'
import { normalizePhone } from '../services/sms.js'

// The client crops/zooms/rotates the photo to a small square and sends it as a
// JPEG/PNG data URL. We cap the size so the user document stays small.
export const avatarSchema = z.object({
  image: z
    .string()
    .regex(/^data:image\/(png|jpeg|jpg|webp);base64,/, 'Must be an image data URL')
    .max(600_000, 'Image too large (max ~450KB) — zoom out or use a smaller image'),
})

export const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  // Upload to Cloudinary when configured; if that fails (e.g. account upload
  // restriction / 403), fall back to storing the image inline so the photo still
  // saves. If Cloudinary isn't configured at all, store inline directly.
  let storedVia = 'inline'
  if (cloudinaryEnabled()) {
    try {
      user.avatar = await cloudUploadAvatar(req.body.image, user._id)
      storedVia = 'cloudinary'
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn('[avatar] Cloudinary upload failed — storing inline instead:', e?.message)
      user.avatar = req.body.image
    }
  } else {
    user.avatar = req.body.image
  }
  await user.save()
  audit(req, 'profile.avatar.upload', { targetType: 'User', targetId: user._id, meta: { storedVia } })
  res.json({ ok: true, user: user.toSafeJSON(), storedVia })
})

export const removeAvatar = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  if (cloudinaryEnabled()) await destroyAvatar(user._id)
  user.avatar = ''
  await user.save()
  audit(req, 'profile.avatar.remove', { targetType: 'User', targetId: user._id })
  res.json({ ok: true, user: user.toSafeJSON() })
})

// PATCH /api/profile/phone — set/replace the phone number. Changing the number
// clears any prior verification (the new number must be re-verified via OTP).
export const setPhoneSchema = z.object({
  phone: z.string().trim().min(6, 'Enter a valid phone number').max(20),
})

export const setPhone = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  if (!user) throw unauthorized()
  const phone = normalizePhone(req.body.phone)
  if (phone.replace(/\D/g, '').length < 6) throw badRequest('Enter a valid phone number (with country code, e.g. +91…)')
  const changed = user.phone !== phone
  user.phone = phone
  if (changed) user.phoneVerified = false
  await user.save()
  audit(req, 'profile.phone.set', { targetType: 'User', targetId: user._id })
  res.json({ ok: true, user: user.toSafeJSON() })
})

// DELETE /api/profile/account — self-delete, password-confirmed (danger zone).
export const deleteAccountSchema = z.object({ password: z.string().min(1) })

export const deleteAccount = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id).select('+passwordHash')
  if (!user) throw unauthorized()
  if (!(await user.comparePassword(req.body.password))) throw badRequest('Password is incorrect')
  if (user.role === ROLES.ADMIN) {
    const admins = await User.countDocuments({ role: ROLES.ADMIN })
    if (admins <= 1) throw forbidden('You are the last admin — make someone else an admin before deleting your account')
  }
  if (cloudinaryEnabled()) await destroyAvatar(user._id).catch(() => {})
  await Promise.all([
    License.deleteMany({ userId: user._id }),
    Purchase.deleteMany({ userId: user._id }),
    import('../models/Device.js').then((m) => m.Device.deleteMany({ userId: user._id })).catch(() => {}),
    import('../models/Favorite.js').then((m) => m.Favorite.deleteMany({ userId: user._id })).catch(() => {}),
    import('../models/Progress.js').then((m) => m.Progress.deleteMany({ userId: user._id })).catch(() => {}),
  ])
  await user.deleteOne()
  res.clearCookie(ACCESS_COOKIE, cookieOpts(0))
  res.clearCookie(REFRESH_COOKIE, cookieOpts(0))
  audit(req, 'profile.account.delete', { targetType: 'User', targetId: user._id, meta: { email: user.email } })
  res.json({ ok: true })
})
