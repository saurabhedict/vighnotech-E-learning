import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { filtersApi } from '../api/filtersApi'

// One multi-select dropdown for a filter category (e.g. "Select Content Type").
function MultiSelect({ category, selected, onToggle }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const count = category.options.filter((o) => selected.has(o.id)).length
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-vigno-line/60 bg-vigno-card text-sm text-vigno-txt hover:border-vigno-accent/50 transition-all w-full sm:min-w-[210px] justify-between"
      >
        <span className="truncate">Select {category.name}{count > 0 && <span className="ml-1.5 text-vigno-accent font-bold">({count})</span>}</span>
        <svg className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div className="absolute z-30 mt-2 w-64 max-h-72 overflow-y-auto rounded-xl border border-vigno-line/60 bg-vigno-card shadow-xl p-2">
          {category.options.length === 0 && <p className="text-xs text-vigno-muted px-2 py-3">No options yet.</p>}
          {category.options.map((o) => (
            <label key={o.id} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-vigno-accent/10 cursor-pointer text-sm">
              <input type="checkbox" checked={selected.has(o.id)} onChange={() => onToggle(o.id)} className="accent-vigno-accent w-4 h-4" />
              <span className="text-vigno-txt">{o.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  )
}

// The catalog filter bar: one dropdown per admin-defined category + Apply.
// Apply opens the results page (/app/browse) with the chosen options.
export default function CatalogFilterBar() {
  const navigate = useNavigate()
  const { data: cats } = useQuery({ queryKey: ['filters'], queryFn: filtersApi.list })
  const [selected, setSelected] = useState(() => new Set())

  const toggle = (id) => setSelected((prev) => {
    const n = new Set(prev)
    n.has(id) ? n.delete(id) : n.add(id)
    return n
  })
  const apply = () => {
    const ids = [...selected]
    navigate(`/app/browse${ids.length ? `?opts=${ids.join(',')}` : ''}`)
  }

  if (!cats || cats.length === 0) return null
  return (
    <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-3">
      {cats.map((cat) => (
        <MultiSelect key={cat.id} category={cat} selected={selected} onToggle={toggle} />
      ))}
      <button
        type="button"
        onClick={apply}
        className="px-7 py-2.5 rounded-xl bg-vigno-accent text-vigno-bg1 font-bold text-sm hover:brightness-110 active:scale-[0.98] transition-all shadow-sm"
      >
        Apply
      </button>
      {selected.size > 0 && (
        <button type="button" onClick={() => setSelected(new Set())} className="text-xs text-vigno-muted hover:text-vigno-txt font-semibold">Clear</button>
      )}
    </div>
  )
}
