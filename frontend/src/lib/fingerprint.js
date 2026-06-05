// Browser stand-in for the launcher's device fingerprint (CPU/MB/OS hash).
// Stable per browser: derived from a persisted random id + UA/platform, hashed.
export async function getDeviceFingerprint() {
  let seed = localStorage.getItem('vigno.device.seed')
  if (!seed) {
    seed = crypto.randomUUID()
    localStorage.setItem('vigno.device.seed', seed)
  }
  const raw = [seed, navigator.userAgent, navigator.platform, navigator.language, screen.width, screen.height].join('|')
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function deviceLabel() {
  const ua = navigator.userAgent
  const browser = /Edg/.test(ua) ? 'Edge' : /Chrome/.test(ua) ? 'Chrome' : /Firefox/.test(ua) ? 'Firefox' : /Safari/.test(ua) ? 'Safari' : 'Browser'
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'OS'
  return `${browser} on ${os}`
}
