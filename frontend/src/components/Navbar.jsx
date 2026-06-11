import { useState, useRef, useEffect } from 'react'
import { useNavigate, NavLink, Link } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { logout } from '../store/authSlice'
import { toggleTheme } from '../store/uiSlice'
import { authApi } from '../api/authApi'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { safeHref } from '../lib/safeUrl'
import Avatar from './Avatar'

const CART_ITEMS = 0 // placeholder — wire to real cart state when implemented

export default function Navbar() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const theme = useSelector((s) => s.ui.theme)
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'AeroLearn'
  const logoEmoji = settings?.brand?.logoEmoji ?? '✈'
  const showSearch = settings?.header?.showSearch !== false
  const extraLinks = settings?.header?.extraLinks || []
  const [q, setQ] = useState('')
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef(null)

  const doLogout = async () => {
    setProfileOpen(false)
    await authApi.logout()
    dispatch(logout())
    navigate('/')
  }

  const doSearch = (e) => {
    e.preventDefault()
    navigate(`/app/search${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const isLight = theme === 'light'

  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 px-5 py-0 bg-vigno-panel/95 backdrop-blur-md border-b border-vigno-line/50 h-14 shrink-0">

      {/* Brand */}
      <NavLink to="/app" className="flex items-center gap-2 shrink-0 group" title="Home">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-vigno-accent/30 to-vigno-accent2/20 flex items-center justify-center text-base font-bold text-vigno-accent group-hover:scale-105 transition-transform">
          {logoEmoji}
        </div>
        <span className="font-bold text-base text-vigno-txt tracking-tight hidden sm:block">{brandName}</span>
      </NavLink>

      {user?.role === 'admin' && (
        <span className="text-[9px] bg-vigno-accent/20 text-vigno-accent rounded-full px-2 py-0.5 font-bold tracking-wider uppercase border border-vigno-accent/30">
          Admin
        </span>
      )}

      {/* Search bar */}
      {showSearch ? (
        <form onSubmit={doSearch} className="flex-1 max-w-md mx-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-vigno-muted/60 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search courses, topics…"
              className="w-full pl-9 pr-4 py-1.5 rounded-lg bg-black/20 border border-vigno-line/60 text-sm outline-none focus:border-vigno-accent/70 focus:bg-black/30 text-vigno-txt placeholder:text-vigno-muted/50 transition-all"
            />
          </div>
        </form>
      ) : <div className="flex-1" />}

      {/* Nav links */}
      <nav className="hidden lg:flex items-center gap-1">
        {[
          { to: '/app', end: true, icon: HomeIcon, label: 'Home' },
          { to: '/app/library', icon: LibraryIcon, label: 'Library' },
          { to: '/app/wallet', icon: WalletIcon, label: 'Wallet' },
        ].map(({ to, end, icon: Icon, label }) => (
          <NavLink key={to} to={to} end={end} className={({ isActive }) =>
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' +
            (isActive
              ? 'bg-vigno-accent/15 text-vigno-accent'
              : 'text-vigno-muted hover:text-vigno-txt hover:bg-white/8')
          }>
            <Icon size={15} />
            <span>{label}</span>
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink to="/app/admin" className={({ isActive }) =>
            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ' +
            (isActive ? 'bg-vigno-accent/15 text-vigno-accent' : 'text-vigno-muted hover:text-vigno-txt hover:bg-white/8')
          }>
            <AdminIcon size={15} />
            <span>Admin</span>
          </NavLink>
        )}
        {extraLinks.filter((l) => l.label).map((l, i) =>
          l.url?.startsWith('/') ? (
            <NavLink key={i} to={l.url} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-vigno-muted hover:text-vigno-txt hover:bg-white/8 transition-colors">{l.label}</NavLink>
          ) : (
            <a key={i} href={safeHref(l.url)} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-vigno-muted hover:text-vigno-txt hover:bg-white/8 transition-colors">{l.label}</a>
          )
        )}
      </nav>

      {/* Right actions */}
      <div className="flex items-center gap-1 ml-auto lg:ml-0">

        {/* Theme toggle */}
        <button
          onClick={() => dispatch(toggleTheme())}
          title={isLight ? 'Switch to Dark mode' : 'Switch to Light mode'}
          className="w-9 h-9 grid place-items-center rounded-lg text-vigno-muted hover:text-vigno-txt hover:bg-white/10 transition-colors border border-transparent hover:border-vigno-line/50"
          aria-label="Toggle theme"
        >
          {isLight ? <MoonIcon size={16} /> : <SunIcon size={16} />}
        </button>

        {/* Cart */}
        <NavLink
          to="/app/wallet"
          className="relative w-9 h-9 grid place-items-center rounded-lg text-vigno-muted hover:text-vigno-txt hover:bg-white/10 transition-colors border border-transparent hover:border-vigno-line/50"
          title="Cart / Wallet"
          aria-label="Cart"
        >
          <CartIcon size={17} />
          {CART_ITEMS > 0 && (
            <span className="absolute top-1.5 right-1.5 w-3.5 h-3.5 bg-vigno-accent rounded-full text-[8px] font-bold text-[#1a1000] flex items-center justify-center leading-none">
              {CART_ITEMS}
            </span>
          )}
        </NavLink>

        {/* Profile dropdown */}
        <div className="relative ml-1" ref={profileRef}>
          <button
            onClick={() => setProfileOpen((o) => !o)}
            className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-lg hover:bg-white/8 transition-colors border border-transparent hover:border-vigno-line/50"
            aria-label="Profile menu"
            aria-expanded={profileOpen}
          >
            <Avatar user={user} size={30} verified={user?.verified} className="shrink-0" />
            <div className="hidden sm:flex flex-col items-start leading-tight">
              <span className="text-xs font-semibold text-vigno-txt truncate max-w-[100px]">{user?.name?.split(' ')[0] || 'Profile'}</span>
              <span className="text-[10px] text-vigno-muted truncate max-w-[100px]">{user?.role === 'admin' ? 'Administrator' : 'Student'}</span>
            </div>
            <ChevronIcon size={12} className={'text-vigno-muted transition-transform ' + (profileOpen ? 'rotate-180' : '')} />
          </button>

          {/* Dropdown */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-52 bg-vigno-panel border border-vigno-line/60 rounded-xl shadow-2xl shadow-black/40 overflow-hidden z-50 py-1">
              {/* User info header */}
              <div className="px-4 py-3 border-b border-vigno-line/40">
                <div className="text-sm font-semibold text-vigno-txt truncate">{user?.name || 'User'}</div>
                <div className="text-xs text-vigno-muted truncate mt-0.5">{user?.email}</div>
              </div>

              <div className="py-1">
                {[
                  { to: '/app', label: 'Home', icon: HomeIcon },
                  { to: '/app/profile', label: 'My Profile', icon: ProfileIcon },
                  { to: '/app/library', label: 'Library', icon: LibraryIcon },
                  { to: '/app/favorites', label: 'Saved', icon: SavedIcon },
                  { to: '/app/wallet', label: 'Wallet', icon: WalletIcon },
                  ...(user?.role === 'admin' ? [{ to: '/app/admin', label: 'Admin Panel', icon: AdminIcon }] : []),
                ].map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setProfileOpen(false)}
                    className={({ isActive }) =>
                      'flex items-center gap-3 px-4 py-2 text-sm transition-colors ' +
                      (isActive ? 'text-vigno-accent bg-vigno-accent/10' : 'text-vigno-muted hover:text-vigno-txt hover:bg-white/8')
                    }
                  >
                    <Icon size={14} />
                    {label}
                  </NavLink>
                ))}
              </div>

              <div className="border-t border-vigno-line/40 py-1">
                <button
                  onClick={doLogout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-vigno-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogoutIcon size={14} />
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

// ── Inline SVG icon components ────────────────────────────────────────────────
function HomeIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )
}
function LibraryIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    </svg>
  )
}
function WalletIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/>
    </svg>
  )
}
function AdminIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.07 4.93A10 10 0 1 0 4.93 19.07 10 10 0 0 0 19.07 4.93z"/>
    </svg>
  )
}
function CartIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
    </svg>
  )
}
function SunIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
      <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
    </svg>
  )
}
function MoonIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  )
}
function ProfileIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  )
}
function SavedIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
    </svg>
  )
}
function LogoutIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
function ChevronIcon({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  )
}
