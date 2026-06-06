import { useQuery, useQueryClient } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'

// Star toggle. Reads the shared favorite-ids set so every instance stays in sync.
export default function FavoriteButton({ contentId, className = '' }) {
  const qc = useQueryClient()
  const { data: ids } = useQuery({ queryKey: ['favorites', 'ids'], queryFn: discoverApi.favoriteIds })
  const isFav = !!ids?.includes(contentId)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (isFav) await discoverApi.removeFavorite(contentId)
      else await discoverApi.addFavorite(contentId)
    } finally {
      qc.invalidateQueries({ queryKey: ['favorites'] })
    }
  }

  return (
    <button
      onClick={toggle}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      className={'transition ' + (isFav ? 'text-vigno-accent2' : 'text-vigno-muted hover:text-vigno-accent2') + ' ' + className}
    >
      {isFav ? '★' : '☆'}
    </button>
  )
}
