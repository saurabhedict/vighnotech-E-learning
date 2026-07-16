import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'
import ContentCard from '../components/ContentCard'
import CourseCard from '../components/CourseCard'
import Breadcrumb from '../components/Breadcrumb'
import SmartSearchBar from '../components/SmartSearchBar'

const TYPES = ['', 'pdf', 'video', '3d', 'game']

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [type, setType] = useState(params.get('type') || '')
  const [debouncedQ, setDebouncedQ] = useState(params.get('q') || '')

  // Debounce the query that actually hits the server (and keep the URL in sync),
  // so typing doesn't fire a full, thumbnail-resolving search on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q)
      const next = {}
      if (q) next.q = q
      if (type) next.type = type
      setParams(next, { replace: true })
    }, 300)
    return () => clearTimeout(t)
  }, [q, type, setParams])

  const results = useQuery({
    queryKey: ['search', debouncedQ, type],
    queryFn: () => discoverApi.search({ ...(debouncedQ ? { q: debouncedQ } : {}), ...(type ? { type } : {}) }),
    enabled: debouncedQ.length > 0 || type.length > 0,
  })

  const input = 'px-3 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none'
  return (
    <div>
      <Breadcrumb trail="Search" />
      <h1 className="text-2xl mb-4">🔍 Search</h1>

      <div className="flex flex-wrap gap-2 mb-6 max-w-2xl">
        <SmartSearchBar
          variant="page"
          value={q}
          onChange={setQ}
          onSubmit={setQ}
          autoFocus
          placeholder="Search content…"
          className="flex-1 min-w-[240px]"
        />
        <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
          {TYPES.map((t) => <option key={t} value={t}>{t || 'All types'}</option>)}
        </select>
      </div>

      {results.isFetching && <p className="text-vigno-muted">Searching…</p>}
      {results.data && (
        <>
          <p className="text-xs text-vigno-muted mb-3">
            {results.data.count} result(s)
            {results.data.courses > 0 && ` · ${results.data.courses} course(s)`}
            {results.data.contents > 0 && ` · ${results.data.contents} item(s)`}
          </p>
          <div className="flex flex-wrap gap-4">
            {results.data.items.map((it) =>
              it.kind === 'course'
                ? <CourseCard key={`course-${it.id}`} course={it} />
                : <ContentCard key={`item-${it.id}`} item={it} />
            )}
          </div>
          {results.data.count === 0 && <p className="text-vigno-muted py-6">No matches. Try a different term.</p>}
        </>
      )}
      {!results.data && !results.isFetching && <p className="text-vigno-muted py-6">Type to search — courses, videos, PDFs, 3D models, games and resources.</p>}
    </div>
  )
}
