import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'

export default function FolderCard({ className, module }) {
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const fileCount = module.chapters.reduce((a, c) => a + c.items.length, 0)

  return (
    <Link
      to={`/app/${className}/module/${module.id}`}
      className={[
        'w-52 rounded-2xl p-4 hover:-translate-y-1 transition-all block border group',
        isDark
          ? 'bg-vigno-card border-vigno-line hover:border-vigno-accent hover:shadow-lg hover:shadow-vigno-accent/10'
          : 'bg-white border-vigno-line hover:border-vigno-accent hover:shadow-md hover:shadow-vigno-accent/15 shadow-sm',
      ].join(' ')}
    >
      <div className="text-3xl group-hover:scale-110 transition-transform duration-200">📁</div>
      <div className={`mt-2.5 font-semibold text-sm ${isDark ? 'text-vigno-txt' : 'text-vigno-txt'}`}>
        {module.name}
      </div>
      <div className="mt-1 text-xs text-vigno-muted">{module.chapters.length} chapters · {fileCount} files</div>
      <div className={`mt-3 text-xs font-medium transition-colors ${isDark ? 'text-vigno-accent2/70 group-hover:text-vigno-accent2' : 'text-vigno-accent2/80 group-hover:text-vigno-accent2'}`}>
        Open →
      </div>
    </Link>
  )
}
