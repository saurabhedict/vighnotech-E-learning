import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { licenseApi } from '../api/licenseApi'
import UdemyHoverPopover from './UdemyHoverPopover'

function AirplaneSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
    </svg>
  )
}

function CompassSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1.5M12 19.5V21M3 12h1.5M19.5 12H21m-3.343-5.657l-1.06 1.06m-10.192 10.192l-1.06 1.06m12.314 0l-1.06-1.06M6.343 6.343l-1.06 1.06M12 6a6 6 0 100 12 6 6 0 000-12z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M14.25 9.75L12 12l-2.25 2.25M12 12l2.25 2.25M12 12l-2.25-2.25" />
    </svg>
  )
}

function JetSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.64 8.41a12 12 0 00-5.87 8.52l-.37 1.95 2.1-.85a12 12 0 005.88-8.52z" />
    </svg>
  )
}

function RadarSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9a3 3 0 100 6 3 3 0 000-6z" />
    </svg>
  )
}

function UsersSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.109A11.386 11.386 0 0110.089 20M3 11.625a3 3 0 116 0m0 0a3 3 0 11-6 0m6 0H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125H9.75M8.25 21h8.25" />
    </svg>
  )
}

function ChatSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.084.29.125.597.125.911 0 3.824-2.98 7-6.75 7-1.442 0-2.782-.44-3.905-1.196L5.5 17.5l1.246-3.805C5.98 12.56 5.25 11.11 5.25 9.5c0-3.824 2.98-7 6.75-7 3.513 0 6.398 2.748 6.705 6.222z" />
    </svg>
  )
}

function ClipboardSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  )
}

function BriefcaseSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 .621-.504 1.12-1.125 1.12H4.875c-.621 0-1.125-.5-1.125-1.12v-4.25m16.5 0a2.25 2.25 0 00-2.25-2.25H4.875a2.25 2.25 0 00-2.25 2.25m16.5 0V9A2.25 2.25 0 0018 6.75h-3A2.25 2.25 0 0012.75 4.5h-1.5a2.25 2.25 0 00-2.25 2.25h-3A2.25 2.25 0 003 9v5.15" />
    </svg>
  )
}

function MicSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
    </svg>
  )
}

function BookSvg({ className = "w-12 h-12 text-white/90" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

const COURSE_META = {
  PPL_Ground: { rating: '4.6', reviews: '91,175', price: '659', oldPrice: '4,229', gradient: 'from-violet-600 to-indigo-850', icon: AirplaneSvg },
  PPL_Flight: { rating: '4.7', reviews: '31,131', price: '659', oldPrice: '4,229', gradient: 'from-blue-600 to-indigo-850', icon: AirplaneSvg },
  CPL_Ground: { rating: '4.6', reviews: '369', price: '479', oldPrice: '799', gradient: 'from-amber-600 to-orange-850', icon: CompassSvg },
  CPL_Flight: { rating: '4.6', reviews: '2,070', price: '539', oldPrice: '799', gradient: 'from-rose-600 to-pink-850', icon: CompassSvg },
  ATPL_Ground: { rating: '4.8', reviews: '124,532', price: '659', oldPrice: '4,229', gradient: 'from-emerald-600 to-teal-850', icon: JetSvg },
  ATPL_Flight: { rating: '4.7', reviews: '89,410', price: '539', oldPrice: '3,549', gradient: 'from-fuchsia-600 to-purple-850', icon: JetSvg },
  IR_Training: { rating: '4.5', reviews: '14,291', price: '479', oldPrice: '799', gradient: 'from-cyan-600 to-blue-850', icon: RadarSvg },
  MCC_Course: { rating: '4.7', reviews: '42,109', price: '659', oldPrice: '4,229', gradient: 'from-sky-600 to-blue-850', icon: UsersSvg },
  CRM_Training: { rating: '4.6', reviews: '8,419', price: '479', oldPrice: '799', gradient: 'from-red-600 to-orange-850', icon: ChatSvg },
  Dispatch_Ops: { rating: '4.4', reviews: '5,182', price: '539', oldPrice: '799', gradient: 'from-indigo-600 to-violet-850', icon: ClipboardSvg },
  Cabin_Crew: { rating: '4.7', reviews: '3,410', price: '539', oldPrice: '799', gradient: 'from-pink-600 to-rose-850', icon: BriefcaseSvg },
  ATC_Basics: { rating: '4.9', reviews: '310,299', price: '659', oldPrice: '4,229', gradient: 'from-teal-600 to-green-850', icon: MicSvg },
}

export default function CourseCard({ course }) {
  const navigate = useNavigate()
  const theme = useSelector((s) => s.ui.theme)
  const isAdmin = useSelector((s) => s.auth.user?.role) === 'admin'
  const isDark = theme === 'dark'

  const courseSlug = typeof course === 'string' ? course : course.slug
  const courseName = typeof course === 'string' ? course.replace(/_/g, ' ') : course.name
  const hasMeta = course && typeof course === 'object' && course.meta

  const meta = COURSE_META[courseSlug] || {
    rating: '4.5',
    reviews: '1,204',
    price: '499',
    oldPrice: '999',
    gradient: 'from-indigo-600 to-indigo-850',
    icon: BookSvg,
  }

  const dynamicInstructor = hasMeta && course.meta.instructor ? course.meta.instructor : 'AeroLearn Expert'
  const dynamicPrice = hasMeta && course.meta.price ? course.meta.price : meta.price
  // Only use explicitly admin-set tags — no auto-derived fallbacks
  const dynamicTags = hasMeta && Array.isArray(course.meta.tags) && course.meta.tags.length > 0
    ? course.meta.tags
    : (hasMeta && typeof course.meta.tags === 'string' && course.meta.tags
      ? course.meta.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [])

  const IconComponent = meta.icon

  const { data: licenses } = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  // Admins buy like normal users (no auto-unlock) → purchased courses land in My Learning.
  const isEnrolled = licenses?.some((l) => l.usable && l.content?.courseKey === courseSlug)

  const [hovered, setHovered] = useState(false)
  const [popoverSide, setPopoverSide] = useState('right')
  const [coords, setCoords] = useState(null)
  const cardRef = useRef(null)
  const enterTimeout = useRef(null)
  const leaveTimeout = useRef(null)

  // Cleanup on unmount
  useEffect(() => () => {
    clearTimeout(enterTimeout.current)
    clearTimeout(leaveTimeout.current)
  }, [])

  const handleMouseEnter = useCallback(() => {
    clearTimeout(leaveTimeout.current)
    enterTimeout.current = setTimeout(() => {
      if (cardRef.current) {
        const rect = cardRef.current.getBoundingClientRect()
        setPopoverSide(window.innerWidth - rect.right < 350 ? 'left' : 'right')
        setCoords(rect)
      }
      setHovered(true)
    }, 320)
  }, [])

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

  const handleNavigate = () => navigate(`/app/${courseSlug}`)

  return (
    <div
      ref={cardRef}
      className={`relative w-64 sm:w-72 shrink-0 transition-[z-index] ${hovered ? 'z-10' : 'z-0'}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Card Body */}
      <Link
        to={`/app/${courseSlug}`}
        className={[
          'group flex flex-col w-full h-full rounded-2xl overflow-hidden hover:border-vigno-accent/40 transition-all duration-300 shadow-sm border bg-vigno-card',
          isDark
            ? 'border-vigno-line/50 hover:border-vigno-accent/40'
            : 'bg-white border-vigno-line/70 hover:border-vigno-accent/40',
        ].join(' ')}
      >
        {/* Course Graphic / Banner */}
        <div className="w-full aspect-video relative flex items-center justify-center overflow-hidden border-b border-vigno-line/20 bg-slate-900">
          {course.meta?.thumbnail ? (
            <img src={course.meta.thumbnail} alt={courseName} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300" />
          ) : (
            <div className={`absolute inset-0 bg-gradient-to-br ${meta.gradient}`} />
          )}
          <div className="absolute inset-0 bg-black/15 transition-colors" />
          {!course.meta?.thumbnail && (
            <span className="select-none filter drop-shadow-lg text-white z-10">
              <IconComponent className="w-12 h-12" />
            </span>
          )}
        </div>

        {/* Course Info */}
        <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
          <div className="space-y-1">
            <h3 className="font-bold text-sm text-vigno-txt leading-snug line-clamp-2 group-hover:text-vigno-accent transition-colors" title={courseName}>
              {courseName}
            </h3>
            <p className="text-xs text-vigno-muted font-medium truncate">
              {dynamicInstructor}
            </p>
          </div>

          <div className="space-y-2">
            {/* Rating */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="font-extrabold text-amber-500">{meta.rating}</span>
              <div className="flex text-amber-400 text-[10px]">
                ★ ★ ★ ★ ★
              </div>
              <span className="text-vigno-muted">({meta.reviews})</span>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-extrabold text-vigno-txt">₹{dynamicPrice}</span>
              <span className="line-through text-[11px] text-vigno-muted">₹{meta.oldPrice}</span>
            </div>
          </div>
        </div>
      </Link>

      {/* Udemy-style Popover */}
      {hovered && (
        <UdemyHoverPopover
          title={courseName}
          isCourse={true}
          isPaid={true}
          price={dynamicPrice}
          oldPrice={meta.oldPrice}
          instructor={dynamicInstructor}
          description={course.meta?.description}
          learningOutcomes={course.meta?.learningOutcomes}
          isEnrolled={isEnrolled}
          onActionClick={handleNavigate}
          contentId={courseSlug}
          favoriteId={course._id}
          side={popoverSide}
          coords={coords}
          thumbnail={course.meta?.thumbnail || ''}
          rating={meta.rating}
          ratingCount={meta.reviews}
          tags={dynamicTags}
        />
      )}
    </div>
  )
}
