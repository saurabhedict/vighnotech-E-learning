import { useEffect, useRef, useState } from 'react'

// Curated palette of footer-relevant emojis. For anything not here, the user can
// paste any emoji (or use the OS emoji keyboard — Win + . / Cmd + Ctrl + Space).
const EMOJIS = [
  '🔗', '📞', '☎️', '✉️', '📧', '📍', '🗺️', '🕒', '📅', '🌐', '🏠', '🏢',
  '📚', '🎓', '🧭', '💼', '🛡️', '🔒', '✅', '⭐', '🌟', '🏆', '🏅', '🎯',
  '📱', '💬', '🟢', '📘', '📷', '▶️', '🐦', '💡', '📝', '📰', '📨', '🤝',
  '💳', '💰', '🎁', '🎟️', '🛒', '📦', '🚀', '✈️', '🛩️', '❤️', '👍', '🔥',
]

/**
 * Emoji selector. Props: value (string emoji), onChange(emoji).
 * Curated grid + free paste so ANY emoji works.
 */
export default function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey) }
  }, [open])

  const pick = (e) => { onChange(e); setOpen(false); setTyped('') }

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        title="Choose an icon"
        className="w-10 h-10 grid place-items-center rounded-lg bg-vigno-bg2 border border-vigno-line text-lg hover:border-vigno-accent"
      >
        {value || '🙂'}
      </button>

      {open && (
        <div className="absolute z-30 top-full mt-1 left-0 w-64 bg-vigno-panel border border-vigno-line rounded-xl shadow-2xl p-2">
          <div className="grid grid-cols-8 gap-1 max-h-40 overflow-auto">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => pick(e)} className="w-7 h-7 grid place-items-center rounded hover:bg-white/10 text-lg">
                {e}
              </button>
            ))}
          </div>
          <div className="flex gap-1 mt-2">
            <input
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Paste any emoji…"
              className="flex-1 min-w-0 px-2 py-1.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none"
            />
            <button type="button" onClick={() => typed.trim() && pick(typed.trim())} className="text-xs bg-vigno-accent text-vigno-accent-txt font-bold rounded-lg px-2.5">Use</button>
          </div>
          <button type="button" onClick={() => pick('')} className="mt-1.5 w-full text-xs text-vigno-muted hover:text-vigno-txt">Clear icon</button>
        </div>
      )}
    </div>
  )
}
