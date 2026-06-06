import mongoose from 'mongoose'

/**
 * One-time password (email OTP). Used for email verification, password reset,
 * and email-based 2FA login. Codes are stored HASHED with a short TTL and an
 * attempt cap. A MongoDB TTL index auto-purges expired rows.
 */
const otpSchema = new mongoose.Schema(
  {
    // Identity: a userId for known users, or an email for pre-account flows.
    email: { type: String, lowercase: true, trim: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    purpose: {
      type: String,
      enum: ['email_verify', 'password_reset', 'login_2fa'],
      required: true,
      index: true,
    },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Auto-clean expired OTPs.
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export const Otp = mongoose.model('Otp', otpSchema)
