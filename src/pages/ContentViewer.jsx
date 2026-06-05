import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useContentItem } from '../hooks/useContent'
import VideoPlayer from '../components/VideoPlayer'
import PdfViewer from '../components/PdfViewer'

// Picks the right secure viewer based on content type.
export default function ContentViewer() {
  const { className, moduleId, contentId } = useParams()
  const user = useSelector((s) => s.auth.user)
  const { data: item, isLoading, isError } = useContentItem(contentId)
  const displayName = className?.replace(/_/g, ' ')

  if (isLoading) return <p className="text-vigno-muted">Opening content…</p>
  if (isError || !item) return <p className="text-red-300">Content not found.</p>

  const watermark = user?.email || 'aerolearn'

  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">
        <Link to={`/app/${className}/module/${moduleId}`} className="text-vigno-accent2 hover:underline">Back to module</Link> › Viewer
      </div>
      <h1 className="text-2xl mb-1">{item.title}</h1>
      <div className="text-xs text-vigno-muted mb-4 capitalize">
        {item.type} · {item.type === 'video' ? 'HLS adaptive stream (Plyr + HLS.js)' : item.type === 'pdf' ? 'PDF.js — download disabled' : 'preview'}
      </div>

      <div className="max-w-4xl bg-vigno-card border border-vigno-line rounded-2xl p-4">
        {item.type === 'video' && <VideoPlayer src={item.src} watermark={watermark} />}
        {item.type === 'pdf' && (
          <div className="bg-white rounded-xl p-3 max-h-[70vh] overflow-auto">
            <PdfViewer url={item.url} watermark={watermark} />
          </div>
        )}
        {(item.type === 'game' || item.type === '3d') && (
          <div className="h-72 flex flex-col items-center justify-center text-vigno-muted">
            <div className="text-5xl mb-2">{item.type === 'game' ? '🎮' : '✈'}</div>
            <div>{item.type === 'game' ? 'Simulation launches via the secure launcher.' : 'Interactive 3D aviation model.'}</div>
          </div>
        )}
      </div>

      <p className="text-xs text-vigno-muted mt-3">
        🔐 Watermarked: {watermark} &nbsp;·&nbsp; download disabled &nbsp;·&nbsp; streamed, not stored
      </p>
    </div>
  )
}
