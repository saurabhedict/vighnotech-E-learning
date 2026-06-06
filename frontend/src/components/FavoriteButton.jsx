import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'

// Star toggle. Reads the shared favorite-ids set so every instance stays in sync.
export default function FavoriteButton({ contentId, className = '' }) {
  const qc = useQueryClient()
  const { data: ids } = useQuery({ queryKey: ['favorites', 'ids'], queryFn: discoverApi.favoriteIds })
  const isFav = !!ids?.includes(contentId)
  const [busy, setBusy] = useState(false)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return // guard against rapid double-clicks firing add+remove
    setBusy(true)
    try {
      if (isFav) await discoverApi.removeFavorite(contentId)
      else await discoverApi.addFavorite(contentId)
    } catch {
      /* idempotent on the server; the invalidate below reconciles UI state */
    } finally {
      setBusy(false)
      qc.invalidateQueries({ queryKey: ['favorites'] })
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={isFav ? 'Remove from favorites' : 'Add to favorites'}
      className={'transition disabled:opacity-50 ' + (isFav ? 'text-vigno-accent2' : 'text-vigno-muted hover:text-vigno-accent2') + ' ' + className}
    >
      {isFav ? '★' : '☆'}
    </button>
  )
}
