import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useClassTree, useContentItem } from '../hooks/useContent'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { licenseApi } from '../api/licenseApi'
import { discoverApi } from '../api/discoverApi'

const VideoPlayer = lazy(() => import('../components/VideoPlayer'))
const PdfViewer = lazy(() => import('../components/PdfViewer'))
const Model3DViewer = lazy(() => import('../components/Model3DViewer'))

function Icon({ name, className = 'w-4 h-4' }) {
  const common = { className, fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: '2' }
  if (name === 'play') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M8 5v14l11-7-11-7z" /></svg>
  if (name === 'file') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.4a1 1 0 00-.3-.7l-5.4-5.4A1 1 0 0012.6 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
  if (name === 'cube') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" /></svg>
  if (name === 'check') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l5 5L19.5 6.25" /></svg>
  if (name === 'chevron') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
  if (name === 'lock') return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 10-9 0v3.5m-.75 11h10.5a2 2 0 002-2v-7a2 2 0 00-2-2H6.75a2 2 0 00-2 2v7a2 2 0 002 2z" /></svg>
  return <svg {...common}><path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.6-2.3A1 1 0 0121 8.6v6.8a1 1 0 01-1.4.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
}

function cleanName(name = '') {
  return name.replace(/^(Unit|Chapter|Section|Submodule)\s*\d+\s*[-–—:]\s*/i, '').trim() || name
}

function lessonMeta(item = {}) {
  if (item.type === 'video') {
    const mins = item.durationSec ? Math.max(1, Math.round(item.durationSec / 60)) : (parseInt(item.id?.slice(-2), 16) % 18) + 8
    return { label: 'Video', detail: `${mins} min`, icon: 'video' }
  }
  if (item.type === 'pdf') {
    const pages = (parseInt(item.id?.slice(-2), 16) % 14) + 6
    return { label: 'Reading', detail: `${pages} pages`, icon: 'file' }
  }
  if (item.type === '3d') return { label: '3D lab', detail: 'Interactive', icon: 'cube' }
  if (item.type === 'apk') return { label: 'Android App', detail: 'Install', icon: 'play' }
  return { label: 'Simulator', detail: 'Practice', icon: 'play' }
}

function LauncherHelpModal({ active, onClose, launcherDownloadUrl, launcherVersion }) {
  if (!active) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-2xl border border-vigno-line bg-vigno-panel p-6 text-vigno-txt shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-vigno-accent">Launcher resource</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">{active.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-vigno-line/60 bg-white/10 px-3 py-1.5 text-sm font-bold hover:bg-white/20"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4 text-sm leading-6 text-vigno-muted">
          <p>
            This resource runs through the secure AeroLearn desktop launcher. The launcher signs you in,
            verifies your course license, binds the resource to your device, and then downloads or opens it securely.
          </p>
          <div className="rounded-xl border border-vigno-line/60 bg-white/5 p-4">
            <p className="font-black text-vigno-txt">How to play</p>
            <ol className="mt-2 list-decimal space-y-1 pl-5">
              <li>Install the launcher from this page.</li>
              <li>Open the launcher and sign in with the same account.</li>
              <li>Select this resource in the launcher to download and run it.</li>
            </ol>
          </div>
        </div>

        <div className="mt-6 flex flex-col sm:flex-row gap-3">
          {launcherDownloadUrl ? (
            <a
              href={launcherDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-vigno-accent px-4 py-3 text-sm font-black text-vigno-accent-txt hover:brightness-110"
            >
              Install Launcher{launcherVersion ? ` v${launcherVersion}` : ''}
            </a>
          ) : (
            <div className="flex-1 rounded-xl border border-vigno-line/60 bg-white/5 px-4 py-3 text-center text-sm font-bold text-vigno-muted">
              Launcher download is not configured yet.
            </div>
          )}
          <button
            onClick={onClose}
            className="inline-flex flex-1 items-center justify-center rounded-xl border border-vigno-line/60 bg-white/10 px-4 py-3 text-sm font-bold text-vigno-txt hover:bg-white/20"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

function LauncherPrompt({ active, launcherDownloadUrl, launcherVersion, onHelp }) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
      {launcherDownloadUrl ? (
        <a
          href={launcherDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group relative inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-8 py-3.5 text-sm font-bold text-white overflow-hidden transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-slate-900 w-full sm:w-auto"
        >
          <span className="absolute inset-0 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative z-10 flex items-center gap-2">
            <Icon name="play" className="w-4 h-4 fill-current" />
            Install Launcher {launcherVersion ? `v${launcherVersion}` : ''}
          </span>
        </a>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 px-6 py-3.5 text-sm font-medium text-white/70 backdrop-blur-sm w-full sm:w-auto">
          Launcher download unavailable.
        </div>
      )}
      <button
        onClick={onHelp}
        className="inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/5 px-8 py-3.5 text-sm font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/30 hover:scale-105 focus:outline-none w-full sm:w-auto"
      >
        How to play
      </button>
    </div>
  )
}

function ResourceStage({ item, content, isLoading, watermark, onProgress, launcherDownloadUrl, launcherVersion, onLauncherHelp }) {
  const active = { ...item, ...(content || {}), locked: false }

  if (!item) {
    return <div className="aspect-video bg-black flex items-center justify-center text-white/70">No lessons are available in this course yet.</div>
  }

  if (isLoading) {
    return <div className="aspect-video bg-black flex items-center justify-center"><div className="vigno-spinner" /></div>
  }

  return (
    <Suspense fallback={<div className="aspect-video bg-black flex items-center justify-center"><div className="vigno-spinner" /></div>}>
      {active?.type === 'video' && active.src && (
        <div className="bg-black">
          <VideoPlayer src={active.src} watermark={watermark} onProgress={onProgress} />
        </div>
      )}

      {active?.type === 'pdf' && active.url && (
        <div className="h-[calc(100vh-13rem)] min-h-[520px] overflow-auto bg-slate-100 p-4">
          <PdfViewer url={active.url} watermark={watermark} />
        </div>
      )}

      {active?.type === '3d' && !active?.requiresLauncher && (
        <div className="bg-black p-4">
          <Model3DViewer src={active.url} watermark={watermark} />
          <div className="text-center pb-4">
            <p className="text-sm text-white/60 mt-4">For the full secure animation experience, open it through the desktop launcher.</p>
            <LauncherPrompt active={active} launcherDownloadUrl={launcherDownloadUrl} launcherVersion={launcherVersion} onHelp={() => onLauncherHelp(active)} />
          </div>
        </div>
      )}

      {(active?.type === 'game' || active?.requiresLauncher) && (
        <div className="relative aspect-video flex flex-col items-center justify-center text-center px-6 overflow-hidden bg-[#070b14]">
          {/* Ambient background glow */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/40 via-[#070b14]/80 to-[#070b14] pointer-events-none" />
          
          {/* Glassmorphic card content */}
          <div className="relative z-10 flex flex-col items-center backdrop-blur-md bg-white/5 p-8 rounded-3xl border border-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.36)] transition-all hover:bg-white/10">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white flex items-center justify-center shadow-[0_0_40px_rgba(59,130,246,0.5)] mb-6 transform hover:scale-110 transition-transform duration-300">
              <Icon name="play" className="w-10 h-10 fill-current ml-1" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-blue-400 mb-3 drop-shadow-md">{active.type === 'apk' ? 'Android App' : 'Simulator'}</p>
            <h2 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white to-white/70 tracking-tight drop-shadow-sm">{active.title}</h2>
            <p className="text-sm font-medium text-white/60 mt-4 mb-8 max-w-lg leading-relaxed">{active.type === 'apk' ? 'This Android app is delivered securely and locked to your registered device — the embedded LicenseGuard verifies your license before it runs.' : 'This immersive simulator runs securely via the AeroLearn desktop launcher. Simply select this module to begin.'}</p>
            <LauncherPrompt active={active} launcherDownloadUrl={launcherDownloadUrl} launcherVersion={launcherVersion} onHelp={() => onLauncherHelp(active)} />
          </div>
        </div>
      )}

      {((active?.type === 'video' && !active.src) || (active?.type === 'pdf' && !active.url)) && (
        <div className="aspect-video bg-slate-950 flex flex-col items-center justify-center text-center px-6">
          <Icon name={lessonMeta(active).icon} className="w-12 h-12 text-vigno-accent mb-4" />
          <h2 className="text-2xl font-black text-white">{active.title}</h2>
          <p className="text-sm text-white/60 mt-2 max-w-lg">This resource is selected, but no playable file URL was returned for it yet.</p>
        </div>
      )}
    </Suspense>
  )
}

export default function CourseWorkspace() {
  const { className } = useParams()
  const { data, isLoading, isError } = useClassTree(className)
  const { data: licenses } = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  const { data: settings } = useSiteSettings()
  const queryClient = useQueryClient()
  const { data: allProgress } = useQuery({ queryKey: ['progress', 'mine'], queryFn: () => discoverApi.myProgress(200) })
  const user = useSelector((s) => s.auth.user)
  const isDark = useSelector((s) => s.ui.theme) === 'dark'
  const [activeTab, setActiveTab] = useState('overview')
  const [activeContentId, setActiveContentId] = useState('')
  const [launcherHelpItem, setLauncherHelpItem] = useState(null)
  const [openUnits, setOpenUnits] = useState({ 0: true })
  const [openSections, setOpenSections] = useState({ '0-0': true })
  const [completionToggling, setCompletionToggling] = useState({}) // Track in-flight requests

  const course = data?.course
  const units = useMemo(() => {
    const list = []
    data?.tree?.forEach((subject) => {
      const sections = (subject.modules || []).map((module) => ({
        title: cleanName(module.name),
        moduleId: module.id,
        items: (module.chapters || []).flatMap((chapter) =>
          (chapter.items || []).map((item) => ({
            ...item,
            moduleId: module.id,
            moduleName: module.name,
            subject: subject.subject,
            sectionName: cleanName(module.name),
          }))
        ),
      })).filter((section) => section.items.length)

      if (sections.length) list.push({ subject: subject.subject, moduleId: sections[0].moduleId, title: subject.subject, sections })
    })
    return list
  }, [data])

  const lessons = units.flatMap((unit) => unit.sections.flatMap((section) => section.items))
  const activeLesson = lessons.find((lesson) => lesson.id === activeContentId) || lessons[0]
  const { data: activeContent, isLoading: contentLoading } = useContentItem(activeLesson?.id)
  const unitRefs = useRef({})

  // "Jump to submodule" — used by the dropdown in the sidebar so a learner
  // can go straight to e.g. submodule 3 instead of scrolling/expanding
  // through everything before it.
  const jumpToUnit = useCallback((unitIndex) => {
    const unit = units[unitIndex]
    if (!unit) return
    setOpenUnits({ [unitIndex]: true })
    setOpenSections({ [`${unitIndex}-0`]: true })
    const firstItem = unit.sections[0]?.items?.[0]
    if (firstItem) setActiveContentId(firstItem.id)
    // Let the newly-expanded content mount before scrolling to it.
    requestAnimationFrame(() => {
      unitRefs.current[unitIndex]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [units])

  // Create a map of content completion status
  const completionMap = useMemo(() => {
    const map = {}
    allProgress?.forEach((item) => {
      map[item.id] = item.completed || false
    })
    return map
  }, [allProgress])
  
  const displayName = course?.name || className?.replace(/_/g, ' ')
  const activeUnitIndex = units.findIndex((unit) => unit.sections.some((section) => section.items.some((it) => it.id === activeLesson?.id)))
  const isEnrolled = user?.role === 'admin' || licenses?.some((l) => l.usable && l.content?.courseKey === className)
  const totalMinutes = lessons.reduce((sum, item) => sum + (item.type === 'video' ? (item.durationSec ? Math.round(item.durationSec / 60) : 12) : 6), 0)
  const completedCount = lessons.filter((lesson) => completionMap[lesson.id]).length
  const progress = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0
  const watermark = user?.email || 'aerolearn'
  const launcher = settings?.launcher || {}
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
  const launcherDownloadUrl = launcher.url || (launcher.hasInstaller ? `${apiBase}/settings/launcher-download` : '')

  useEffect(() => {
    if (!activeContentId && lessons[0]?.id) setActiveContentId(lessons[0].id)
  }, [activeContentId, lessons])

  useEffect(() => {
    if (activeLesson?.id) discoverApi.saveProgress(activeLesson.id, {}).catch(() => {})
  }, [activeLesson?.id])

  const onProgress = useCallback((p) => {
    if (activeLesson?.id) {
      discoverApi.saveProgress(activeLesson.id, p).catch(() => {})
      // Auto-mark as complete if video watched >= 95%
      if (p.position && p.duration && p.position / p.duration >= 0.95 && activeLesson.type === 'video') {
        setCompletionToggling((prev) => ({ ...prev, [activeLesson.id]: true }))
        discoverApi.markComplete(activeLesson.id, true)
          .then(() => {
            setCompletionToggling((prev) => ({ ...prev, [activeLesson.id]: false }))
          })
          .catch(() => {
            setCompletionToggling((prev) => ({ ...prev, [activeLesson.id]: false }))
          })
      }
    }
  }, [activeLesson?.id, activeLesson?.type])

  const toggleCompletion = useCallback(
    (lessonId) => {
      console.log('Toggling completion for lesson:', lessonId)
      // Get current state
      const currentState = completionMap[lessonId] || false
      const newState = !currentState
      
      console.log('Current state:', currentState, 'New state:', newState)
      
      // Show loading
      setCompletionToggling((prev) => ({ ...prev, [lessonId]: true }))
      
      // Send to API
      discoverApi.markComplete(lessonId, newState)
        .then((res) => {
          console.log('Mark complete success:', res)
          setCompletionToggling((prev) => ({ ...prev, [lessonId]: false }))
          // Refetch progress to update the UI
          queryClient.invalidateQueries({ queryKey: ['progress', 'mine'] })
        })
        .catch((err) => {
          console.error('Failed to mark complete:', err)
          setCompletionToggling((prev) => ({ ...prev, [lessonId]: false }))
        })
    },
    [completionMap, queryClient]
  )

  if (isLoading) return <div className="py-24 flex items-center justify-center"><div className="vigno-spinner" /></div>
  if (isError || !data) return <p className="text-sm text-red-300 py-8">Unable to open this course workspace.</p>

  if (!isEnrolled) {
    return (
      <div className="max-w-2xl mx-auto text-center py-20">
        <div className="text-sm font-bold text-vigno-accent mb-2">Course access required</div>
        <h1 className="text-3xl font-black text-vigno-txt tracking-tight mb-3">{displayName}</h1>
        <p className="text-sm text-vigno-muted mb-6">Buy the course to unlock the full learning workspace and course resources.</p>
        <Link to={`/app/${className}`} className="inline-flex items-center justify-center rounded-xl bg-vigno-accent px-5 py-3 text-sm font-black text-vigno-accent-txt hover:brightness-110">
          View course
        </Link>
      </div>
    )
  }

  return (
    <div className="pb-10 -mx-2 lg:-mx-6">
      <div className="rounded-2xl overflow-hidden border border-vigno-line/50 bg-vigno-card/70 shadow-2xl shadow-black/10">
        <div className="min-h-[calc(100vh-10rem)] grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_430px]">
          <section className="min-w-0 bg-black/95 flex flex-col">
            <div className="h-14 flex items-center gap-4 px-6 border-b border-white/5 bg-black/40 backdrop-blur-md text-white/90">
              <Link to="/app/library" className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center transition-colors" aria-label="Back to my learning">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2.5"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <div className="min-w-0 flex items-center gap-3">
                <h1 className="text-sm font-bold truncate tracking-wide text-white">{displayName}</h1>
                {activeLesson && (
                  <>
                    <span className="text-white/20">•</span>
                    <p className="text-xs font-medium text-white/50 truncate tracking-wide">{activeLesson.sectionName} <span className="mx-1">/</span> {activeLesson.title}</p>
                  </>
                )}
              </div>
            </div>

            <ResourceStage
              item={activeLesson}
              content={activeContent}
              isLoading={contentLoading}
              watermark={watermark}
              onProgress={onProgress}
              launcherDownloadUrl={launcherDownloadUrl}
              launcherVersion={launcher.version}
              onLauncherHelp={setLauncherHelpItem}
            />

            <div className="bg-vigno-panel text-vigno-txt flex-1">
              <div className="flex items-center gap-6 px-5 border-b border-vigno-line/60 overflow-x-auto scrollbar-none">
                {['overview', 'q&a', 'notes', 'announcements', 'reviews', 'tools'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`h-14 text-sm font-bold border-b-2 whitespace-nowrap ${activeTab === tab ? 'border-vigno-accent text-vigno-txt' : 'border-transparent text-vigno-muted hover:text-vigno-txt'}`}
                  >
                    {tab === 'q&a' ? 'Q&A' : tab[0].toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>

              <div className="p-5 md:p-7 space-y-6">
                {activeTab === 'overview' ? (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[
                        ['Progress', `${progress}%`],
                        ['Lessons', lessons.length],
                        ['Units', units.length],
                        ['Duration', `${Math.max(1, Math.round(totalMinutes / 60))}h ${totalMinutes % 60}m`],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-xl border border-vigno-line/50 bg-white/5 p-4">
                          <div className="text-[11px] font-bold text-vigno-muted uppercase tracking-wider">{label}</div>
                          <div className="text-xl font-black mt-1">{value}</div>
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="text-xl font-black mb-2">{activeLesson?.title || 'About this course'}</h3>
                      <p className="text-sm leading-7 text-vigno-muted max-w-4xl">
                        {activeContent?.description || activeContent?.previewText || course?.meta?.description || 'A guided aviation learning path with videos, reading material, interactive resources, and exam-focused study structure.'}
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-vigno-line/50 bg-white/5 p-6">
                    <h3 className="text-lg font-black capitalize mb-2">{activeTab === 'q&a' ? 'Q&A' : activeTab}</h3>
                    <p className="text-sm text-vigno-muted">This workspace is ready for your course activity. Content for this tab can be connected as the learning tools grow.</p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <aside className="bg-vigno-panel text-vigno-txt border-l border-vigno-line/60 min-h-full flex flex-col shadow-[-4px_0_24px_rgba(0,0,0,0.1)]">
            <div className="sticky top-0 z-10 bg-vigno-panel/95 backdrop-blur-xl border-b border-vigno-line/60 shadow-sm">
              <div className="p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black tracking-tight text-vigno-txt">Course content</h2>
                    <p className="text-xs font-semibold text-vigno-muted mt-1.5">{completedCount} / {lessons.length} lessons complete</p>
                  </div>
                  <Link to={`/app/${className}`} className="text-xs font-bold text-vigno-accent hover:text-vigno-accent2 hover:underline transition-colors px-3 py-1.5 rounded-md bg-vigno-accent/10">Details</Link>
                </div>
                <div className="mt-5 h-2 rounded-full bg-vigno-line/40 overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-vigno-accent to-vigno-accent2 rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_rgba(var(--v-accent),0.5)]" style={{ width: `${progress}%` }} />
                </div>
                {units.length > 1 && (
                  <div className="mt-5">
                    <label htmlFor="unit-jump" className="text-[10px] font-bold text-vigno-muted uppercase tracking-wider block mb-1.5">
                      Jump to submodule
                    </label>
                    <div className="relative">
                      <select
                        id="unit-jump"
                        value={activeUnitIndex >= 0 ? activeUnitIndex : ''}
                        onChange={(e) => jumpToUnit(Number(e.target.value))}
                        className="w-full appearance-none text-xs font-bold bg-vigno-bg2 border border-vigno-line/60 rounded-lg pl-3 pr-9 py-2.5 text-vigno-txt outline-none focus:border-vigno-accent transition-colors cursor-pointer hover:border-vigno-accent/50"
                      >
                        <option value="" disabled>Select a submodule ({units.length} total)…</option>
                        {units.map((unit, i) => (
                          <option key={`${unit.moduleId}-${i}`} value={i}>
                            Submodule {i + 1}: {unit.title}
                          </option>
                        ))}
                      </select>
                      <Icon name="chevron" className="w-3.5 h-3.5 text-vigno-muted absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto divide-y divide-vigno-line/40">
              {units.map((unit, unitIndex) => {
                const unitOpen = !!openUnits[unitIndex]
                const unitLessons = unit.sections.reduce((sum, section) => sum + section.items.length, 0)
                return (
                  <section key={`${unit.moduleId}-${unitIndex}`} ref={(el) => { unitRefs.current[unitIndex] = el }}>
                    <button
                      onClick={() => setOpenUnits((prev) => ({ ...prev, [unitIndex]: !prev[unitIndex] }))}
                      className="group w-full px-6 py-5 flex items-start gap-4 text-left transition-colors hover:bg-white/5"
                    >
                      <div className={`mt-0.5 flex items-center justify-center w-6 h-6 rounded-full bg-vigno-line/30 text-vigno-txt transition-all duration-300 ${unitOpen ? 'rotate-90 bg-vigno-accent/20 text-vigno-accent' : 'group-hover:bg-vigno-line/50'}`}>
                        <Icon name="chevron" className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-bold leading-snug text-vigno-txt group-hover:text-vigno-accent transition-colors">Submodule {unitIndex + 1}: {unit.title}</h3>
                        <p className="text-[11px] font-semibold tracking-wide text-vigno-muted uppercase mt-1.5">{unit.sections.length} section{unit.sections.length !== 1 ? 's' : ''} • {unitLessons} lesson{unitLessons !== 1 ? 's' : ''}</p>
                      </div>
                    </button>

                    {unitOpen && (
                      <div className="pb-2 bg-vigno-line/10">
                        {unit.sections.map((section, sectionIndex) => {
                          const sectionKey = `${unitIndex}-${sectionIndex}`
                          const sectionOpen = !!openSections[sectionKey]
                          return (
                            <div key={sectionKey} className="border-t border-vigno-line/40 first:border-t-0">
                              <button
                                onClick={() => setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                                className="group w-full pl-12 pr-6 py-3 flex items-center gap-3 text-left transition-colors hover:bg-white/5"
                              >
                                <Icon name="chevron" className={`w-3.5 h-3.5 text-vigno-muted transition-transform duration-300 ${sectionOpen ? 'rotate-90 text-vigno-txt' : 'group-hover:text-vigno-txt'}`} />
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-[13px] font-bold leading-snug text-vigno-txt/90">Section {sectionIndex + 1}: {section.title}</h4>
                                </div>
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-vigno-line/30 text-vigno-muted">{section.items.length} resource{section.items.length !== 1 ? 's' : ''}</span>
                              </button>

                              {sectionOpen && (
                                <div className="pb-1 bg-transparent">
                                  {section.items.map((item, itemIndex) => {
                                    const meta = lessonMeta(item)
                                    const done = completionMap[item.id] || false
                                    const isTogglingCompletion = completionToggling[item.id]
                                    const selected = item.id === activeLesson?.id
                                    
                                    return (
                                      <div
                                        key={item.id}
                                        className={`group relative w-full flex items-start gap-4 pl-14 pr-6 py-4 text-left transition-all duration-300 ${selected ? 'bg-vigno-accent/10 border-l-2 border-vigno-accent' : 'border-l-2 border-transparent hover:bg-white/5'}`}
                                      >
                                        {/* Checkbox Button - Clickable */}
                                        <button
                                          type="button"
                                          onClick={() => toggleCompletion(item.id)}
                                          disabled={isTogglingCompletion}
                                          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded flex items-center justify-center transition-all duration-300 cursor-pointer shadow-sm ${
                                            done
                                              ? 'bg-vigno-accent border-vigno-accent text-vigno-accent-txt'
                                              : 'border-2 border-vigno-line/60 bg-transparent text-transparent hover:border-vigno-accent'
                                          } ${isTogglingCompletion ? 'opacity-50 cursor-wait' : ''} disabled:opacity-50`}
                                          title={done ? 'Mark as incomplete' : 'Mark as complete'}
                                        >
                                          {isTogglingCompletion ? (
                                            <svg className="w-3 h-3 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                                              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                          ) : done ? (
                                            <Icon name="check" className="w-3.5 h-3.5 fill-current" />
                                          ) : (
                                            <span />
                                          )}
                                        </button>
                                        
                                        {/* Lesson Title and Details - Clickable for Selection */}
                                        <button
                                          type="button"
                                          onClick={() => setActiveContentId(item.id)}
                                          className="flex-1 text-left min-w-0 flex flex-col justify-center"
                                        >
                                          <span className={`block text-sm font-bold leading-snug transition-colors duration-300 ${selected ? 'text-vigno-accent' : 'text-vigno-txt group-hover:text-vigno-txt/90'}`}>
                                            {item.title}
                                          </span>
                                          <span className={`mt-1.5 flex items-center gap-1.5 text-[11px] font-semibold transition-colors duration-300 ${selected ? 'text-vigno-accent/80' : 'text-vigno-muted group-hover:text-vigno-muted/80'}`}>
                                            <Icon name={meta.icon} className="w-3.5 h-3.5" />
                                            {meta.label} • {meta.detail}
                                          </span>
                                        </button>
                                      </div>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </section>
                )
              })}
            </div>
          </aside>
        </div>
      </div>
      <LauncherHelpModal
        active={launcherHelpItem}
        onClose={() => setLauncherHelpItem(null)}
        launcherDownloadUrl={launcherDownloadUrl}
        launcherVersion={launcher.version}
      />
    </div>
  )
}
