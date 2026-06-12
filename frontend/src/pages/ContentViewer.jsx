import { useEffect, useCallback, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useContentItem } from '../hooks/useContent'
import { useSiteSettings } from '../hooks/useSiteSettings'
import { discoverApi } from '../api/discoverApi'
import VideoPlayer from '../components/VideoPlayer'
import PdfViewer from '../components/PdfViewer'
import BuyButton from '../components/BuyButton'
import FavoriteButton from '../components/FavoriteButton'

// Lazy so Three.js is only downloaded when a 3D item is opened.
const Model3DViewer = lazy(() => import('../components/Model3DViewer'))

// Picks the right secure viewer based on content type, and gates paid content
// behind the buy flow (server-issued license unlocks it).
export default function ContentViewer() {
  const { className, moduleId, contentId } = useParams()
  const user = useSelector((s) => s.auth.user)
  const { data: item, isLoading, isError, refetch } = useContentItem(contentId)
  const { data: settings } = useSiteSettings()
  const launcher = settings?.launcher || {}
  // Prefer an admin-set external URL; else our own S3-hosted installer via the
  // public redirect endpoint (built off the API base so it works in any env).
  const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api'
  const launcherDownloadUrl = launcher.url || (launcher.hasInstaller ? `${apiBase}/settings/launcher-download` : '')

  const accessible = !!item && !item.locked && !item.requiresLauncher

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
  const backTo = className && moduleId ? `/app/${className}/module/${moduleId}` : '/app/library'
  const backLabel = className && moduleId ? 'Back to module' : 'Back to library'

  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">
        <Link to={backTo} className="text-vigno-accent2 hover:underline">{backLabel}</Link> › Viewer
      </div>
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
            <div className="text-vigno-muted max-w-md">
              This is premium content. Purchase a license to unlock secure access — you
              buy a <span className="text-vigno-txt font-semibold">license tied to your account</span>, not the file.
            </div>
            <BuyButton content={item} onUnlocked={refetch} />
          </div>
        )}

        {/* Download lane (software/games) → launcher */}
        {!item.locked && item.requiresLauncher && (
          <div className="py-10 flex flex-col items-center justify-center text-vigno-muted text-center gap-4">
            <div className="text-5xl">🎮</div>
            <div className="max-w-md">
              You own this. Download &amp; run it through the secure desktop launcher — the
              license + device binding are verified before it decrypts.
            </div>
            {launcherDownloadUrl ? (
              <div className="flex flex-col items-center gap-1.5">
                <a
                  href={launcherDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-vigno-accent text-[#1a0d0f] font-bold px-5 py-2.5 rounded-lg text-sm hover:brightness-110 inline-flex items-center gap-2"
                >
                  ⬇ Install the Launcher{launcher.version ? ` (v${launcher.version})` : ''}
                </a>
                <span className="text-xs text-vigno-muted">
                  Already installed? Open <b>Vigno Launcher</b> and sign in to download this title.
                </span>
              </div>
            ) : (
              <span className="text-xs text-vigno-muted">
                The launcher download isn’t set up yet — an admin can add it under <b>Admin → Site Settings → Desktop Launcher</b>.
              </span>
            )}
          </div>
        )}

        {/* Unlocked stream content */}
        {accessible && (
          <>
            {item.type === 'video' && <VideoPlayer src={item.src} watermark={watermark} onProgress={onProgress} />}
            {item.type === 'pdf' && (
              <div className="bg-white rounded-xl p-3 max-h-[70vh] overflow-auto">
                <PdfViewer url={item.url} watermark={watermark} />
              </div>
            )}
            {item.type === '3d' && (
              <Suspense fallback={<div className="h-72 flex items-center justify-center text-vigno-muted">Loading 3D viewer…</div>}>
                <Model3DViewer src={item.url} watermark={watermark} />
              </Suspense>
            )}
            {item.type === 'game' && (
              <div className="h-72 flex flex-col items-center justify-center text-vigno-muted text-center">
                <div className="text-5xl mb-2">🎮</div>
                <div>Simulation launches via the secure desktop launcher.</div>
              </div>
            )}
          </>
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
