// Return a safe href, or '#' for dangerous schemes (javascript:, data:, etc.).
// Allows internal /paths, #, http(s), mailto:, tel:. Defense-in-depth for any
// admin-entered URL rendered into an <a href> (backend also validates).
export function safeHref(url) {
  const u = String(url || '').trim()
  if (!u) return '#'
  if (/^(#|https?:\/\/|mailto:|tel:)/i.test(u)) return u
  if (u.startsWith('/') && !u.startsWith('//')) return u
  return '#'
}
