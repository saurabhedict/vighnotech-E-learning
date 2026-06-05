import { AuditLog } from '../models/AuditLog.js'

/**
 * Fire-and-forget audit logging. Never throws into the request path — a failed
 * audit write must not break the user action, but we log it.
 */
export function audit(req, action, { targetType, targetId, meta } = {}) {
  const entry = {
    actorId: req?.user?.id || null,
    action,
    targetType,
    targetId: targetId != null ? String(targetId) : undefined,
    ip: req?.ip,
    userAgent: req?.headers?.['user-agent'],
    meta,
  }
  AuditLog.create(entry).catch((e) => console.warn('[audit] write failed:', e.message))
}
