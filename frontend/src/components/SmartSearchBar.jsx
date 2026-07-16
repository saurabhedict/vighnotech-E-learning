import { useState, useEffect, useRef, useId } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'

// ─────────────────────────────────────────────────────────────────────────────
// SmartSearchBar — a Google-style search box: live keyword suggestions, recent
// searches, keyboard navigation, and voice (mic) search via the Web Speech API.
// Reused by the Navbar (uncontrolled → navigates to /app/search) and the Search
// page (controlled via value/onChange/onSubmit so results update in place).
// ─────────────────────────────────────────────────────────────────────────────

const RECENT_KEY = 'vigno.recent.searches'
const RECENT_MAX = 8
// Stable empty reference so the "reset highlight when suggestions change" effect
// doesn't fire on every render while the query is loading (data === undefined).
const EMPTY_SUGGESTIONS = []

function loadRecent() {
  try {
    const v = JSON.parse(localStorage.getItem(RECENT_KEY))
    return Array.isArray(v) ? v.filter((x) => typeof x === 'string') : []
  } catch {
    return []
  }
}
function pushRecent(q) {
  const t = q.trim()
  if (!t) return loadRecent()
  const next = [t, ...loadRecent().filter((x) => x.toLowerCase() !== t.toLowerCase())].slice(0, RECENT_MAX)
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    /* storage full / disabled — non-fatal */
  }
  return next
}

// Web Speech API — Chrome/Edge expose it (prefixed); Firefox/older Safari don't.
const SpeechRecognition =
  typeof window !== 'undefined' ? window.SpeechRecognition || window.webkitSpeechRecognition : null

// Bold the matched substring inside a suggestion, like Google does.
function Highlight({ text, query }) {
  const i = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1
  if (i < 0) return <span className="truncate">{text}</span>
  return (
    <span className="truncate">
      {text.slice(0, i)}
      <span className="font-semibold text-vigno-txt">{text.slice(i, i + query.length)}</span>
      {text.slice(i + query.length)}
    </span>
  )
}

function RowIcon({ kind }) {
  const cls = 'w-4 h-4 shrink-0 text-vigno-muted'
  if (kind === 'recent')
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
      </svg>
    )
  if (kind === 'course')
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.5C10.8 5.7 9.2 5.2 7.5 5.2S4.2 5.7 3 6.5v12c1.2-.8 2.8-1.3 4.5-1.3s3.3.5 4.5 1.3m0-12c1.2-.8 2.8-1.3 4.5-1.3s3.3.5 4.5 1.3v12c-1.2-.8-2.8-1.3-4.5-1.3s-3.3.5-4.5 1.3m0-12v12" />
      </svg>
    )
  if (kind === 'tag')
    return (
      <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5.6a2 2 0 011.4.6l6.4 6.4a2 2 0 010 2.8l-5.6 5.6a2 2 0 01-2.8 0L5.6 12A2 2 0 015 10.6V5a2 2 0 012-2z" />
      </svg>
    )
  // 'query' | 'title' → magnifier
  return (
    <svg className={cls} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  )
}

export default function SmartSearchBar({
  variant = 'navbar',
  value,
  onChange,
  onSubmit,
  autoFocus = false,
  placeholder = 'Search for anything…',
  className = '',
}) {
  const navigate = useNavigate()
  const controlled = value !== undefined
  const [inner, setInner] = useState(value ?? '')
  const q = controlled ? value : inner
  const setQ = (v) => {
    if (!controlled) setInner(v)
    onChange?.(v)
  }

  const [open, setOpen] = useState(false)
  const [debouncedQ, setDebouncedQ] = useState(q)
  const [active, setActive] = useState(-1)
  const [listening, setListening] = useState(false)
  const [micError, setMicError] = useState('')
  const [recent, setRecent] = useState(loadRecent)

  const wrapRef = useRef(null)
  const inputRef = useRef(null)
  const recognitionRef = useRef(null)
  const valueRef = useRef(q) // latest input value — lets async voice callbacks detect edits
  const canceledRef = useRef(false) // true when the user pressed stop to cancel voice input
  const listboxId = useId() // unique per instance (navbar + page can be mounted together)

  // Debounce the text before it drives a network request.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 180)
    return () => clearTimeout(t)
  }, [q])

  // Mirror the current value into a ref so the (async) voice onend handler can tell
  // whether the user has edited the box since we recognized their words.
  useEffect(() => {
    valueRef.current = q
  }, [q])

  const trimmed = debouncedQ.trim()
  const { data } = useQuery({
    queryKey: ['search', 'suggest', trimmed],
    queryFn: () => discoverApi.suggest(trimmed),
    enabled: open && trimmed.length >= 1,
    staleTime: 60_000,
  })
  const suggestions = data ?? EMPTY_SUGGESTIONS

  // The rows shown in the dropdown: recent searches when empty, else the typed
  // query as the first (exact) row followed by the server suggestions.
  const typed = q.trim()
  const rows =
    typed.length === 0
      ? recent.map((text) => ({ text, kind: 'recent' }))
      : [
          { text: typed, kind: 'query' },
          ...suggestions.filter((s) => s.text.toLowerCase() !== typed.toLowerCase()),
        ]

  const showDropdown = open && rows.length > 0

  // Close on outside click.
  useEffect(() => {
    const h = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // Reset the highlighted row when the dropdown opens/closes OR when the suggestion
  // list changes (new results arriving would otherwise reflow rows under a held
  // selection). Typing also resets it synchronously in onChange, so a stale index
  // can never survive a keystroke and submit the wrong query on Enter.
  useEffect(() => {
    setActive(-1)
  }, [open, suggestions])

  // Abort any in-flight recognition when unmounting.
  useEffect(() => () => {
    try {
      recognitionRef.current?.abort()
    } catch {
      /* noop */
    }
  }, [])

  const submit = (text) => {
    const t = (text ?? q).trim()
    setOpen(false)
    setActive(-1)
    if (t) setRecent(pushRecent(t))
    if (onSubmit) onSubmit(t)
    else navigate(`/app/search${t ? `?q=${encodeURIComponent(t)}` : ''}`)
    inputRef.current?.blur()
  }

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (!open) return setOpen(true)
      setActive((i) => Math.min(i + 1, rows.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, -1))
    } else if (e.key === 'Enter') {
      if (active >= 0 && rows[active]) {
        e.preventDefault()
        submit(rows[active].text)
      } else {
        submit()
      }
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActive(-1)
    }
  }

  const clearRecent = () => {
    try {
      localStorage.removeItem(RECENT_KEY)
    } catch {
      /* noop */
    }
    setRecent([])
  }

  // ── Voice search ────────────────────────────────────────────────────────────
  const toggleMic = () => {
    if (!SpeechRecognition) return
    setMicError('')
    if (listening) {
      // User pressed stop → cancel. abort() discards the audio so onend won't submit.
      canceledRef.current = true
      recognitionRef.current?.abort()
      return
    }
    canceledRef.current = false
    const rec = new SpeechRecognition()
    rec.lang = navigator.language || 'en-US'
    rec.interimResults = true
    rec.continuous = false
    rec.maxAlternatives = 1
    let finalText = ''
    rec.onresult = (ev) => {
      let interim = ''
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i]
        if (r.isFinal) finalText += r[0].transcript
        else interim += r[0].transcript
      }
      setQ(finalText || interim)
      setOpen(true)
    }
    rec.onerror = (ev) => {
      setListening(false)
      if (ev?.error === 'not-allowed' || ev?.error === 'service-not-allowed') setMicError('Microphone access denied')
      else if (ev?.error === 'no-speech') setMicError('Didn’t catch that — try again')
    }
    rec.onend = () => {
      setListening(false)
      const t = finalText.trim()
      // Speak → search — but only if the user didn't cancel and hasn't edited the
      // box since we recognized the words (onend can fire hundreds of ms later).
      if (t && !canceledRef.current && valueRef.current.trim() === t) submit(t)
    }
    recognitionRef.current = rec
    setListening(true)
    try {
      rec.start()
    } catch {
      setListening(false)
    }
  }

  // ── Styling ─────────────────────────────────────────────────────────────────
  const isNav = variant === 'navbar'
  const inputCls = [
    'w-full outline-none transition-all border text-vigno-txt placeholder-vigno-muted/60 bg-vigno-bg2',
    isNav ? 'pl-10 pr-11 py-2 rounded-full text-sm' : 'pl-11 pr-12 py-2.5 rounded-xl text-sm',
    'border-vigno-line/60 focus:border-vigno-accent/70',
  ].join(' ')

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Left search icon */}
      <svg
        className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-vigno-muted pointer-events-none ${isNav ? 'left-3' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={showDropdown}
        aria-controls={listboxId}
        aria-activedescendant={active >= 0 ? `${listboxId}-opt-${active}` : undefined}
        aria-autocomplete="list"
        autoComplete="off"
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus={autoFocus}
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
          setActive(-1)
          if (micError) setMicError('')
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={listening ? 'Listening…' : placeholder}
        className={inputCls}
      />

      {/* Mic button — only when the browser supports voice input */}
      {SpeechRecognition && (
        <button
          type="button"
          onClick={toggleMic}
          title={listening ? 'Stop listening' : 'Search by voice'}
          aria-label={listening ? 'Stop voice search' : 'Search by voice'}
          className={[
            'absolute top-1/2 -translate-y-1/2 grid place-items-center rounded-full transition-all',
            isNav ? 'right-1.5 w-8 h-8' : 'right-2 w-9 h-9',
            listening
              ? 'text-red-500 bg-red-500/10'
              : 'text-vigno-muted hover:text-vigno-accent hover:bg-vigno-line/40',
          ].join(' ')}
        >
          {listening && (
            <span className="absolute inset-0 rounded-full bg-red-500/30 animate-ping" aria-hidden="true" />
          )}
          <svg className="w-4 h-4 relative" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15a3 3 0 003-3V6a3 3 0 00-6 0v6a3 3 0 003 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 11a7 7 0 0014 0M12 18v3" />
          </svg>
        </button>
      )}

      {/* Suggestions / recent dropdown */}
      {showDropdown && (
        <div
          id={listboxId}
          role="listbox"
          className="absolute top-full left-0 right-0 mt-2 z-50 bg-vigno-card border border-vigno-line/70 rounded-xl shadow-xl overflow-hidden max-h-96 overflow-y-auto"
        >
          {typed.length === 0 && recent.length > 0 && (
            <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-vigno-muted/70">Recent</span>
              <button type="button" onClick={clearRecent} className="text-[11px] font-medium text-vigno-muted hover:text-vigno-accent">
                Clear
              </button>
            </div>
          )}
          {rows.map((row, i) => (
            <button
              type="button"
              key={`${row.kind}-${row.text}-${i}`}
              id={`${listboxId}-opt-${i}`}
              role="option"
              aria-selected={i === active}
              // onMouseDown (not onClick) so it fires before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault()
                submit(row.text)
              }}
              onMouseEnter={() => setActive(i)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors',
                i === active ? 'bg-vigno-accent/10 text-vigno-txt' : 'text-vigno-txt/90 hover:bg-vigno-line/30',
              ].join(' ')}
            >
              <RowIcon kind={row.kind} />
              <Highlight text={row.text} query={typed} />
              {row.kind === 'course' && (
                <span className="ml-auto text-[10px] font-semibold uppercase tracking-wide text-vigno-accent2/80 shrink-0">Course</span>
              )}
            </button>
          ))}
        </div>
      )}

      {micError && <p className="absolute top-full left-0 mt-1 text-[11px] text-red-400 px-1">{micError}</p>}
    </div>
  )
}
