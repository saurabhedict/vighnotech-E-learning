import { useSiteSettings } from '../hooks/useSiteSettings'

// "#f0c040" → "240 192 64" (the space-separated channels Tailwind expects).
function toChannels(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || '').trim())
  if (!m) return null
  const n = parseInt(m[1], 16)
  return `${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255}`
}

/**
 * Applies admin-chosen brand colours site-wide by overriding the CSS variables
 * for both dark and light themes. Rendered once near the app root so it also
 * affects the public auth pages.
 */
export default function SiteTheme() {
  const { data } = useSiteSettings()
  const accent = toChannels(data?.theme?.accent)
  const accent2 = toChannels(data?.theme?.accent2)
  if (!accent && !accent2) return null
  const vars = `${accent ? `--v-accent:${accent};` : ''}${accent2 ? `--v-accent2:${accent2};` : ''}`
  return <style>{`:root,.theme-light{${vars}}`}</style>
}
