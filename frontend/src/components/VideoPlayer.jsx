import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

// ── Inline icons (crisp, inherit text color) ─────────────────────────────────
const Play = () => (<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>)
const Pause = () => (<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z" /></svg>)
const Stroke = ({ children }) => (<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>)
const Back10 = () => (<span className="inline-flex items-center gap-0.5"><Stroke><polyline points="1 4 1 10 7 10" /><path d="M3.5 15a9 9 0 1 0 2.1-9.4L1 10" /></Stroke><span className="text-[11px] font-bold">10</span></span>)
const Fwd10 = () => (<span className="inline-flex items-center gap-0.5"><span className="text-[11px] font-bold">10</span><Stroke><polyline points="23 4 23 10 17 10" /><path d="M20.5 15a9 9 0 1 1-2.1-9.4L23 10" /></Stroke></span>)
const VolHigh = () => (<Stroke><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a9 9 0 0 1 0 14" /></Stroke>)
const VolMute = () => (<Stroke><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></Stroke>)
const Gear = () => (<Stroke><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></Stroke>)
const FsEnter = () => (<Stroke><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3" /></Stroke>)
const FsExit = () => (<Stroke><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" /></Stroke>)

const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00'
  s = Math.floor(s)
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), ss = s % 60
  const mm = h ? String(m).padStart(2, '0') : m
  return `${h ? h + ':' : ''}${mm}:${String(ss).padStart(2, '0')}`
}

// Secure video player with a custom control bar (play/pause · −10s/+10s · seek ·
// volume · time · quality · fullscreen). HLS (.m3u8) via HLS.js with a quality
// picker; uploaded MP4 plays natively. Secure touches: drifting email watermark,
// no download/right-click, throttled progress reporting.
export default function VideoPlayer({ src, watermark, onProgress }) {
  const videoRef = useRef(null)
  const containerRef = useRef(null)
  const hlsRef = useRef(null)
  const hideTimer = useRef(null)

  const [wmPos, setWmPos] = useState({ top: '12%', left: '8%' })
  const [wmShow, setWmShow] = useState(true)
  const [levels, setLevels] = useState([])
  const [selected, setSelected] = useState(-1)
  const [activeHeight, setActiveHeight] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const [playing, setPlaying] = useState(false)
  const [current, setCurrent] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [showCtrl, setShowCtrl] = useState(true)
  const [isFs, setIsFs] = useState(false)

  // Drifting anti-piracy watermark (discrete relocations, not continuous motion).
  useEffect(() => {
    if (!watermark) return
    let fadeTimer
    const relocate = () => {
      setWmShow(false)
      fadeTimer = setTimeout(() => {
        setWmPos({ top: `${8 + Math.random() * 72}%`, left: `${5 + Math.random() * 62}%` })
        setWmShow(true)
      }, 400)
    }
    const id = setInterval(relocate, 5000)
    return () => { clearInterval(id); clearTimeout(fadeTimer) }
  }, [watermark])

  // Load the source (HLS.js or native) and wire media events.
  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    let hls
    setLevels([]); setSelected(-1); setActiveHeight(null); setMenuOpen(false)

    const isHls = /\.m3u8(\?|$)/i.test(src)
    if (isHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true })
      hlsRef.current = hls
      hls.loadSource(src)
      hls.attachMedia(video)
      hls.on(Hls.Events.MANIFEST_PARSED, () => setLevels(hls.levels.map((l, i) => ({ index: i, height: l.height || 0 }))))
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => { const l = hls.levels[d.level]; if (l) setActiveHeight(l.height) })
      hls.on(Hls.Events.ERROR, (_e, d) => {
        if (!d.fatal) return
        if (d.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad()
        else if (d.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError()
      })
    } else {
      video.src = src
    }

    const onLoaded = () => { setDuration(video.duration); setVolume(video.volume); setMuted(video.muted) }
    const onTimeRaw = () => setCurrent(video.currentTime)
    const onPlay = () => setPlaying(true)
    const onPause = () => setPlaying(false)
    const onVol = () => { setVolume(video.volume); setMuted(video.muted) }
    const blockMenu = (e) => e.preventDefault()

    // Throttled progress report for continue-watching.
    let last = 0
    const report = () => { if (onProgress && video.duration) onProgress({ position: Math.floor(video.currentTime), duration: Math.floor(video.duration) }) }
    const onTime = () => { onTimeRaw(); const now = Date.now(); if (now - last > 10_000) { last = now; report() } }

    video.addEventListener('loadedmetadata', onLoaded)
    video.addEventListener('durationchange', onLoaded)
    video.addEventListener('timeupdate', onTime)
    video.addEventListener('play', onPlay)
    video.addEventListener('pause', onPause)
    video.addEventListener('ended', report)
    video.addEventListener('volumechange', onVol)
    video.addEventListener('contextmenu', blockMenu)

    return () => {
      report()
      video.removeEventListener('loadedmetadata', onLoaded)
      video.removeEventListener('durationchange', onLoaded)
      video.removeEventListener('timeupdate', onTime)
      video.removeEventListener('play', onPlay)
      video.removeEventListener('pause', onPause)
      video.removeEventListener('ended', report)
      video.removeEventListener('volumechange', onVol)
      video.removeEventListener('contextmenu', blockMenu)
      if (hls) hls.destroy()
      hlsRef.current = null
      video.removeAttribute('src'); video.load()
    }
  }, [src, onProgress])

  useEffect(() => {
    const onFs = () => setIsFs(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Auto-hide controls while playing + mouse idle; always show when paused.
  const poke = useCallback(() => {
    setShowCtrl(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setShowCtrl(false) }, 2600)
  }, [])
  useEffect(() => { if (!playing) { clearTimeout(hideTimer.current); setShowCtrl(true) } else poke() }, [playing, poke])

  const togglePlay = () => { const v = videoRef.current; if (!v) return; v.paused ? v.play() : v.pause() }
  const skip = (d) => { const v = videoRef.current; if (!v) return; v.currentTime = Math.max(0, Math.min(Number.isFinite(v.duration) ? v.duration : Infinity, v.currentTime + d)) }
  const seek = (e) => { const v = videoRef.current; if (v) v.currentTime = Number(e.target.value) }
  const setVol = (e) => { const v = videoRef.current; if (!v) return; const val = Number(e.target.value); v.volume = val; v.muted = val === 0 }
  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted }
  const toggleFs = () => { const el = containerRef.current; if (!document.fullscreenElement) el?.requestFullscreen?.(); else document.exitFullscreen?.() }
  const pickQuality = (idx) => { if (hlsRef.current) hlsRef.current.currentLevel = idx; setSelected(idx); setMenuOpen(false) }

  const playedPct = duration ? (current / duration) * 100 : 0
  const qualityLabel = selected === -1 ? (activeHeight ? `Auto ${activeHeight}p` : 'Auto') : `${levels.find((l) => l.index === selected)?.height}p`

  return (
    <div
      ref={containerRef}
      className={`relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-lg ${showCtrl ? '' : 'cursor-none'}`}
      onMouseMove={poke}
      onMouseLeave={() => { if (playing) setShowCtrl(false) }}
    >
      <video
        ref={videoRef}
        playsInline
        onClick={togglePlay}
        onDoubleClick={toggleFs}
        className="absolute inset-0 w-full h-full object-contain bg-black"
      />

      {/* Center play button when paused */}
      {!playing && (
        <button onClick={togglePlay} aria-label="Play" className="absolute inset-0 z-10 flex items-center justify-center">
          <span className="bg-black/45 hover:bg-black/60 transition rounded-full p-4 text-white">
            <svg viewBox="0 0 24 24" width="34" height="34" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          </span>
        </button>
      )}

      {/* Drifting watermark */}
      {watermark && (
        <div
          className="pointer-events-none absolute z-10 select-none whitespace-nowrap text-white/20 text-[10px] font-medium tracking-wide transition-opacity duration-300"
          style={{ top: wmPos.top, left: wmPos.left, opacity: wmShow ? 1 : 0, textShadow: '0 1px 3px rgba(0,0,0,0.65)' }}
        >
          {watermark}
        </div>
      )}

      {/* Control bar */}
      <div
        className={`absolute inset-x-0 bottom-0 z-20 px-3 pb-2 pt-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent transition-opacity duration-200 ${showCtrl ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
      >
        <input
          type="range" className="vp-range vp-seek w-full block" min="0" max={duration || 0} step="0.1" value={current}
          style={{ '--pct': `${playedPct}%` }} onChange={seek} aria-label="Seek"
        />
        <div className="flex items-center gap-1.5 mt-2 text-white">
          <button onClick={togglePlay} className="vp-btn" aria-label={playing ? 'Pause' : 'Play'}>{playing ? <Pause /> : <Play />}</button>
          <button onClick={() => skip(-10)} className="vp-btn" title="Back 10 seconds"><Back10 /></button>
          <button onClick={() => skip(10)} className="vp-btn" title="Forward 10 seconds"><Fwd10 /></button>
          <div className="flex items-center gap-1">
            <button onClick={toggleMute} className="vp-btn" aria-label="Mute">{muted || volume === 0 ? <VolMute /> : <VolHigh />}</button>
            <input type="range" className="vp-range w-16 hidden sm:block" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={setVol} aria-label="Volume" />
          </div>
          <span className="text-xs tabular-nums ml-1 text-white/90">{fmt(current)} / {fmt(duration)}</span>
          <div className="flex-1" />
          {levels.length > 1 && (
            <div className="relative">
              <button onClick={() => setMenuOpen((o) => !o)} className="vp-btn text-xs gap-1.5"><Gear /> <span className="hidden sm:inline">{qualityLabel}</span></button>
              {menuOpen && (
                <div className="absolute bottom-full right-0 mb-2 bg-black/90 rounded-lg overflow-hidden min-w-[96px] shadow-xl py-1">
                  <button onClick={() => pickQuality(-1)} className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-white/15 ${selected === -1 ? 'text-vigno-accent font-semibold' : 'text-white'}`}>Auto{selected === -1 && activeHeight ? ` (${activeHeight}p)` : ''}</button>
                  {levels.slice().sort((a, b) => b.height - a.height).map((l) => (
                    <button key={l.index} onClick={() => pickQuality(l.index)} className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-white/15 ${selected === l.index ? 'text-vigno-accent font-semibold' : 'text-white'}`}>{l.height}p</button>
                  ))}
                </div>
              )}
            </div>
          )}
          <button onClick={toggleFs} className="vp-btn" aria-label="Fullscreen">{isFs ? <FsExit /> : <FsEnter />}</button>
        </div>
      </div>
    </div>
  )
}
