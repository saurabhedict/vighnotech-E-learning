import { useEffect, useRef, useState } from 'react'
import { COUNTRIES } from '../lib/countryCodes'

/**
 * Country dial-code picker that opens DOWNWARD with a search box. Avoids the
 * native <select> (which opens upward near screen edges and renders flag emoji
 * as letter pairs on Windows). Props: value (dial, e.g. '+91'), onChange(dial).
 */
export default function CountrySelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const ref = useRef(null)
  const sel = COUNTRIES.find((c) => c.dial === value) || COUNTRIES.find((c) => c.dial === '+91')

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const term = q.trim().toLowerCase()
  const list = term ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(term) || c.dial.includes(term)) : COUNTRIES

  return (
    <div className="relative w-32 shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-1 px-2.5 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent"
      >
        <span className="truncate"><span className="text-vigno-muted text-xs mr-1">{sel?.iso}</span>{sel?.dial}</span>
        <span className="text-vigno-muted text-[10px]">▼</span>
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-72 max-w-[80vw] bg-vigno-panel border border-vigno-line rounded-xl shadow-2xl overflow-hidden">
          <div className="p-2 border-b border-vigno-line">
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search country…"
              className="w-full px-2.5 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent"
            />
          </div>
          <ul className="max-h-60 overflow-auto py-1">
            {list.map((c) => (
              <li key={c.iso}>
                <button
                  type="button"
                  onClick={() => { onChange(c.dial); setOpen(false); setQ('') }}
                  className={'w-full text-left px-3 py-2 text-sm flex items-center justify-between gap-2 hover:bg-white/10 ' +
                    (c.dial === value ? 'bg-vigno-accent/15 text-vigno-accent2' : '')}
                >
                  <span className="truncate"><span className="text-vigno-muted text-xs mr-1.5">{c.iso}</span>{c.name}</span>
                  <span className="text-vigno-muted shrink-0">{c.dial}</span>
                </button>
              </li>
            ))}
            {list.length === 0 && <li className="px-3 py-2 text-sm text-vigno-muted">No match</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
