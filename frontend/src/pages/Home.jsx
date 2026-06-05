import { useParams } from 'react-router-dom'
import { useClassTree } from '../hooks/useContent'
import FolderCard from '../components/FolderCard'

export default function Home() {
  const { className } = useParams()
  const { data: subjects, isLoading, isError } = useClassTree(className)
  const displayName = className?.replace(/_/g, ' ')

  return (
    <div>
      <div className="text-sm text-vigno-muted mb-1">AeroLearn › {displayName}</div>
      <h1 className="text-2xl mb-5">{displayName}</h1>

      {isLoading && <p className="text-vigno-muted">Loading course content…</p>}
      {isError && <p className="text-red-300">Failed to load. Try again.</p>}

      {!isLoading && subjects?.length === 0 && (
        <p className="text-vigno-muted py-8">No content added for {displayName} yet. (Admin can create subjects, modules and files here.)</p>
      )}

      {subjects?.map((s, i) => (
        <section key={s.subject}>
          <h2 className="text-base font-bold mt-5 mb-2.5 pl-2.5 border-l-4 border-vigno-accent">{i + 1}. {s.subject}</h2>
          <div className="flex flex-wrap gap-4">
            {s.modules.map((m) => (
              <FolderCard key={m.id} className={className} module={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
