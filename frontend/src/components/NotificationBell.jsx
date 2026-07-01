import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { notificationApi } from '../api/notificationApi'
import { safeHref } from '../lib/safeUrl'

const LEVEL_DOT = { info: 'bg-vigno-accent', success: 'bg-green-400', warning: 'bg-amber-400' }

function timeAgo(iso) {
  const s = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return 'just now'
  const m = Math.floor(s / 60); if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60); if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24); return `${d}d ago`
}

// Real notification bell — shows admin broadcasts to everyone, with an unread badge.
export default function NotificationBell({ isDark }) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  const { data } = useQuery({
    queryKey: ['notifications', 'mine'],
    queryFn: notificationApi.mine,
    refetchInterval: 60_000,          // pick up new broadcasts within a minute
    refetchOnWindowFocus: true,
  })
  const items = data?.items || []
  const unread = data?.unread || 0

  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const toggle = async () => {
    const next = !open
    setOpen(next)
    // Opening clears the badge: mark seen server-side, then refresh the count.
    if (next && unread > 0) {
      try { await notificationApi.markSeen() } catch { /* ignore */ }
      qc.invalidateQueries({ queryKey: ['notifications', 'mine'] })
    }
  }

  const openLink = (link) => {
    if (!link) return
    setOpen(false)
    if (link.startsWith('/') && !link.startsWith('//')) navigate(link)
    else window.open(safeHref(link), '_blank', 'noopener')
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        className="text-vigno-muted hover:text-vigno-txt transition-colors p-1 relative"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-extrabold min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className={[
            'absolute right-0 mt-2 w-80 max-h-[70vh] overflow-y-auto rounded-xl shadow-2xl z-50 border',
            isDark ? 'bg-[#0d1829] border-vigno-line/50' : 'bg-white border-vigno-line',
          ].join(' ')}
        >
          <div className={`px-4 py-3 border-b flex items-center justify-between ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/60'}`}>
            <span className="text-sm font-bold text-vigno-txt">Notifications</span>
            {items.length > 0 && <span className="text-[10px] text-vigno-muted">{items.length} total</span>}
          </div>

          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-vigno-muted">You're all caught up 🎉</div>
          ) : (
            <ul className="divide-y divide-vigno-line/20">
              {items.map((n) => (
                <li
                  key={n.id}
                  onClick={() => openLink(n.link)}
                  className={[
                    'px-4 py-3 flex gap-3 transition-colors',
                    n.link ? 'cursor-pointer hover:bg-white/5' : '',
                    n.unread ? (isDark ? 'bg-vigno-accent/5' : 'bg-vigno-accent/8') : '',
                  ].join(' ')}
                >
                  <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${LEVEL_DOT[n.level] || LEVEL_DOT.info}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-vigno-txt truncate">{n.title}</p>
                      <span className="text-[10px] text-vigno-muted shrink-0">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-vigno-muted mt-0.5 whitespace-pre-line break-words">{n.body}</p>
                    {n.link && <span className="text-[11px] text-vigno-accent font-semibold mt-1 inline-block">View →</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
