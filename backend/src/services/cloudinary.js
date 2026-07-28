import { v2 as cloudinary } from 'cloudinary'
import { env } from '../config/env.js'

/**
 * Cloudinary uploader for profile photos. When not configured, callers fall
 * back to storing the image inline (data URL) so the feature works in dev.
 */
let configured = false
function ensure() {
  if (configured) return true
  if (!env.cloudinary.configured) return false
  cloudinary.config({
    cloud_name: env.cloudinary.cloudName,
    api_key: env.cloudinary.apiKey,
    api_secret: env.cloudinary.apiSecret,
    secure: true,
  })
  configured = true
  return true
}

export const cloudinaryEnabled = () => env.cloudinary.configured

// Upload a data-URL image as the user's avatar; returns the secure URL.
export async function uploadAvatar(dataUrl, userId) {
  if (!ensure()) return null
  try {
    const res = await cloudinary.uploader.upload(dataUrl, {
      folder: 'vigno/avatars',
      public_id: String(userId),
      overwrite: true,
      invalidate: true,
      resource_type: 'image',
      // 512px square, auto-gravity (no add-on needed), auto quality for crisp avatars.
      transformation: [{ width: 512, height: 512, crop: 'fill', gravity: 'auto', quality: 'auto:good' }],
    })
    return res.secure_url
  } catch (e) {
    const err = new Error(`Cloudinary upload failed: ${e?.message || 'check CLOUDINARY_* credentials'}`)
    err.status = 400
    throw err
  }
}

export async function destroyAvatar(userId) {
  if (!ensure()) return
  try {
    await cloudinary.uploader.destroy(`vigno/avatars/${userId}`, { invalidate: true })
  } catch {
    /* best-effort */
  }
}
