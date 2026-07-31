import { AppActivation } from '../models/AppActivation.js'

/**
 * Unified login-session helpers. A "session" is one place the account is logged in
 * (web browser, launcher machine, or apk device). The registry lives on
 * User.sessions[]; these helpers keep the apk lane (AppActivation) in sync when a
 * place is evicted by the cap or revoked, so an evicted apk stops verifying.
 */

// Derive the place descriptor from the request. An explicit `X-Vigno-Client`
// header wins; otherwise sniff the User-Agent. Labels are for admin display only.
export function sessionInfoFromReq(req, extra = {}) {
  const hinted = String(req.headers['x-vigno-client'] || '').toLowerCase()
  const ua = String(req.headers['user-agent'] || '')
  let kind = 'web'
  if (hinted === 'launcher' || hinted === 'apk' || hinted === 'web') kind = hinted
  else if (/electron|vigno[- ]?launcher/i.test(ua)) kind = 'launcher'
  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || req.socket?.remoteAddress || ''
  return { kind, ua, ip, deviceModel: extra.deviceModel || '', label: labelFor(kind, ua, extra), ...extra }
}

function labelFor(kind, ua, extra = {}) {
  if (extra.label) return extra.label
  if (kind === 'apk') return extra.deviceModel || 'Android device'
  if (kind === 'launcher') return extra.hostname ? `Desktop · ${extra.hostname}` : 'Desktop app'
  return browserOs(ua)
}

// Tiny UA → "Browser on OS" summary (display only).
function browserOs(ua = '') {
  const b = /Edg\//.test(ua) ? 'Edge' : /OPR\//.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser'
  const o = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad|iOS/.test(ua) ? 'iOS'
    : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : ''
  return o ? `${b} on ${o}` : b
}

// Add a place; deregister any apk activations evicted by the cap. Returns the new
// sid. Caller must save() the user (addSession mutated user.sessions).
export async function addSessionAndReconcile(user, info) {
  const { sid, evicted } = user.addSession(info)
  const apkSids = evicted.filter((e) => e.kind === 'apk' && e.sid).map((e) => e.sid)
  if (apkSids.length) {
    await AppActivation.updateMany(
      { userId: user._id, sid: { $in: apkSids }, status: 'active' },
      { $set: { status: 'deregistered', deregisteredAt: new Date() } }
    )
  }
  return sid
}

// Remove one place; also deregister its apk activation if it was an apk place.
// Returns the removed session (or null). Caller must save() the user.
export async function revokeSession(user, sid) {
  const removed = user.removeSession(sid)
  if (removed && removed.kind === 'apk') {
    await AppActivation.updateMany(
      { userId: user._id, sid, status: 'active' },
      { $set: { status: 'deregistered', deregisteredAt: new Date() } }
    )
  }
  return removed
}

// Clear ALL places (sign out everywhere) — also deregisters every active apk
// activation for the user. Caller must save() the user.
export async function revokeAllSessions(user) {
  user.sessions = []
  await AppActivation.updateMany(
    { userId: user._id, status: 'active' },
    { $set: { status: 'deregistered', deregisteredAt: new Date() } }
  )
}
