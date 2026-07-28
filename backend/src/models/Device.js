import mongoose from 'mongoose'

/**
 * Bound device for the download lane (LLD: devices; Doc 2 §7).
 * A copied encrypted file won't unlock on another machine because its
 * fingerprint won't match the license — console-style "home device" activation.
 */
const deviceSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fingerprint: { type: String, required: true }, // hash of CPU/MB/OS
    name: { type: String, default: '' },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
)

deviceSchema.index({ userId: 1, fingerprint: 1 }, { unique: true })

export const Device = mongoose.model('Device', deviceSchema)
