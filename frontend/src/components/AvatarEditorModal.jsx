import { useEffect, useRef, useState } from 'react'

const OUT = 256 // exported avatar resolution (square)
const VIEW = 288 // on-screen canvas size (CSS px)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * "Adjust Your Photo" — drag to reposition, zoom + rotate, circular crop.
 * Exports a cropped JPEG data URL. Props: file (File), onCancel(), onApply(dataUrl).
 */
export default function AvatarEditorModal({ file, onCancel, onApply }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const dragRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotate, setRotate] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 }) // pan, in canvas px

  // Load the chosen file into an Image.
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { imgRef.current = img; setOffset({ x: 0, y: 0 }); setZoom(1); setRotate(0); setReady(true) }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Redraw on any change (guarded so a draw hiccup can never blank the page).
  useEffect(() => {
    const cv = canvasRef.current
    const img = imgRef.current
    if (!cv || !img || !ready) return
    try {
      const ctx = cv.getContext('2d')
      ctx.clearRect(0, 0, OUT, OUT)
      ctx.fillStyle = '#0b1220'
      ctx.fillRect(0, 0, OUT, OUT)
      ctx.save()
      ctx.translate(OUT / 2 + offset.x, OUT / 2 + offset.y)
      ctx.rotate((rotate * Math.PI) / 180)
      const cover = Math.max(OUT / img.width, OUT / img.height)
      const s = cover * zoom
      ctx.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s)
      ctx.restore()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('[avatar] draw failed', err)
    }
  }, [zoom, rotate, offset, ready])

  // Drag to reposition (pointer = mouse + touch). preventDefault stops the
  // browser's native image-drag (which could otherwise navigate away).
  const onDown = (e) => {
    e.preventDefault()
    dragRef.current = { x: e.clientX, y: e.clientY }
    try { e.currentTarget.setPointerCapture?.(e.pointerId) } catch { /* ignore */ }
  }
  const onMove = (e) => {
    if (!dragRef.current) return
    e.preventDefault()
    const k = OUT / VIEW // canvas px per CSS px
    const dx = (e.clientX - dragRef.current.x) * k
    const dy = (e.clientY - dragRef.current.y) * k
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) return
    setOffset((o) => ({ x: o.x + dx, y: o.y + dy }))
    dragRef.current = { x: e.clientX, y: e.clientY }
  }
  const onUp = () => { dragRef.current = null }

  const apply = () => onApply(canvasRef.current.toDataURL('image/jpeg', 0.9))

  const sliderCls = 'flex-1 accent-vigno-accent cursor-pointer'
  const iconBtn = 'text-vigno-muted hover:text-vigno-accent2 w-6 text-center text-lg'

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-vigno-panel border border-vigno-line rounded-2xl w-[420px] max-w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-vigno-line">
          <h3 className="font-bold">Adjust Your Photo</h3>
          <button onClick={onCancel} className="text-vigno-muted hover:text-vigno-txt text-lg leading-none">✕</button>
        </div>

        {/* Canvas + circular crop guide (drag to move) */}
        <div className="bg-black grid place-items-center py-5">
          <div className="relative" style={{ width: VIEW, height: VIEW }}>
            <canvas
              ref={canvasRef}
              width={OUT}
              height={OUT}
              draggable={false}
              onDragStart={(e) => e.preventDefault()}
              style={{ width: VIEW, height: VIEW, touchAction: 'none', userSelect: 'none' }}
              className="block cursor-grab active:cursor-grabbing select-none"
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerLeave={onUp}
            />
            <div className="absolute inset-0 m-auto rounded-full pointer-events-none"
              style={{ width: 240, height: 240, border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }} />
            {!ready && <div className="absolute inset-0 grid place-items-center text-vigno-muted text-sm">Loading…</div>}
          </div>
        </div>
        <p className="text-center text-xs text-vigno-muted -mt-2 mb-1">✋ Drag the photo to reposition</p>

        {/* Controls */}
        <div className="px-5 py-3 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-vigno-accent2 font-medium">🔍 Zoom</span>
              <span className="text-vigno-muted">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z - 0.1, 1, 3))}>−</button>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className={sliderCls} />
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z + 0.1, 1, 3))}>+</button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-vigno-accent2 font-medium">🔄 Rotate</span>
              <span className="text-vigno-muted">{rotate}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button className={iconBtn} onClick={() => setRotate((r) => clamp(r - 90, -180, 180))}>↺</button>
              <input type="range" min="-180" max="180" step="1" value={rotate} onChange={(e) => setRotate(Number(e.target.value))} className={sliderCls} />
              <button className={iconBtn} onClick={() => setRotate((r) => clamp(r + 90, -180, 180))}>↻</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5 pt-1">
          <button onClick={onCancel}
            className="flex-1 border border-vigno-line text-vigno-txt rounded-xl py-2.5 text-sm font-medium hover:bg-white/5">
            Cancel
          </button>
          <button onClick={apply} disabled={!ready}
            className="flex-1 bg-vigno-accent text-[#1a0d0f] font-bold rounded-xl py-2.5 text-sm shadow-lg shadow-vigno-accent/20 hover:brightness-110 disabled:opacity-60">
            ✓ Apply &amp; Upload
          </button>
        </div>
      </div>
    </div>
  )
}
