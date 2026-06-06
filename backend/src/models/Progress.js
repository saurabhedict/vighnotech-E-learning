import mongoose from 'mongoose'

/**
 * Per-user content progress (LLD: Recently Viewed + Continue Watching).
 * Upserted as the user views/plays content; `position`/`duration` (seconds)
 * drive "continue watching" for video.
 */
const progressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    position: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    completed: { type: Boolean, default: false },
    lastViewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
)

progressSchema.index({ userId: 1, contentId: 1 }, { unique: true })

export const Progress = mongoose.model('Progress', progressSchema)
