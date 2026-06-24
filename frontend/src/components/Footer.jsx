import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { safeHref } from '../lib/safeUrl'

// Inline SVG social icons (matching Relume styling)
const ICONS = {
  facebook: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black shrink-0" aria-hidden="true">
      <path d="M22 12.06C22 6.48 17.52 2 11.94 2 6.36 2 1.88 6.48 1.88 12.06c0 5.02 3.68 9.18 8.49 9.94v-7.03H7.83v-2.91h2.54V9.85c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56v1.88h2.78l-.44 2.91h-2.34V22c4.8-.76 8.48-4.92 8.48-9.94Z" />
    </svg>
  ),
  instagram: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-black shrink-0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  ),
  x: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black shrink-0" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117L17.083 19.77Z" />
    </svg>
  ),
  linkedin: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black shrink-0" aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.779-1.75-1.75s.784-1.75 1.75-1.75 1.75.779 1.75 1.75-.784 1.75-1.75 1.75zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  ),
  youtube: (
    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black shrink-0" aria-hidden="true">
      <path d="M23.498 6.163a3.003 3.003 0 0 0-2.11-2.107C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.388.556a3.003 3.003 0 0 0-2.11 2.107C0 8.053 0 12 0 12s0 3.948.502 5.837a3.003 3.003 0 0 0 2.11 2.107C4.5 20.5 12 20.5 12 20.5s7.5 0 9.388-.556a3.003 3.003 0 0 0 2.11-2.107C24 15.948 24 12 24 12s0-3.947-.502-5.837zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
    </svg>
  )
}

function PhoneIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.638-5.161-3.976-6.797-6.797l1.293-.97c.362-.271.527-.733.417-1.173L5.879 4.88c-.125-.501-.575-.852-1.091-.852H3.75A2.25 2.25 0 001.5 6.75v.003z" />
    </svg>
  )
}

function MailIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91A2.25 2.25 0 012.25 6.994V6.75" />
    </svg>
  )
}

function LocationIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  )
}

function ClockIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

// Fallback Relume mockup sections if the admin has not configured any sections yet
const DEFAULT_SECTIONS = [
  {
    type: 'contact',
    title: 'Contact us',
    links: [
      { label: 'Link One', url: '#' },
      { label: 'Link Two', url: '#' },
      { label: 'Link Three', url: '#' },
      { label: 'Link Four', url: '#' },
      { label: 'Link Five', url: '#' },
    ],
    phones: ['+91 77200 25900'],
    emails: ['contact@aerolearn.in'],
  },
  {
    type: 'links',
    title: 'about us',
    links: [
      { label: 'Link Six', url: '#' },
      { label: 'Link Seven', url: '#' },
      { label: 'Link Eight', url: '#' },
      { label: 'Link Nine', url: '#' },
      { label: 'Link Ten', url: '#' },
    ]
  },
  {
    type: 'social',
    title: 'Follow Us',
    items: [
      { platform: 'facebook', url: '#' },
      { platform: 'instagram', url: '#' },
      { platform: 'x', url: '#' },
      { platform: 'linkedin', url: '#' },
      { platform: 'youtube', url: '#' },
    ]
  }
]

export default function Footer() {
  const { data } = useSiteSettings()
  const brand = data?.brand || {}
  const f = data?.footer || {}
  
  // Use user-configured sections if they exist, otherwise fall back to the default Relume template
  const sections = f.sections && f.sections.length > 0 ? f.sections : DEFAULT_SECTIONS

  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)

  const handleSubscribe = (e) => {
    e.preventDefault()
    if (email.trim()) {
      setSubscribed(true)
      setEmail('')
      setTimeout(() => setSubscribed(false), 5000)
    }
  }

  // Format dynamic copyright line
  const copyright = (f.copyright || '© {year} {brandName}. All rights reserved.')
    .replace('{year}', new Date().getFullYear().toString())
    .replace('{brandName}', brand.name || 'Aerolearn')

  return (
    <footer className="bg-[#e6f2ff] text-black border-t border-black/10 pt-16 pb-12 mt-16">
      <div className="max-w-7xl mx-auto px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-12">
          {/* Brand Identity & Newsletter */}
          <div className="lg:col-span-6 flex flex-col space-y-6">
            <div>
              <span style={{ fontFamily: "'Caveat', cursive" }} className="text-4xl font-bold text-black select-none">
                {brand.name || 'Aerolearn'}
              </span>
            </div>
            <p className="text-base text-black max-w-md">
              {f.blurb || 'Join our newsletter to stay up to date on features and releases.'}
            </p>
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 max-w-md w-full">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-3 py-3 border border-black bg-white text-black placeholder:text-gray-500 text-sm outline-none flex-grow"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button
                type="submit"
                className="px-6 py-3 border border-black bg-white text-black font-semibold text-sm hover:bg-black hover:text-white transition-colors duration-200 whitespace-nowrap"
              >
                Subscribe
              </button>
            </form>
            {subscribed && (
              <p className="text-sm text-green-600 font-medium">Thank you for subscribing!</p>
            )}
            <p className="text-xs text-black leading-relaxed max-w-md">
              By subscribing you agree to with our <a href="#" className="underline hover:text-gray-700">Privacy Policy</a> and provide consent to receive updates from our company.
            </p>
          </div>

          {/* Dynamic Columns of Links */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8">
            {sections.map((s, idx) => {
              const columnHeader = (
                <h4 className="font-bold text-black text-sm flex items-center gap-2">
                  <span>{s.title || 'Untitled Column'}</span>
                </h4>
              )

              return (
                <div key={idx} className="flex flex-col space-y-4">
                  {columnHeader}

                  {s.type === 'links' && (
                    <ul className="flex flex-col space-y-3">
                      {(s.links || []).map((link, lIdx) => (
                        <li key={lIdx}>
                          {link.url.startsWith('/') && !link.url.startsWith('//') ? (
                            <Link to={link.url} className="text-sm text-black hover:underline">
                              {link.label || 'Link'}
                            </Link>
                          ) : (
                            <a href={safeHref(link.url)} className="text-sm text-black hover:underline">
                              {link.label || 'Link'}
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {s.type === 'social' && (
                    <ul className="flex flex-col space-y-3">
                      {(s.items || []).map((it, sIdx) => {
                        const platform = it.platform || 'facebook'
                        const platformKey = platform.toLowerCase() === 'twitter' ? 'x' : platform.toLowerCase()
                        const icon = ICONS[platformKey] || ICONS.facebook
                        const platformLabel = platform.toLowerCase() === 'x' || platform.toLowerCase() === 'twitter' 
                          ? 'X' 
                          : platform.charAt(0).toUpperCase() + platform.slice(1)

                        return (
                          <li key={sIdx}>
                            <a href={safeHref(it.url)} target="_blank" rel="noreferrer" className="text-sm text-black hover:underline flex items-center gap-3">
                              {icon}
                              <span className={platformKey === 'instagram' ? 'ml-[1px]' : ''}>{platformLabel}</span>
                            </a>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {s.type === 'contact' && (
                    <ul className="flex flex-col space-y-3 text-sm text-black">
                      {(s.links || []).map((link, lIdx) => (
                        <li key={`l${lIdx}`}>
                          {link.url.startsWith('/') && !link.url.startsWith('//') ? (
                            <Link to={link.url} className="text-sm text-black hover:underline">
                              {link.label || 'Link'}
                            </Link>
                          ) : (
                            <a href={safeHref(link.url)} className="text-sm text-black hover:underline">
                              {link.label || 'Link'}
                            </a>
                          )}
                        </li>
                      ))}
                      {(s.phones || []).map((p, pIdx) => (
                        <li key={`p${pIdx}`}>
                          <a href={`tel:${p.replace(/\s+/g, '')}`} className="hover:underline flex items-center gap-3">
                            <PhoneIcon className="w-5 h-5 text-black shrink-0" />
                            <span>{p}</span>
                          </a>
                        </li>
                      ))}
                      {(s.emails || []).map((e, eIdx) => (
                        <li key={`e${eIdx}`}>
                          <a href={`mailto:${e}`} className="hover:underline flex items-center gap-3 break-all">
                            <MailIcon className="w-5 h-5 text-black shrink-0" />
                            <span>{e}</span>
                          </a>
                        </li>
                      ))}
                      {s.address && (
                        <li className="flex items-start gap-3">
                          <LocationIcon className="w-5 h-5 text-black shrink-0 mt-0.5" />
                          <span>{s.address}</span>
                        </li>
                      )}
                      {s.hours && (
                        <li className="flex items-start gap-3">
                          <ClockIcon className="w-5 h-5 text-black shrink-0 mt-0.5" />
                          <span>{s.hours}</span>
                        </li>
                      )}
                    </ul>
                  )}

                  {s.type === 'text' && (
                    <p className="text-sm text-black leading-relaxed whitespace-pre-line">
                      {s.body}
                    </p>
                  )}

                  {s.type === 'custom' && (
                    <ul className="flex flex-col space-y-3 text-sm text-black">
                      {(s.rows || []).map((row, rIdx) => (
                        <li key={rIdx} className="flex items-start gap-3">
                          {row.url ? (
                            row.url.startsWith('/') && !row.url.startsWith('//') ? (
                              <Link to={row.url} className="hover:underline">
                                {row.text}
                              </Link>
                            ) : (
                              <a href={safeHref(row.url)} className="hover:underline">
                                {row.text}
                              </a>
                            )
                          ) : (
                            <span>{row.text}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Divider and Copyright */}
        <div className="border-t border-black/20 pt-8 mt-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-sm text-black">
            {copyright}
          </div>
          <div className="flex gap-6 text-sm text-black font-normal">
            <a href="#" className="hover:underline">Privacy Policy</a>
            <a href="#" className="hover:underline">Terms of Service</a>
            <a href="#" className="hover:underline">Cookies Settings</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
