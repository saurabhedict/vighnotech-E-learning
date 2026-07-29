import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { filtersApi } from '../api/filtersApi'

/**
 * "Filter by Tags" dropdown driven by the admin's catalog filter categories/
 * options (Content Type, Training Program, …) — the same tags set on courses and
 * individual resources. Square multi-checkboxes grouped by category + an Apply
 * button. `selected` is a Set of option IDs; `onApply(newSet)` commits the choice.
 */
export default function CatalogTagFilter({ selected, onApply, isDark }) {
  const { data: cats } = useQuery({ queryKey: ['filters'], queryFn: filtersApi.list })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(() => new Set(selected))
  const ref = useRef(null)

  // Re-sync the working copy each time the panel opens.
  useEffect(() => { if (open) setDraft(new Set(selected)) }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const withOptions = (cats || []).filter((c) => c.options && c.options.length)
  if (withOptions.length === 0) return null

  const toggle = (id) => setDraft((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const apply = () => { onApply(new Set(draft)); setOpen(false) }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all active:scale-95 ${
          selected.size > 0
            ? 'bg-vigno-accent/10 text-vigno-accent border-vigno-accent/40'
            : isDark
            ? 'bg-vigno-bg2/60 text-vigno-txt border-vigno-line/50 hover:border-vigno-accent/40'
            : 'bg-white text-slate-700 border-slate-200 hover:border-vigno-accent/40 shadow-sm'
        }`}
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M7 9.5h10M11 14.5h2" />
        </svg>
        Filter by Tags
        {selected.size > 0 && (
          <span className="flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-vigno-accent text-vigno-accent-txt text-[10px] font-black">
            {selected.size}
          </span>
        )}
        <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {open && (
        <div className={`absolute top-full left-0 mt-2 z-30 w-72 rounded-2xl border shadow-2xl overflow-hidden ${isDark ? 'bg-vigno-card border-vigno-line/60' : 'bg-white border-slate-200/80'}`}>
          <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-vigno-line/40' : 'border-slate-100'}`}>
            <span className="text-xs font-black uppercase tracking-widest text-vigno-muted">Filter by Tags</span>
            {draft.size > 0 && (
              <button type="button" onClick={() => setDraft(new Set())} className="text-[11px] font-bold text-vigno-accent hover:underline">Clear all</button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto py-1.5">
            {withOptions.map((cat) => (
              <div key={cat.id} className="pb-1">
                <div className="px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-widest text-vigno-muted">{cat.name}</div>
                {cat.options.map((o) => {
                  const on = draft.has(o.id)
                  return (
                    <label key={o.id} className={`flex items-center gap-2.5 px-4 py-2 cursor-pointer text-sm ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}>
                      <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all ${
                        on ? 'bg-vigno-accent border-vigno-accent' : isDark ? 'border-vigno-line/60 bg-transparent' : 'border-slate-300 bg-white'
                      }`}>
                        {on && (
                          <svg className="w-2.5 h-2.5 text-vigno-accent-txt" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l5 5L19.5 6.25" />
                          </svg>
                        )}
                      </span>
                      <input type="checkbox" className="sr-only" checked={on} onChange={() => toggle(o.id)} />
                      <span className="font-semibold text-vigno-txt">{o.label}</span>
                    </label>
                  )
                })}
              </div>
            ))}
          </div>

          <div className={`px-4 py-3 border-t ${isDark ? 'border-vigno-line/40' : 'border-slate-100'}`}>
            <button type="button" onClick={apply} className="w-full py-2 rounded-xl bg-vigno-accent hover:brightness-110 text-vigno-accent-txt text-xs font-black transition-all">
              Apply{draft.size > 0 ? ` (${draft.size} selected)` : ''}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
