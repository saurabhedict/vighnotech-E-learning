import { useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { removeCartItem, clearCart, addCartItem } from '../store/cartSlice'
import { paymentsApi } from '../api/paymentsApi'
import { commerceApi } from '../api/commerceApi'
import { purchaseCourse, purchaseContent } from '../lib/buy'
import { discoverApi } from '../api/discoverApi'
import { useClasses } from '../hooks/useContent'

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

function CardIcon() {
  return (
    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18" />
    </svg>
  )
}

function WalletIcon({ className = "w-5 h-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12H17a2 2 0 00-2 2v0a2 2 0 002 2h4" />
    </svg>
  )
}

function CheckCircleIcon() {
  return (
    <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-4 h-4 text-rose-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  )
}

function ShieldIcon({ className = "w-4 h-4 text-emerald-600 dark:text-emerald-500" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.57-.598-3.75h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function PaymentMethodsIcons() {
  return (
    <div className="flex justify-center items-center gap-4 text-vigno-muted/40 py-2 border-t border-vigno-line/10">
      {/* Credit Card */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" d="M3 10h18" />
      </svg>
      {/* PayPal / Bank note */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
      </svg>
      {/* Wallet */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path strokeLinecap="round" d="M21 12H17a2 2 0 00-2 2v0a2 2 0 002 2h4" />
      </svg>
      {/* Contactless */}
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
        <path strokeLinecap="round" d="M16.5 12a4.5 4.5 0 00-1.35-3.15M19 12a7 7 0 00-2.1-4.9M21.5 12a9.5 9.5 0 00-2.85-6.65M12 12a1 1 0 11-2 0 1 1 0 012 0z" />
      </svg>
    </div>
  )
}

function getGradient(item) {
  if (item.type === 'course') {
    const slug = item.id || ''
    if (slug.startsWith('PPL')) return 'from-violet-600 via-indigo-700 to-indigo-900'
    if (slug.startsWith('CPL')) return 'from-amber-500 via-orange-600 to-red-700'
    if (slug.startsWith('ATPL')) return 'from-emerald-500 via-teal-600 to-cyan-800'
    return 'from-blue-600 via-indigo-700 to-purple-800'
  }
  return 'from-cyan-500 via-sky-600 to-blue-700'
}

export default function Cart() {
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const isDark = useSelector((s) => s.ui.theme) === 'dark'
  const user = useSelector((s) => s.auth.user)
  const cartItems = useSelector((s) => s.cart.items)
  const subtotal = cartItems.reduce((acc, item) => acc + (item.price || 0), 0)

  const { data: favoriteIds } = useQuery({
    queryKey: ['favorites', 'ids'],
    queryFn: discoverApi.favoriteIds,
    enabled: !!user,
  })

  const { data: courses } = useClasses()
  const { data: standaloneResources } = useQuery({
    queryKey: ['resources', 'standalone'],
    queryFn: () => discoverApi.standaloneResources(),
  })

  const getFreshThumbnail = (item) => {
    if (item.type === 'course') {
      const match = courses?.find((c) => c.slug === item.id || c._id === item.id)
      if (match?.meta?.thumbnail) return match.meta.thumbnail
    } else {
      const match = standaloneResources?.find((r) => r.id === item.id)
      if (match?.thumbnailUrl) return match.thumbnailUrl
    }
    return item.thumbnail
  }

  const handleMoveToWishlist = async (itemId) => {
    try {
      await discoverApi.addFavorite(itemId)
      queryClient.invalidateQueries({ queryKey: ['favorites'] })
      dispatch(removeCartItem(itemId))
    } catch (e) {
      console.error(e)
    }
  }

  // Payment method state
  const [paymentMethod, setPaymentMethod] = useState('wallet')

  // Coupon state
  const [couponInput, setCouponInput] = useState('')
  const [discountPercent, setDiscountPercent] = useState(0)
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [couponError, setCouponError] = useState('')
  const [couponSuccess, setCouponSuccess] = useState('')

  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutSuccess, setCheckoutSuccess] = useState(false)

  const { data: walletData } = useQuery({
    queryKey: ['wallet'],
    queryFn: commerceApi.wallet,
    enabled: !!user,
  })
  const walletBalance = walletData?.balance ?? user?.walletBalance ?? 0

  // Calculate discounts
  const discountAmount = Math.round(subtotal * (discountPercent / 100))
  const finalTotal = subtotal - discountAmount

  const handleApplyCoupon = (e) => {
    e.preventDefault()
    setCouponError('')
    setCouponSuccess('')
    const code = couponInput.trim().toUpperCase()
    if (!code) return

    if (code === 'WELCOME10') {
      setDiscountPercent(10)
      setAppliedCoupon('WELCOME10')
      setCouponSuccess('Promo code WELCOME10 applied! 10% discount has been deducted.')
    } else if (code === 'FLIGHT15') {
      setDiscountPercent(15)
      setAppliedCoupon('FLIGHT15')
      setCouponSuccess('Promo code FLIGHT15 applied! 15% discount has been deducted.')
    } else {
      setCouponError('Invalid promo code. Try WELCOME10 or FLIGHT15.')
    }
  }

  const handleRemoveCoupon = () => {
    setDiscountPercent(0)
    setAppliedCoupon('')
    setCouponSuccess('')
    setCouponInput('')
  }

  const handleCheckoutWallet = async () => {
    setCheckoutError('')
    setCheckoutLoading(true)
    try {
      for (const item of cartItems) {
        try {
          if (item.type === 'course') {
            await paymentsApi.walletPayCourse(item.id, appliedCoupon)
          } else {
            await paymentsApi.walletPay(item.id, appliedCoupon)
          }
        } catch (err) {
          // Self-healing checkout retry without coupon if backend coupon check fails
          const msg = err.response?.data?.message || ''
          if (msg.toLowerCase().includes('coupon') || msg.toLowerCase().includes('invalid')) {
            if (item.type === 'course') {
              await paymentsApi.walletPayCourse(item.id)
            } else {
              await paymentsApi.walletPay(item.id)
            }
          } else {
            throw err
          }
        }
      }
      queryClient.invalidateQueries({ queryKey: ['licenses', 'mine'] })
      queryClient.invalidateQueries({ queryKey: ['wallet'] })
      dispatch(clearCart())
      setCheckoutSuccess(true)
    } catch (err) {
      setCheckoutError(err.response?.data?.message || 'Checkout failed. Please check your wallet balance.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleCheckoutCard = async () => {
    if (cartItems.length !== 1) return
    const item = cartItems[0]
    setCheckoutError('')
    setCheckoutLoading(true)
    try {
      if (item.type === 'course') {
        await purchaseCourse(item.id, user, appliedCoupon)
      } else {
        await purchaseContent(item.id, user, appliedCoupon)
      }
      queryClient.invalidateQueries({ queryKey: ['licenses', 'mine'] })
      dispatch(clearCart())
      setCheckoutSuccess(true)
    } catch (err) {
      setCheckoutError(err.message || 'Payment failed')
    } finally {
      setCheckoutLoading(false)
    }
  }

  const handleProceedCheckout = () => {
    if (paymentMethod === 'wallet') {
      handleCheckoutWallet()
    } else {
      handleCheckoutCard()
    }
  }



  if (checkoutSuccess) {
    return (
      <div className="max-w-xl mx-auto px-6 py-20">
        <div className={`rounded-3xl border p-8 md:p-12 text-center space-y-6 shadow-2xl relative overflow-hidden ${
          isDark ? 'bg-vigno-card/50 border-vigno-line/40' : 'bg-white border-slate-200/80'
        }`}>
          {/* Background Gradient Accents */}
          <div className="absolute -right-20 -top-20 w-48 h-48 rounded-full bg-emerald-500/10 blur-2xl" />
          <div className="absolute -left-20 -bottom-20 w-48 h-48 rounded-full bg-blue-500/10 blur-2xl" />

          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto text-emerald-500 text-4xl shadow-inner animate-pulse">
            ✓
          </div>
          <div className="space-y-2 relative z-10">
            <h2 className="text-2xl md:text-3xl font-black text-vigno-txt tracking-tight">Checkout Successful!</h2>
            <p className="text-xs md:text-sm text-vigno-muted max-w-sm mx-auto leading-relaxed">
              Your licenses have been verified and activated. You can now access your new courses and study materials in your personal library.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row justify-center gap-3 pt-6 relative z-10">
            <Link
              to="/app/library"
              className="px-6 py-3 bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black rounded-xl text-sm transition-all shadow-md active:scale-98"
            >
              Go to Library
            </Link>
            <Link
              to="/app"
              className="px-6 py-3 border border-vigno-line bg-white/5 hover:bg-white/10 text-vigno-txt font-bold rounded-xl text-sm transition-all active:scale-98"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      {/* Back to Dashboard Link */}
      <div>
        <Link to="/app" className="inline-flex items-center gap-2 text-xs font-extrabold tracking-wider uppercase text-vigno-accent hover:underline group">
          <span className="group-hover:-translate-x-0.5 transition-transform">←</span> Back to Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Cart items and recommendations */}
        <div className="lg:col-span-8 space-y-8">
          <div className="border-b border-vigno-line/20 pb-4">
            <h1 className="text-3xl md:text-4xl font-extrabold text-vigno-txt tracking-tight">
              Shopping Cart
            </h1>
            <p className="text-sm font-semibold text-vigno-muted mt-2">
              {cartItems.length} {cartItems.length === 1 ? 'Course' : 'Courses'} in Cart
            </p>
          </div>

          {cartItems.length === 0 ? (
            <div className={`py-20 text-center border border-dashed rounded-3xl space-y-6 shadow-sm p-6 ${
              isDark ? 'border-vigno-line/40 bg-vigno-card/20' : 'border-slate-200 bg-slate-50/20'
            }`}>
              <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/40 rounded-full flex items-center justify-center mx-auto text-slate-350 dark:text-slate-650">
                <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.116 60.116 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
                </svg>
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-extrabold text-vigno-txt">Your cart is empty</h3>
                <p className="text-xs text-vigno-muted max-w-sm mx-auto leading-relaxed">
                  Browse our catalog of pilot training courses, flight exam prep material, and interactive standalone resources.
                </p>
              </div>
              <Link
                to="/app/library"
                className="inline-block bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black text-xs px-6 py-3.5 rounded-xl transition-all shadow-md active:scale-98"
              >
                Explore Training Material
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {cartItems.map((item) => {
                const isFav = favoriteIds?.includes(item.id)
                return (
                  <div
                    key={item.id}
                    className={`flex flex-col sm:flex-row items-start gap-6 p-6 rounded-2xl border transition-all duration-300 hover:shadow-md group relative ${
                      isDark ? 'bg-vigno-card/50 border-vigno-line/45' : 'bg-white border-slate-200/60 shadow-sm'
                    }`}
                  >
                    {/* Aspect-Ratio Graphic Thumbnail */}
                    <div className="w-32 sm:w-36 aspect-video rounded-xl bg-slate-900 overflow-hidden relative shrink-0 border border-vigno-line/10 flex items-center justify-center select-none shadow-sm">
                      {getFreshThumbnail(item) ? (
                        <img src={getFreshThumbnail(item)} alt={item.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                      ) : (
                        <>
                          <div className={`absolute inset-0 bg-gradient-to-br ${getGradient(item)} opacity-90 transition-transform duration-500 group-hover:scale-105`} />
                          <div className="absolute inset-0 bg-black/10" />
                          <span className="text-[10px] text-white font-extrabold tracking-widest uppercase z-10 drop-shadow-md">
                            {item.type}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Title, Instructor, Ratings, Actions */}
                    <div className="flex-1 min-w-0 flex flex-col justify-between h-full space-y-2">
                      <div>
                        <h3 className="font-bold text-base md:text-lg text-vigno-txt leading-snug line-clamp-2 hover:text-vigno-accent transition-colors" title={item.title}>
                          {item.title}
                        </h3>
                        <p className="text-xs text-vigno-muted/80 mt-1">
                          By {item.instructor || 'AeroLearn Instructor Panel'}
                        </p>
                        
                        {/* Ratings stars */}
                        <div className="flex items-center gap-1.5 text-xs mt-1.5">
                          <span className="font-extrabold text-amber-500">{item.rating || '4.6'}</span>
                          <div className="flex text-amber-400 text-[10px] tracking-tighter">
                            ★ ★ ★ ★ ★
                          </div>
                          <span className="text-vigno-muted">({item.ratingCount || item.reviews || '1,245'})</span>
                        </div>
                      </div>

                      {/* Action buttons (Move to Wishlist, Remove) */}
                      <div className="flex items-center gap-3 pt-3 text-xs font-semibold select-none border-t border-vigno-line/5 mt-4">
                        {!isFav && (
                          <>
                            <button
                              onClick={() => handleMoveToWishlist(item.id)}
                              className="text-indigo-600 hover:text-indigo-800 dark:text-vigno-accent dark:hover:brightness-110 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                              </svg>
                              <span>Move to Wishlist</span>
                            </button>
                            <span className="text-vigno-line/20 select-none">|</span>
                          </>
                        )}

                        {/* Remove Button */}
                        <button
                          onClick={() => dispatch(removeCartItem(item.id))}
                          disabled={checkoutLoading}
                          className="text-red-500 hover:text-red-650 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <TrashIcon />
                          <span>Remove</span>
                        </button>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="text-lg md:text-xl font-bold text-vigno-accent2 font-mono whitespace-nowrap self-start sm:ml-auto">
                      ₹{item.price}
                    </div>
                  </div>
                )
              })}
            </div>
          )}


        </div>

        {/* Right Side: Order Summary Panel */}
        {cartItems.length > 0 && (
          <div className="lg:col-span-4">
            <div className={`p-6 rounded-2xl border space-y-6 sticky top-24 transition-all duration-300 ${
              isDark ? 'bg-vigno-card/45 border-vigno-line/45 shadow-lg' : 'bg-white border-slate-200/80 shadow-md'
            }`}>
              <h2 className="text-base font-extrabold text-vigno-txt border-b border-vigno-line/10 pb-3 uppercase tracking-wider">Order Summary</h2>

              <div className="space-y-4">
                {/* Details Breakdown */}
                <div className="space-y-2.5">
                  <div className="flex justify-between items-center text-xs text-vigno-muted font-semibold">
                    <span>Subtotal</span>
                    <span>₹{subtotal}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-vigno-muted font-semibold">
                    <span>Platform Fee</span>
                    <span>₹0</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-500 font-bold">
                      <span>Discounts ({appliedCoupon})</span>
                      <span>-₹{discountAmount}</span>
                    </div>
                  )}
                  <div className="flex items-baseline justify-between pt-3 border-t border-vigno-line/10">
                    <span className="text-sm font-bold text-vigno-txt">Total:</span>
                    <span className="text-2xl font-black text-vigno-accent mt-0.5 tracking-tight">₹{finalTotal}</span>
                  </div>
                </div>

                {/* Coupon Code Input */}
                <div className="pt-2 border-t border-vigno-line/5 space-y-1.5">
                  <label className="text-[10px] font-extrabold uppercase tracking-wider text-vigno-muted">Coupon Code</label>
                  <form onSubmit={handleApplyCoupon} className="flex items-center">
                    <input
                      type="text"
                      placeholder="Enter code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-vigno-line rounded-l-xl bg-vigno-bg2 text-xs font-semibold outline-none focus:border-vigno-accent focus:ring-0"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2 bg-slate-800 dark:bg-slate-200 text-white dark:text-[#0a0f1e] font-extrabold text-xs rounded-r-xl border border-slate-800 dark:border-slate-200 transition-all hover:bg-slate-700 dark:hover:bg-slate-300"
                    >
                      Apply
                    </button>
                  </form>
                  {appliedCoupon && (
                    <div className="flex items-center justify-between mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold rounded-lg select-none">
                      <span>Applied: <strong className="font-extrabold">{appliedCoupon}</strong></span>
                      <button 
                        type="button"
                        onClick={handleRemoveCoupon} 
                        className="text-red-500 hover:text-red-650 font-black uppercase text-[9px] tracking-widest pl-2 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                  {couponError && <p className="text-[10px] text-red-500 mt-1 font-semibold">{couponError}</p>}
                  {couponSuccess && <p className="text-[10px] text-emerald-500 mt-1 font-semibold">{couponSuccess}</p>}
                </div>

                {/* Payment Selection Radio Controls */}
                <div className="pt-2 border-t border-vigno-line/5 space-y-2.5">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-vigno-muted block mb-1">Select Payment Method</span>
                  
                  {/* Pay with Wallet */}
                  <label className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                    paymentMethod === 'wallet'
                      ? 'border-vigno-accent bg-vigno-accent/5'
                      : 'border-vigno-line bg-white/5 hover:bg-white/10'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="wallet"
                        checked={paymentMethod === 'wallet'}
                        onChange={() => setPaymentMethod('wallet')}
                        className="text-vigno-accent focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="flex flex-col select-none">
                        <span className="text-xs font-bold text-vigno-txt flex items-center gap-1.5">
                          <WalletIcon className="w-3.5 h-3.5 shrink-0" /> Pay with Wallet Balance
                        </span>
                        <span className="text-[10px] text-vigno-muted mt-0.5">Available: ₹{walletBalance}</span>
                      </div>
                    </div>
                  </label>

                  {/* Pay with Card */}
                  <label className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                    cartItems.length > 1
                      ? 'opacity-40 cursor-not-allowed border-vigno-line/40 bg-black/5'
                      : 'cursor-pointer'
                  } ${
                    paymentMethod === 'card' && cartItems.length === 1
                      ? 'border-vigno-accent bg-vigno-accent/5'
                      : 'border-vigno-line bg-white/5 hover:bg-white/10'
                  }`}>
                    <div className="flex items-center gap-2.5">
                      <input
                        type="radio"
                        name="paymentMethod"
                        value="card"
                        disabled={cartItems.length > 1}
                        checked={paymentMethod === 'card' && cartItems.length === 1}
                        onChange={() => setPaymentMethod('card')}
                        className="text-vigno-accent focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                      />
                      <div className="flex flex-col select-none">
                        <span className="text-xs font-bold text-vigno-txt flex items-center gap-1.5">
                          <CardIcon /> Pay with Credit/Debit Card
                        </span>
                        <span className="text-[10px] text-vigno-muted mt-0.5">Direct checkout via Razorpay</span>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Balance check helper box */}
                {paymentMethod === 'wallet' && (
                  <div className={`p-3.5 rounded-xl border text-[11px] leading-relaxed flex flex-col gap-2 transition-all ${
                    walletBalance >= finalTotal
                      ? (isDark ? 'bg-green-500/5 border-green-500/25 text-green-300' : 'bg-green-50 border-green-200 text-green-700')
                      : (isDark ? 'bg-rose-500/5 border-rose-500/25 text-rose-350' : 'bg-rose-50 border-rose-200/65 text-rose-750')
                  }`}>
                    {walletBalance < finalTotal ? (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 font-bold">
                          <WarningIcon />
                          <span>Short by ₹{finalTotal - walletBalance}</span>
                        </div>
                        <Link
                          to="/app/wallet"
                          className="w-full text-center py-2 px-3 bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 text-rose-600 dark:text-rose-300 font-extrabold text-[10px] uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow-sm"
                        >
                          Top Up Wallet
                        </Link>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-500">
                        <CheckCircleIcon />
                        <span>Sufficient balance to purchase</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Proceed Checkout Button */}
                <div className="space-y-3.5 pt-2">
                  <button
                    onClick={handleProceedCheckout}
                    disabled={
                      checkoutLoading || 
                      (paymentMethod === 'wallet' && walletBalance < finalTotal)
                    }
                    className="w-full bg-vigno-accent hover:brightness-110 text-vigno-accent-txt font-black py-4 rounded-xl text-sm transition-all focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg active:scale-98"
                  >
                    {checkoutLoading ? 'Processing...' : 'Proceed to Checkout'}
                  </button>

                  {cartItems.length > 1 && paymentMethod === 'card' && (
                    <p className="text-[10px] text-vigno-muted text-center leading-normal font-semibold">
                      Note: Direct card checkouts are restricted to single items. Please select Wallet payment or remove items.
                    </p>
                  )}
                </div>

                {checkoutError && <p className="text-xs text-red-500 text-center font-bold mt-2">{checkoutError}</p>}
                
                {/* 30-Day Guarantee and Payment methods graphics */}
                <div className="pt-2 border-t border-vigno-line/10 space-y-4">
                  <div className="flex items-center justify-center gap-1.5 text-[11px] text-vigno-muted font-bold select-none leading-none">
                    <ShieldIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-500 shrink-0" />
                    <span>30-Day Money-Back Guarantee</span>
                  </div>

                  <PaymentMethodsIcons />

                  <p className="text-[9px] text-vigno-muted/65 text-center leading-normal">
                    Prices are shown in INR. Final tax calculated at checkout based on your billing address.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
