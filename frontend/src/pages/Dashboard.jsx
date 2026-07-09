import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { useClasses } from '../hooks/useContent'
import { discoverApi } from '../api/discoverApi'
import ContentCard from '../components/ContentCard'
import CourseCard from '../components/CourseCard'
import { licenseApi } from '../api/licenseApi'



// ── SVG Icons (Formal / Clean) ────────────────────────────────────────────────
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
  PPL_Ground: {
    rating: '4.6',
    reviews: '91,175',
    price: '659',
    oldPrice: '4,229',
    gradient: 'from-violet-600 to-indigo-850',
    icon: AirplaneSvg,
  },
  PPL_Flight: {
    rating: '4.7',
    reviews: '31,131',
    price: '659',
    oldPrice: '4,229',
    gradient: 'from-blue-600 to-indigo-850',
    icon: AirplaneSvg,
  },
  CPL_Ground: {
    rating: '4.6',
    reviews: '369',
    price: '479',
    oldPrice: '799',
    gradient: 'from-amber-600 to-orange-850',
    icon: CompassSvg,
  },
  CPL_Flight: {
    rating: '4.6',
    reviews: '2,070',
    price: '539',
    oldPrice: '799',
    gradient: 'from-rose-600 to-pink-850',
    icon: CompassSvg,
  },
  ATPL_Ground: {
    rating: '4.8',
    reviews: '124,532',
    price: '659',
    oldPrice: '4,229',
    gradient: 'from-emerald-600 to-teal-850',
    icon: JetSvg,
  },
  ATPL_Flight: {
    rating: '4.7',
    reviews: '89,410',
    price: '539',
    oldPrice: '3,549',
    gradient: 'from-fuchsia-600 to-purple-850',
    icon: JetSvg,
  },
  IR_Training: {
    rating: '4.5',
    reviews: '14,291',
    price: '479',
    oldPrice: '799',
    gradient: 'from-cyan-600 to-blue-850',
    icon: RadarSvg,
  },
  MCC_Course: {
    rating: '4.7',
    reviews: '42,109',
    price: '659',
    oldPrice: '4,229',
    gradient: 'from-sky-600 to-blue-850',
    icon: UsersSvg,
  },
  CRM_Training: {
    rating: '4.6',
    reviews: '8,419',
    price: '479',
    oldPrice: '799',
    gradient: 'from-red-600 to-orange-850',
    icon: ChatSvg,
  },
  Dispatch_Ops: {
    rating: '4.4',
    reviews: '5,182',
    price: '539',
    oldPrice: '799',
    gradient: 'from-indigo-600 to-violet-850',
    icon: ClipboardSvg,
  },
  Cabin_Crew: {
    rating: '4.7',
    reviews: '3,410',
    price: '539',
    oldPrice: '799',
    gradient: 'from-pink-600 to-rose-850',
    icon: BriefcaseSvg,
  },
  ATC_Basics: {
    rating: '4.9',
    reviews: '310,299',
    price: '659',
    oldPrice: '4,229',
    gradient: 'from-teal-600 to-green-850',
    icon: MicSvg,
  },
}

function TagFilterDropdown({ allTags, tagCounts, selectedTags, setSelectedTags, toggleTag, isDark, availableCourses }) {
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef(null)

  useEffect(() => {
    if (!filterOpen) return
    const handler = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [filterOpen])

  if (allTags.length === 0) return null

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Filter trigger button */}
      <div ref={filterRef} className="relative">
        <button
          onClick={() => setFilterOpen(v => !v)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border transition-all duration-200 active:scale-95 ${
            selectedTags.size > 0
              ? isDark
                ? 'bg-vigno-accent/15 text-vigno-accent border-vigno-accent/40'
                : 'bg-vigno-accent/10 text-vigno-accent border-vigno-accent/30'
              : isDark
              ? 'bg-vigno-bg2/60 text-vigno-txt border-vigno-line/50 hover:border-vigno-accent/40'
              : 'bg-white text-slate-700 border-slate-200 hover:border-vigno-accent/40 shadow-sm'
          }`}
        >
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h18M7 9.5h10M11 14.5h2" />
          </svg>
          Filter by Tags
          {selectedTags.size > 0 && (
            <span className="flex items-center justify-center w-5 h-5 rounded-full bg-vigno-accent text-vigno-accent-txt text-[10px] font-black">
              {selectedTags.size}
            </span>
          )}
          <svg className={`w-3.5 h-3.5 flex-shrink-0 transition-transform duration-200 ${filterOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
          </svg>
        </button>

        {/* Dropdown panel */}
        {filterOpen && (
          <div className={`absolute top-full left-0 mt-2 z-30 w-64 rounded-2xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-vigno-card border-vigno-line/60' : 'bg-white border-slate-200/80'
          }`}>
            {/* Header */}
            <div className={`flex items-center justify-between px-4 py-3 border-b ${isDark ? 'border-vigno-line/40' : 'border-slate-100'}`}>
              <span className="text-xs font-black uppercase tracking-widest text-vigno-muted">Filter Courses</span>
              {selectedTags.size > 0 && (
                <button
                  onClick={() => setSelectedTags(new Set())}
                  className="text-[11px] font-bold text-vigno-accent hover:underline"
                >
                  Clear all
                </button>
              )}
            </div>

            {/* Tag list */}
            <div className="max-h-64 overflow-y-auto py-2">
              {allTags.map((tag) => {
                const active = selectedTags.has(tag)
                const count = tagCounts[tag] || 0
                return (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors duration-150 text-left ${
                      active
                        ? isDark ? 'bg-vigno-accent/12 text-vigno-accent' : 'bg-vigno-accent/8 text-vigno-accent'
                        : isDark ? 'text-vigno-txt hover:bg-white/5' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={`w-4 h-4 rounded flex-shrink-0 flex items-center justify-center border transition-all duration-150 ${
                        active
                          ? 'bg-vigno-accent border-vigno-accent'
                          : isDark ? 'border-vigno-line/60 bg-transparent' : 'border-slate-300 bg-white'
                      }`}>
                        {active && (
                          <svg className="w-2.5 h-2.5 text-vigno-accent-txt" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l5 5L19.5 6.25" />
                          </svg>
                        )}
                      </span>
                      <span className="font-semibold">{tag}</span>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      active
                        ? 'bg-vigno-accent/20 text-vigno-accent'
                        : isDark ? 'bg-vigno-line/40 text-vigno-muted' : 'bg-slate-100 text-slate-400'
                    }`}>
                      {count}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Footer */}
            <div className={`px-4 py-3 border-t ${isDark ? 'border-vigno-line/40' : 'border-slate-100'}`}>
              <button
                onClick={() => setFilterOpen(false)}
                className="w-full py-2 rounded-xl bg-vigno-accent hover:brightness-110 text-vigno-accent-txt text-xs font-black transition-all"
              >
                Apply{selectedTags.size > 0 ? ` (${selectedTags.size} selected)` : ''}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Active tag chips summary — shown next to the button */}
      {selectedTags.size > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap">
          {[...selectedTags].map(tag => (
            <span
              key={tag}
              className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                isDark
                  ? 'bg-vigno-accent/10 text-vigno-accent border-vigno-accent/25'
                  : 'bg-vigno-accent/8 text-vigno-accent border-vigno-accent/20'
              }`}
            >
              {tag}
              <button
                onClick={() => toggleTag(tag)}
                className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${tag} filter`}
              >
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="3">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function Carousel({ children }) {
  const containerRef = useRef(null)
  const [showLeft, setShowLeft] = useState(false)
  const [showRight, setShowRight] = useState(false)

  const checkScroll = () => {
    const el = containerRef.current
    if (!el) return
    setShowLeft(el.scrollLeft > 2)
    setShowRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 2)
  }

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const t = setTimeout(checkScroll, 100)
    el.addEventListener('scroll', checkScroll)
    window.addEventListener('resize', checkScroll)
    return () => {
      clearTimeout(t)
      el.removeEventListener('scroll', checkScroll)
      window.removeEventListener('resize', checkScroll)
    }
  }, [children])

  const scroll = (direction) => {
    const el = containerRef.current
    if (!el) return
    const scrollAmount = el.clientWidth * 0.75
    el.scrollBy({
      left: direction === 'left' ? -scrollAmount : scrollAmount,
      behavior: 'smooth'
    })
  }

  return (
    <div className="relative group/carousel">
      {/* Left button */}
      {showLeft && (
        <button
          onClick={() => scroll('left')}
          className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-white text-slate-800 border border-slate-200 shadow-xl hover:scale-105 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all duration-200"
          aria-label="Scroll left"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
      )}

      {/* Scrollable area */}
      <div
        ref={containerRef}
        className="flex gap-6 overflow-x-auto pb-4 pt-1 -mx-4 px-4 scrollbar-none scroll-smooth"
      >
        {children}
      </div>

      {/* Right button */}
      {showRight && (
        <button
          onClick={() => scroll('right')}
          className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full flex items-center justify-center bg-white text-slate-800 border border-slate-200 shadow-xl hover:scale-105 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all duration-200"
          aria-label="Scroll right"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default function Dashboard() {
  const user = useSelector((s) => s.auth.user)
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const { data: courses, isLoading, isError } = useClasses()
  const [selectedTags, setSelectedTags] = useState(new Set())

  const { data: progressItems, isLoading: isProgressLoading } = useQuery({
    queryKey: ['progress', 'mine', { limit: 4 }],
    queryFn: () => discoverApi.myProgress(10).then(items => (items || []).filter(it => !it.completed).slice(0, 4)),
  })

  const { data: standaloneResources, isLoading: isResourcesLoading } = useQuery({
    queryKey: ['resources', 'standalone'],
    queryFn: () => discoverApi.standaloneResources(),
  })

  const { data: licenses, isLoading: isLicensesLoading } = useQuery({
    queryKey: ['licenses', 'mine'],
    queryFn: licenseApi.mine,
  })

  // Get purchased courseKeys to filter from recommendations
  const purchasedCourseKeys = new Set(
    licenses?.filter((l) => l.usable && l.content?.courseKey).map((l) => l.content.courseKey) || []
  )

  // Get purchased resource IDs to filter from resources
  const purchasedResourceIds = new Set(
    licenses?.filter((l) => l.status !== 'revoked' && l.content?.id).map((l) => l.content.id) || []
  )

  // Filter out already purchased courses
  const availableCourses = courses?.filter((course) => {
    const courseSlug = typeof course === 'string' ? course : course.slug
    return !purchasedCourseKeys.has(courseSlug)
  }) || []

  // Derive all unique admin-set tags from ALL courses (not just available)
  // so learners see the full tag list even if they've bought some courses
  const allTags = useMemo(() => {
    const tagSet = new Set()
    ;(courses || []).forEach((course) => {
      if (course && typeof course === 'object' && course.meta) {
        const tags = Array.isArray(course.meta.tags)
          ? course.meta.tags
          : typeof course.meta.tags === 'string' && course.meta.tags
          ? course.meta.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []
        tags.forEach(t => t && tagSet.add(t))
      }
    })
    return [...tagSet].sort()
  }, [courses])

  // Count against availableCourses (not-yet-purchased) for the badge numbers
  const tagCounts = useMemo(() => {
    const counts = {}
    availableCourses.forEach((course) => {
      if (course && typeof course === 'object' && course.meta) {
        const tags = Array.isArray(course.meta.tags)
          ? course.meta.tags
          : typeof course.meta.tags === 'string' && course.meta.tags
          ? course.meta.tags.split(',').map(t => t.trim()).filter(Boolean)
          : []
        tags.forEach(t => { if (t) counts[t] = (counts[t] || 0) + 1 })
      }
    })
    return counts
  }, [availableCourses])

  // Apply tag filtering — show courses matching ANY selected tag
  const filteredCourses = useMemo(() => {
    if (selectedTags.size === 0) return availableCourses
    return availableCourses.filter((course) => {
      if (!course || typeof course !== 'object' || !course.meta) return false
      const tags = Array.isArray(course.meta.tags)
        ? course.meta.tags
        : typeof course.meta.tags === 'string' && course.meta.tags
        ? course.meta.tags.split(',').map(t => t.trim()).filter(Boolean)
        : []
      return tags.some(t => selectedTags.has(t))
    })
  }, [availableCourses, selectedTags])

  const toggleTag = (tag) => {
    setSelectedTags(prev => {
      const next = new Set(prev)
      if (next.has(tag)) next.delete(tag)
      else next.add(tag)
      return next
    })
  }

  const filteredResources = standaloneResources?.filter(
    (item) => !purchasedResourceIds.has(item.id)
  )

  const showResourcesLoading = isResourcesLoading || isLicensesLoading

  return (
    <div className="space-y-8">


      {/* Welcome Banner */}
      <div className={`flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border ${isDark ? 'bg-gradient-to-r from-vigno-accent/15 via-vigno-bg2/40 to-transparent border-vigno-line/40' : 'bg-gradient-to-r from-vigno-accent/10 via-white/80 to-transparent border-vigno-line/60 shadow-sm'}`}>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-vigno-accent/20 flex items-center justify-center text-3xl font-black text-vigno-accent shadow-inner border border-vigno-accent/30">
            {user?.name ? user.name.slice(0, 2).toUpperCase() : 'DG'}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-vigno-txt leading-tight tracking-tight">
              Welcome, {user?.name || 'Dhruv Gupta'}
            </h1>
          </div>
        </div>
      </div>

      {/* Courses List Section */}
      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-extrabold text-vigno-txt tracking-tight">What to learn next</h2>
          <p className="text-sm text-vigno-muted font-medium mt-1">Recommended for you</p>
        </div>

        {/* Tag Filter Dropdown — only shown when admin has set tags on courses */}
        {!isLoading && allTags.length > 0 && (
          <TagFilterDropdown
            allTags={allTags}
            tagCounts={tagCounts}
            selectedTags={selectedTags}
            setSelectedTags={setSelectedTags}
            toggleTag={toggleTag}
            isDark={isDark}
            availableCourses={availableCourses}
          />
        )}

        {/* No results state */}
        {!isLoading && selectedTags.size > 0 && filteredCourses.length === 0 && (
          <div className={`py-10 text-center rounded-2xl border-2 border-dashed ${
            isDark ? 'border-vigno-line/30 bg-vigno-bg2/20' : 'border-slate-200 bg-slate-50/50'
          }`}>
            <p className="text-vigno-muted text-sm font-medium">No courses match the selected tags.</p>
            <button
              onClick={() => setSelectedTags(new Set())}
              className="mt-3 text-xs font-bold text-vigno-accent hover:underline"
            >
              Clear filter
            </button>
          </div>
        )}

        {isLoading && (
          <div className="flex gap-6 overflow-x-auto pb-4 pt-1 -mx-4 px-4 scrollbar-none">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="w-64 sm:w-72 h-72 shrink-0 rounded-2xl bg-vigno-card border border-vigno-line/40 animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="py-8 text-center">
            <p className="text-sm text-red-300">Failed to load courses. Please refresh the page.</p>
          </div>
        )}

        {!isLoading && courses && filteredCourses.length > 0 && (
          <Carousel>
            {filteredCourses.map((course) => {
              const courseSlug = typeof course === 'string' ? course : course.slug
              return <CourseCard key={courseSlug} course={course} />
            })}
          </Carousel>
        )}
      </section>

      {/* Learn Trending Topics Section */}
      {(showResourcesLoading || (filteredResources && filteredResources.length > 0)) && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-extrabold text-vigno-txt tracking-tight">Learn Trending Topics</h2>
            <p className="text-sm text-vigno-muted font-medium mt-1">Choose among independent topics</p>
          </div>

          {showResourcesLoading && (
            <div className="flex gap-6 overflow-x-auto pb-4 pt-1 -mx-4 px-4 scrollbar-none">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="w-64 sm:w-72 h-72 shrink-0 rounded-2xl bg-vigno-card border border-vigno-line/40 animate-pulse" />
              ))}
            </div>
          )}

          {!showResourcesLoading && filteredResources && (
            <Carousel>
              {filteredResources.map((item) => (
                <ContentCard key={item.id} item={item} />
              ))}
            </Carousel>
          )}
        </section>
      )}

      {/* Continue Watching Section */}
      {progressItems && progressItems.length > 0 && (
        <section className="space-y-4">
          <div>
            <h2 className="text-2xl font-extrabold text-vigno-txt tracking-tight">Continue learning</h2>
            <p className="text-sm text-vigno-muted font-medium mt-1">Pick up where you left off</p>
          </div>

          <Carousel>
            {progressItems.map((item) => (
              <ContentCard key={item.id} item={item} disablePopover={true} />
            ))}
          </Carousel>
        </section>
      )}
    </div>
  )
}
