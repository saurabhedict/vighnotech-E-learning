import { useState, useRef, useEffect } from 'react'
import { useNavigate, NavLink, Link, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { logout } from '../store/authSlice'
import { toggleTheme } from '../store/uiSlice'
import { authApi } from '../api/authApi'
import { commerceApi } from '../api/commerceApi'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { safeHref } from '../lib/safeUrl'
import Avatar from './Avatar'
import NotificationBell from './NotificationBell'
import SmartSearchBar from './SmartSearchBar'
import { paymentsApi } from '../api/paymentsApi'
import { removeCartItem, clearCart } from '../store/cartSlice'
import { purchaseCourse, purchaseContent } from '../lib/buy'
function NavPanel({ open, onClose, user, isAdmin, isDark, settings, onLogout }) {
  const panelRef = useRef(null)
  const extraLinks = settings?.header?.extraLinks || []

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, onClose])

  const navLink = (to, label, end = false) => (
    <NavLink
      to={to}
      end={end}
      onClick={onClose}
      className={({ isActive }) => [
        'block px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
        isActive
          ? isDark ? 'bg-vigno-accent/15 text-vigno-accent border-l-2 border-vigno-accent pl-3.5' : 'bg-vigno-accent/12 text-[#8a6200] border-l-2 border-vigno-accent pl-3.5'
          : isDark ? 'text-vigno-txt hover:bg-white/6 hover:text-white' : 'text-vigno-txt hover:bg-vigno-line/40',
      ].join(' ')}
    >
      {label}
    </NavLink>
  )

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={[
          'fixed top-0 right-0 h-full z-50 flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]',
          open ? 'translate-x-0' : 'translate-x-full',
          isDark ? 'bg-[#0d1829] border-l border-vigno-line/40' : 'bg-white border-l border-vigno-line',
        ].join(' ')}
        style={{ width: 280 }}
      >
        {/* Panel header */}
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/60'}`}>
          <div className="flex items-center gap-3">
            <Avatar user={user} size={36} verified={user?.verified} />
            <div>
              <div className="text-sm font-semibold text-vigno-txt leading-tight">{user?.name || 'My Account'}</div>
              <div className="text-xs text-vigno-muted truncate max-w-[140px]">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={onClose}
            className={`w-8 h-8 grid place-items-center rounded-lg text-vigno-muted transition-all ${isDark ? 'hover:bg-white/10 hover:text-vigno-txt' : 'hover:bg-vigno-line/40 hover:text-vigno-txt'}`}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Nav links — everyone can browse the user side; admins also get the panel */}
        <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
          {isAdmin && (
            <>
              <p className={`text-[10px] font-semibold uppercase tracking-widest px-4 py-2 ${isDark ? 'text-vigno-muted/50' : 'text-vigno-muted/60'}`}>Administration</p>
              {navLink('/app/admin?tab=overview', 'Admin Dashboard')}
            </>
          )}
          {(
            <>
              <p className={`text-[10px] font-semibold uppercase tracking-widest px-4 py-2 ${isDark ? 'text-vigno-muted/50' : 'text-vigno-muted/60'}`}>Navigation</p>
              {navLink('/app', 'Home', true)}
              {navLink('/app/library', 'My Learning')}
              {navLink('/app/favorites', 'Wishlist')}
              {navLink('/app/wallet', 'Wallet')}
              {navLink('/app/profile', 'Profile')}

              {extraLinks.filter(l => l.label).map((l, i) =>
                l.url?.startsWith('/') ? (
                  <NavLink key={i} to={l.url} onClick={onClose}
                    className={({ isActive }) => `block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isActive ? (isDark ? 'bg-vigno-accent/15 text-vigno-accent' : 'bg-vigno-accent/12 text-[#8a6200]') : (isDark ? 'text-vigno-txt hover:bg-white/6' : 'text-vigno-txt hover:bg-vigno-line/40')}`}>
                    {l.label}
                  </NavLink>
                ) : (
                  <a key={i} href={safeHref(l.url)} target="_blank" rel="noreferrer" onClick={onClose}
                    className={`block px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isDark ? 'text-vigno-txt hover:bg-white/6' : 'text-vigno-txt hover:bg-vigno-line/40'}`}>
                    {l.label}
                  </a>
                )
              )}
            </>
          )}
        </nav>

        {/* Panel footer */}
        <div className={`px-3 py-3 border-t space-y-1 ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/60'}`}>
          <button
            onClick={() => { onLogout(); onClose() }}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${isDark ? 'text-red-400/80 hover:bg-red-500/10 hover:text-red-300' : 'text-red-600/80 hover:bg-red-50 hover:text-red-600'}`}
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  )
}

export default function Navbar() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const theme = useSelector((s) => s.ui.theme)
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'Aerolearn'
  const showSearch = settings?.header?.showSearch !== false
  const [panelOpen, setPanelOpen] = useState(false)

  const cartItems = useSelector((s) => s.cart.items)

  const isDark = theme === 'dark'
  const isAdmin = user?.role === 'admin'

  const doLogout = async () => {
    await authApi.logout()
    dispatch(logout())
    navigate('/')
  }

  // Close panel on route change
  useEffect(() => { setPanelOpen(false) }, [location.pathname])

  return (
    <>
      <header className={[
        'aero-nav flex items-center justify-between gap-4 px-6 h-14 backdrop-blur-xl sticky top-0 z-30 w-full',
        isDark
          ? 'bg-[#080f1e]/90 border-b border-vigno-line/30'
          : 'bg-white/95 border-b border-vigno-line/70 shadow-sm',
      ].join(' ')}>

        {/* Brand — same as the user side */}
        <NavLink to="/app" className="flex items-center shrink-0">
          <span style={{ fontFamily: "'Caveat', cursive" }} className="text-3xl font-bold select-none text-vigno-txt">
            {brandName}
          </span>
        </NavLink>

        {/* Search — grows to fill middle (mic + live suggestions) */}
        {showSearch && <SmartSearchBar variant="navbar" className="flex-1 max-w-xl mx-4 hidden sm:block" />}

        <div className="flex items-center gap-4">
          {/* My learning — same as the user side */}
          <NavLink
            to="/app/library"
            className={({ isActive }) => [
              'text-sm font-medium hover:text-vigno-accent transition-colors hidden md:block',
              isActive ? 'text-vigno-accent' : 'text-vigno-txt'
            ].join(' ')}
          >
            My learning
          </NavLink>

          {/* Admin panel — the one extra for admins, styled as a distinct pill */}
          {isAdmin && (
            <NavLink
              to="/app/admin?tab=overview"
              title="Admin panel"
              className={({ isActive }) => [
                'hidden md:inline-flex items-center gap-1.5 pl-2.5 pr-3.5 py-1.5 rounded-full text-sm font-semibold',
                'border transition-all duration-200 shadow-sm active:scale-[0.97]',
                isActive
                  ? 'bg-vigno-accent text-vigno-bg1 border-vigno-accent'
                  : 'text-vigno-accent border-vigno-accent/35 bg-gradient-to-r from-vigno-accent/12 to-vigno-accent2/12 hover:from-vigno-accent/22 hover:to-vigno-accent2/22 hover:border-vigno-accent/60',
              ].join(' ')}
            >
              <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2.5l7 3.2v5.8c0 4.3-2.9 7.7-7 9.5-4.1-1.8-7-5.2-7-9.5V5.7l7-3.2z" />
                <path d="M9.2 12l2 2 3.6-3.8" />
              </svg>
              Admin panel
            </NavLink>
          )}

          {/* Wishlist Link */}
          {(
            <NavLink to="/app/favorites" className="text-vigno-muted hover:text-vigno-txt transition-colors p-1" title="Wishlist">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </NavLink>
          )}

          {/* Wallet Link */}
          {(
            <NavLink to="/app/wallet" className="text-vigno-muted hover:text-vigno-txt transition-colors p-1 relative" title="Wallet">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H17a2 2 0 00-2 2v0a2 2 0 002 2h4" />
              </svg>
              {user?.walletBalance > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-vigno-accent text-vigno-accent-txt text-[9px] font-extrabold px-1 rounded-full scale-90">
                  ₹
                </span>
              )}
            </NavLink>
          )}

          {/* Cart Icon */}
          {(
            <button
              onClick={() => navigate('/app/cart')}
              className="text-vigno-muted hover:text-vigno-txt transition-colors p-1 relative cursor-pointer focus:outline-none"
              title="Cart"
            >
              <svg className="w-5 h-5" width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-vigno-accent text-vigno-accent-txt text-[9px] font-extrabold w-4 h-4 rounded-full flex items-center justify-center scale-90">
                  {cartItems.length}
                </span>
              )}
            </button>
          )}

          {/* Notifications bell (real — admin broadcasts) */}
          <NotificationBell isDark={isDark} />

          {/* Avatar Menu Trigger */}
          <button
            onClick={() => setPanelOpen(true)}
            className="shrink-0 flex items-center"
            title={user?.name || 'Dhruv Gupta'}
          >
            <Avatar user={user} size={32} verified={user?.verified}
              className="ring-2 ring-vigno-line/40 transition-all rounded-full" />
          </button>
        </div>
      </header>
      
      <NavPanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        user={user}
        isAdmin={isAdmin}
        isDark={isDark}
        settings={settings}
        onLogout={doLogout}
        onToggleTheme={() => dispatch(toggleTheme())}
        theme={theme}
      />
    </>
  )
}
