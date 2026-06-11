import { useEffect, useRef, useState } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
// Vite resolves the worker file URL; PDF.js renders off the main thread.
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

// Renders each PDF page to a <canvas> — no native viewer toolbar, so there is
// no built-in download/print button. Right-click is disabled too.
export default function PdfViewer({ url, watermark }) {
  const containerRef = useRef(null)
  const [status, setStatus] = useState('loading')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const pdf = await pdfjsLib.getDocument(url).promise
        if (cancelled) return
        const container = containerRef.current
        container.innerHTML = ''
        // Render at the screen's pixel density so pages stay crisp on HiDPI/retina
        // (the old code rendered at CSS size, so the bitmap got upscaled → blur).
        const dpr = Math.min(window.devicePixelRatio || 1, 3)
        const containerWidth = container.clientWidth || 820
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n)
          const base = page.getViewport({ scale: 1 })
          // Fit the page to the container width (cap upscaling at 2x for small PDFs).
          const cssScale = Math.min(containerWidth / base.width, 2)
          // Bitmap is rendered at cssScale × dpr; CSS shrinks it back → sharp.
          const viewport = page.getViewport({ scale: cssScale * dpr })
          const canvas = document.createElement('canvas')
          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.style.width = `${Math.floor(base.width * cssScale)}px`
          canvas.style.height = `${Math.floor(base.height * cssScale)}px`
          canvas.className = 'mx-auto mb-4 rounded-lg shadow-lg max-w-full'
          container.appendChild(canvas)
          await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise
          if (cancelled) return
        }
        setStatus('done')
      } catch (e) {
        console.warn('pdf', e)
        setStatus('error')
      }
    })()
    return () => { cancelled = true }
  }, [url])

  return (
    <div className="relative" onContextMenu={(e) => e.preventDefault()}>
      {status === 'loading' && <p className="text-vigno-muted">Rendering PDF…</p>}
      {status === 'error' && <p className="text-red-300">Could not load the PDF.</p>}
      <div ref={containerRef} />
      {watermark && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-black/10 text-2xl font-extrabold -rotate-12 select-none">
          {watermark}
        </div>
      )}
    </div>
  )
}
