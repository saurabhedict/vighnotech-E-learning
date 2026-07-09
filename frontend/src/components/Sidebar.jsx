import { NavLink, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedClass, toggleSidebar } from '../store/uiSlice'
import { useClasses } from '../hooks/useContent'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function Sidebar() {
  const { className } = useParams()
  const dispatch = useDispatch()
  const collapsed = useSelector((s) => s.ui.sidebarCollapsed)
  const theme = useSelector((s) => s.ui.theme)
  const user = useSelector((s) => s.auth.user)
  const { data: classes, isLoading } = useClasses()
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'Aerolearn'
  const logoEmoji = settings?.brand?.logoEmoji ?? '✈'
  const isAdmin = user?.role === 'admin'
  const isDark = theme === 'dark'

  const base = [
    'aero-sidebar flex-none flex flex-col sticky top-0 h-screen overflow-hidden',
    isDark
      ? 'bg-black/30 border-r border-vigno-line/40'
      : 'bg-white/80 border-r border-vigno-line',
  ].join(' ')

  const activeItem = isDark
    ? 'bg-gradient-to-r from-vigno-accent/35 to-transparent border-l-2 border-vigno-accent text-vigno-txt'
    : 'bg-vigno-accent/15 border-l-2 border-vigno-accent text-vigno-txt font-semibold'

  const inactiveItem = isDark
    ? 'hover:bg-white/10 text-vigno-muted hover:text-vigno-txt'
    : 'hover:bg-vigno-line/30 text-vigno-muted hover:text-vigno-txt'

  const navItemCls = (isActive) =>
    `text-left rounded-lg px-2.5 py-2 text-sm flex justify-between items-center transition-all ${isActive ? activeItem : inactiveItem}`

  if (collapsed) {
    return (
      <aside className={base + ' w-12 p-2 items-center gap-2'}>
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className={[
            'w-8 h-8 grid place-items-center rounded-lg border transition-all',
            isDark
              ? 'bg-white/10 hover:bg-white/20 border-vigno-line text-vigno-muted hover:text-vigno-txt'
              : 'bg-vigno-line/30 hover:bg-vigno-line/60 border-vigno-line text-vigno-muted hover:text-vigno-txt',
          ].join(' ')}
        >
          »
        </button>
        <div className="mt-1 text-vigno-muted" title="Courses">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
          </svg>
        </div>
        {isAdmin && (
          <NavLink
            to="/app/admin?tab=overview"
            title="Admin Dashboard"
            className={({ isActive }) => [
              'mt-2 w-8 h-8 grid place-items-center rounded-lg border transition-all text-sm',
              isActive
                ? isDark ? 'bg-vigno-accent/30 border-vigno-accent/50 text-vigno-accent' : 'bg-amber-100 border-amber-300 text-amber-700'
                : isDark ? 'bg-white/10 hover:bg-vigno-accent/15 border-vigno-line text-vigno-muted hover:text-vigno-accent' : 'bg-amber-50/60 hover:bg-amber-100 border-amber-200 text-amber-600',
            ].join(' ')}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </NavLink>
        )}
      </aside>
    )
  }

  return (
    <aside className={base + ' w-60 p-4 overflow-auto'}>
      {/* Brand header */}
      <div className="flex items-center justify-between pb-3 mb-1">
        <div style={{ fontFamily: "'Caveat', cursive" }} className="text-3xl font-bold px-2 select-none text-vigno-txt">
          {brandName}
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className={[
            'w-7 h-7 grid place-items-center rounded-lg border text-sm transition-all',
            isDark
              ? 'bg-white/10 hover:bg-white/20 border-vigno-line text-vigno-muted hover:text-vigno-txt'
              : 'bg-vigno-line/30 hover:bg-vigno-line/60 border-vigno-line text-vigno-muted hover:text-vigno-txt',
          ].join(' ')}
        >
          «
        </button>
      </div>

      {/* Mode tabs */}
      <div className={[
        'flex gap-1 rounded-xl p-1 mb-4 text-xs',
        isDark ? 'bg-black/25' : 'bg-vigno-line/30',
      ].join(' ')}>
        <span className="flex-1 text-center bg-vigno-accent text-vigno-accent-txt font-bold rounded-lg py-1.5 shadow-sm">Ground</span>
        <span className="flex-1 text-center text-vigno-muted/50 rounded-lg py-1.5 cursor-not-allowed" title="Coming soon">Flight</span>
        <NavLink to="/app/favorites" className={({ isActive }) =>
          `flex-1 text-center rounded-lg py-1.5 transition-all ${isActive
            ? 'bg-vigno-accent text-vigno-accent-txt font-bold shadow-sm'
            : isDark ? 'text-vigno-muted hover:bg-white/10' : 'text-vigno-muted hover:bg-vigno-line/40'
          }`
        }>Wishlist</NavLink>
      </div>

      {/* Admin link — only for admin users */}
      {isAdmin && (
        <>
          <NavLink
            to="/app/admin?tab=overview"
            className={({ isActive }) => [
              'flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm mb-2 border transition-all font-medium',
              isActive
                ? isDark ? 'bg-vigno-accent/20 border-vigno-accent/40 text-vigno-accent' : 'bg-amber-50 border-amber-200 text-amber-700 font-semibold'
                : isDark ? 'bg-vigno-accent/8 border-vigno-accent/20 text-vigno-accent/80 hover:bg-vigno-accent/15 hover:text-vigno-accent' : 'bg-amber-50/60 border-amber-100 text-amber-600 hover:bg-amber-100 hover:text-amber-700',
            ].join(' ')}
          >
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Admin Dashboard</span>
          </NavLink>
          <div className={`h-px mb-3 ${isDark ? 'bg-vigno-line/40' : 'bg-vigno-line/60'}`} />
        </>
      )}

      {/* Courses heading */}
      <div className="text-xs text-vigno-muted uppercase tracking-wide px-2 mb-1">Courses ▾</div>
      {isLoading && <div className="text-sm text-vigno-muted px-2 py-2">Loading…</div>}

      {/* Course list */}
      <nav className="flex flex-col gap-0.5">
        {classes?.map((c) => (
          <NavLink
            key={c}
            to={`/app/${c}`}
            onClick={() => dispatch(setSelectedClass(c))}
            className={({ isActive }) => navItemCls(isActive || c === className)}
          >
            {c.replace(/_/g, ' ')}
            <span className="text-vigno-muted">›</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
