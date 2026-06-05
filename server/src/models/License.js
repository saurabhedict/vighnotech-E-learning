import mongoose from 'mongoose'

/**
 * Source of truth for ownership (LLD: licenses; Doc 2 §4).
 * The signed JWS handed to clients is derived from this record. The DB row is
 * what makes revocation possible: every verify re-checks `status` here.
 *
 * `_id` IS the jti (license id), so revocation lists and lookups are trivial.
 */
const licenseSchema = new mongoose.Schema(
  {
    _id: { type: String }, // jti, e.g. "lic_8f2a..."
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },

    type: { type: String, enum: ['stream', 'download'], required: true },
    status: { type: String, enum: ['active', 'revoked', 'expired'], default: 'active', index: true },

    // For the download lane: the device this license is bound to.
    deviceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Device', default: null },

    kid: { type: String }, // signing key id used (for rotation)
    issuedAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: true },
    revokedAt: { type: Date },
    revokedReason: { type: String },
  },
  { timestamps: true, _id: false }
)

licenseSchema.index({ userId: 1, contentId: 1 })

licenseSchema.methods.isUsable = function isUsable() {
  return this.status === 'active' && this.expiresAt.getTime() > Date.now()
}

export const License = mongoose.model('License', licenseSchema)
