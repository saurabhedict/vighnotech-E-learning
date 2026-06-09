import { useEffect, useRef, useState } from 'react'

const OUT = 256 // exported avatar resolution (square)
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v))

/**
 * "Adjust Your Photo" modal: zoom + rotate + circular crop, exported as a
 * cropped JPEG data URL. Props: file (File), onCancel(), onApply(dataUrl).
 */
export default function AvatarEditorModal({ file, onCancel, onApply }) {
  const canvasRef = useRef(null)
  const imgRef = useRef(null)
  const [ready, setReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [rotate, setRotate] = useState(0)

  // Load the chosen file into an Image.
  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { imgRef.current = img; setReady(true) }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Redraw on any change.
  useEffect(() => {
    const cv = canvasRef.current
    const img = imgRef.current
    if (!cv || !img || !ready) return
    const ctx = cv.getContext('2d')
    ctx.clearRect(0, 0, OUT, OUT)
    ctx.fillStyle = '#0b0b0b'
    ctx.fillRect(0, 0, OUT, OUT)
    ctx.save()
    ctx.translate(OUT / 2, OUT / 2)
    ctx.rotate((rotate * Math.PI) / 180)
    const cover = Math.max(OUT / img.width, OUT / img.height)
    const s = cover * zoom
    ctx.drawImage(img, (-img.width * s) / 2, (-img.height * s) / 2, img.width * s, img.height * s)
    ctx.restore()
  }, [zoom, rotate, ready])

  const apply = () => onApply(canvasRef.current.toDataURL('image/jpeg', 0.9))

  const slider = 'flex-1 accent-vigno-accent cursor-pointer'
  const iconBtn = 'text-vigno-muted hover:text-vigno-accent2 w-6 text-center'

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onCancel}>
      <div className="bg-vigno-panel border border-vigno-line rounded-2xl w-[420px] max-w-full shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-vigno-line">
          <h3 className="font-bold">Adjust Your Photo</h3>
          <button onClick={onCancel} className="text-vigno-muted hover:text-vigno-txt text-lg leading-none">✕</button>
        </div>

        {/* Canvas + circular crop guide */}
        <div className="bg-black grid place-items-center py-5">
          <div className="relative" style={{ width: 288, height: 288 }}>
            <canvas ref={canvasRef} width={OUT} height={OUT} style={{ width: 288, height: 288 }} className="block" />
            <div className="absolute inset-0 m-auto rounded-full pointer-events-none"
              style={{ width: 240, height: 240, border: '2px solid rgba(255,255,255,0.85)', boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)' }} />
            {!ready && <div className="absolute inset-0 grid place-items-center text-vigno-muted text-sm">Loading…</div>}
          </div>
        </div>

        {/* Controls */}
        <div className="px-5 py-4 space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-vigno-accent2">🔍 Zoom</span>
              <span className="text-vigno-muted">{Math.round(zoom * 100)}%</span>
            </div>
            <div className="flex items-center gap-2">
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z - 0.1, 1, 3))}>−</button>
              <input type="range" min="1" max="3" step="0.01" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className={slider} />
              <button className={iconBtn} onClick={() => setZoom((z) => clamp(z + 0.1, 1, 3))}>+</button>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-vigno-accent2">🔄 Rotate</span>
              <span className="text-vigno-muted">{rotate}°</span>
            </div>
            <div className="flex items-center gap-2">
              <button className={iconBtn} onClick={() => setRotate((r) => clamp(r - 90, -180, 180))}>↺</button>
              <input type="range" min="-180" max="180" step="1" value={rotate} onChange={(e) => setRotate(Number(e.target.value))} className={slider} />
              <button className={iconBtn} onClick={() => setRotate((r) => clamp(r + 90, -180, 180))}>↻</button>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-5 pb-5">
          <button onClick={onCancel}
            className="flex-1 border border-vigno-line rounded-xl py-2.5 text-sm hover:bg-white/5">Cancel</button>
          <button onClick={apply} disabled={!ready}
            className="flex-1 bg-vigno-accent text-[#1a0d0f] font-bold rounded-xl py-2.5 text-sm hover:brightness-110 disabled:opacity-60">
            ✓ Apply & Upload
          </button>
        </div>
      </div>
    </div>
  )
}
