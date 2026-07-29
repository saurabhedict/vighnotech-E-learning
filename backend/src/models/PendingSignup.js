import mongoose from 'mongoose'

/**
 * A registration awaiting OTP verification. We do NOT create the real User until
 * the emailed/SMS code is confirmed, so unverified accounts never exist. The
 * password is stored HASHED (same bcrypt cost as User) and the whole row is
 * auto-purged by a TTL index once it expires.
 */
const pendingSignupSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: { type: String, default: '' },
    phone: { type: String, default: '' },
    channel: { type: String, enum: ['email', 'sms'], default: 'email' },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
)

// Auto-clean abandoned registrations once they expire.
pendingSignupSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const PendingSignup = mongoose.model('PendingSignup', pendingSignupSchema)
