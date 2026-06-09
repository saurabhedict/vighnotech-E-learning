import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound } from '../utils/ApiError.js'
import { User } from '../models/User.js'
import { WalletTxn } from '../models/WalletTxn.js'
import { Coupon } from '../models/Coupon.js'
import { Content } from '../models/Content.js'
import { creditWallet } from '../services/commerce.js'
import { isMock } from '../services/payments.js'

// ── Wallet (LLD: Wallet/Credits) ─────────────────────────────────────────────
export const getWallet = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user.id)
  const txns = await WalletTxn.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(50).lean()
  res.json({ balance: user.walletBalance, txns })
})

export const topupSchema = z.object({ amount: z.number().int().positive().max(100000) })

// Direct instant credit — DEV-ONLY seam (mock gateway, no real keys). Once real
// Razorpay keys are configured, balance can ONLY be added through the paid
// top-up flow (POST /payments/topup/order → /payments/topup/verify), so users
// can't mint free credit.
export const topupWallet = asyncHandler(async (req, res) => {
  if (!isMock()) {
    throw badRequest('Direct top-up is disabled. Use the Razorpay top-up flow on the Wallet page.')
  }
  const user = await User.findById(req.user.id)
  const balance = await creditWallet(user, req.body.amount, { type: 'topup', note: 'Wallet top-up (dev)' })
  audit(req, 'wallet.topup.dev', { meta: { amount: req.body.amount } })
  res.json({ ok: true, balance })
})

// ── Coupon validation (used by the buy flow) ─────────────────────────────────
export const validateCouponSchema = z.object({
  code: z.string().trim().min(1),
  contentId: z.string().length(24),
})

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, contentId } = req.body
  const content = await Content.findById(contentId)
  if (!content || !content.isPaid) throw badRequest('Coupon applies only to paid content')
  const coupon = await Coupon.findOne({ code: code.toUpperCase() })
  if (!coupon) throw notFound('Invalid coupon code')
  const result = coupon.evaluate(content.price)
  if (!result.usable) throw badRequest(`Coupon ${result.reason}`)
  res.json({ valid: true, code: coupon.code, discount: result.discount, finalAmount: result.finalAmount, listPrice: content.price })
})
