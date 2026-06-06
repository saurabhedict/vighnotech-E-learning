import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { USER_ROLES, ROLES } from '@vigno/shared'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: '' },
    role: { type: String, enum: USER_ROLES, default: ROLES.USER, index: true },

    // Security trail / account controls (LLD: Auth & Access)
    twoFAEnabled: { type: Boolean, default: false },
    // 'totp' (authenticator app) | 'email' (email OTP) | null
    twoFAMethod: { type: String, enum: ['totp', 'email', null], default: null },
    // TOTP shared secret — never serialized.
    totpSecret: { type: String, select: false, default: null },
    // One-time recovery codes (hashed). [{ codeHash, usedAt }]
    backupCodes: { type: [{ codeHash: String, usedAt: Date }], select: false, default: [] },

    emailVerified: { type: Boolean, default: false },
    // Bumped on logout-all / password change to invalidate outstanding refresh tokens.
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    // Known login devices (hash of ip+user-agent) for new-device alerts.
    loginDevices: {
      type: [{ hash: String, label: String, firstSeen: Date, lastSeen: Date }],
      select: false,
      default: [],
    },
  },
  { timestamps: true }
)

userSchema.methods.setPassword = async function setPassword(plain) {
  this.passwordHash = await bcrypt.hash(plain, 12)
}

userSchema.methods.comparePassword = function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash)
}

// Never serialize the hash, even if accidentally selected.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    role: this.role,
    twoFAEnabled: this.twoFAEnabled,
    emailVerified: this.emailVerified,
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
