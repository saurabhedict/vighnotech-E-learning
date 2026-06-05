import { useParams, Link } from 'react-router-dom'
import { useModule } from '../hooks/useContent'

const ICON = { pdf: '📄', video: '🎬', game: '🎮', '3d': '✈' }

export default function ModuleView() {
  const { className, moduleId } = useParams()
  const { data: mod, isLoading, isError } = useModule(className, moduleId)
  const displayName = className?.replace(/_/g, ' ')

  if (isLoading) return <p className="text-vigno-muted">Loading module…</p>
  if (isError || !mod) return <p className="text-red-300">Module not found.</p>

  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">
        <Link to={`/app/${className}`} className="text-vigno-accent2 hover:underline">{displayName}</Link> › {mod.subject} › {mod.name}
      </div>
      <h1 className="text-2xl mb-5">{mod.name}</h1>

      {mod.chapters.map((ch) => (
        <section key={ch.name}>
          <h2 className="text-base font-bold mt-5 mb-2.5 pl-2.5 border-l-4 border-vigno-accent">{ch.name}</h2>
          <div className="flex flex-col gap-2.5 max-w-3xl">
            {ch.items.map((it) => (
              <Link key={it.id} to={`/app/${className}/module/${moduleId}/content/${it.id}`}
                className="flex items-center gap-3.5 bg-vigno-card border border-vigno-line rounded-xl px-4 py-3 hover:border-vigno-accent transition">
                <div className="text-xl w-7 text-center">{ICON[it.type]}</div>
                <div className="flex-1">
                  <div className="font-semibold text-sm">{it.title}</div>
                  <div className="text-xs text-vigno-muted mt-0.5 capitalize">{it.type}</div>
                </div>
                {it.paid
                  ? <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#ff9d6b]/20 text-[#ff9d6b]">🔒 ₹{it.price}</span>
                  : <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/20 text-green-300">FREE</span>}
              </Link>
            ))}
          </div>
        </section>
      ))}

      <div className="mt-6">
        <Link to={`/app/${className}`} className="text-sm bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 py-2">← Back to {displayName}</Link>
      </div>
    </div>
  )
}
