import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { licenseApi } from '../api/licenseApi'
import { paymentsApi } from '../api/paymentsApi'
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
  expired: 'bg-yellow-500/20 text-yellow-200',
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

function fmt(d) {
  return d ? new Date(d).toLocaleDateString() : '—'
}

export default function Library() {
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const licenses = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  const purchases = useQuery({ queryKey: ['purchases', 'mine'], queryFn: paymentsApi.mine })
  const [tab, setTab] = useState('courses') // 'courses' | 'licenses' | 'purchases'

  // Group active licenses by courseKey, separating standalone resources
  const courseGroups = {}
  const individualResourceLicenses = []
  licenses.data?.forEach((l) => {
    if (l.usable && l.content?.courseKey) {
      const key = l.content.courseKey
      if (key === 'Individual_Resources') {
        individualResourceLicenses.push(l)
      } else {
        if (!courseGroups[key]) {
          courseGroups[key] = []
        }
        courseGroups[key].push(l)
      }
    }
  })

  const courseKeys = Object.keys(courseGroups)

  return (
    <div className="space-y-6">
      <Breadcrumb trail="My learning" />

      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-extrabold text-vigno-txt tracking-tight">My learning</h1>
        <p className="text-xs text-vigno-muted font-medium">All your enrolled and purchased courses in one place.</p>
      </div>

      {/* Sub-tab navigation */}
      <div className="flex border-b border-vigno-line/30 gap-6 text-sm font-bold">
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
              className={`pb-3 border-b-2 transition-all ${isActive ? 'border-vigno-accent text-vigno-accent' : 'border-transparent text-vigno-muted hover:text-vigno-txt'}`}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Tab: Courses (My Purchases) */}
      {tab === 'courses' && (
        <div className="space-y-6">
          {licenses.isLoading && <p className="text-vigno-muted text-sm">Loading purchases…</p>}
          {licenses.isError && <p className="text-red-300 text-sm">Failed to load purchases.</p>}
          
          {!licenses.isLoading && courseKeys.length === 0 && individualResourceLicenses.length === 0 && (
            <div className={`text-center py-16 rounded-2xl border ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/60 bg-white/20'}`}>
              <div className="flex justify-center mb-3">
                <BookSvg className="w-12 h-12 text-vigno-muted" />
              </div>
              <p className="text-sm font-semibold text-vigno-txt">No purchases yet</p>
              <p className="text-xs text-vigno-muted mt-1 max-w-sm mx-auto">Purchase premium courses or standalone topics from the catalog to see them here.</p>
              <Link to="/app" className="inline-block mt-4 text-xs font-bold bg-vigno-accent text-vigno-accent-txt rounded-lg px-4 py-2 hover:brightness-110">
                Browse catalog
              </Link>
            </div>
          )}

          {!licenses.isLoading && (courseKeys.length > 0 || individualResourceLicenses.length > 0) && (
            <div className="space-y-8">
              {/* My Courses Section */}
              {courseKeys.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold text-vigno-txt tracking-tight">My Courses</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {courseKeys.map((key) => {
                      const group = courseGroups[key]
                      const decor = COURSE_DECOR[key] || { gradient: 'from-indigo-600 to-indigo-850', icon: BookSvg }
                      const IconComponent = decor.icon
                      return (
                        <div
                          key={key}
                          className="flex flex-col bg-vigno-card border border-vigno-line/50 rounded-2xl overflow-hidden hover:border-vigno-accent/40 hover:-translate-y-0.5 transition-all duration-200 group"
                        >
                          <div className={`w-full aspect-video bg-gradient-to-br ${decor.gradient} relative flex items-center justify-center overflow-hidden border-b border-vigno-line/20`}>
                            <div className="absolute inset-0 bg-black/10" />
                            <span className="transform group-hover:scale-105 transition-transform duration-300 select-none filter drop-shadow-lg text-white">
                              <IconComponent className="w-12 h-12" />
                            </span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                            <div>
                              <h3 className="font-bold text-sm text-vigno-txt leading-snug truncate">
                                {key.replace(/_/g, ' ')}
                              </h3>
                              <p className="text-xs text-vigno-muted mt-1 font-medium">
                                {group.length} lesson{group.length !== 1 ? 's' : ''} unlocked
                              </p>
                            </div>
                            <Link
                              to={`/app/${key}`}
                              className="w-full text-center text-xs font-extrabold bg-vigno-accent text-vigno-accent-txt rounded-xl py-2.5 hover:brightness-110 transition-all"
                            >
                              Resume learning
                            </Link>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* My Resources Section */}
              {individualResourceLicenses.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-extrabold text-vigno-txt tracking-tight pt-2">My Resources</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    {individualResourceLicenses.map((l) => {
                      const item = l.content
                      if (!item) return null
                      const resourceTypeLabel = { pdf: 'PDF', video: 'Video', game: 'Simulator', '3d': '3D Model' }[item.type] || item.type
                      const resourceGradient = {
                        video: 'from-blue-600 to-indigo-850',
                        pdf: 'from-teal-600 to-green-850',
                        '3d': 'from-purple-600 to-indigo-950',
                        game: 'from-rose-600 to-pink-850',
                      }[item.type] || 'from-slate-600 to-slate-850'

                      return (
                        <div
                          key={l.jti}
                          className="flex flex-col bg-vigno-card border border-vigno-line/50 rounded-2xl overflow-hidden hover:border-vigno-accent/40 hover:-translate-y-0.5 transition-all duration-200 group"
                        >
                          {/* Graphic / Banner */}
                          <div className="w-full aspect-video relative flex items-center justify-center overflow-hidden border-b border-vigno-line/20 bg-slate-900">
                            {item.thumbnailUrl ? (
                              <img src={item.thumbnailUrl} alt={item.title} className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                            ) : (
                              <div className={`absolute inset-0 bg-gradient-to-br ${resourceGradient}`} />
                            )}
                            <div className="absolute inset-0 bg-black/15 group-hover:bg-black/5 transition-colors" />
                            {!item.thumbnailUrl && (
                              <span className="transform group-hover:scale-110 transition-transform duration-300 select-none filter drop-shadow-lg text-white z-10">
                                {item.type === 'video' && (
                                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                )}
                                {item.type === 'pdf' && (
                                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                  </svg>
                                )}
                                {item.type === '3d' && (
                                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                  </svg>
                                )}
                                {item.type !== 'video' && item.type !== 'pdf' && item.type !== '3d' && (
                                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                                  </svg>
                                )}
                              </span>
                            )}
                            <span className="absolute bottom-2.5 left-2.5 text-[10px] font-bold tracking-widest text-white/80 uppercase font-mono z-10 bg-black/30 px-1.5 py-0.5 rounded">
                              RESOURCE
                            </span>
                          </div>
                          <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                            <div className="space-y-1">
                              <h3 className="font-bold text-sm text-vigno-txt leading-snug line-clamp-2" title={item.title}>
                                {item.title}
                              </h3>
                              <p className="text-xs text-vigno-muted font-medium truncate">
                                AeroLearn Resource
                              </p>
                            </div>
                            <div className="space-y-2">
                              <div className="flex items-center gap-1.5 text-xs">
                                <span className="text-vigno-muted font-medium">Standalone study resource</span>
                              </div>
                              <div className="flex items-center justify-between flex-wrap gap-1.5 pt-1">
                                <span className="text-[9px] font-extrabold tracking-wider px-2 py-0.5 rounded-md uppercase border text-vigno-accent border-vigno-accent/20 bg-vigno-accent/5">
                                  {resourceTypeLabel}
                                </span>
                              </div>
                            </div>
                            <Link
                              to={`/app/content/${item.id}`}
                              className="w-full text-center text-xs font-extrabold bg-vigno-accent text-vigno-accent-txt rounded-xl py-2.5 hover:brightness-110 transition-all"
                            >
                              Open Resource
                            </Link>
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
        <div className="space-y-4">
          {licenses.isLoading && <p className="text-vigno-muted text-sm">Loading licenses…</p>}
          {licenses.isError && <p className="text-red-300 text-sm">Failed to load licenses.</p>}
          {!licenses.isLoading && licenses.data?.length === 0 && (
            <p className="text-vigno-muted text-sm py-4">No active content licenses held.</p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {licenses.data?.map((l) => (
              <div key={l.jti} className="bg-vigno-card border border-vigno-line rounded-2xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-vigno-accent2">
                    <LessonIcon type={l.content?.type} className="w-5 h-5" />
                  </div>
                  <span className={'text-[9px] font-bold px-2 py-0.5 rounded-full ' + (STATUS[l.status] || 'bg-white/10')}>
                    {l.status.toUpperCase()}
                  </span>
                </div>
                <div>
                  <div className="font-semibold text-xs text-vigno-txt truncate">{l.content?.title || 'Content'}</div>
                  <p className="text-[10px] text-vigno-muted mt-0.5 capitalize">{l.type} lane · expires {fmt(l.expiresAt)}</p>
                </div>
                <div>
                  {l.usable && l.content ? (
                    <Link to={`/app/content/${l.content.id}`}
                      className="inline-flex items-center gap-1.5 text-[11px] font-bold bg-white/10 text-vigno-txt border border-vigno-line/60 rounded-lg px-2.5 py-1.5 hover:bg-white/20 transition-all">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                      Open Content
                    </Link>
                  ) : (
                    <span className="text-xs text-vigno-muted">{l.status === 'revoked' ? 'Access revoked' : 'Expired'}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab: Purchase History */}
      {tab === 'purchases' && (
        <div className="space-y-4">
          {purchases.isLoading && <p className="text-vigno-muted text-sm">Loading purchases…</p>}
          {purchases.isError && <p className="text-red-300 text-sm">Failed to load purchases.</p>}
          {!purchases.isLoading && purchases.data?.length === 0 && <p className="text-vigno-muted text-sm py-4">No purchase receipts found.</p>}

          {!purchases.isLoading && purchases.data?.length > 0 && (
            <div className="bg-vigno-card border border-vigno-line rounded-2xl overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-black/20 text-vigno-muted text-xs">
                  <tr>
                    <th className="text-left px-4 py-3 font-bold">Content</th>
                    <th className="text-left px-4 py-3 font-bold">Amount</th>
                    <th className="text-left px-4 py-3 font-bold">Status</th>
                    <th className="text-left px-4 py-3 font-bold">Date</th>
                    <th className="text-right px-4 py-3 font-bold">Receipt</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.data.map((p) => (
                    <tr key={p._id} className="border-t border-vigno-line/40 hover:bg-white/2 transition-colors">
                      <td className="px-4 py-3 text-vigno-txt font-medium">{p.contentId?.title || '—'}</td>
                      <td className="px-4 py-3 text-vigno-txt">
                        ₹{p.amount}
                        {p.discount > 0 && <span className="text-green-300 text-xs ml-1">(−₹{p.discount}{p.couponCode ? ` ${p.couponCode}` : ''})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={'text-[9px] font-bold px-2 py-0.5 rounded-full ' +
                          (p.status === 'paid' ? 'bg-green-500/20 text-green-300'
                            : p.status === 'refunded' ? 'bg-red-500/20 text-red-300'
                            : 'bg-white/10 text-vigno-muted')}>
                          {p.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-vigno-muted">{fmt(p.paidAt || p.createdAt)}</td>
                      <td className="px-4 py-3 text-right">
                        {['paid', 'refunded'].includes(p.status) && (
                          <button onClick={() => paymentsApi.downloadInvoice(p._id)} className="text-xs text-vigno-accent2 hover:underline font-bold">Download PDF</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
