import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

// Secure video player feeding a Plyr UI. Handles two source kinds:
//   • HLS streams (.m3u8) → adaptive playback via HLS.js (external demo streams)
//   • progressive files (e.g. uploaded MP4 served via a signed URL) → native <video>
// "Secure" touches: no download control, right-click disabled, watermark overlay.
export default function VideoPlayer({ src, watermark, onProgress }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    let hls
    // Signed URLs have no file extension, so an uploaded MP4 won't contain
    // ".m3u8" — those play natively. Only true HLS manifests go through HLS.js.
    const isHls = /\.m3u8(\?|$)/i.test(src)
    if (isHls && Hls.isSupported()) {
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src // native HLS (Safari/iOS)
    } else {
      video.src = src // progressive file (uploaded MP4, etc.)
    }

    const player = new Plyr(video, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
    })
    const blockMenu = (e) => e.preventDefault()
    video.addEventListener('contextmenu', blockMenu)

    // Report playback progress (throttled) for continue-watching.
    let last = 0
    const report = () => {
      if (!onProgress || !video.duration) return
      onProgress({ position: Math.floor(video.currentTime), duration: Math.floor(video.duration) })
    }
    const onTime = () => {
      const now = Date.now()
      if (now - last > 10_000) { last = now; report() }
    }
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('pause', report)
    video.addEventListener('ended', report)

    return () => {
      report()
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('pause', report)
      video.removeEventListener('ended', report)
      video.removeEventListener('contextmenu', blockMenu)
      player.destroy()
      if (hls) hls.destroy()
    }
  }, [src, onProgress])

  return (
    <div className="relative rounded-xl overflow-hidden">
      <video ref={videoRef} controlsList="nodownload" playsInline className="w-full" />
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-white/10 text-1xl font-extrabold -rotate-12 select-none">
          {watermark}
        </div>
      )}
    </div>
  )
}
