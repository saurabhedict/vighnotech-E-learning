import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { discoverApi } from '../api/discoverApi'

// Bookmark or Heart toggle. Reads the shared favorite-ids set so every instance stays in sync.
export default function FavoriteButton({ contentId, className = '', variant = 'bookmark', size = 15 }) {
  const qc = useQueryClient()
  const { data: ids } = useQuery({ queryKey: ['favorites', 'ids'], queryFn: discoverApi.favoriteIds })
  const isFav = !!ids?.includes(contentId)
  const [busy, setBusy] = useState(false)

  const toggle = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (busy) return
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

  const isHeart = variant === 'heart'
  const defaultColors = isHeart
    ? (isFav ? 'text-rose-500 hover:text-rose-650' : 'text-[#2d2f31] dark:text-slate-300 hover:text-[#1c1d1f] dark:hover:text-white')
    : (isFav ? 'text-vigno-accent2' : 'text-vigno-muted/50 hover:text-vigno-accent2')

  return (
    <button
      onClick={toggle}
      disabled={busy}
      title={isFav ? (isHeart ? 'Remove from wishlist' : 'Remove bookmark') : (isHeart ? 'Add to wishlist' : 'Bookmark')}
      aria-label={isFav ? (isHeart ? 'Remove from wishlist' : 'Remove bookmark') : (isHeart ? 'Add to wishlist' : 'Bookmark this item')}
      className={`transition-all duration-150 disabled:opacity-50 ${defaultColors} ${className}`}
    >
      {isHeart ? (
        isFav ? (
          /* Filled heart */
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        ) : (
          /* Outline heart */
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
        )
      ) : (
        isFav ? (
          /* Filled bookmark */
          <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        ) : (
          /* Outline bookmark */
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>
          </svg>
        )
      )}
    </button>
  )
}
