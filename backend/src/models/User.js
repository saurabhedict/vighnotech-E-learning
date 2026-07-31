import mongoose from 'mongoose'
import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'
import { USER_ROLES, ROLES } from '@vigno/shared'
import { env } from '../config/env.js'
import ms from '../utils/ms.js'
import { encryptClientPassword } from '../services/clientCredential.js'

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true, select: false },
    name: { type: String, trim: true, default: '' },
    role: { type: String, enum: USER_ROLES, default: ROLES.USER, index: true },
    // Hard account ban. When true, EVERY lane is denied — web, launcher (.exe),
    // apk, license/key/download — and all active sessions are cleared. Enforced in
    // middleware/auth.js (all authed routes), login/refresh, and the apk endpoints.
    blocked: { type: Boolean, default: false, index: true },
    blockedAt: { type: Date, default: null },

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
    // Concurrent login "places" (web / launcher / apk). Capped at
    // env.security.maxSessionsPerUser; a login past the cap evicts the
    // least-recently-active one. Tokens carry a `sid` that must match a live
    // entry here (see middleware/auth.js). Never serialized.
    sessions: {
      type: [{
        sid: String,
        kind: { type: String, enum: ['web', 'launcher', 'apk'], default: 'web' },
        label: { type: String, default: '' },
        ua: { type: String, default: '' },
        ip: { type: String, default: '' },
        deviceModel: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
        lastSeenAt: { type: Date, default: Date.now },
        // Hard expiry — the place auto-logs-out at this time (createdAt + sessionTtl).
        expiresAt: { type: Date },
      }],
      select: false,
      default: [],
    },
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

// Register a new login place. Returns { sid, evicted:[removed sessions] } after
// LRU-trimming to the concurrent cap — the least-recently-active place is dropped
// first (never the one just added). Callers persist the doc + reconcile evicted
// apk sessions (see services/sessions.js). Requires `sessions` to be selected.
userSchema.methods.addSession = function addSession(info = {}) {
  const sid = crypto.randomBytes(16).toString('hex')
  const now = new Date()
  const ttlMs = ms(env.security.sessionTtl || '72h') || ms('72h')
  this.sessions.push({
    sid,
    kind: info.kind || 'web',
    label: info.label || '',
    ua: info.ua || '',
    ip: info.ip || '',
    deviceModel: info.deviceModel || '',
    createdAt: now,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + ttlMs),
  })
  const cap = Math.max(1, env.security.maxSessionsPerUser || 6)
  const plain = (s) => (s && s.toObject ? s.toObject() : s)
  const evicted = []
  while (this.sessions.length > cap) {
    let oldest = 0
    for (let i = 1; i < this.sessions.length; i++) {
      if (new Date(this.sessions[i].lastSeenAt).getTime() < new Date(this.sessions[oldest].lastSeenAt).getTime()) oldest = i
    }
    evicted.push(plain(this.sessions[oldest]))
    this.sessions.splice(oldest, 1)
  }
  return { sid, evicted }
}

// Remove one place by sid; returns the removed session (plain) or null.
userSchema.methods.removeSession = function removeSession(sid) {
  const idx = this.sessions.findIndex((s) => s.sid === sid)
  if (idx === -1) return null
  const [removed] = this.sessions.splice(idx, 1)
  return removed && removed.toObject ? removed.toObject() : removed
}

// Bump a session's last-active time. Returns true if the sid was found.
userSchema.methods.touchSession = function touchSession(sid) {
  const s = this.sessions.find((x) => x.sid === sid)
  if (!s) return false
  s.lastSeenAt = new Date()
  return true
}

// Never serialize the hash, even if accidentally selected.
userSchema.methods.toSafeJSON = function toSafeJSON() {
  return {
    id: this._id.toString(),
    email: this.email,
    name: this.name,
    avatar: this.avatar,
    role: this.role,
    blocked: !!this.blocked,
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
