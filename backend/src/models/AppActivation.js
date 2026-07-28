import mongoose from 'mongoose'

/**
 * AppActivation — the Android (APK) single-device lock.
 *
 * One row per (user, app). It records WHICH single device the installed APK is
 * activated on, plus the device metadata the app reports on activation. The app
 * only runs on that one device; to move to a new phone/tablet the user must
 * deregister first (status → 'deregistered'), which frees the row to re-bind.
 *
 * This is separate from the PC/launcher `Device`+`License` device binding so the
 * two delivery models never interfere.
 */
const appActivationSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true, index: true },
    identifier: { type: String, required: true, index: true }, // the app's product code
    deviceId: { type: String, required: true }, // the single bound device (the lock key)
    status: { type: String, enum: ['active', 'deregistered'], default: 'active', index: true },

    // Device metadata the APK sends on activation (all optional, stored as-is).
    androidId: { type: String, default: '' },
    installationId: { type: String, default: '' },
    appVersion: { type: String, default: '' },
    deviceModel: { type: String, default: '' },
    osVersion: { type: String, default: '' },
    deviceInfo: { type: String, default: '' }, // free-form (may be a JSON string)
    license: { type: String, default: '' }, // optional license/token the app holds

    activatedAt: { type: Date, default: Date.now },
    lastSeenAt: { type: Date, default: Date.now },
    deregisteredAt: { type: Date, default: null },
  },
  { timestamps: true }
)

// Exactly one activation row per (user, app) — updated on re-activate / deregister.
appActivationSchema.index({ userId: 1, contentId: 1 }, { unique: true })

export const AppActivation = mongoose.model('AppActivation', appActivationSchema)
