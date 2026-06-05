import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useContentItem } from '../hooks/useContent'
import VideoPlayer from '../components/VideoPlayer'
import PdfViewer from '../components/PdfViewer'
import BuyButton from '../components/BuyButton'

// Picks the right secure viewer based on content type, and gates paid content
// behind the buy flow (server-issued license unlocks it).
export default function ContentViewer() {
  const { className, moduleId, contentId } = useParams()
  const user = useSelector((s) => s.auth.user)
  const { data: item, isLoading, isError, refetch } = useContentItem(contentId)

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
      <h1 className="text-2xl mb-1">{item.title}</h1>
      <div className="text-xs text-vigno-muted mb-4 capitalize">
        {item.type} ·{' '}
        {item.type === 'video' ? 'HLS adaptive stream (Plyr + HLS.js)'
          : item.type === 'pdf' ? 'PDF.js — download disabled'
          : 'preview'}
        {item.paid && <> · <span className="text-vigno-accent2">{item.locked ? 'Locked' : 'Owned'}</span></>}
      </div>

      <div className="max-w-4xl bg-vigno-card border border-vigno-line rounded-2xl p-4">
        {/* Locked paid content → buy to unlock */}
        {item.locked && (
          <div className="h-72 flex flex-col items-center justify-center gap-4 text-center">
            <div className="text-5xl">🔒</div>
            <div className="text-vigno-muted max-w-md">
              This is premium content. Purchase a license to unlock secure access — you
              buy a <span className="text-vigno-txt font-semibold">license tied to your account</span>, not the file.
            </div>
            <BuyButton content={item} onUnlocked={refetch} />
          </div>
        )}

        {/* Download lane (software/games) → launcher */}
        {!item.locked && item.requiresLauncher && (
          <div className="h-72 flex flex-col items-center justify-center text-vigno-muted text-center">
            <div className="text-5xl mb-2">🎮</div>
            <div className="max-w-md">
              You own this. Download &amp; run it through the secure desktop launcher — the
              license + device binding are verified before it decrypts.
            </div>
          </div>
        )}

        {/* Unlocked stream content */}
        {!item.locked && !item.requiresLauncher && (
          <>
            {item.type === 'video' && <VideoPlayer src={item.src} watermark={watermark} />}
            {item.type === 'pdf' && (
              <div className="bg-white rounded-xl p-3 max-h-[70vh] overflow-auto">
                <PdfViewer url={item.url} watermark={watermark} />
              </div>
            )}
            {item.type === '3d' && (
              <div className="h-72 flex flex-col items-center justify-center text-vigno-muted">
                <div className="text-5xl mb-2">✈</div>
                <div>Interactive 3D aviation model.</div>
              </div>
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

      {!item.locked && !item.requiresLauncher && (
        <p className="text-xs text-vigno-muted mt-3">
          🔐 Watermarked: {watermark} &nbsp;·&nbsp; download disabled &nbsp;·&nbsp; streamed via short-lived signed URL, not stored
        </p>
      )}
    </div>
  )
}
