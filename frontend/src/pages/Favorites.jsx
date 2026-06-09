import { useQuery } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'
import ContentCard from '../components/ContentCard'
import Breadcrumb from '../components/Breadcrumb'

export default function Favorites() {
  const favs = useQuery({ queryKey: ['favorites', 'mine'], queryFn: discoverApi.myFavorites })
  return (
    <div>
      <Breadcrumb trail="Favorites" />
      <h1 className="text-2xl mb-5">★ Favorites</h1>
      {favs.isLoading && <p className="text-vigno-muted">Loading…</p>}
      {favs.isError && <p className="text-red-300">Failed to load favorites.</p>}
      {favs.data?.length === 0 && <p className="text-vigno-muted py-6">No favorites yet. Tap the ☆ on any content to save it here.</p>}
      <div className="flex flex-wrap gap-4">
        {favs.data?.map((it) => <ContentCard key={it.id} item={it} />)}
      </div>
    </div>
  )
}
