import { useState, useRef, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { licenseApi } from '../api/licenseApi'
import FavoriteButton from './FavoriteButton'
import UdemyHoverPopover from './UdemyHoverPopover'

const TYPE_LABEL = { pdf: 'PDF', video: 'Video', game: 'Simulator', '3d': '3D Model' }

function LessonIcon({ type, className = "w-10 h-10" }) {
  if (type === 'video') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (type === 'pdf') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  if (type === '3d') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}



export default function ContentCard({ item, disablePopover = false }) {
  const navigate = useNavigate()
  const theme = useSelector((s) => s.ui.theme)
  const isAdmin = useSelector((s) => s.auth.user?.role) === 'admin'
  const isDark = theme === 'dark'
  const { data: licenses } = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  const isEnrolled = isAdmin || (!!item.courseKey && licenses?.some((l) => l.content?.courseKey === item.courseKey))

  const [hovered, setHovered] = useState(false)
  const [popoverSide, setPopoverSide] = useState('right')
  const [coords, setCoords] = useState(null)
  const cardRef = useRef(null)
  const enterTimeout = useRef(null)
  const leaveTimeout = useRef(null)

  const pct = item.completed
    ? 100
    : (item.duration > 0 ? Math.min(100, Math.round((item.position / item.duration) * 100)) : 0)

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(enterTimeout.current)
    clearTimeout(leaveTimeout.current)
  }, [])

  const handleMouseEnter = useCallback(() => {
    if (disablePopover) return
    clearTimeout(leaveTimeout.current)
    enterTimeout.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setPopoverSide(window.innerWidth - rect.right < 350 ? 'left' : 'right')
        setCoords(rect)
      }
      setHovered(true)
    }, 320)
  }, [disablePopover])

  const handleMouseLeave = useCallback(() => {
    clearTimeout(enterTimeout.current)
    leaveTimeout.current = setTimeout(() => setHovered(false), 120)
  }, [])

  const handleScroll = useCallback(() => {
    setHovered(false)
  }, [])

  // Hide popover immediately when scrolling parent or viewport
  useEffect(() => {
    if (hovered) {
      window.addEventListener('scroll', handleScroll, true)
      return () => {
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [hovered, handleScroll])

  const handleNavigate = () => navigate(`/app/content/${item.id}`)

  const resourceGradient = {
    video: 'from-blue-600 to-indigo-850',
    pdf: 'from-teal-600 to-green-850',
    '3d': 'from-purple-600 to-indigo-950',
    game: 'from-rose-600 to-pink-850',
  }[item.type] || 'from-slate-600 to-slate-850'

  const isPlayableResource = !item.courseKey && item.type !== 'pdf'

  return (
    <div
      ref={cardRef}
      className={`relative w-64 sm:w-72 shrink-0 transition-[z-index] ${hovered ? 'z-10' : 'z-0'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card */}
      <div
        onClick={handleNavigate}
        className={[
          'group cursor-pointer rounded-2xl border transition-all duration-300 overflow-hidden flex flex-col h-full bg-vigno-card shadow-sm',
          isDark
            ? 'border-vigno-line/50 hover:border-vigno-accent/40'
            : 'bg-white border-vigno-line/70 hover:border-vigno-accent/40',
        ].join(' ')}
      >
        {/* Thumbnail zone */}
        <div className="w-full aspect-video relative flex items-center justify-center overflow-hidden border-b border-vigno-line/20 bg-slate-900">
          {item.thumbnailUrl || item.thumbnail ? (
            <img src={item.thumbnailUrl || item.thumbnail} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${resourceGradient}`} />
          )}

          {/* Darkening overlay for playable resources on hover */}
          {isPlayableResource ? (
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/45 transition-colors duration-300 z-10" />
          ) : (
            <div className="absolute inset-0 bg-black/15 transition-colors" />
          )}

          {/* Icon overlay for playable resources on hover, or static placeholder if no thumbnail */}
          {isPlayableResource ? (
            <span className="select-none filter drop-shadow-lg text-white z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-90 group-hover:scale-100">
              <LessonIcon type={item.type} className="w-12 h-12" />
            </span>
          ) : (
            !(item.thumbnailUrl || item.thumbnail) && (
              <span className="select-none filter drop-shadow-lg text-white z-10">
                <LessonIcon type={item.type} className="w-12 h-12" />
              </span>
            )
          )}

          {pct > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/20 z-20">
              <div className="h-full bg-vigno-accent" style={{ width: `${pct}%` }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-3">
            <h3 className="font-bold text-sm text-vigno-txt line-clamp-2 leading-snug group-hover:text-vigno-accent transition-colors min-h-[2.5rem]">
              {item.title}
            </h3>
            <div className="flex items-center justify-between pt-1">
              {!item.courseKey ? (
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${
                  {
                    video: 'bg-blue-50 text-blue-600 border-blue-200/60 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20',
                    pdf: 'bg-emerald-50 text-emerald-600 border-emerald-200/60 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20',
                    '3d': 'bg-purple-50 text-purple-600 border-purple-200/60 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20',
                    game: 'bg-rose-50 text-rose-600 border-rose-200/60 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                  }[item.type] || 'bg-slate-50 text-slate-600 border-slate-200/60 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20'
                }`}>
                  {TYPE_LABEL[item.type] || item.type}
                </span>
              ) : (
                <span className="text-[10px] text-vigno-muted">{TYPE_LABEL[item.type] || item.type}</span>
              )}
              {disablePopover ? (
                // In continue learning, hide premium/unlocked labels but keep the price/free label if it's a standalone resource
                !item.courseKey && (
                  item.paid ? (
                    <span className="text-xs font-bold text-vigno-txt">₹{item.price}</span>
                  ) : (
                    <span className={`text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Free</span>
                  )
                )
              ) : (
                item.courseKey ? (
                  isEnrolled ? (
                    <span className={`text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Unlocked</span>
                  ) : (
                    <span className="text-[10px] font-bold text-vigno-accent2">Premium</span>
                  )
                ) : item.paid ? (
                  <span className="text-xs font-bold text-vigno-txt">₹{item.price}</span>
                ) : (
                  <span className={`text-[10px] font-semibold ${isDark ? 'text-emerald-400' : 'text-emerald-600'}`}>Free</span>
                )
              )}
            </div>
          </div>
          {pct > 0 && (
            <div className="mt-2">
              <div className={`h-1 rounded-full overflow-hidden ${isDark ? 'bg-vigno-line/50' : 'bg-vigno-line'}`}>
                <div className="h-full bg-vigno-accent rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[9px] text-vigno-muted mt-0.5">
                {`${pct}%`}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popover */}
      {hovered && (
        <UdemyHoverPopover
          title={item.title}
          isCourse={false}
          isPaid={item.paid}
          price={item.price}
          instructor={item.courseKey ? item.courseKey.replace(/_/g, ' ') + ' Instructor' : 'AeroLearn Resource'}
          description={item.description}
          previewText={item.previewText}
          isEnrolled={isEnrolled}
          type={item.type}
          onActionClick={handleNavigate}
          contentId={item.id}
          side={popoverSide}
          coords={coords}
          thumbnail={item.thumbnailUrl || item.thumbnail || ''}
          rating="4.8"
          ratingCount="8,200"
        />
      )}
    </div>
  )
}
