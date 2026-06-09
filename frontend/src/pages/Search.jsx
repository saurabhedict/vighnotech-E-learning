import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'
import ContentCard from '../components/ContentCard'
import Breadcrumb from '../components/Breadcrumb'

const TYPES = ['', 'pdf', 'video', '3d', 'game']

export default function Search() {
  const [params, setParams] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [type, setType] = useState(params.get('type') || '')

  // keep the URL in sync (debounced)
  useEffect(() => {
    const t = setTimeout(() => {
      const next = {}
      if (q) next.q = q
      if (type) next.type = type
      setParams(next, { replace: true })
    }, 250)
    return () => clearTimeout(t)
  }, [q, type, setParams])

  const results = useQuery({
    queryKey: ['search', q, type],
    queryFn: () => discoverApi.search({ ...(q ? { q } : {}), ...(type ? { type } : {}) }),
    enabled: q.length > 0 || type.length > 0,
  })

  const input = 'px-3 py-2.5 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none focus:border-vigno-accent'
  return (
    <div>
      <Breadcrumb trail="Search" />
      <h1 className="text-2xl mb-4">🔍 Search</h1>

      <div className="flex flex-wrap gap-2 mb-6 max-w-2xl">
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search content…" className={input + ' flex-1 min-w-[220px]'} />
        <select value={type} onChange={(e) => setType(e.target.value)} className={input}>
          {TYPES.map((t) => <option key={t} value={t}>{t || 'All types'}</option>)}
        </select>
      </div>

      {results.isFetching && <p className="text-vigno-muted">Searching…</p>}
      {results.data && (
        <>
          <p className="text-xs text-vigno-muted mb-3">{results.data.count} result(s)</p>
          <div className="flex flex-wrap gap-4">
            {results.data.items.map((it) => <ContentCard key={it.id} item={it} />)}
          </div>
          {results.data.count === 0 && <p className="text-vigno-muted py-6">No matches. Try a different term.</p>}
        </>
      )}
      {!results.data && !results.isFetching && <p className="text-vigno-muted py-6">Type to search the catalog.</p>}
    </div>
  )
}
