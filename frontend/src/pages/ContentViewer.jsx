import { useState, useEffect, useCallback, lazy, Suspense } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useContentItem } from '../hooks/useContent'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { discoverApi } from '../api/discoverApi'
import BuyButton from '../components/BuyButton'
import FavoriteButton from '../components/FavoriteButton'

// Lazy-load the heavy media viewers so each library (hls.js ≈ video, pdfjs ≈ pdf,
// three.js ≈ 3d) is fetched ONLY when its content type is actually opened. This
// keeps the ContentViewer chunk small instead of bundling all three together.
const VideoPlayer = lazy(() => import('../components/VideoPlayer'))
const PdfViewer = lazy(() => import('../components/PdfViewer'))
const Model3DViewer = lazy(() => import('../components/Model3DViewer'))

// Picks the right secure viewer based on content type, and gates paid content
// behind the buy flow (server-issued license unlocks it).
export default function ContentViewer() {
  const { className, moduleId, contentId } = useParams()
  const [searchParams] = useSearchParams()
  // ?play=1 — used when arriving from "Resume Learning" in My Learning (an
  // owned resource): jump straight into the player instead of the landing/
  // details page a first-time visitor would want to see.
  const autoplay = searchParams.get('play') === '1'
  const user = useSelector((s) => s.auth.user)
  const isDark = useSelector((s) => s.ui.theme) === 'dark'
  const [showViewer, setShowViewer] = useState(false)
  const { data: item, isLoading, isError, refetch } = useContentItem(contentId)
  const { data: settings } = useSiteSettings()
  const launcher = settings?.launcher || {}
  // Prefer an admin-set external URL; else our own S3-hosted installer via the
  // public redirect endpoint (built off the API base so it works in any env).
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
  const launcherDownloadUrl = launcher.url || (launcher.hasInstaller ? `${apiBase}/settings/launcher-download` : '')

  const accessible = !!item && !item.locked && !item.requiresLauncher
  const isStandalone = !!item && !item.courseKey
  const showLanding = isStandalone && !showViewer

  // Owned resource opened with ?play=1 → skip the landing page entirely.
  useEffect(() => {
    if (accessible && autoplay && !showViewer) setShowViewer(true)
  }, [accessible, autoplay, showViewer])

  // Record a view (recently-viewed / continue-watching) when accessible content opens.
  useEffect(() => {
    if (accessible && contentId) discoverApi.saveProgress(contentId, {}).catch(() => {})
  }, [accessible, contentId])

  // Throttled video progress reporting.
  const onProgress = useCallback(
    (p) => { discoverApi.saveProgress(contentId, p).catch(() => {}) },
    [contentId]
  )

  if (isLoading) return <p className="text-vigno-muted">Opening content…</p>
  if (isError || !item) return <p className="text-red-300">Content not found.</p>

  const watermark = user?.email || 'aerolearn'
  const isAdmin = user?.role === 'admin'
  const backTo = isAdmin ? '/app/admin' : (className && moduleId ? `/app/${className}/module/${moduleId}` : '/app/library')
  const backLabel = isAdmin ? 'Back to Admin Dashboard' : (className && moduleId ? 'Back to module' : 'Back to library')

  if (showLanding) {
    const displayName = item.title
    const resourceTypeLabel = { pdf: 'PDF', video: 'Video', game: 'Simulator', '3d': '3D Model', apk: 'Android App' }[item.type] || item.type

    return (
      <div className="space-y-8 pb-16">
        <div className="text-sm text-vigno-muted">
          <Link to="/app" className="text-vigno-accent2 hover:underline">Dashboard</Link> › {displayName}
        </div>

        {/* Udemy-style Hero Banner */}
        <div className={`-mx-6 px-6 py-10 border-y ${isDark ? 'bg-gradient-to-r from-[#0d1627] to-[#12233f] border-vigno-line/30' : 'bg-gradient-to-r from-slate-100 via-slate-50 to-white border-vigno-line/50'} text-vigno-txt`}>
          <div className="max-w-4xl space-y-4">
            <div className="flex gap-2 flex-wrap">
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-vigno-accent/20 text-vigno-accent border border-vigno-accent/25">
                Resource
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-md bg-vigno-accent2/20 text-vigno-accent2 border border-vigno-accent2/25">
                {resourceTypeLabel}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-none text-vigno-txt">
              {displayName}
            </h1>

            {item.previewText && (
              <p className="text-base font-medium text-vigno-muted max-w-3xl leading-relaxed">
                {item.previewText}
              </p>
            )}

            <div className="text-xs text-vigno-muted flex flex-wrap gap-x-4 gap-y-1 pt-1.5 font-medium">
              <p>Created by <span className="text-vigno-accent2 font-bold hover:underline cursor-pointer">AeroLearn Experts</span></p>
              <p>·</p>
              <p>Last updated June 2026</p>
              <p>·</p>
              <p>English</p>
            </div>
          </div>
        </div>

        {/* Main Content & Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* Details */}
          <div className="lg:col-span-2 space-y-8">
            <div className={`border p-6 rounded-2xl ${isDark ? 'bg-vigno-card/30 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-sm'}`}>
              <h3 className="text-lg font-extrabold text-vigno-txt mb-4 tracking-tight">About this resource</h3>
              <div className="text-sm md:text-[15px] text-vigno-txt/85 leading-relaxed space-y-4">
                {item.description ? (
                  item.description.split(/\r?\n/).map(p => p.trim()).filter(Boolean).map((para, idx) => (
                    <p key={idx}>{para}</p>
                  ))
                ) : (
                  <p>No description available for this resource.</p>
                )}
              </div>
            </div>
          </div>

          {/* Checkout card */}
          <div className="lg:col-span-1">
            <div className={`sticky top-6 border rounded-2xl overflow-hidden ${isDark ? 'bg-vigno-card/75 border-vigno-line/50' : 'bg-white border-vigno-line/60 shadow-md'}`}>
              {/* Thumbnail */}
              <div className={`aspect-video w-full relative flex items-center justify-center border-b ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/40'} overflow-hidden bg-slate-900`}>
                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt={displayName} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 to-indigo-950" />
                )}
                <div className="absolute inset-0 bg-black/20" />
                <div className="relative w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 border border-white/25 flex items-center justify-center cursor-pointer transition-colors shadow-lg z-10">
                  <span className="text-white text-xl pl-1">▶</span>
                </div>
              </div>

              <div className="p-6 space-y-5">
                {!item.locked ? (
                  <div className="space-y-3">
                    <div className="text-xs text-center text-green-400 font-bold bg-green-500/10 border border-green-500/20 py-2 rounded-lg">
                      ✓ You own this resource
                    </div>
                    <button
                      onClick={() => setShowViewer(true)}
                      className="w-full bg-vigno-accent hover:brightness-115 text-vigno-accent-txt font-black py-3 rounded-xl text-sm transition-all focus:outline-none"
                    >
                      View Resource
                    </button>
                  </div>
                ) : (
                  <BuyButton content={item} onUnlocked={refetch} />
                )}

                {/* Inclusions */}
                <div className="space-y-2 pt-2 border-t border-vigno-line/20">
                  <p className="text-xs font-bold text-vigno-txt">This resource includes:</p>
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
                      <span>Secure offline player license</span>
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

  return (
    <div>
      {isStandalone ? (
        <div className="text-sm text-vigno-muted mb-1">
          <span
            onClick={() => setShowViewer(false)}
            className="text-vigno-accent2 hover:underline cursor-pointer"
          >
            ← Back to Details
          </span>
        </div>
      ) : (
        <div className="text-sm text-vigno-muted mb-1">
          <Link to={backTo} className="text-vigno-accent2 hover:underline">{backLabel}</Link> › Viewer
        </div>
      )}
      <h1 className="text-2xl mb-1 flex items-center gap-2">
        {item.title}
        <FavoriteButton contentId={item.id} className="text-2xl" />
      </h1>
      <div className="text-xs text-vigno-muted mb-4 capitalize">
        {item.type} ·{' '}
        {item.type === 'video' ? (item.hls ? 'Adaptive HLS · secure stream' : 'Secure video stream')
          : item.type === 'pdf' ? 'PDF.js — download disabled'
          : 'preview'}
        {item.paid && <> · <span className="text-vigno-accent2">{item.locked ? 'Locked' : 'Owned'}</span></>}
      </div>

      <div className="max-w-4xl bg-vigno-card border border-vigno-line rounded-2xl p-4">
        {/* Locked paid content → buy to unlock */}
        {item.locked && (
          <div className="py-10 flex flex-col items-center gap-4 text-center">
            <div className="text-5xl leading-none">🔒</div>
            {item.courseKey ? (
              <div className="space-y-4 max-w-md mx-auto">
                <div className="text-vigno-muted">
                  This lesson is part of the course <span className="text-vigno-txt font-extrabold">{item.courseKey.replace(/_/g, ' ')}</span>.
                  Individual purchases are disabled for course curriculum items. To access this lesson, please purchase the full course.
                </div>
                <Link
                  to={`/app/${item.courseKey}`}
                  className="inline-block bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black px-6 py-2.5 rounded-xl text-sm transition-all focus:outline-none"
                >
                  Go to Course Page
                </Link>
              </div>
            ) : (
              <>
                <div className="text-vigno-muted max-w-md">
                  This is premium content. Purchase a license to unlock secure access — you
                  buy a <span className="text-vigno-txt font-semibold">license tied to your account</span>, not the file.
                </div>
                <BuyButton content={item} onUnlocked={refetch} />
              </>
            )}
          </div>
        )}

        {/* Download lane (software / Android apps) → secure launcher */}
        {!item.locked && item.requiresLauncher && (
          <div className="py-10 flex flex-col items-center justify-center text-vigno-muted text-center gap-4">
            <div className="text-5xl">{item.type === 'apk' ? '📱' : '🎮'}</div>
            <div className="max-w-md">
              {item.type === 'apk' ? (
                <>You own this Android app. It’s stored <b>encrypted</b> and locked to your
                registered device — the embedded <b>LicenseGuard</b> verifies your license before
                it runs.</>
              ) : (
                <>You own this. Download &amp; run it through the secure desktop launcher — the
                license + device binding are verified before it decrypts.</>
              )}
            </div>
            {launcherDownloadUrl ? (
              <div className="flex flex-col items-center gap-1.5">
                <a
                  href={launcherDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-vigno-accent text-[#1a0d0f] font-bold px-5 py-2.5 rounded-lg text-sm hover:brightness-110 inline-flex items-center gap-2"
                >
                  ⬇ {item.type === 'apk' ? 'Get the Vigno Android App' : `Install the Launcher${launcher.version ? ` (v${launcher.version})` : ''}`}
                </a>
                <span className="text-xs text-vigno-muted">
                  {item.type === 'apk' ? (
                    <>Install the Vigno app on your registered Android device and sign in to download this title.</>
                  ) : (
                    <>Already installed? Open <b>Vigno Launcher</b> and sign in to download this title.</>
                  )}
                </span>
              </div>
            ) : (
              <span className="text-xs text-vigno-muted">
                {item.type === 'apk' ? (
                  <>The Android app delivery isn’t set up yet — an admin can add it under <b>Admin → Site Settings</b>.</>
                ) : (
                  <>The launcher download isn’t set up yet — an admin can add it under <b>Admin → Site Settings → Desktop Launcher</b>.</>
                )}
              </span>
            )}
          </div>
        )}

        {/* Unlocked stream content */}
        {accessible && (
          <Suspense fallback={<div className="h-72 flex items-center justify-center text-vigno-muted">Loading viewer…</div>}>
            {item.type === 'video' && <VideoPlayer src={item.src} watermark={watermark} onProgress={onProgress} />}
            {item.type === 'pdf' && (
              <div className="bg-white rounded-xl p-3 max-h-[70vh] overflow-auto">
                <PdfViewer url={item.url} watermark={watermark} />
              </div>
            )}
            {item.type === '3d' && <Model3DViewer src={item.url} watermark={watermark} />}
            {item.type === 'game' && (
              <div className="h-72 flex flex-col items-center justify-center text-vigno-muted text-center">
                <div className="text-5xl mb-2">🎮</div>
                <div>Simulation launches via the secure desktop launcher.</div>
              </div>
            )}
            {item.type === 'apk' && (
              <div className="h-72 flex flex-col items-center justify-center text-vigno-muted text-center">
                <div className="text-5xl mb-2">📱</div>
                <div>Install this app on your registered Android device via the Vigno app.</div>
              </div>
            )}
          </Suspense>
        )}
      </div>

      {accessible && (
        <p className="text-xs text-vigno-muted mt-3">
          🔐 Watermarked: {watermark} &nbsp;·&nbsp; download disabled &nbsp;·&nbsp; streamed via short-lived signed URL, not stored
        </p>
      )}
    </div>
  )
}
