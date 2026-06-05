import { useState } from 'react'
import { useSelector } from 'react-redux'
import { useQueryClient } from '@tanstack/react-query'
import { purchaseContent } from '../lib/buy'
import { apiErrorMessage } from '../api/authApi'

// Buy-and-unlock control. On success it invalidates the content + library
// queries so the viewer re-fetches and the item unlocks in place.
export default function BuyButton({ content, onUnlocked }) {
  const user = useSelector((s) => s.auth.user)
  const queryClient = useQueryClient()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const buy = async () => {
    setError('')
    setLoading(true)
    try {
      await purchaseContent(content.id, user)
      await queryClient.invalidateQueries({ queryKey: ['content', content.id] })
      queryClient.invalidateQueries({ queryKey: ['licenses', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['purchases', 'mine'] })
      onUnlocked?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Purchase failed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button onClick={buy} disabled={loading}
        className="bg-vigno-accent text-[#1a0d0f] font-extrabold px-6 py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
        {loading ? 'Processing…' : `🔓 Buy & Unlock · ₹${content.price}`}
      </button>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <p className="text-xs text-vigno-muted">
        Secure license issued on payment — verified on every access (Xbox/PlayStation model).
      </p>
    </div>
  )
}
