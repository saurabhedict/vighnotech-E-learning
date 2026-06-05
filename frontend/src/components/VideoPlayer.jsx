import { useEffect, useRef } from 'react'
import Hls from 'hls.js'
import Plyr from 'plyr'
import 'plyr/dist/plyr.css'

// Secure adaptive video: HLS.js feeds an .m3u8 stream into a Plyr player.
// "Secure" touches: no download control, right-click disabled, watermark overlay.
export default function VideoPlayer({ src, watermark }) {
  const videoRef = useRef(null)

  useEffect(() => {
    const video = videoRef.current
    let hls
    if (Hls.isSupported()) {
      hls = new Hls()
      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = src // native HLS (Safari/iOS)
    }

    const player = new Plyr(video, {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
    })
    const blockMenu = (e) => e.preventDefault()
    video.addEventListener('contextmenu', blockMenu)

    return () => {
      video.removeEventListener('contextmenu', blockMenu)
      player.destroy()
      if (hls) hls.destroy()
    }
  }, [src])

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
