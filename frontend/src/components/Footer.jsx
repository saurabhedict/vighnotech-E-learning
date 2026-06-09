import { Link } from 'react-router-dom'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { safeHref } from '../lib/safeUrl'

// Inline SVG social icons (no extra deps). Keyed by platform slug.
const ICONS = {
  facebook: 'M22 12.06C22 6.48 17.52 2 11.94 2 6.36 2 1.88 6.48 1.88 12.06c0 5.02 3.68 9.18 8.49 9.94v-7.03H7.83v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.8-.76 8.48-4.92 8.48-9.94Z',
  twitter: 'M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z',
  linkedin: 'M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14ZM7.12 20.45H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z',
  instagram: 'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.7 3.7 0 0 1-1.38-.9 3.7 3.7 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 1.94c-3.14 0-3.51.01-4.75.07-1.15.05-1.77.24-2.18.4-.55.22-.94.47-1.35.88-.41.41-.66.8-.88 1.35-.16.41-.35 1.03-.4 2.18-.06 1.24-.07 1.61-.07 4.75s.01 3.51.07 4.75c.05 1.15.24 1.77.4 2.18.22.55.47.94.88 1.35.41.41.8.66 1.35.88.41.16 1.03.35 2.18.4 1.24.06 1.61.07 4.75.07s3.51-.01 4.75-.07c1.15-.05 1.77-.24 2.18-.4.55-.22.94-.47 1.35-.88.41-.41.66-.8.88-1.35.16-.41.35-1.03.4-2.18.06-1.24.07-1.61.07-4.75s-.01-3.51-.07-4.75c-.05-1.15-.24-1.77-.4-2.18a3.6 3.6 0 0 0-.88-1.35 3.6 3.6 0 0 0-1.35-.88c-.41-.16-1.03-.35-2.18-.4-1.24-.06-1.61-.07-4.75-.07Zm0 3.3a4.6 4.6 0 1 1 0 9.2 4.6 4.6 0 0 1 0-9.2Zm0 7.59a2.99 2.99 0 1 0 0-5.98 2.99 2.99 0 0 0 0 5.98Zm5.86-7.81a1.08 1.08 0 1 1-2.15 0 1.08 1.08 0 0 1 2.15 0Z',
  youtube: 'M23.5 6.2a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.51A3.02 3.02 0 0 0 .5 6.2 31.5 31.5 0 0 0 0 12a31.5 31.5 0 0 0 .5 5.8 3.02 3.02 0 0 0 2.12 2.14C4.5 20.45 12 20.45 12 20.45s7.5 0 9.38-.51a3.02 3.02 0 0 0 2.12-2.14A31.5 31.5 0 0 0 24 12a31.5 31.5 0 0 0-.5-5.8ZM9.55 15.57V8.43L15.82 12l-6.27 3.57Z',
}

const linkCls = 'text-vigno-muted hover:text-vigno-accent2 transition text-sm'

function SocialIcon({ platform, url }) {
  const path = ICONS[platform?.toLowerCase()] || ICONS.facebook
  return (
    <a href={safeHref(url)} target="_blank" rel="noreferrer" title={platform} aria-label={platform}
      className="grid place-items-center w-9 h-9 rounded-full bg-white/10 hover:bg-vigno-accent hover:text-[#1a0d0f] text-vigno-txt transition">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d={path} /></svg>
    </a>
  )
}

// Internal route (/app/...) → <Link>; everything else (http/mailto/tel/#) → <a>.
function FooterLink({ to, children }) {
  if (to && to.startsWith('/') && !to.startsWith('//')) return <Link to={to} className={linkCls}>{children}</Link>
  return <a href={safeHref(to)} className={linkCls}>{children}</a>
}

// Render one modular footer column based on its type.
function Section({ section: s }) {
  return (
    <div className="min-w-[150px] max-w-xs">
      {(s.title || s.icon) && (
        <h4 className="text-vigno-txt font-bold text-sm mb-3">
          {s.icon && <span className="mr-1.5">{s.icon}</span>}{s.title}
        </h4>
      )}

      {s.type === 'links' && (
        <ul className="space-y-2">
          {(s.links || []).map((l, i) => <li key={i}><FooterLink to={l.url}>{l.label}</FooterLink></li>)}
        </ul>
      )}

      {s.type === 'contact' && (
        <ul className="space-y-2">
          {(s.phones || []).map((p, i) => (
            <li key={`p${i}`}><a href={`tel:${p.replace(/\s+/g, '')}`} className={linkCls}>📞 {p}</a></li>
          ))}
          {(s.emails || []).map((e, i) => (
            <li key={`e${i}`}><a href={`mailto:${e}`} className={linkCls + ' break-all'}>✉ {e}</a></li>
          ))}
          {s.address && <li className="text-vigno-muted text-sm flex gap-1.5"><span>📍</span><span>{s.address}</span></li>}
          {s.hours && <li className="text-vigno-muted text-sm flex gap-1.5"><span>🕒</span><span>{s.hours}</span></li>}
        </ul>
      )}

      {s.type === 'social' && (
        <div className="flex flex-wrap gap-2">
          {(s.items || []).map((it, i) => <SocialIcon key={i} platform={it.platform} url={it.url} />)}
        </div>
      )}

      {s.type === 'text' && s.body && (
        <p className="text-vigno-muted text-sm leading-relaxed whitespace-pre-line">{s.body}</p>
      )}

      {s.type === 'custom' && (
        <ul className="space-y-2">
          {(s.rows || []).map((r, i) => (
            <li key={i} className="text-sm">
              {r.url ? (
                <FooterLink to={r.url}>{r.icon && <span className="mr-1.5">{r.icon}</span>}{r.text}</FooterLink>
              ) : (
                <span className="text-vigno-muted">{r.icon && <span className="mr-1.5">{r.icon}</span>}{r.text}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default function Footer() {
  const { data } = useSiteSettings()
  const brand = data?.brand || {}
  const f = data?.footer || {}
  const sections = f.sections || []
  const copyright = (f.copyright || '').replace('{year}', new Date().getFullYear())

  return (
    <footer className="bg-vigno-card border-t border-vigno-line mt-12">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <div className="flex flex-wrap gap-x-12 gap-y-8">
          {/* Brand identity (always present) */}
          <div className="min-w-[220px] max-w-sm flex-1">
            <div className="font-extrabold text-lg mb-2">
              <span className="text-vigno-accent2">{brand.logoEmoji ?? '✈'}</span> {brand.name || 'AeroLearn'}
            </div>
            {f.blurb && <p className="text-vigno-muted text-sm leading-relaxed">{f.blurb}</p>}
          </div>

          {/* Modular columns */}
          {sections.map((s, i) => <Section key={i} section={s} />)}
        </div>

        {copyright && (
          <div className="border-t border-vigno-line/60 mt-8 pt-5 text-center text-xs text-vigno-muted">{copyright}</div>
        )}
      </div>
    </footer>
  )
}
