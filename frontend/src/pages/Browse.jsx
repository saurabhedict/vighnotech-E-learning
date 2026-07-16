import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { filtersApi } from '../api/filtersApi'
import { useClasses } from '../hooks/useContent'
import CourseCard from '../components/CourseCard'
import Breadcrumb from '../components/Breadcrumb'
import CatalogFilterBar from '../components/CatalogFilterBar'

// Results page for the catalog filters. Matches courses whose meta.filters
// intersect the chosen options — OR within a category, AND across categories.
export default function Browse() {
  const [params] = useSearchParams()
  const optIds = (params.get('opts') || '').split(',').map((s) => s.trim()).filter(Boolean)
  const { data: cats } = useQuery({ queryKey: ['filters'], queryFn: filtersApi.list })
  const { data: courses, isLoading, isError } = useClasses()

  // Group the chosen option ids by their category, and collect labels to show.
  const { byCat, labels } = useMemo(() => {
    const byCat = {}
    const labels = []
    if (cats) {
      for (const cat of cats) {
        const sel = cat.options.filter((o) => optIds.includes(o.id))
        if (sel.length) {
          byCat[cat.id] = sel.map((o) => o.id)
          sel.forEach((o) => labels.push({ cat: cat.name, label: o.label }))
        }
      }
    }
    return { byCat, labels }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cats, optIds.join(',')])

  const matches = useMemo(() => {
    if (!Array.isArray(courses)) return []
    const catIds = Object.keys(byCat)
    if (catIds.length === 0) return courses
    return courses.filter((c) => {
      const cf = Array.isArray(c?.meta?.filters) ? c.meta.filters.map(String) : []
      // Course must satisfy every selected category (AND), matching any of its options (OR).
      return catIds.every((catId) => byCat[catId].some((oid) => cf.includes(String(oid))))
    })
  }, [courses, byCat])

  return (
    <div>
      <Breadcrumb trail="Browse" />
      <h1 className="text-2xl font-extrabold text-vigno-txt tracking-tight mb-1">Browse courses</h1>
      <p className="text-sm text-vigno-muted mb-5">Refine by content type and training program.</p>

      <div className="mb-6"><CatalogFilterBar /></div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {labels.length === 0 ? (
          <span className="text-sm text-vigno-muted">Showing all courses</span>
        ) : (
          labels.map((l, i) => (
            <span key={i} className="text-xs font-semibold px-3 py-1 rounded-full bg-vigno-accent/12 text-vigno-accent border border-vigno-accent/25">
              {l.cat}: {l.label}
            </span>
          ))
        )}
      </div>

      {isLoading && <p className="text-vigno-muted py-8">Loading courses…</p>}
      {isError && <p className="text-red-300 py-8">Failed to load courses.</p>}

      {!isLoading && !isError && (
        <>
          <p className="text-xs text-vigno-muted mb-4">{matches.length} course{matches.length === 1 ? '' : 's'}</p>
          <div className="flex flex-wrap gap-6">
            {matches.map((c) => (
              <CourseCard key={typeof c === 'string' ? c : (c.slug || c._id)} course={c} />
            ))}
          </div>
          {matches.length === 0 && (
            <div className="py-12 text-center rounded-2xl border-2 border-dashed border-vigno-line/40">
              <p className="text-vigno-muted text-sm">No courses match these filters yet.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
