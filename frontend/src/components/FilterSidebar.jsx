import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { filtersApi } from '../api/filtersApi'

const toggleIn = (set, id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n }

function CheckRow({ label, on, onToggle, isDark }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-full flex items-center gap-2.5 px-1.5 py-1.5 rounded-md text-left text-sm transition-colors ${isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'}`}
    >
      <span className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-all ${on ? 'bg-vigno-accent border-vigno-accent' : isDark ? 'border-vigno-line/60' : 'border-slate-300 bg-white'}`}>
        {on && (
          <svg className="w-2.5 h-2.5 text-vigno-accent-txt" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l5 5L19.5 6.25" />
          </svg>
        )}
      </span>
      <span className="font-semibold text-vigno-txt capitalize truncate">{label}</span>
    </button>
  )
}

const FilterIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M7 9.5h10M11 14.5h2" />
  </svg>
)

/**
 * Static, collapsible LEFT filter panel. Holds every catalog filter — the admin's
 * filter categories (Tags), plus course Category and resource Type — as square
 * multi-checkboxes. All work together; Apply commits the whole selection at once.
 * Controlled: `selected` = { tags:Set, cats:Set, types:Set }; onApply(next).
 */
export default function FilterSidebar({ categories = [], types = [], selected, onApply, isDark }) {
  const { data: cats } = useQuery({ queryKey: ['filters'], queryFn: filtersApi.list })
  const [collapsed, setCollapsed] = useState(false)
  const [dTags, setDTags] = useState(() => new Set(selected.tags))
  const [dCats, setDCats] = useState(() => new Set(selected.cats))
  const [dTypes, setDTypes] = useState(() => new Set(selected.types))

  // Re-sync the working copy when the committed selection changes (e.g. Clear all).
  useEffect(() => {
    setDTags(new Set(selected.tags)); setDCats(new Set(selected.cats)); setDTypes(new Set(selected.types))
  }, [selected])

  const tagCats = (cats || []).filter((c) => c.options && c.options.length)
  const activeCount = selected.tags.size + selected.cats.size + selected.types.size
  const draftCount = dTags.size + dCats.size + dTypes.size
  const nothing = tagCats.length === 0 && categories.length === 0 && types.length === 0

  const apply = () => onApply({ tags: new Set(dTags), cats: new Set(dCats), types: new Set(dTypes) })
  const clearAll = () => onApply({ tags: new Set(), cats: new Set(), types: new Set() })

  if (nothing) return null

  if (collapsed) {
    return (
      <aside className="shrink-0 lg:sticky lg:top-6">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          title="Show filters"
          className={`relative w-11 h-11 rounded-xl border flex items-center justify-center ${isDark ? 'bg-vigno-card border-vigno-line/60 text-vigno-txt' : 'bg-white border-slate-200 text-slate-700 shadow-sm'}`}
        >
          <FilterIcon className="w-5 h-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-vigno-accent text-vigno-accent-txt text-[10px] font-black flex items-center justify-center">{activeCount}</span>
          )}
        </button>
      </aside>
    )
  }

  return (
    <aside className={`w-full lg:w-60 shrink-0 lg:sticky lg:top-6 rounded-2xl border overflow-hidden ${isDark ? 'bg-vigno-card border-vigno-line/60' : 'bg-white border-slate-200 shadow-sm'}`}>
      <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-vigno-line/40' : 'border-slate-100'}`}>
        <span className="text-xs font-black uppercase tracking-widest text-vigno-muted flex items-center gap-2">
          <FilterIcon className="w-4 h-4" />
          Filters{activeCount > 0 ? ` (${activeCount})` : ''}
        </span>
        <button type="button" onClick={() => setCollapsed(true)} title="Minimize" className="text-vigno-muted hover:text-vigno-txt">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
      </div>

      <div className="max-h-[65vh] overflow-y-auto px-3 py-3 space-y-4">
        {tagCats.map((cat) => (
          <div key={cat.id}>
            <div className="text-[10px] font-black uppercase tracking-widest text-vigno-muted mb-1 px-1.5">{cat.name}</div>
            {cat.options.map((o) => (
              <CheckRow key={o.id} label={o.label} on={dTags.has(o.id)} onToggle={() => setDTags((s) => toggleIn(s, o.id))} isDark={isDark} />
            ))}
          </div>
        ))}

        {categories.length > 0 && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-vigno-muted mb-1 px-1.5">Category</div>
            {categories.map((c) => (
              <CheckRow key={c} label={c} on={dCats.has(c)} onToggle={() => setDCats((s) => toggleIn(s, c))} isDark={isDark} />
            ))}
          </div>
        )}

        {types.length > 0 && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-widest text-vigno-muted mb-1 px-1.5">Type</div>
            {types.map((t) => (
              <CheckRow key={t} label={t} on={dTypes.has(t)} onToggle={() => setDTypes((s) => toggleIn(s, t))} isDark={isDark} />
            ))}
          </div>
        )}
      </div>

      <div className={`px-3 py-3 border-t space-y-1.5 ${isDark ? 'border-vigno-line/40' : 'border-slate-100'}`}>
        <button type="button" onClick={apply} className="w-full py-2 rounded-xl bg-vigno-accent hover:brightness-110 text-vigno-accent-txt text-xs font-black transition-all">
          Apply Filters{draftCount > 0 ? ` (${draftCount})` : ''}
        </button>
        {activeCount > 0 && (
          <button type="button" onClick={clearAll} className="w-full py-1.5 text-[11px] font-bold text-vigno-muted hover:text-vigno-txt">Clear all</button>
        )}
      </div>
    </aside>
  )
}
