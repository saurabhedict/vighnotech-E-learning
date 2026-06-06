import { Link } from 'react-router-dom'
import FavoriteButton from './FavoriteButton'

const ICON = { pdf: '📄', video: '🎬', game: '🎮', '3d': '✈' }

// Reusable content tile for favorites / search / recommended / continue-watching.
export default function ContentCard({ item }) {
  const pct = item.duration > 0 ? Math.min(100, Math.round((item.position / item.duration) * 100)) : 0
  return (
    <Link
      to={`/app/content/${item.id}`}
      className="w-56 bg-vigno-card border border-vigno-line rounded-2xl p-4 hover:-translate-y-1 hover:border-vigno-accent transition block relative"
    >
      <div className="flex items-start justify-between">
        <div className="text-3xl">{ICON[item.type] || '📦'}</div>
        <FavoriteButton contentId={item.id} className="text-xl" />
      </div>
      <div className="mt-2.5 font-semibold text-sm line-clamp-2 min-h-[2.5rem]">{item.title}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xs text-vigno-muted capitalize">{item.type}</span>
        {item.paid ? (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ff9d6b]/20 text-[#ff9d6b]">🔒 ₹{item.price}</span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-300">FREE</span>
        )}
      </div>
      {pct > 0 && (
        <div className="mt-3">
          <div className="h-1.5 bg-black/30 rounded-full overflow-hidden">
            <div className="h-full bg-vigno-accent" style={{ width: `${pct}%` }} />
          </div>
          <div className="text-[10px] text-vigno-muted mt-1">{item.completed ? 'Completed' : `${pct}% watched`}</div>
        </div>
      )}
    </Link>
  )
}
