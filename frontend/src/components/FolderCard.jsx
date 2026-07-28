import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function FolderCard({ className, module }) {
  const navigate = useNavigate()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const fileCount = module.chapters.reduce((a, c) => a + c.items.length, 0)

  return (
    <div
      onClick={() => navigate(`/app/${className}/module/${module.id}`)}
      className={[
        'w-52 rounded-xl border cursor-pointer transition-all duration-200 group overflow-hidden',
        isDark
          ? 'bg-vigno-card border-vigno-line hover:border-vigno-accent/50 hover:shadow-xl hover:shadow-black/30'
          : 'bg-white border-vigno-line/70 hover:border-vigno-line hover:shadow-lg hover:shadow-slate-200/80 shadow-sm',
      ].join(' ')}
    >
      {/* Top accent bar */}
      <div className={`h-1 w-full transition-all ${isDark ? 'bg-vigno-line/50 group-hover:bg-vigno-accent/60' : 'bg-vigno-line/40 group-hover:bg-vigno-accent/70'}`} />

      <div className="p-4">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 transition-colors ${isDark ? 'bg-vigno-line/40 group-hover:bg-vigno-accent/15' : 'bg-vigno-line/30 group-hover:bg-vigno-accent/12'}`}>
          <svg className={`w-5 h-5 transition-colors ${isDark ? 'text-vigno-muted group-hover:text-vigno-accent' : 'text-vigno-muted group-hover:text-vigno-accent'}`}
            width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8}
              d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/>
          </svg>
        </div>

        <h3 className="text-sm font-semibold text-vigno-txt leading-snug mb-2 line-clamp-2 min-h-[2.4rem]">
          {module.name}
        </h3>

        <div className="flex items-center gap-3 text-[10px] text-vigno-muted">
          <span>{module.chapters.length} {module.chapters.length === 1 ? 'chapter' : 'chapters'}</span>
          <span className="w-0.5 h-0.5 rounded-full bg-current opacity-50" />
          <span>{fileCount} {fileCount === 1 ? 'item' : 'items'}</span>
        </div>

        <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isDark ? 'border-vigno-line/30' : 'border-vigno-line/50'}`}>
          <span className={`text-[10px] font-semibold uppercase tracking-wide transition-colors ${isDark ? 'text-vigno-muted group-hover:text-vigno-accent' : 'text-vigno-muted group-hover:text-vigno-accent'}`}>
            Open module
          </span>
          <svg className={`w-3.5 h-3.5 transition-all group-hover:translate-x-0.5 ${isDark ? 'text-vigno-muted group-hover:text-vigno-accent' : 'text-vigno-muted group-hover:text-vigno-accent'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
