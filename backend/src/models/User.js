import mongoose from 'mongoose'
import bcrypt from 'bcryptjs'
import { USER_ROLES, ROLES } from '@vigno/shared'
import { encryptClientPassword } from '../services/clientCredential.js'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: '' },
    role: { type: String, enum: USER_ROLES, default: ROLES.USER, index: true },

    // Profile photo URL. New uploads go to S3 (served via /api/files/local/<key>);
    // older avatars may be a Cloudinary URL or an inline data URL (still rendered).
    avatar: { type: String, default: '' },
    // S3 object key backing the avatar (so we can delete/replace it). Empty for
    // legacy inline/Cloudinary avatars.
    avatarStorageKey: { type: String, default: '' },

    // Phone (E.164, e.g. +9198…) for SMS / WhatsApp OTP.
    phone: { type: String, trim: true, default: '' },
    phoneVerified: { type: Boolean, default: false },

    // Security trail / account controls (LLD: Auth & Access)
    twoFAEnabled: { type: Boolean, default: false },
    // 'totp' (authenticator app) | 'email' (email OTP) | null
    twoFAMethod: { type: String, enum: ['totp', 'email', null], default: null },
    // TOTP shared secret — never serialized.
    totpSecret: { type: String, select: false, default: null },
    // Reversible-encrypted password — CLIENTS ONLY (admin-managed accounts an admin
    // may view/reset). Kept in sync by setPassword(). Never serialized. Null for
    // normal users/admins (their password lives only as the one-way bcrypt hash).
    clientPasswordEnc: { type: String, select: false, default: null },
    // One-time recovery codes (hashed). [{ codeHash, usedAt }]
    backupCodes: { type: [{ codeHash: String, usedAt: Date }], select: false, default: [] },
    // Per-account 2FA brute-force guard (IP-independent).
    failedTwoFA: { type: Number, default: 0 },
    twoFALockUntil: { type: Date, default: null },

    emailVerified: { type: Boolean, default: false },
    // Wallet balance (INR) for credits / refunds (LLD: Wallet/Credits).
    walletBalance: { type: Number, default: 0, min: 0 },
    // Bumped on logout-all / password change to invalidate outstanding refresh tokens.
    tokenVersion: { type: Number, default: 0 },
    // Last time the user opened their notification bell — anything broadcast
    // after this is "unread" for them (see Notification model).
    notificationsSeenAt: { type: Date, default: null },
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
  // Clients are admin-managed: keep a reversible copy so an admin can view/reset it.
  // Every password path (create, self-change, reset, admin-set) runs through here.
  if (this.role === ROLES.CLIENT) this.clientPasswordEnc = encryptClientPassword(plain)
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
    avatar: this.avatar,
    role: this.role,
    twoFAEnabled: this.twoFAEnabled,
    twoFAMethod: this.twoFAMethod,
    emailVerified: this.emailVerified,
    phone: this.phone,
    phoneVerified: this.phoneVerified,
    verified: this.emailVerified || this.phoneVerified,
    walletBalance: this.walletBalance,
    createdAt: this.createdAt,
  }
}

export const User = mongoose.model('User', userSchema)
