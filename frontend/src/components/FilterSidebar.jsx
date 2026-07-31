import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { filtersApi } from '../api/filtersApi'

const toggleIn = (set, id) => { const n = new Set(set); n.has(id) ? n.delete(id) : n.add(id); return n }

function CheckRow({ label, on, onToggle, isDark }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={on}
      className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-xl text-left text-sm transition-all duration-150 ${
        on
          ? isDark ? 'bg-vigno-accent/10' : 'bg-vigno-accent/[0.06]'
          : isDark ? 'hover:bg-white/[0.04]' : 'hover:bg-slate-50'
      }`}
    >
      <span
        className={`w-[18px] h-[18px] rounded-[6px] border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
          on
            ? 'bg-vigno-accent border-vigno-accent scale-100'
            : isDark ? 'border-vigno-line/70 bg-transparent' : 'border-slate-300 bg-white'
        }`}
      >
        <svg
          className={`w-3 h-3 text-vigno-accent-txt transition-all duration-150 ${on ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l5 5L19.5 6.25" />
        </svg>
      </span>
      <span className={`font-semibold capitalize truncate transition-colors ${on ? 'text-vigno-accent' : 'text-vigno-txt'}`}>{label}</span>
    </button>
  )
}

const FilterIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h18M6 12h12M10 19h4" />
  </svg>
)

const ChevronIcon = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
  </svg>
)

function SectionLabel({ children, isDark }) {
  return (
    <div className="flex items-center gap-1.5 mb-1.5 px-1">
      <span className="w-1 h-3.5 rounded-full bg-vigno-accent/70" />
      <span className="text-[10.5px] font-black uppercase tracking-widest text-vigno-muted">{children}</span>
    </div>
  )
}

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
          className={`relative w-12 h-12 rounded-2xl border flex items-center justify-center transition-all hover:scale-105 active:scale-95 ${
            isDark
              ? 'bg-vigno-card border-vigno-line/60 text-vigno-txt shadow-lg shadow-black/20'
              : 'bg-white border-slate-200 text-slate-700 shadow-md'
          }`}
        >
          <FilterIcon className="w-5 h-5" />
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 rounded-full bg-vigno-accent text-vigno-accent-txt text-[10px] font-black flex items-center justify-center shadow-sm ring-2 ring-vigno-bg1/40">
              {activeCount}
            </span>
          )}
        </button>
      </aside>
    )
  }

  return (
    <aside
      className={`w-full lg:w-64 shrink-0 lg:sticky lg:top-6 rounded-2xl border overflow-hidden transition-shadow ${
        isDark
          ? 'bg-vigno-card border-vigno-line/50 shadow-xl shadow-black/20'
          : 'bg-white border-slate-200/80 shadow-[0_2px_16px_rgba(15,23,42,0.06)]'
      }`}
    >
      {/* Header */}
      <div
        className={`flex items-center justify-between gap-2 px-4 py-3.5 border-b ${
          isDark ? 'border-vigno-line/40 bg-vigno-accent/[0.06]' : 'border-slate-100 bg-vigno-accent/[0.035]'
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="w-8 h-8 rounded-xl bg-vigno-accent/15 text-vigno-accent flex items-center justify-center flex-shrink-0">
            <FilterIcon className="w-4 h-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-extrabold text-vigno-txt tracking-tight leading-tight">Filters</p>
            <p className="text-[11px] font-semibold text-vigno-muted leading-tight">
              {activeCount > 0 ? `${activeCount} active` : 'Refine your results'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          title="Minimize"
          className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors ${
            isDark ? 'text-vigno-muted hover:text-vigno-txt hover:bg-white/5' : 'text-vigno-muted hover:text-vigno-txt hover:bg-slate-100'
          }`}
        >
          <ChevronIcon className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[65vh] overflow-y-auto px-3.5 py-3.5 space-y-4">
        {tagCats.map((cat, i) => (
          <div key={cat.id}>
            <SectionLabel isDark={isDark}>{cat.name}</SectionLabel>
            <div className="space-y-0.5">
              {cat.options.map((o) => (
                <CheckRow key={o.id} label={o.label} on={dTags.has(o.id)} onToggle={() => setDTags((s) => toggleIn(s, o.id))} isDark={isDark} />
              ))}
            </div>
            {(i < tagCats.length - 1 || categories.length > 0 || types.length > 0) && (
              <div className={`h-px mt-3.5 ${isDark ? 'bg-vigno-line/25' : 'bg-slate-100'}`} />
            )}
          </div>
        ))}

        {categories.length > 0 && (
          <div>
            <SectionLabel isDark={isDark}>Category</SectionLabel>
            <div className="space-y-0.5">
              {categories.map((c) => (
                <CheckRow key={c} label={c} on={dCats.has(c)} onToggle={() => setDCats((s) => toggleIn(s, c))} isDark={isDark} />
              ))}
            </div>
            {types.length > 0 && <div className={`h-px mt-3.5 ${isDark ? 'bg-vigno-line/25' : 'bg-slate-100'}`} />}
          </div>
        )}

        {types.length > 0 && (
          <div>
            <SectionLabel isDark={isDark}>Type</SectionLabel>
            <div className="space-y-0.5">
              {types.map((t) => (
                <CheckRow key={t} label={t} on={dTypes.has(t)} onToggle={() => setDTypes((s) => toggleIn(s, t))} isDark={isDark} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className={`px-3.5 py-3.5 border-t space-y-2 ${isDark ? 'border-vigno-line/40 bg-black/10' : 'border-slate-100 bg-slate-50/60'}`}>
        <button
          type="button"
          onClick={apply}
          className="w-full py-2.5 rounded-xl bg-vigno-accent text-vigno-accent-txt text-xs font-black tracking-wide shadow-md shadow-vigno-accent/20 hover:shadow-lg hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
        >
          Apply Filters
          {draftCount > 0 && (
            <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-vigno-accent-txt/20 text-[10px] flex items-center justify-center">{draftCount}</span>
          )}
        </button>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className={`w-full py-2 rounded-xl text-[11px] font-bold border transition-colors ${
              isDark
                ? 'border-vigno-line/40 text-vigno-muted hover:text-vigno-txt hover:border-vigno-line/70'
                : 'border-slate-200 text-vigno-muted hover:text-vigno-txt hover:border-slate-300'
            }`}
          >
            Clear all filters
          </button>
        )}
      </div>
    </aside>
  )
}
