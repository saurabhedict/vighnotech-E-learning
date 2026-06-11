import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { useClassTree } from '../hooks/useContent'
import { discoverApi } from '../api/discoverApi'
import FolderCard from '../components/FolderCard'
import ContentCard from '../components/ContentCard'
import Breadcrumb from '../components/Breadcrumb'
import { useSiteSettings } from '../hooks/useSiteSettings'

function DiscoverRow({ title, queryKey, queryFn }) {
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const { data } = useQuery({ queryKey, queryFn })
  if (!data?.length) return null
  return (
    <section className="mb-7">
      <h2 className={`text-base font-bold mb-2.5 pl-2.5 border-l-4 border-vigno-accent2 ${isDark ? '' : 'text-vigno-txt'}`}>
        {title}
      </h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {data.map((it) => <ContentCard key={it.id} item={it} />)}
      </div>
    </section>
  )
}

export default function Home() {
  const { className } = useParams()
  const theme = useSelector((s) => s.ui.theme)
  const isDark = theme === 'dark'
  const { data: subjects, isLoading, isError } = useClassTree(className)
  const { data: settings } = useSiteSettings()
  const hero = settings?.home
  const displayName = className?.replace(/_/g, ' ')

  return (
    <div>
      <Breadcrumb trail={displayName} />

      {hero?.heroEnabled && (hero.heroTitle || hero.heroSubtitle) && (
        <div className={[
          'mb-6 rounded-2xl border border-vigno-line p-6',
          isDark
            ? 'bg-gradient-to-r from-vigno-accent/15 to-transparent'
            : 'bg-gradient-to-r from-vigno-accent/10 to-transparent shadow-sm',
        ].join(' ')}>
          {hero.heroTitle && <h2 className="text-2xl font-extrabold mb-1.5 text-vigno-txt">{hero.heroTitle}</h2>}
          {hero.heroSubtitle && <p className="text-vigno-muted max-w-2xl">{hero.heroSubtitle}</p>}
        </div>
      )}

      <h1 className="text-2xl mb-5 text-vigno-txt font-bold">{displayName}</h1>

      <DiscoverRow title="▶ Continue watching" queryKey={['progress', 'mine']} queryFn={() => discoverApi.myProgress(10)} />
      <DiscoverRow title="✨ Recommended for you" queryKey={['recommended']} queryFn={discoverApi.recommended} />

      {isLoading && <p className="text-vigno-muted">Loading course content…</p>}
      {isError && <p className={isDark ? 'text-red-300' : 'text-red-600'}>Failed to load. Try again.</p>}

      {!isLoading && subjects?.length === 0 && (
        <p className="text-vigno-muted py-8">No content added for {displayName} yet.</p>
      )}

      {subjects?.map((s, i) => (
        <section key={s.subject}>
          <h2 className={`text-base font-bold mt-5 mb-2.5 pl-2.5 border-l-4 border-vigno-accent ${isDark ? '' : 'text-vigno-txt'}`}>
            {i + 1}. {s.subject}
          </h2>
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
