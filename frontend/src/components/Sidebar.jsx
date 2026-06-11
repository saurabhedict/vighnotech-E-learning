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

  if (collapsed) {
    return (
      <aside className="w-14 flex-none bg-vigno-panel border-r border-vigno-line/50 p-2 flex flex-col items-center pt-4 gap-3">
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="Expand sidebar"
          aria-label="Expand sidebar"
          className="w-9 h-9 grid place-items-center rounded-lg bg-white/8 hover:bg-vigno-accent/20 border border-vigno-line text-vigno-muted hover:text-vigno-accent transition-all duration-150"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M5 3l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <div className="mt-2 text-vigno-muted/60 text-base" title="Courses">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
      </aside>
    )
  }

  return (
    <aside className="w-64 flex-none bg-vigno-panel border-r border-vigno-line/50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-vigno-line/40">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md bg-vigno-accent/20 flex items-center justify-center text-vigno-accent text-sm font-bold">
            {logoEmoji}
          </div>
          <span className="font-semibold text-sm text-vigno-txt">{brandName}</span>
        </div>
        <button
          onClick={() => dispatch(toggleSidebar())}
          title="Collapse sidebar"
          aria-label="Collapse sidebar"
          className="w-7 h-7 grid place-items-center rounded-md hover:bg-white/10 text-vigno-muted hover:text-vigno-txt transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 3L5 7l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>

      {/* Filter tabs */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1 bg-black/20 rounded-lg p-0.5 text-xs">
          <span className="flex-1 text-center bg-vigno-accent text-[#1a1000] font-semibold rounded-md py-1.5 cursor-default">Ground</span>
          <span className="flex-1 text-center text-vigno-muted/50 rounded-md py-1.5 cursor-not-allowed" title="Coming soon">Flight</span>
          <NavLink to="/app/favorites" className={({ isActive }) =>
            'flex-1 text-center rounded-md py-1.5 transition-colors ' +
            (isActive ? 'bg-vigno-accent text-[#1a1000] font-semibold' : 'text-vigno-muted hover:bg-white/10 hover:text-vigno-txt')
          }>★ Saved</NavLink>
        </div>
      </div>

      {/* Section label */}
      <div className="px-4 pt-2 pb-1.5">
        <span className="text-[10px] font-semibold tracking-widest uppercase text-vigno-muted/70">Courses</span>
      </div>

      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-thin">
        {isLoading && (
          <div className="flex flex-col gap-1.5 px-2 py-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-0.5">
          {classes?.map((c) => (
            <NavLink
              key={c}
              to={`/app/${c}`}
              onClick={() => dispatch(setSelectedClass(c))}
              className={({ isActive }) =>
                'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ' +
                ((isActive || c === className)
                  ? 'bg-vigno-accent/15 text-vigno-accent border-l-2 border-vigno-accent font-medium pl-[10px]'
                  : 'text-vigno-muted hover:bg-white/8 hover:text-vigno-txt border-l-2 border-transparent pl-[10px]')
              }
            >
              <span className="truncate">{c.replace(/_/g, ' ')}</span>
              <svg className="shrink-0 opacity-40 group-hover:opacity-70 transition-opacity" width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M4.5 3l3 3-3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </NavLink>
          ))}
        </div>
      </nav>
    </aside>
  )
}
