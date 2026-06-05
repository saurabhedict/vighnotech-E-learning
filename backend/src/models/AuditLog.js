import mongoose from 'mongoose'

/**
 * Security trail (LLD: auditlogs). Captures admin actions and license events
 * (issue / verify-fail / revoke / payment) for fraud investigation.
 */
const auditLogSchema = new mongoose.Schema(
  {
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true, index: true },
    targetType: { type: String },
    targetId: { type: String },
    ip: { type: String },
    userAgent: { type: String },
    meta: { type: Object, default: {} },
  },
  { timestamps: { createdAt: 'time', updatedAt: false } }
)

export const AuditLog = mongoose.model('AuditLog', auditLogSchema)
