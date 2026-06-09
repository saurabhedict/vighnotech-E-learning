import { useEffect } from 'react'

// Small centered dialog. Props: title, onClose, children, width.
export default function Modal({ title, onClose, children, width = 420 }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
      <div
        className="bg-vigno-panel border border-vigno-line rounded-2xl shadow-2xl w-full overflow-hidden"
        style={{ maxWidth: width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-vigno-line">
          <h3 className="font-bold">{title}</h3>
          <button onClick={onClose} className="text-vigno-muted hover:text-vigno-txt text-lg leading-none">✕</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  )
}
