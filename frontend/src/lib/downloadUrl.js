// Make a download URL safe to click from the (https) app.
//
// Browsers BLOCK mixed-content downloads: an http:// file linked from an https://
// page silently fails — the click does nothing, no error. Admins sometimes paste
// an http launcher URL, so upgrade it to https when the page itself is https.
// In local dev (http page) we leave it untouched so localhost downloads still work.
export function secureDownloadUrl(url) {
  if (!url) return url
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    return url.replace(/^http:\/\//i, 'https://')
  }
  return url
}
