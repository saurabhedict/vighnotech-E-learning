import { NavLink, useParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { setSelectedClass, toggleSidebar } from '../store/uiSlice'
import { useClasses } from '../hooks/useContent'
import { useSiteSettings } from '../hooks/useSiteSettings'

export default function Sidebar() {
  const { className } = useParams()
  const dispatch = useDispatch()
  const collapsed = useSelector((s) => s.ui.sidebarCollapsed)
  const { data: classes, isLoading } = useClasses()
  const { data: settings } = useSiteSettings()
  const brandName = settings?.brand?.name || 'AeroLearn'
  const logoEmoji = settings?.brand?.logoEmoji ?? '✈'

  // Collapsed → a slim rail with just an expand button, so the home modules
  // sidebar can be minimized to give content more room.
  if (collapsed) {
    return (
      <aside className="w-12 flex-none bg-black/30 p-2 flex flex-col items-center">
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="Expand modules"
          aria-label="Expand sidebar"
          className="w-8 h-8 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 border border-vigno-line"
        >
          »
        </button>
        <div className="mt-3 text-vigno-muted text-lg" title="Courses">📚</div>
      </aside>
    )
  }

  return (
    <aside className="w-60 flex-none bg-black/30 p-4 overflow-auto">
      <div className="flex items-center justify-between pb-3">
        <div className="font-extrabold px-2">{logoEmoji} {brandName}</div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="Minimize modules"
          aria-label="Collapse sidebar"
          className="w-7 h-7 grid place-items-center rounded-lg bg-white/10 hover:bg-white/20 border border-vigno-line text-sm"
        >
          «
        </button>
      </div>

      <div className="flex gap-1 bg-black/25 rounded-xl p-1 mb-4 text-xs">
        <span className="flex-1 text-center bg-vigno-accent text-[#1a0d0f] font-bold rounded-lg py-1.5">Ground</span>
        <span className="flex-1 text-center text-vigno-muted/60 rounded-lg py-1.5 cursor-not-allowed" title="Coming soon">Flight</span>
        <NavLink to="/app/favorites" className={({ isActive }) =>
          'flex-1 text-center rounded-lg py-1.5 ' + (isActive ? 'bg-vigno-accent text-[#1a0d0f] font-bold' : 'text-vigno-muted hover:bg-white/10')
        }>★ Saved</NavLink>
      </div>

      <div className="text-xs text-vigno-muted uppercase tracking-wide px-2 mb-1">Courses ▾</div>
      {isLoading && <div className="text-sm text-vigno-muted px-2 py-2">Loading…</div>}

      <nav className="flex flex-col gap-0.5">
        {classes?.map((c) => (
          <NavLink key={c} to={`/app/${c}`} onClick={() => dispatch(setSelectedClass(c))}
            className={({ isActive }) =>
              'text-left rounded-lg px-2.5 py-2 text-sm flex justify-between items-center ' +
              ((isActive || c === className)
                ? 'bg-gradient-to-r from-vigno-accent/35 to-transparent border-l-2 border-vigno-accent'
                : 'hover:bg-white/10')
            }>
            {c.replace(/_/g, ' ')} <span className="text-vigno-muted">›</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
