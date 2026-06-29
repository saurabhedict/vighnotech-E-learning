import mongoose from 'mongoose'
import { CONTENT_TYPES, CONTENT_LANES, LANES } from '@vigno/shared'

/**
 * A leaf content file (LLD: contents). Catalog item that can be free or paid.
 * `lane` decides how the license is verified (Doc 1 §6):
 *   - 'stream'   → study material, verified server-side before each signed URL
 *   - 'download' → software, verified by the launcher before it decrypts & runs
 */
const contentSchema = new mongoose.Schema(
  {
    chapterId: { type: mongoose.Schema.Types.ObjectId, ref: 'TreeNode', required: true, index: true },
    courseKey: { type: String, index: true },

    title: { type: String, required: true, trim: true },
    description: { type: String, default: '' },
    // pdf | video | 3d | game (matches the frontend viewers)
    type: { type: String, enum: CONTENT_TYPES, required: true },
    lane: { type: String, enum: CONTENT_LANES, default: LANES.STREAM },

    isPaid: { type: Boolean, default: false },
    price: { type: Number, default: 0, min: 0 }, // in INR (paise handled at payment time)

    // Storage (S3 stand-in). `storageKey` points at the (encrypted) object.
    storageKey: { type: String, default: '' },
    // AES-256-GCM encryption-at-rest params for download-lane objects.
    // `salt` derives the key; `iv`/`tag` are needed to decrypt. Never expose salt.
    // Large games are encrypted in the BACKGROUND (decoupled from the upload
    // request): `status` tracks it; `rawKey` is the temp unencrypted object being
    // processed (so a restart can resume). Not ready until status === 'ready'.
    enc: {
      encrypted: { type: Boolean, default: false },
      iv: { type: String, select: false },
      tag: { type: String, select: false },
      salt: { type: String, select: false },
      status: { type: String, enum: ['encrypting', 'ready', 'failed', null], default: null },
      rawKey: { type: String, default: '', select: false },
      error: { type: String, default: '' },
    },
    // For external HLS/test streams used in the demo viewer.
    externalUrl: { type: String, default: '' },

    // Adaptive HLS transcode (AWS MediaConvert). When `status === 'ready'`, the
    // stream lane serves `masterKey` (the multi-bitrate .m3u8) instead of the raw
    // upload. While 'processing'/'failed', playback falls back to progressive MP4.
    hls: {
      status: { type: String, enum: ['processing', 'ready', 'failed', null], default: null },
      jobId: { type: String, default: '' },
      masterKey: { type: String, default: '' }, // logical key, e.g. hls/<id>/master.m3u8
      error: { type: String, default: '' },
    },

    // Optional studio-grade DRM (Widevine/FairPlay via Mux/VdoCipher).
    drm: {
      provider: { type: String, enum: ['mux', 'vdocipher', null], default: null },
      assetId: { type: String, default: '' },
    },

    durationSec: { type: Number },
    sizeBytes: { type: Number },
    tags: { type: [String], default: [] },
    thumbnail: { type: String, default: '' },
    thumbnailStorageKey: { type: String, default: '' },
    previewText: { type: String, default: '' },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

contentSchema.index({ courseKey: 1, published: 1 })
// Hot path: list a chapter's content in display order (CMS + public tree).
contentSchema.index({ chapterId: 1, published: 1, order: 1 })
// Recommended fallback: newest paid, published content.
contentSchema.index({ published: 1, isPaid: 1, createdAt: -1 })
// Full-text index for search (title/description/tags).
contentSchema.index({ title: 'text', description: 'text', tags: 'text' })

// Public catalog shape (no storage internals leaked).
contentSchema.methods.toCatalogJSON = function toCatalogJSON() {
  return {
    id: this._id.toString(),
    title: this.title,
    type: this.type,
    lane: this.lane,
    paid: this.isPaid,
    price: this.price,
    courseKey: this.courseKey || '',
    durationSec: this.durationSec,
    thumbnailUrl: this.thumbnail,
    previewText: this.previewText,
  }
}

export const Content = mongoose.model('Content', contentSchema)