import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useQueries } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { licenseApi } from '../api/licenseApi'
import { paymentsApi } from '../api/paymentsApi'
import { discoverApi } from '../api/discoverApi'
import { fetchClassTree } from '../api/mockApi'
import { useClasses } from '../hooks/useContent'
import Breadcrumb from '../components/Breadcrumb'

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

function LessonIcon({ type, className = "w-5 h-5 text-vigno-accent2" }) {
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

const STATUS = {
  active: 'bg-green-500/20 text-green-300',
  revoked: 'bg-red-500/20 text-red-300',
}

const COURSE_DECOR = {
  PPL_Ground: { gradient: 'from-violet-600 to-indigo-850', icon: AirplaneSvg },
  PPL_Flight: { gradient: 'from-blue-600 to-indigo-850', icon: AirplaneSvg },
  CPL_Ground: { gradient: 'from-amber-600 to-orange-850', icon: CompassSvg },
  CPL_Flight: { gradient: 'from-rose-600 to-pink-850', icon: CompassSvg },
  ATPL_Ground: { gradient: 'from-emerald-600 to-teal-850', icon: JetSvg },
  ATPL_Flight: { gradient: 'from-fuchsia-600 to-purple-850', icon: JetSvg },
  IR_Training: { gradient: 'from-cyan-600 to-blue-850', icon: RadarSvg },
  MCC_Course: { gradient: 'from-sky-600 to-blue-850', icon: UsersSvg },
  CRM_Training: { gradient: 'from-red-600 to-orange-850', icon: ChatSvg },
  Dispatch_Ops: { gradient: 'from-indigo-600 to-violet-850', icon: ClipboardSvg },
  Cabin_Crew: { gradient: 'from-pink-600 to-rose-850', icon: BriefcaseSvg },
  ATC_Basics: { gradient: 'from-teal-600 to-green-850', icon: MicSvg },
}

const COURSE_META = {
  PPL_Ground: { rating: '4.6', reviews: '91,175', price: '659', oldPrice: '4,229' },
  PPL_Flight: { rating: '4.7', reviews: '31,131', price: '659', oldPrice: '4,229' },
  CPL_Ground: { rating: '4.6', reviews: '369', price: '479', oldPrice: '799' },
  CPL_Flight: { rating: '4.6', reviews: '2,070', price: '539', oldPrice: '799' },
  ATPL_Ground: { rating: '4.8', reviews: '124,532', price: '659', oldPrice: '4,229' },
  ATPL_Flight: { rating: '4.7', reviews: '89,410', price: '539', oldPrice: '3,549' },
  IR_Training: { rating: '4.5', reviews: '14,291', price: '479', oldPrice: '799' },
  MCC_Course: { rating: '4.7', reviews: '42,109', price: '659', oldPrice: '4,229' },
  CRM_Training: { rating: '4.6', reviews: '8,419', price: '479', oldPrice: '799' },
  Dispatch_Ops: { rating: '4.4', reviews: '5,182', price: '539', oldPrice: '799' },
  Cabin_Crew: { rating: '4.7', reviews: '3,410', price: '539', oldPrice: '799' },
  ATC_Basics: { rating: '4.9', reviews: '310,299', price: '659', oldPrice: '4,229' },
}

// Standalone-resource cards reuse the exact same visual language as course
// cards (thumbnail gradient + icon, rating row, lifetime badge) for a
// uniform "My Learning" page — just keyed by content type instead of course.
const RESOURCE_DECOR = {
  video: { gradient: 'from-blue-600 to-indigo-850', icon: (props) => <LessonIcon type="video" {...props} /> },
  pdf: { gradient: 'from-teal-600 to-green-850', icon: (props) => <LessonIcon type="pdf" {...props} /> },
  '3d': { gradient: 'from-purple-600 to-indigo-950', icon: (props) => <LessonIcon type="3d" {...props} /> },
  game: { gradient: 'from-rose-600 to-pink-850', icon: (props) => <LessonIcon type="game" {...props} /> },
  default: { gradient: 'from-slate-600 to-slate-850', icon: (props) => <LessonIcon {...props} /> },
}

const RESOURCE_META = {
  video: { rating: '4.7', reviews: '12,480' },
  pdf: { rating: '4.6', reviews: '8,210' },
  '3d': { rating: '4.8', reviews: '3,150' },
  game: { rating: '4.7', reviews: '6,900' },
  default: { rating: '4.6', reviews: '4,000' },
}

function fmt(d) {
  return d ? new Date(d).toLocaleDateString() : '—'
}

export default function Library() {
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const licenses = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  const purchases = useQuery({ queryKey: ['purchases', 'mine'], queryFn: paymentsApi.mine })
  const { data: allCourses, isLoading: coursesLoading } = useClasses()
  const [tab, setTab] = useState('courses')

  // Group active licenses by courseKey, separating standalone resources
  const courseGroups = {}
  const individualResourceLicenses = []
  licenses.data?.forEach((l) => {
    if (l.usable && l.content) {
      const key = l.content.courseKey
      if (!key || key === 'Individual_Resources') {
        individualResourceLicenses.push(l)
      } else {
        if (!courseGroups[key]) {
          courseGroups[key] = []
        }
        courseGroups[key].push(l)
      }
    }
  })

  // Create a map of courses for easy lookup by slug
  const courseMap = {}
  allCourses?.forEach((c) => {
    const slug = typeof c === 'string' ? c : c.slug
    courseMap[slug] = typeof c === 'string' ? {} : c
  })

  const courseKeys = Object.keys(courseGroups)

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      <Breadcrumb trail="My learning" />

      {/* Header Section */}
      <div className="flex items-center gap-4 mb-8 mt-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/10 flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-500/20 backdrop-blur-md">
          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-vigno-txt">My Learning</h1>
          <p className="text-sm font-medium text-vigno-muted mt-1.5">All your purchased courses and study materials in one organized space</p>
        </div>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex gap-2 text-sm font-bold overflow-x-auto p-1.5 rounded-2xl bg-vigno-bg2/40 border border-vigno-line/30 w-max backdrop-blur-md shadow-sm">
        {[
          { key: 'courses', label: 'My purchases' },
          { key: 'licenses', label: 'All Licenses' },
          { key: 'purchases', label: 'Purchase History' },
        ].map((t) => {
          const isActive = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-2.5 rounded-xl transition-all whitespace-nowrap active:scale-95 flex items-center gap-2 ${
                isActive 
                  ? 'bg-white dark:bg-vigno-card text-vigno-accent shadow-sm border border-vigno-line/40 font-black' 
                  : 'text-vigno-muted hover:text-vigno-txt hover:bg-black/5 dark:hover:bg-white/5 border border-transparent font-bold'
              }`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Courses (My Purchases) */}
      {tab === 'courses' && (
        <div className="space-y-6">
          {licenses.isLoading && <p className="text-vigno-muted text-sm py-8 text-center">Loading your courses…</p>}
          {licenses.isError && <p className="text-red-300 text-sm py-8 text-center">Failed to load purchases.</p>}
          
          {!licenses.isLoading && courseKeys.length === 0 && individualResourceLicenses.length === 0 && (
            <div className={`text-center py-20 rounded-2xl border-2 border-dashed ${isDark ? 'border-vigno-line/40 bg-vigno-bg2/30' : 'border-vigno-line/60 bg-white/10'}`}>
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-vigno-accent/10 flex items-center justify-center">
                  <BookSvg className="w-8 h-8 text-vigno-muted" />
                </div>
              </div>
              <p className="text-lg font-extrabold text-vigno-txt mb-2">No courses purchased yet</p>
              <p className="text-sm text-vigno-muted mb-6 max-w-md mx-auto">Start your learning journey by exploring and purchasing premium courses from our extensive catalog.</p>
              <Link to="/app" className="inline-flex items-center justify-center gap-2 text-sm font-extrabold bg-vigno-accent text-vigno-accent-txt rounded-xl px-6 py-3 hover:brightness-110 transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Browse Courses
              </Link>
            </div>
          )}

          {!licenses.isLoading && (courseKeys.length > 0 || individualResourceLicenses.length > 0) && (
            <div className="space-y-8">
              {/* My Courses Section */}
              {courseKeys.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-vigno-txt tracking-tight">My Courses</h2>
                      <p className="text-xs text-vigno-muted font-medium mt-1.5">Continue your learning journey</p>
                    </div>
                    <span className="text-xs font-bold text-vigno-accent/70 bg-vigno-accent/10 px-3 py-1 rounded-full">{courseKeys.length} courses</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {courseKeys.map((key) => {
                      const group = courseGroups[key]
                      const decor = COURSE_DECOR[key] || { gradient: 'from-indigo-600 to-indigo-850', icon: BookSvg }
                      const IconComponent = decor.icon
                      const courseData = courseMap[key] || {}
                      const courseMeta = courseData.meta || {}
                      const courseName = courseData.name || key.replace(/_/g, ' ')
                      const meta = COURSE_META[key] || { rating: '4.5', reviews: '1,204' }
                      const instructorName = courseMeta.instructor || 'AeroLearn Experts'
                      const thumbnail = courseMeta.thumbnail
                      
                      return (
                        <div
                          key={key}
                          className="flex flex-col bg-vigno-card border border-vigno-line/50 rounded-xl overflow-hidden hover:border-vigno-accent/50 hover:shadow-lg transition-all duration-300 group/card"
                        >
                          {/* Thumbnail/Banner with Image Support */}
                          <div className={`w-full aspect-video bg-gradient-to-br ${decor.gradient} relative flex items-center justify-center overflow-hidden border-b border-vigno-line/20 bg-slate-900`}>
                            {thumbnail ? (
                              <img 
                                src={thumbnail} 
                                alt={courseName}
                                className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br opacity-90" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                            )}
                            <div className="absolute inset-0 bg-black/10 group-hover/card:bg-black/5 transition-colors" />
                            {!thumbnail && (
                              <span className="transform group-hover/card:scale-110 transition-transform duration-300 select-none filter drop-shadow-lg text-white z-10">
                                <IconComponent className="w-12 h-12" />
                              </span>
                            )}
                            <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 text-[9px] font-extrabold tracking-wide text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full uppercase">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Lifetime
                            </span>
                          </div>
                          
                          {/* Content */}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            {/* Title & Instructor */}
                            <div className="space-y-1">
                              <h3 className="font-extrabold text-lg text-vigno-txt leading-tight line-clamp-2 group-hover/card:text-vigno-accent transition-colors" title={courseName}>
                                {courseName}
                              </h3>
                              <p className="text-sm text-vigno-muted/90 font-medium truncate">
                                by <span className="text-vigno-accent font-semibold hover:underline cursor-pointer">{instructorName}</span>
                              </p>
                            </div>

                            {/* Rating & Stats */}
                            <div className="flex items-center gap-2 text-sm pt-1">
                              <span className="font-extrabold text-amber-500">{meta.rating}</span>
                              <div className="flex text-amber-400 text-xs gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i}>★</span>
                                ))}
                              </div>
                              <span className="text-vigno-muted text-xs">({meta.reviews})</span>
                            </div>

                            {/* Progress Bar */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-vigno-txt">{group.length} lessons</span>
                                <span className="text-vigno-accent text-xs font-bold tracking-widest uppercase">In Progress</span>
                              </div>
                              <div className="h-2 bg-vigno-line/30 rounded-full overflow-hidden shadow-inner">
                                <div 
                                  className="h-full bg-gradient-to-r from-vigno-accent to-vigno-accent2 transition-all duration-500 rounded-full"
                                  style={{ width: `${Math.min((group.length / 20) * 100, 90)}%` }}
                                />
                              </div>
                            </div>

                            {/* CTA Button */}
                            <div className="pt-2">
                              <Link
                                to={`/app/${key}/learn`}
                                className="block w-full text-center text-sm font-black bg-vigno-accent text-vigno-accent-txt rounded-xl py-3 shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200 active:scale-95"
                              >
                                Resume Learning
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* My Resources Section */}
              {individualResourceLicenses.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <h2 className="text-xl font-extrabold text-vigno-txt tracking-tight pt-2">Study Resources</h2>
                      <p className="text-xs text-vigno-muted font-medium mt-1.5">Standalone learning materials</p>
                    </div>
                    <span className="text-xs font-bold text-vigno-accent2/70 bg-vigno-accent2/10 px-3 py-1 rounded-full">{individualResourceLicenses.length} resources</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {individualResourceLicenses.map((l) => {
                      const item = l.content
                      if (!item) return null
                      const resourceTypeLabel = { pdf: 'PDF', video: 'Video', game: 'Simulator', '3d': '3D Model' }[item.type] || item.type
                      const decor = RESOURCE_DECOR[item.type] || RESOURCE_DECOR.default
                      const IconComponent = decor.icon
                      const meta = RESOURCE_META[item.type] || RESOURCE_META.default

                      return (
                        <div
                          key={l.jti}
                          className="flex flex-col bg-vigno-card border border-vigno-line/50 rounded-xl overflow-hidden hover:border-vigno-accent/50 hover:shadow-lg transition-all duration-300 group/card"
                        >
                          {/* Thumbnail/Banner with Image Support */}
                          <div className={`w-full aspect-video bg-gradient-to-br ${decor.gradient} relative flex items-center justify-center overflow-hidden border-b border-vigno-line/20 bg-slate-900`}>
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt={item.title}
                                className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="absolute inset-0 bg-gradient-to-br opacity-90" style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
                            )}
                            <div className="absolute inset-0 bg-black/10 group-hover/card:bg-black/5 transition-colors" />
                            {!item.thumbnailUrl && (
                              <span className="transform group-hover/card:scale-110 transition-transform duration-300 select-none filter drop-shadow-lg text-white z-10">
                                <IconComponent className="w-12 h-12" />
                              </span>
                            )}
                            <span className="absolute top-2.5 right-2.5 z-10 inline-flex items-center gap-1 text-[9px] font-extrabold tracking-wide text-white bg-black/40 backdrop-blur-sm px-2 py-1 rounded-full uppercase">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Lifetime
                            </span>
                          </div>

                          {/* Content */}
                          <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                            {/* Title & Source */}
                            <div className="space-y-1">
                              <h3 className="font-extrabold text-lg text-vigno-txt leading-tight line-clamp-2 group-hover/card:text-vigno-accent transition-colors" title={item.title}>
                                {item.title}
                              </h3>
                              <p className="text-sm text-vigno-muted/90 font-medium truncate">
                                by <span className="text-vigno-accent font-semibold">AeroLearn Resource</span>
                              </p>
                            </div>

                            {/* Rating & Stats */}
                            <div className="flex items-center gap-2 text-sm pt-1">
                              <span className="font-extrabold text-amber-500">{meta.rating}</span>
                              <div className="flex text-amber-400 text-xs gap-0.5">
                                {[...Array(5)].map((_, i) => (
                                  <span key={i}>★</span>
                                ))}
                              </div>
                              <span className="text-vigno-muted text-xs">({meta.reviews})</span>
                            </div>

                            {/* Status row + full "ready" bar (single standalone item — no multi-lesson progress) */}
                            <div className="space-y-2 pt-1">
                              <div className="flex items-center justify-between text-sm">
                                <span className="font-bold text-vigno-txt">{resourceTypeLabel} Resource</span>
                                <span className="text-vigno-accent text-xs font-bold tracking-widest uppercase">Ready</span>
                              </div>
                              <div className="h-2 bg-vigno-line/30 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full w-full bg-gradient-to-r from-vigno-accent to-vigno-accent2 rounded-full" />
                              </div>
                            </div>

                            {/* CTA Button — straight into the player, not a details/landing page */}
                            <div className="pt-2">
                              <Link
                                to={`/app/content/${item.id}?play=1`}
                                className="block w-full text-center text-sm font-black bg-vigno-accent text-vigno-accent-txt rounded-xl py-3 shadow-md hover:shadow-lg hover:brightness-110 transition-all duration-200 active:scale-95"
                              >
                                Resume Learning
                              </Link>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tab: All Licenses */}
      {tab === 'licenses' && (
        <div className="space-y-6">
          {licenses.isLoading && <p className="text-vigno-muted text-sm py-8 text-center">Loading licenses…</p>}
          {licenses.isError && <p className="text-red-300 text-sm py-8 text-center">Failed to load licenses.</p>}
          {!licenses.isLoading && licenses.data?.length === 0 && (
            <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${isDark ? 'border-vigno-line/40 bg-vigno-bg2/30' : 'border-vigno-line/60 bg-white/10'}`}>
              <p className="text-vigno-muted text-sm font-medium">No active licenses at the moment</p>
            </div>
          )}

          {licenses.data && licenses.data.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {licenses.data.map((l) => (
                <div key={l.jti} className="bg-vigno-card border border-vigno-line/50 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:border-vigno-accent/40 transition-all">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-vigno-accent2">
                      <LessonIcon type={l.content?.type} className="w-5 h-5" />
                    </div>
                    <span className={'text-[9px] font-bold px-2.5 py-1 rounded-full ' + (STATUS[l.status] || 'bg-white/10')}>
                      {l.status.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-xs text-vigno-txt truncate">{l.content?.title || 'Content'}</div>
                    <p className="text-[10px] text-vigno-muted mt-1 capitalize flex items-center gap-1">
                      <span>{l.type}</span>
                      <span>·</span>
                      {l.status === 'revoked' ? (
                        <span>revoked {fmt(l.revokedAt || l.expiresAt)}</span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-vigno-accent2 font-bold normal-case">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Lifetime access
                        </span>
                      )}
                    </p>
                  </div>
                  <div>
                    {l.usable && l.content ? (
                      <Link to={`/app/content/${l.content.id}`}
                        className="inline-flex items-center justify-center gap-1.5 text-[11px] font-bold bg-vigno-accent/20 text-vigno-accent hover:bg-vigno-accent/30 border border-vigno-line/60 rounded-lg px-2.5 py-1.5 transition-all w-full">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                        Open
                      </Link>
                    ) : (
                      <span className="text-xs text-vigno-muted font-medium block text-center py-1.5">Access revoked</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Purchase History */}
      {tab === 'purchases' && (
        <div className="space-y-6">
          {purchases.isLoading && <p className="text-vigno-muted text-sm py-8 text-center">Loading purchase history…</p>}
          {purchases.isError && <p className="text-red-300 text-sm py-8 text-center">Failed to load purchases.</p>}
          {!purchases.isLoading && purchases.data?.length === 0 && (
            <div className={`text-center py-12 rounded-2xl border-2 border-dashed ${isDark ? 'border-vigno-line/40 bg-vigno-bg2/30' : 'border-vigno-line/60 bg-white/10'}`}>
              <p className="text-vigno-muted text-sm font-medium">No purchase history yet</p>
            </div>
          )}

          {!purchases.isLoading && purchases.data?.length > 0 && (
            <div className="bg-vigno-card border border-vigno-line/50 rounded-2xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-vigno-bg2/50 text-vigno-muted text-xs border-b border-vigno-line/40">
                    <tr>
                      <th className="text-left px-6 py-4 font-extrabold">Course / Resource</th>
                      <th className="text-left px-6 py-4 font-extrabold">Amount</th>
                      <th className="text-left px-6 py-4 font-extrabold">Status</th>
                      <th className="text-left px-6 py-4 font-extrabold">Date</th>
                      <th className="text-right px-6 py-4 font-extrabold">Receipt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchases.data.map((p) => (
                      <tr key={p._id} className="border-t border-vigno-line/20 hover:bg-vigno-bg2/30 transition-colors">
                        <td className="px-6 py-4 text-vigno-txt font-medium">{p.contentId?.title || '—'}</td>
                        <td className="px-6 py-4 text-vigno-txt font-semibold">
                          ₹{p.amount}
                          {p.discount > 0 && <span className="text-green-400 text-xs ml-2 font-bold">(Saved ₹{p.discount})</span>}
                        </td>
                        <td className="px-6 py-4">
                          <span className={'text-[9px] font-extrabold px-3 py-1.5 rounded-full ' +
                            (p.status === 'paid' ? 'bg-green-500/20 text-green-300'
                              : p.status === 'refunded' ? 'bg-red-500/20 text-red-300'
                              : 'bg-vigno-accent/20 text-vigno-accent')}>
                            {p.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-vigno-muted text-sm">{fmt(p.paidAt || p.createdAt)}</td>
                        <td className="px-6 py-4 text-right">
                          {['paid', 'refunded'].includes(p.status) && (
                            <button onClick={() => paymentsApi.downloadInvoice(p._id)} className="text-xs text-vigno-accent2 hover:text-vigno-accent2/80 font-extrabold transition-colors flex items-center gap-1.5 ml-auto">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3v-9" />
                              </svg>
                              PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
