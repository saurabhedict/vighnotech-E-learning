// Small ring spinner. Used as the route/page Suspense fallback and for any
// in-app loading state. Pass `fullscreen` to cover the viewport (matches the boot
// splash in index.html); omit it to drop the spinner inline. The visual lives in
// index.css (.vigno-* classes) so it stays in sync with the boot splash.
export default function Loader({ fullscreen = false, label = 'Loading…' }) {
  return (
    <div
      className={`vigno-loader${fullscreen ? ' vigno-loader--fullscreen' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="vigno-spinner" aria-hidden="true" />
      {label && <div className="vigno-loader__text">{label}</div>}
    </div>
  )
}
