import { useSelector } from 'react-redux'

// Small ring spinner. Used as the route/page Suspense fallback and for any
// in-app loading state. Pass `fullscreen` to cover the viewport (matches the boot
// splash in index.html); omit it to drop the spinner inline. The visual lives in
// index.css (.vigno-* classes) so it stays in sync with the boot splash.
//
// This can render above <AppLayout> (e.g. the top-level route Suspense fallback
// in App.jsx), so it can't rely on inheriting the `.theme-light` class from a
// parent — it reads the theme itself so the fullscreen background always
// matches the current theme instead of silently falling back to the dark
// palette.
export default function Loader({ fullscreen = false, label = 'Loading…' }) {
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'

  return (
    <div
      className={`${isDark ? '' : 'theme-light '}vigno-loader${fullscreen ? ' vigno-loader--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="vigno-spinner" aria-hidden="true" />
      {label && <div className="vigno-loader__text">{label}</div>}
    </div>
  )
}
