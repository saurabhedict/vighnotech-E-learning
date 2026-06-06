import { NavLink, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setSelectedClass } from '../store/uiSlice'
import { useClasses } from '../hooks/useContent'

export default function Sidebar() {
  const { className } = useParams()
  const dispatch = useDispatch()
  const { data: classes, isLoading } = useClasses()

  return (
    <aside className="w-60 flex-none bg-black/30 p-4 overflow-auto">
      <div className="font-extrabold px-2 pb-3">✈ AeroLearn</div>

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
