import { useParams, Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { useQuery } from '@tanstack/react-query'
import { useModule } from '../hooks/useContent'
import { licenseApi } from '../api/licenseApi'

function LessonIcon({ type, className = "w-5 h-5" }) {
  if (type === 'video') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }
  if (type === 'pdf') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  }
  if (type === '3d') {
    return (
      <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  }
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
    </svg>
  )
}

export default function ModuleView() {
  const { className, moduleId } = useParams()
  const { data: mod, isLoading, isError } = useModule(className, moduleId)
  const { data: licenses } = useQuery({ queryKey: ['licenses', 'mine'], queryFn: licenseApi.mine })
  const isAdmin = useSelector((s) => s.auth.user?.role) === 'admin'
  const isEnrolled = isAdmin || licenses?.some((l) => l.usable && l.content?.courseKey === className)
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
                className="flex items-center gap-3.5 bg-vigno-card border border-vigno-line rounded-xl px-4 py-3 hover:border-vigno-accent transition group">
                <div className="w-8 h-8 rounded-lg bg-vigno-accent/10 flex items-center justify-center text-vigno-accent2 shrink-0">
                  <LessonIcon type={it.type} className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{it.title}</div>
                  <div className="text-xs text-vigno-muted mt-0.5 capitalize">{it.type}</div>
                </div>
                {isEnrolled ? (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-500/20 text-green-300">✓ Unlocked</span>
                ) : (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#ff9d6b]/20 text-[#ff9d6b]">🔒 Premium</span>
                )}
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
