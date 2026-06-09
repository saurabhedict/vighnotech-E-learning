import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { unauthorized } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { cloudinaryEnabled, uploadAvatar as cloudUploadAvatar, destroyAvatar } from '../services/cloudinary.js'

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
  // Upload to Cloudinary when configured; else store the data URL inline (dev).
  if (cloudinaryEnabled()) {
    user.avatar = await cloudUploadAvatar(req.body.image, user._id)
  } else {
    user.avatar = req.body.image
  }
  await user.save()
  audit(req, 'profile.avatar.upload', { targetType: 'User', targetId: user._id, meta: { cloud: cloudinaryEnabled() } })
  res.json({ ok: true, user: user.toSafeJSON() })
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
