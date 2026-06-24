import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { useQueryClient } from '@tanstack/react-query'
import { purchaseContent } from '../lib/buy'
import { paymentsApi } from '../api/paymentsApi'
import { commerceApi } from '../api/commerceApi'
import { apiErrorMessage } from '../api/authApi'
import { addCartItem, removeCartItem } from '../store/cartSlice'

// Buy-and-unlock control with optional coupon and pay-from-wallet.
export default function BuyButton({ content, onUnlocked }) {
  const dispatch = useDispatch()
  const user = useSelector((s) => s.auth.user)
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [applied, setApplied] = useState(null) // { code, discount, finalAmount }
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')

  const cartItems = useSelector((s) => s.cart.items)
  const isInCart = cartItems.some((i) => i.id === content.id)

  const handleCartToggle = () => {
    if (isInCart) {
      dispatch(removeCartItem(content.id))
    } else {
      dispatch(addCartItem({
        id: content.id,
        title: content.title,
        price: Number(content.price),
        type: 'resource',
        thumbnail: content.thumbnailUrl || content.thumbnail || ''
      }))
    }
  }

  const finalAmount = applied ? applied.finalAmount : content.price

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['content', content.id] })
    queryClient.invalidateQueries({ queryKey: ['licenses', 'mine'] })
    queryClient.invalidateQueries({ queryKey: ['purchases', 'mine'] })
    queryClient.invalidateQueries({ queryKey: ['wallet'] })
  }

  const applyCoupon = async () => {
    setError('')
    setLoading('coupon')
    try {
      const r = await commerceApi.validateCoupon(code.trim(), content.id)
      setApplied({ code: r.code, discount: r.discount, finalAmount: r.finalAmount })
    } catch (err) {
      setApplied(null)
      setError(apiErrorMessage(err, 'Invalid coupon'))
    } finally {
      setLoading('')
    }
  }

  const run = (kind) => async () => {
    setError('')
    setLoading(kind)
    try {
      if (kind === 'wallet') await paymentsApi.walletPay(content.id, applied?.code)
      else await purchaseContent(content.id, user, applied?.code)
      invalidate()
      onUnlocked?.()
    } catch (err) {
      setError(apiErrorMessage(err, 'Purchase failed'))
    } finally {
      setLoading('')
    }
  }

  const inputCls = 'px-3 py-2 rounded-lg bg-vigno-bg2 border border-vigno-line text-sm outline-none'
  return (
    <div className="flex flex-col items-center gap-3 w-full max-w-sm">
      <div className="text-lg font-bold">
        {applied ? (
          <>
            <span className="line-through text-vigno-muted text-sm mr-2">₹{content.price}</span>
            ₹{finalAmount} <span className="text-green-300 text-xs">(−₹{applied.discount})</span>
          </>
        ) : (
          <>₹{content.price}</>
        )}
      </div>

      <div className="flex gap-2 w-full">
        <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="Coupon code" className={inputCls + ' flex-1 uppercase'} />
        <button onClick={applyCoupon} disabled={!code.trim() || loading === 'coupon'}
          className="bg-white/10 hover:bg-white/20 border border-vigno-line rounded-lg px-3 text-sm disabled:opacity-50">
          {loading === 'coupon' ? '…' : 'Apply'}
        </button>
      </div>

      <div className="flex flex-col gap-2 w-full">
        <div className="flex gap-2 w-full">
          <button onClick={run('card')} disabled={!!loading}
            className="flex-1 bg-vigno-accent text-vigno-accent-txt font-extrabold py-3 rounded-xl hover:brightness-110 disabled:opacity-60">
            {loading === 'card' ? 'Processing…' : `Pay ₹${finalAmount}`}
          </button>
          <button onClick={run('wallet')} disabled={!!loading}
            className="flex-1 bg-white/10 hover:bg-white/20 border border-vigno-line font-bold py-3 rounded-xl disabled:opacity-60">
            {loading === 'wallet' ? '…' : '👛 Wallet'}
          </button>
        </div>
        <button
          onClick={handleCartToggle}
          className="w-full bg-white/10 hover:bg-white/20 border border-vigno-line font-bold py-3 rounded-xl transition-all text-vigno-txt text-sm"
        >
          {isInCart ? '✓ In Cart' : 'Add to Cart'}
        </button>
      </div>

      {error && <p className="text-sm text-red-300">{error}</p>}
      <p className="text-xs text-vigno-muted text-center">
        Secure license issued on payment — a license tied to your account, verified on every access.
      </p>
    </div>
  )
}
