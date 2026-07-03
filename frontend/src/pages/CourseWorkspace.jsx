import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
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
  return name.replace(/^Unit\s*\d+\s*[-:]\s*/i, '').trim() || name
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
    <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
      {launcherDownloadUrl ? (
        <a
          href={launcherDownloadUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-vigno-accent px-5 py-3 text-sm font-black text-vigno-accent-txt hover:brightness-110"
        >
          Install the Launcher{launcherVersion ? ` v${launcherVersion}` : ''}
        </a>
      ) : (
        <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm font-semibold text-white/80">
          Launcher download is not configured yet.
        </div>
      )}
      <button
        onClick={onHelp}
        className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/10 px-5 py-3 text-sm font-bold text-white hover:bg-white/15"
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
        <div className="aspect-video bg-gradient-to-br from-slate-950 via-[#0b1730] to-black flex flex-col items-center justify-center text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-vigno-accent text-vigno-accent-txt flex items-center justify-center shadow-2xl mb-5">
            <Icon name="play" className="w-10 h-10 fill-current" />
          </div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-vigno-accent mb-2">Simulator</p>
          <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">{active.title}</h2>
          <p className="text-sm text-white/65 mt-3 max-w-xl">This simulator opens through the secure launcher. The resource is selected directly in your course workspace.</p>
          <LauncherPrompt active={active} launcherDownloadUrl={launcherDownloadUrl} launcherVersion={launcherVersion} onHelp={() => onLauncherHelp(active)} />
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
      subject.modules?.forEach((module) => {
        const sections = module.chapters?.map((chapter) => ({
          title: cleanName(chapter.name),
          items: chapter.items?.map((item) => ({
            ...item,
            moduleId: module.id,
            moduleName: module.name,
            subject: subject.subject,
            sectionName: cleanName(chapter.name),
          })) || [],
        })).filter((section) => section.items.length) || []

        if (sections.length) list.push({ subject: subject.subject, moduleId: module.id, title: module.name, sections })
      })
    })
    return list
  }, [data])

  const lessons = units.flatMap((unit) => unit.sections.flatMap((section) => section.items))
  const activeLesson = lessons.find((lesson) => lesson.id === activeContentId) || lessons[0]
  const { data: activeContent, isLoading: contentLoading } = useContentItem(activeLesson?.id)
  
  // Create a map of content completion status
  const completionMap = useMemo(() => {
    const map = {}
    allProgress?.forEach((item) => {
      map[item.id] = item.completed || false
    })
    return map
  }, [allProgress])
  
  const displayName = course?.name || className?.replace(/_/g, ' ')
  const isEnrolled = user?.role === 'admin' || licenses?.some((l) => l.content?.courseKey === className)
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
          <section className="min-w-0 bg-[#111318]">
            <div className="h-12 flex items-center gap-3 px-4 border-b border-white/10 text-white">
              <Link to="/app/library" className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center" aria-label="Back to my learning">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <div className="min-w-0">
                <h1 className="text-sm md:text-base font-bold truncate">{displayName}</h1>
                {activeLesson && <p className="text-[11px] text-white/50 truncate">{activeLesson.sectionName} / {activeLesson.title}</p>}
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

            <div className="bg-vigno-panel text-vigno-txt">
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

          <aside className={`${isDark ? 'bg-[#f6f7fb] text-slate-950' : 'bg-white text-slate-950'} border-l border-slate-200 min-h-full`}>
            <div className="sticky top-0 z-10 bg-inherit border-b border-slate-200">
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-black tracking-tight">Course content</h2>
                    <p className="text-xs text-slate-500 mt-1">{completedCount} / {lessons.length} lessons complete</p>
                  </div>
                  <Link to={`/app/${className}`} className="text-xs font-black text-blue-700 hover:underline">Details</Link>
                </div>
                <div className="mt-4 h-2 rounded-full bg-slate-200 overflow-hidden">
                  <div className="h-full bg-blue-700 rounded-full" style={{ width: `${progress}%` }} />
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {units.map((unit, unitIndex) => {
                const unitOpen = !!openUnits[unitIndex]
                const unitLessons = unit.sections.reduce((sum, section) => sum + section.items.length, 0)
                return (
                  <section key={`${unit.moduleId}-${unitIndex}`}>
                    <button
                      onClick={() => setOpenUnits((prev) => ({ ...prev, [unitIndex]: !prev[unitIndex] }))}
                      className="w-full px-5 py-4 flex items-start gap-3 text-left hover:bg-slate-50"
                    >
                      <Icon name="chevron" className={`w-4 h-4 mt-1 text-slate-600 transition-transform ${unitOpen ? 'rotate-90' : ''}`} />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-black leading-snug">Unit {unitIndex + 1}: {unit.title}</h3>
                        <p className="text-xs text-slate-500 mt-1">{unit.sections.length} section{unit.sections.length !== 1 ? 's' : ''} | {unitLessons} lesson{unitLessons !== 1 ? 's' : ''}</p>
                      </div>
                    </button>

                    {unitOpen && (
                      <div className="pb-2 bg-slate-50/60">
                        {unit.sections.map((section, sectionIndex) => {
                          const sectionKey = `${unitIndex}-${sectionIndex}`
                          const sectionOpen = !!openSections[sectionKey]
                          return (
                            <div key={sectionKey} className="border-t border-slate-200/70 first:border-t-0">
                              <button
                                onClick={() => setOpenSections((prev) => ({ ...prev, [sectionKey]: !prev[sectionKey] }))}
                                className="w-full pl-10 pr-5 py-3 flex items-start gap-2 text-left hover:bg-white"
                              >
                                <Icon name="chevron" className={`w-3.5 h-3.5 mt-1 text-slate-500 transition-transform ${sectionOpen ? 'rotate-90' : ''}`} />
                                <div className="min-w-0 flex-1">
                                  <h4 className="text-[13px] font-black leading-snug text-slate-800">Section {sectionIndex + 1}: {section.title}</h4>
                                  <p className="text-xs text-slate-500 mt-0.5">{section.items.length} resource{section.items.length !== 1 ? 's' : ''}</p>
                                </div>
                              </button>

                              {sectionOpen && (
                                <div className="pb-1 bg-white">
                                  {section.items.map((item, itemIndex) => {
                                    const meta = lessonMeta(item)
                                    const done = completionMap[item.id] || false
                                    const isTogglingCompletion = completionToggling[item.id]
                                    const selected = item.id === activeLesson?.id
                                    
                                    return (
                                      <div
                                        key={item.id}
                                        className={`w-full flex items-start gap-3 pl-14 pr-5 py-3 text-left transition-colors ${selected ? 'bg-blue-50' : 'hover:bg-blue-50/70'}`}
                                      >
                                        {/* Checkbox Button - Clickable */}
                                        <button
                                          type="button"
                                          onClick={() => {
                                            toggleCompletion(item.id)
                                          }}
                                          disabled={isTogglingCompletion}
                                          className={`flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 flex items-center justify-center transition-all cursor-pointer ${
                                            done
                                              ? 'bg-blue-700 border-blue-700 text-white'
                                              : 'border-slate-300 text-slate-400 hover:border-blue-500'
                                          } ${isTogglingCompletion ? 'opacity-50 cursor-wait' : ''} disabled:opacity-50`}
                                          title={done ? 'Mark as incomplete' : 'Mark as complete'}
                                        >
                                          {isTogglingCompletion ? (
                                            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                                              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                                              <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                          ) : done ? (
                                            <Icon name="check" className="w-3 h-3 fill-current" />
                                          ) : (
                                            <span />
                                          )}
                                        </button>
                                        
                                        {/* Lesson Title and Details - Clickable for Selection */}
                                        <button
                                          type="button"
                                          onClick={() => setActiveContentId(item.id)}
                                          className="flex-1 text-left min-w-0"
                                        >
                                          <span className={`block text-sm font-semibold leading-snug ${selected ? 'text-blue-800' : 'text-slate-800'}`}>
                                            {item.title}
                                          </span>
                                          <span className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                                            <Icon name={meta.icon} className="w-3.5 h-3.5" />
                                            {meta.label} | {meta.detail}
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
