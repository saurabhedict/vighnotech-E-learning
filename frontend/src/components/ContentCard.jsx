import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { createPortal } from 'react-dom'
import FavoriteButton from './FavoriteButton'

// ── Type metadata ─────────────────────────────────────────────────────────────
const TYPE_LABEL = { pdf: 'PDF', video: 'Video', game: 'Interactive', '3d': '3D Model' }

const TYPE_DARK = {
  pdf:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
  video: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  game:  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  '3d':  'bg-sky-500/10 text-sky-400 border-sky-500/20',
}
const TYPE_LIGHT = {
  pdf:   'bg-blue-50 text-blue-600 border-blue-200',
  video: 'bg-purple-50 text-purple-600 border-purple-200',
  game:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  '3d':  'bg-sky-50 text-sky-700 border-sky-200',
}
const TYPE_FALLBACK_DARK  = 'bg-white/10 text-vigno-muted border-white/10'
const TYPE_FALLBACK_LIGHT = 'bg-gray-100 text-gray-600 border-gray-200'

// ── Portal-based preview panel ────────────────────────────────────────────────
// Renders into document.body so it's never clipped by overflow:hidden parents.
function PreviewPortal({ item, isDark, anchorRect, onNavigate }) {
  const [style, setStyle] = useState({})

  useEffect(() => {
    if (!anchorRect) return
    const panelW = 288
    const panelH = 340
    const gap = 10
    const vw = window.innerWidth
    const vh = window.innerHeight

    let left = anchorRect.right + gap
    if (left + panelW > vw - 8) left = anchorRect.left - panelW - gap
    if (left < 8) left = 8

    let top = anchorRect.top
    if (top + panelH > vh - 8) top = vh - panelH - 8
    if (top < 8) top = 8

    setStyle({ position: 'fixed', top, left, width: panelW, zIndex: 9999 })
  }, [anchorRect])

  const badge = isDark
    ? (TYPE_DARK[item.type]  || TYPE_FALLBACK_DARK)
    : (TYPE_LIGHT[item.type] || TYPE_FALLBACK_LIGHT)

  return createPortal(
    <div
      style={style}
      className={[
        'rounded-lg border shadow-2xl overflow-hidden pointer-events-none',
        isDark
          ? 'bg-[rgb(var(--v-panel))] border-vigno-line/60'
          : 'bg-white border-vigno-line',
      ].join(' ')}
    >
      {/* Thumbnail zone */}
      <div className={[
        'h-28 flex items-center justify-center relative',
        isDark ? 'bg-vigno-bg3/70' : 'bg-vigno-bg3/30',
      ].join(' ')}>
        <span className={[
          'text-2xl font-bold tracking-widest select-none opacity-15',
          isDark ? 'text-vigno-txt' : 'text-vigno-txt',
        ].join(' ')}>
          {(item.type || 'content').toUpperCase()}
        </span>
        <span className={`absolute top-2 left-2 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge}`}>
          {TYPE_LABEL[item.type] || item.type || 'Content'}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className={`font-semibold text-[13px] leading-snug mb-2 line-clamp-2 ${isDark ? 'text-vigno-txt' : 'text-vigno-txt'}`}>
          {item.title}
        </p>

        {/* Meta row */}
        <div className="flex items-center gap-3 mb-3">
          <span className={`capitalize text-xs ${isDark ? 'text-vigno-muted' : 'text-vigno-muted'}`}>
            {TYPE_LABEL[item.type] || item.type}
          </span>
          {item.duration > 0 && (
            <span className={`text-xs ${isDark ? 'text-vigno-muted' : 'text-vigno-muted'}`}>
              {Math.round(item.duration / 60)} min
            </span>
          )}
        </div>

        {/* What you get */}
        <ul className="mb-3 space-y-1.5">
          {[
            'Access on all devices',
            item.paid ? 'Secure account-linked license' : 'Free — no purchase needed',
            item.type === 'video' ? 'Streamed securely, no download' :
            item.type === 'pdf'   ? 'Rendered in-browser, download disabled' :
            item.type === 'game'  ? 'Requires AeroLearn desktop launcher' :
                                    'Opens directly in browser',
          ].map((h, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className={`mt-0.5 shrink-0 text-xs ${isDark ? 'text-vigno-accent' : 'text-vigno-accent'}`}>✓</span>
              <span className={`text-xs ${isDark ? 'text-vigno-muted' : 'text-vigno-muted'}`}>{h}</span>
            </li>
          ))}
        </ul>

        {/* Price + CTA */}
        <div className={`pt-3 border-t flex items-center justify-between gap-2 ${isDark ? 'border-vigno-line/30' : 'border-vigno-line'}`}>
          {item.paid ? (
            <span className={`font-bold text-sm ${isDark ? 'text-vigno-txt' : 'text-vigno-txt'}`}>
              ₹{item.price?.toLocaleString('en-IN')}
            </span>
          ) : (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${isDark ? 'bg-green-500/15 text-green-300 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200'}`}>
              Free
            </span>
          )}
          {/* pointer-events re-enabled on button only */}
          <button
            style={{ pointerEvents: 'auto' }}
            onClick={onNavigate}
            className={[
              'text-xs font-semibold px-3 py-1.5 rounded transition-all',
              isDark
                ? 'bg-vigno-accent2 hover:opacity-85 text-white'
                : 'bg-vigno-accent2 hover:opacity-85 text-white',
            ].join(' ')}
          >
            {item.paid ? 'View / Buy' : 'Open'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

// ── Card ──────────────────────────────────────────────────────────────────────
export default function ContentCard({ item }) {
  const navigate = useNavigate()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'

  const [showPreview, setShowPreview] = useState(false)
  const [anchorRect, setAnchorRect] = useState(null)
  const cardRef = useRef(null)
  const hoverTimer = useRef(null)

  const pct = item.duration > 0
    ? Math.min(100, Math.round((item.position / item.duration) * 100))
    : 0

  const badge = isDark
    ? (TYPE_DARK[item.type]  || TYPE_FALLBACK_DARK)
    : (TYPE_LIGHT[item.type] || TYPE_FALLBACK_LIGHT)

  const handleMouseEnter = useCallback(() => {
    hoverTimer.current = setTimeout(() => {
      if (cardRef.current) setAnchorRect(cardRef.current.getBoundingClientRect())
      setShowPreview(true)
    }, 320)
  }, [])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(hoverTimer.current)
    setShowPreview(false)
    setAnchorRect(null)
  }, [])

  useEffect(() => () => clearTimeout(hoverTimer.current), [])

  const goToContent = useCallback(() => {
    navigate(`/app/content/${item.id}`)
  }, [navigate, item.id])

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="relative"
      style={{ width: '13rem' }} /* 208px — matches w-52 */
    >
      <button
        onClick={goToContent}
        className={[
          'w-full text-left rounded-lg border overflow-hidden transition-all duration-150',
          showPreview
            ? isDark
              ? 'border-vigno-accent2/50 shadow-lg shadow-vigno-accent2/10 -translate-y-0.5'
              : 'border-vigno-accent2/40 shadow-lg shadow-vigno-accent2/10 -translate-y-0.5'
            : isDark
              ? 'bg-vigno-card border-vigno-line hover:border-vigno-line/80'
              : 'bg-white border-vigno-line hover:border-vigno-line/80 shadow-sm',
          isDark ? 'bg-vigno-card' : 'bg-white',
        ].join(' ')}
      >
        {/* Thumbnail */}
        <div className={[
          'h-28 flex items-center justify-center relative overflow-hidden',
          isDark ? 'bg-vigno-bg3/50' : 'bg-vigno-bg3/20',
        ].join(' ')}>
          <span className={`text-xl font-bold tracking-widest select-none opacity-[0.12] ${isDark ? 'text-vigno-txt' : 'text-vigno-txt'}`}>
            {(item.type || '').toUpperCase()}
          </span>
          {pct > 0 && (
            <div className="absolute bottom-0 inset-x-0 h-[3px] bg-black/20">
              <div className="h-full bg-vigno-accent" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* Body */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${badge}`}>
              {TYPE_LABEL[item.type] || item.type || 'Content'}
            </span>
            {/* stop propagation so click on star doesn't navigate */}
            <span onClick={(e) => e.stopPropagation()}>
              <FavoriteButton contentId={item.id} className="text-base" />
            </span>
          </div>

          <p className={`font-semibold text-[13px] leading-snug line-clamp-2 min-h-[2.4rem] ${isDark ? 'text-vigno-txt' : 'text-vigno-txt'}`}>
            {item.title}
          </p>

          <div className="mt-2 flex items-center justify-between">
            {item.paid ? (
              <span className={`text-xs font-bold ${isDark ? 'text-vigno-txt' : 'text-vigno-txt'}`}>
                ₹{item.price?.toLocaleString('en-IN')}
              </span>
            ) : (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${isDark ? 'bg-green-500/15 text-green-300 border-green-500/20' : 'bg-green-50 text-green-700 border-green-200'}`}>
                Free
              </span>
            )}
            {pct > 0 && (
              <span className={`text-[10px] ${isDark ? 'text-vigno-muted' : 'text-vigno-muted'}`}>
                {item.completed ? 'Done' : `${pct}%`}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Portal preview — never clipped */}
      {showPreview && anchorRect && (
        <PreviewPortal
          item={item}
          isDark={isDark}
          anchorRect={anchorRect}
          onNavigate={goToContent}
        />
      )}
    </div>
  )
}
