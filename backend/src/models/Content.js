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

    // Storage (S3 stand-in). `storageKey` points at the encrypted object.
    storageKey: { type: String, default: '' },
    // For external HLS/test streams used in the demo viewer.
    externalUrl: { type: String, default: '' },

    // Optional studio-grade DRM (Widevine/FairPlay via Mux/VdoCipher).
    drm: {
      provider: { type: String, enum: ['mux', 'vdocipher', null], default: null },
      assetId: { type: String, default: '' },
    },

    durationSec: { type: Number },
    sizeBytes: { type: Number },
    tags: { type: [String], default: [] },
    thumbnail: { type: String, default: '' },
    order: { type: Number, default: 0 },
    published: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
)

contentSchema.index({ courseKey: 1, published: 1 })
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
    durationSec: this.durationSec,
    thumbnail: this.thumbnail,
  }
}

export const Content = mongoose.model('Content', contentSchema)
