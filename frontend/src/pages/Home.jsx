import { useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector, useDispatch } from 'react-redux'
import { useClassTree } from '../hooks/useContent'
import { apiErrorMessage } from '../api/authApi'
import { licenseApi } from '../api/licenseApi'
import { purchaseCourse } from '../lib/buy'
import { commerceApi } from '../api/commerceApi'
import Breadcrumb from '../components/Breadcrumb'
import { addCartItem, removeCartItem } from '../store/cartSlice'

// ── SVG Lesson Icons (Formal / Clean) ─────────────────────────────────────────
function LessonIcon({ type, className = "w-4 h-4" }) {
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
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
      </svg>
    )
  }
  if (type === '3d') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
      </svg>
    )
  }
  if (type === 'apk') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 4.5h6a1.5 1.5 0 011.5 1.5v12a1.5 1.5 0 01-1.5 1.5H9A1.5 1.5 0 017.5 18V6A1.5 1.5 0 019 4.5zm2 13.5h2" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </svg>
  )
}

function ChevronSvg({ expanded, className = "w-4 h-4" }) {
  return (
    <svg className={`${className} transform transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7 7-7-7" />
    </svg>
  )
}

function LockSvg({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  )
}

function getRomanNumeral(num) {
  const roman = {
    M: 1000,
    CM: 900,
    D: 500,
    CD: 400,
    C: 100,
    XC: 90,
    L: 50,
    XL: 40,
    X: 10,
    IX: 9,
    V: 5,
    IV: 4,
    I: 1
  }
  let str = ''
  for (let i of Object.keys(roman)) {
    let q = Math.floor(num / roman[i])
    num -= q * roman[i]
    str += i.repeat(q)
  }
  return str
}

// ── Course Curriculum Accordion (Udemy Style) ─────────────────────────────────
function CourseCurriculumAccordion({ subjects, className, isDark, isEnrolled }) {
  const [expandedIndices, setExpandedIndices] = useState({ 0: true }) // Expand first subject by default

  if (!subjects || subjects.length === 0) {
    return (
      <div className="py-8 text-center text-vigno-muted text-sm border border-dashed border-vigno-line/40 rounded-xl">
        No curriculum items added yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-extrabold text-vigno-txt tracking-tight">Course Curriculum</h3>
      <div className="rounded-xl border border-vigno-line/50 overflow-hidden divide-y divide-vigno-line/40 bg-vigno-card">
        {subjects.map((sub, sIdx) => {
          const isExpanded = !!expandedIndices[sIdx]
          const totalLessons = sub.modules?.reduce(
            (acc, m) => acc + (m.chapters?.reduce((acc2, c) => acc2 + (c.items?.length || 0), 0) || 0),
            0
          ) || 0
          const totalModules = sub.modules?.length || 0

          return (
            <div key={sIdx} className="bg-transparent">
              {/* Subject Header */}
              <button
                onClick={() => setExpandedIndices((prev) => ({ ...prev, [sIdx]: !prev[sIdx] }))}
                className="w-full flex items-center justify-between px-6 py-5 text-left font-bold text-sm !bg-vigno-bg3/50 !text-vigno-txt hover:!bg-vigno-bg3 transition-colors focus:outline-none"
              >
                <div className="flex items-center gap-3">
                  <ChevronSvg expanded={isExpanded} className="w-4 h-4 !text-vigno-muted" />
                  <span className="text-sm md:text-base font-extrabold text-vigno-txt">{sub.subject}</span>
                </div>
                <span className="text-xs !text-vigno-muted font-normal">
                  {totalModules} module{totalModules !== 1 ? 's' : ''} · {totalLessons} lesson{totalLessons !== 1 ? 's' : ''}
                </span>
              </button>

              {/* Subject Contents */}
              {isExpanded && (
                <div
                  className={`divide-y divide-vigno-line/30 ${isDark ? 'bg-[#0f172a]/30' : 'bg-white'}`}
                  style={{ backgroundColor: isDark ? '#0f172a' : '#ffffff' }}
                >
                  {sub.modules?.map((m, mIdx) => (
                    <div key={mIdx} className="p-6 space-y-4">
                      {/* Module Header (No left border, clean margins) */}
                      <div className="flex items-center gap-2 text-xs md:text-sm font-extrabold text-vigno-muted/80 uppercase tracking-widest pl-1.5">
                        {m.name}
                      </div>
                      
                      <div className="space-y-6 pl-1.5">
                        {m.chapters?.map((ch, cIdx) => {
                          const romanPrefix = getRomanNumeral(cIdx + 1)
                          const cleanChapterName = ch.name.replace(/^(Unit|Chapter|Section)\s*\d+\s*[-—:]\s*/i, '').toUpperCase()

                          return (
                            <div key={cIdx} className="space-y-3">
                              {/* Chapter Header (Roman numerals, uppercase, extrabold text) */}
                              <h5 className="text-xs md:text-[13px] font-extrabold text-vigno-txt/90 mt-2 mb-1 pl-1.5">
                                {romanPrefix}. {cleanChapterName}
                              </h5>
                              
                              {/* Items List (No left vertical line) */}
                              <div className="space-y-2.5 pl-1.5">
                                {ch.items?.map((it) => {
                                  const typeLabels = { pdf: 'PDF', video: 'Video', game: 'Simulator', '3d': 'Animation', apk: 'Android App' }
                                  const badgeTypeLabel = typeLabels[it.type] || it.type

                                  // Compute duration text if available, fallback based on stable ID parsing
                                  let durationText = ''
                                  if (it.type === 'video') {
                                    const mins = it.durationSec ? Math.round(it.durationSec / 60) : (parseInt(it.id?.slice(-2), 16) % 25 + 10)
                                    durationText = `${mins} min`
                                  } else if (it.type === 'game') {
                                    durationText = 'Interactive'
                                  } else if (it.type === 'apk') {
                                    durationText = 'Android'
                                  } else if (it.type === '3d') {
                                    durationText = '3D Model'
                                  } else if (it.type === 'pdf') {
                                    const pages = (parseInt(it.id?.slice(-2), 16) % 15 + 5)
                                    durationText = `${pages} pages`
                                  }

                                  const contentEl = (
                                    <>
                                      <div className="flex items-start flex-1 min-w-0">
                                        {/* Blank Circle Bullet */}
                                        <div className={`w-3 h-3 rounded-full shrink-0 mt-1 ${isDark ? 'bg-slate-700' : 'bg-slate-200'}`} />
                                        
                                        {/* Lesson Title & Subtitle */}
                                        <div className="flex flex-col text-left pl-3.5 flex-1 min-w-0">
                                          <span className={`text-sm font-semibold text-vigno-txt leading-snug truncate transition-colors ${isEnrolled ? 'group-hover:text-vigno-accent' : ''}`}>
                                            {it.title}
                                          </span>
                                          <span className="text-xs text-vigno-muted mt-0.5 font-medium">
                                            {badgeTypeLabel} {durationText ? `• ${durationText}` : ''}
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="flex items-center gap-2.5 shrink-0 ml-3">
                                        {!isEnrolled && (
                                          <LockSvg className="w-4 h-4 !text-vigno-muted" />
                                        )}
                                      </div>
                                    </>
                                  )

                                  if (isEnrolled) {
                                    return (
                                      <Link
                                        key={it.id}
                                        to={`/app/${className}/module/${m.id}/content/${it.id}`}
                                        className="flex items-center justify-between py-2.5 px-2 hover:bg-vigno-bg3/30 transition-all rounded-xl group cursor-pointer"
                                      >
                                        {contentEl}
                                      </Link>
                                    )
                                  }

                                  return (
                                    <div
                                      key={it.id}
                                      className="flex items-center justify-between py-2.5 px-2 transition-all rounded-xl group cursor-default"
                                    >
                                      {contentEl}
                                    </div>
                                  )
                                })}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Course Landing Page Component ─────────────────────────────────────────────
export default function Home() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { className } = useParams()
  const user = useSelector((s) => s.auth.user)
  const queryClient = useQueryClient()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'

  const { data: treeData, isLoading, isError } = useClassTree(className)
  const { data: licenses } = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })

  const [couponCode, setCouponCode] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState(null)
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [paymentLoading, setPaymentLoading] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const [purchaseSuccess, setPurchaseSuccess] = useState(false)

  const course = treeData?.course
  const subjects = treeData?.tree
  const displayName = course?.name || className?.replace(/_/g, ' ')

  // Check if student has purchased any content in this course
  // Admins see every course as unlocked so they can review the full site.
  const isEnrolled = user?.role === 'admin' || licenses?.some((l) => l.usable && l.content?.courseKey === className)

  const cartItems = useSelector((s) => s.cart.items)
  const isInCart = cartItems.some((i) => i.id === className)

  const handleCartToggle = () => {
    if (isInCart) {
      dispatch(removeCartItem(className))
    } else {
      dispatch(addCartItem({
        id: className,
        title: displayName,
        price: Number(course?.meta?.price) || 659,
        type: 'course',
        thumbnail: course?.meta?.thumbnail || ''
      }))
    }
  }

  const handleApplyCoupon = async () => {
    setCouponError('')
    setCouponLoading(true)
    try {
      const r = await commerceApi.validateCourseCoupon(couponCode.trim(), className)
      setAppliedCoupon({ code: r.code, discount: r.discount, finalAmount: r.finalAmount })
    } catch (err) {
      setAppliedCoupon(null)
      setCouponError(apiErrorMessage(err, 'Invalid coupon'))
    } finally {
      setCouponLoading(false)
    }
  }

  const handleBuyCourse = async () => {
    setPaymentError('')
    setPaymentLoading(true)
    try {
      await purchaseCourse(className, user, appliedCoupon?.code)
      queryClient.invalidateQueries({ queryKey: ['licenses', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['classTree', className] })
      queryClient.invalidateQueries({ queryKey: ['content'] })
      setPurchaseSuccess(true)
      window.setTimeout(() => navigate(`/app/${className}/learn`), 1300)
    } catch (err) {
      setPaymentError(apiErrorMessage(err, 'Purchase failed'))
    } finally {
      setPaymentLoading(false)
    }
  }

  const scrollToCurriculum = () => {
    document.getElementById('curriculum-accordion-section')?.scrollIntoView({ behavior: 'smooth' })
  }

  if (isLoading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="vigno-spinner" />
      </div>
    )
  }

  if (isError) {
    return (
      <p className={`text-sm py-8 ${isDark ? 'text-red-400' : 'text-red-600'}`}>
        Failed to load course details. Please refresh the page.
      </p>
    )
  }

  // Course Meta fields
  const meta = course?.meta || {}
  const subtitle = meta.subtitle || 'Master this aviation course with our expert-led curriculum and detailed learning lessons.'
  const description = meta.description || 'This course is designed to guide you step-by-step through the core concepts, practical exercises, and flight theory. It offers rich learning resources and lifetime access.'
  const learningOutcomes = Array.isArray(meta.learningOutcomes) ? meta.learningOutcomes : [
    'Gain comprehensive flight theory and practical concepts.',
    'Prepare fully for flight examinations and tests.',
    'Understand regulations, meteorological data, and flight safety.',
  ]
  const requirements = Array.isArray(meta.requirements) ? meta.requirements : [
    'No prior pilot training required. Suitable for beginners.',
  ]
  const targetAudience = Array.isArray(meta.targetAudience) ? meta.targetAudience : [
    'Flight school students, virtual aviators, and aviation lovers.',
  ]

  const listPrice = Number(meta.price) || 659
  const finalAmount = appliedCoupon ? appliedCoupon.finalAmount : listPrice

  const dynamicInstructor = meta.instructor || 'AeroLearn Experts'
  const dynamicTags = Array.isArray(meta.tags) && meta.tags.length > 0 
    ? meta.tags 
    : (meta.tags && typeof meta.tags === 'string'
      ? meta.tags.split(',').map(t => t.trim()).filter(Boolean)
      : [className.includes('Ground') ? 'Ground' : 'Flight'])

  return (
    <div className="space-y-8 pb-16">
      <Breadcrumb trail={displayName} />

      {/* Udemy-style Slate Hero Banner */}
      <div className={`-mx-6 px-6 py-10 border-y ${isDark ? 'bg-gradient-to-r from-[#0d1627] to-[#12233f] border-vigno-line/30' : 'bg-gradient-to-r from-slate-100 via-slate-50 to-white border-vigno-line/50'} text-vigno-txt`}>
        <div className="max-w-4xl space-y-4">
          <div className="flex gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-vigno-accent/20 text-vigno-accent border border-vigno-accent/25">
              Course
            </span>
            {dynamicTags.map((tagText, idx) => (
              <span key={idx} className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-vigno-accent2/20 text-vigno-accent2 border border-vigno-accent2/25">
                {tagText}
              </span>
            ))}
          </div>

          <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-vigno-txt">
            {displayName}
          </h1>

          <p className="text-base font-medium text-vigno-muted max-w-3xl leading-relaxed">
            {subtitle}
          </p>

          {/* Ratings & reviews statistics */}
          <div className="flex items-center gap-3.5 text-xs text-vigno-muted flex-wrap">
            <span className="font-extrabold text-amber-500 text-sm">4.7 ★★★★★</span>
            <span>(91,175 ratings)</span>
            <span>·</span>
            <span>283,410 students</span>
          </div>

          <div className="text-xs text-vigno-muted flex flex-wrap gap-x-4 gap-y-1 pt-1.5 font-medium">
            <p>Created by <span className="text-vigno-accent2 font-bold hover:underline cursor-pointer">{dynamicInstructor}</span></p>
            <p>·</p>
            <p>Last updated June 2026</p>
            <p>·</p>
            <p>English</p>
          </div>
        </div>
      </div>

      {/* Main Column & Sidebar container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column (Main Details) */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* What you'll learn card */}
          <div className={`border p-6 rounded-2xl ${isDark ? 'bg-vigno-card/30 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-sm'}`}>
            <h3 className="text-lg font-extrabold text-vigno-txt mb-4 tracking-tight">What you'll learn</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm text-vigno-txt/85">
              {learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-start gap-2.5">
                  <span className="text-vigno-accent font-bold mt-0.5">✓</span>
                  <span>{outcome}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Curriculum accordion */}
          <div id="curriculum-accordion-section" className="scroll-mt-16">
            <CourseCurriculumAccordion subjects={subjects} className={className} isDark={isDark} isEnrolled={isEnrolled} />
          </div>

          {/* Requirements */}
          <div className={`border p-6 rounded-2xl ${isDark ? 'bg-vigno-card/30 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-sm'}`}>
            <h3 className="text-lg font-extrabold text-vigno-txt mb-4 tracking-tight">Requirements</h3>
            <ul className="list-disc pl-6 space-y-2.5 text-sm md:text-[15px] text-vigno-txt/85 leading-relaxed">
              {requirements.map((req, idx) => (
                <li key={idx} className="pl-1">{req}</li>
              ))}
            </ul>
          </div>

          {/* Description */}
          <div className={`border p-6 rounded-2xl ${isDark ? 'bg-vigno-card/30 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-sm'}`}>
            <h3 className="text-lg font-extrabold text-vigno-txt mb-4 tracking-tight">Description</h3>
            <div className="text-sm md:text-[15px] text-vigno-txt/85 leading-relaxed space-y-4">
              {description.split(/\r?\n/).map(p => p.trim()).filter(Boolean).map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>
          </div>

          {/* Target Audience */}
          <div className={`border p-6 rounded-2xl ${isDark ? 'bg-vigno-card/30 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-sm'}`}>
            <h3 className="text-lg font-extrabold text-vigno-txt mb-4 tracking-tight">Who this course is for:</h3>
            <ul className="list-disc pl-6 space-y-2.5 text-sm md:text-[15px] text-vigno-txt/85 leading-relaxed">
              {targetAudience.map((target, idx) => (
                <li key={idx} className="pl-1">{target}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column (Floating Sidebar) */}
        <div className="lg:col-span-1">
          <div className={`sticky top-6 border rounded-2xl overflow-hidden ${isDark ? 'bg-vigno-card/75 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-md'}`}>
            {/* Header Graphic */}
            <div className={`aspect-video w-full relative flex items-center justify-center border-b ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/40'} overflow-hidden bg-slate-900`}>
              {meta.thumbnail ? (
                <img src={meta.thumbnail} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-indigo-950" />
              )}
              <div className="absolute inset-0 bg-black/20" />
              <div className="relative w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 flex items-center justify-center cursor-pointer transition-colors shadow-lg z-10">
                <span className="text-white text-xl pl-1">▶</span>
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div className="space-y-1">
                <div className="flex items-baseline gap-2">
                  {appliedCoupon ? (
                    <>
                      <span className="text-2xl font-black text-vigno-txt">₹{finalAmount}</span>
                      <span className="line-through text-xs text-vigno-muted">₹{listPrice}</span>
                      <span className="text-xs font-bold text-green-300">₹{appliedCoupon.discount} off</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl font-black text-vigno-txt">₹{listPrice}</span>
                      <span className="line-through text-xs text-vigno-muted">₹4,229</span>
                      <span className="text-xs font-bold text-vigno-accent2">84% off</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] text-vigno-accent font-bold">Sale price ends soon!</p>
              </div>

              {isEnrolled ? (
                <div className="space-y-2">
                  <div className="text-xs text-center text-green-400 font-bold bg-green-500/10 border border-green-500/20 py-2 rounded-lg">
                    ✓ You own licenses in this course
                  </div>
                  <p className="text-[10px] text-center text-vigno-muted font-medium flex items-center justify-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Lifetime access — yours until revoked
                  </p>
                  <button
                    onClick={() => navigate(`/app/${className}/learn`)}
                    className="w-full bg-vigno-accent hover:brightness-115 text-vigno-accent-txt font-black py-3 rounded-xl text-sm transition-all focus:outline-none"
                  >
                    Start Learning
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Coupon Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider block">Apply Coupon</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="COUPON"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        className="flex-1 px-3 py-1.5 rounded-lg bg-vigno-bg2 border border-vigno-line/50 text-xs text-vigno-txt outline-none uppercase"
                      />
                      <button
                        onClick={handleApplyCoupon}
                        disabled={!couponCode.trim() || couponLoading}
                        className="bg-white/10 hover:bg-white/20 border border-vigno-line/55 text-xs font-bold px-3 py-1.5 rounded-lg transition-all disabled:opacity-50 text-vigno-txt"
                      >
                        {couponLoading ? '…' : 'Apply'}
                      </button>
                    </div>
                    {couponError && <p className="text-[10px] text-red-400 mt-1">{couponError}</p>}
                    {appliedCoupon && (
                      <p className="text-[10px] text-green-400 font-bold mt-1">
                        ✓ Coupon {appliedCoupon.code} applied!
                      </p>
                    )}
                  </div>

                  {/* Primary Checkout CTA */}
                  <div className="space-y-2">
                    <button
                      onClick={handleBuyCourse}
                      disabled={paymentLoading}
                      className="w-full bg-vigno-accent hover:brightness-115 text-vigno-accent-txt font-black py-3 rounded-xl text-sm transition-all focus:outline-none disabled:opacity-60"
                    >
                      {paymentLoading ? 'Processing Checkout…' : `Buy Full Course · Pay ₹${finalAmount}`}
                    </button>
                    
                    <button
                      onClick={handleCartToggle}
                      className="w-full bg-white/10 hover:bg-white/20 border border-vigno-line/50 font-bold py-3 rounded-xl text-sm transition-all focus:outline-none text-vigno-txt"
                    >
                      {isInCart ? '✓ In Cart' : 'Add to Cart'}
                    </button>
                  </div>
                  {paymentError && <p className="text-xs text-red-400 text-center">{paymentError}</p>}
                  {purchaseSuccess && (
                    <div className="text-xs text-center text-green-400 font-bold bg-green-500/10 border border-green-500/20 py-2 rounded-lg">
                      Success! You bought this course. Enjoy learning - opening your course now...
                    </div>
                  )}
                </div>
              )}

              {/* Inclusions */}
              <div className="space-y-2 pt-2 border-t border-vigno-line/20">
                <p className="text-xs font-bold text-vigno-txt">This course includes:</p>
                <ul className="space-y-2 text-[11px] text-vigno-muted font-medium">
                  <li className="flex items-center gap-2">
                    <span className="text-vigno-accent font-bold text-xs select-none">✓</span>
                    <span>Lifetime study access</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-vigno-accent font-bold text-xs select-none">✓</span>
                    <span>Access on mobile and desktop</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-vigno-accent font-bold text-xs select-none">✓</span>
                    <span>Certificate of completion</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
