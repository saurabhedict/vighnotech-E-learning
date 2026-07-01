import mongoose from 'mongoose'

/**
 * Admin → everyone broadcast. One document = one announcement/instruction shown
 * to every user's notification bell. Per-user "read" state is derived cheaply
 * from User.notificationsSeenAt (createdAt > seenAt ⇒ unread) instead of fanning
 * a copy out to every user.
 */
const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    body: { type: String, required: true, trim: true, maxlength: 2000 },
    // Optional call-to-action link (internal path like /app/library or a URL).
    link: { type: String, trim: true, default: '' },
    // 'info' | 'success' | 'warning' — drives the bell's accent colour.
    level: { type: String, enum: ['info', 'success', 'warning'], default: 'info' },
    active: { type: Boolean, default: true, index: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
)

notificationSchema.index({ active: 1, createdAt: -1 })

export const Notification = mongoose.model('Notification', notificationSchema)
