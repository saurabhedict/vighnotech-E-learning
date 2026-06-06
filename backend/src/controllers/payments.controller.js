import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound, conflict, paymentRequired } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { Content } from '../models/Content.js'
import { Purchase } from '../models/Purchase.js'
import { Coupon } from '../models/Coupon.js'
import { User } from '../models/User.js'
import {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  isMock,
  mockSignature,
} from '../services/payments.js'
import { issueLicense, hasActiveLicense } from '../services/licenseAuthority.js'
import { debitWallet, invoicePdf } from '../services/commerce.js'
import { sendMail, receiptEmail } from '../services/mailer.js'

// Compute final price after an optional coupon (throws on invalid coupon).
async function resolvePricing(content, couponCode) {
  const listPrice = content.price
  if (!couponCode) return { listPrice, discount: 0, finalAmount: listPrice, coupon: null }
  const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase() })
  if (!coupon) throw badRequest('Invalid coupon code')
  const r = coupon.evaluate(listPrice)
  if (!r.usable) throw badRequest(`Coupon ${r.reason}`)
  return { listPrice, discount: r.discount, finalAmount: r.finalAmount, coupon }
}

// Issue the license, bump coupon usage, email a receipt. Shared by all pay paths.
async function finalizePurchase(purchase, content) {
  const { license, token } = await issueLicense({ userId: purchase.userId, content })
  purchase.licenseId = license._id
  await purchase.save()
  if (purchase.couponCode) await Coupon.updateOne({ code: purchase.couponCode }, { $inc: { redeemed: 1 } })
  const user = await User.findById(purchase.userId)
  if (user) {
    sendMail(receiptEmail(user.email, {
      title: content.title, amount: purchase.amount, licenseId: license._id, when: new Date().toUTCString(),
    })).catch(() => {})
  }
  return { license, token }
}

// POST /payments/order { contentId, couponCode? }
export const orderSchema = z.object({ contentId: z.string().length(24), couponCode: z.string().trim().optional() })

export const createOrderHandler = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.body.contentId)
  if (!content || !content.published) throw notFound('Content not found')
  if (!content.isPaid) throw badRequest('This content is free — no purchase needed')
  if (await hasActiveLicense(req.user.id, content._id)) throw conflict('You already own this content')

  const pricing = await resolvePricing(content, req.body.couponCode)
  const order = await createOrder({ amountInr: pricing.finalAmount, receipt: `rcpt_${content._id}_${req.user.id}` })

  await Purchase.create({
    userId: req.user.id,
    contentId: content._id,
    listPrice: pricing.listPrice,
    discount: pricing.discount,
    couponCode: pricing.coupon?.code,
    amount: pricing.finalAmount,
    provider: isMock() ? 'mock' : 'razorpay',
    razorpayOrderId: order.id,
    status: 'created',
  })

  audit(req, 'payment.order', { targetType: 'Content', targetId: content._id, meta: { orderId: order.id } })
  res.status(201).json({
    orderId: order.id,
    amount: order.amount,
    currency: order.currency,
    discount: pricing.discount,
    finalAmount: pricing.finalAmount,
    keyId: env.razorpay.keyId || null,
    mock: isMock(),
    ...(isMock()
      ? (() => {
          const paymentId = `pay_mock_${order.id.slice(-8)}`
          return { mockPaymentId: paymentId, mockSignature: mockSignature(order.id, paymentId) }
        })()
      : {}),
  })
})

// POST /payments/verify — confirm gateway payment then mint the license.
export const verifySchema = z.object({
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(3),
})

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body

  if (!verifyPaymentSignature({ orderId, paymentId, signature })) {
    audit(req, 'payment.verify.fail', { meta: { orderId } })
    throw badRequest('Payment signature verification failed')
  }

  const purchase = await Purchase.findOne({ razorpayOrderId: orderId, userId: req.user.id })
  if (!purchase) throw notFound('Order not found')
  if (purchase.status === 'paid' && purchase.licenseId) {
    return res.json({ ok: true, licenseId: purchase.licenseId, alreadyProcessed: true })
  }

  const content = await Content.findById(purchase.contentId)
  if (!content) throw notFound('Content not found')

  const claimed = await Purchase.findOneAndUpdate(
    { _id: purchase._id, status: { $ne: 'paid' } },
    { $set: { status: 'paid', razorpayPaymentId: paymentId, razorpaySignature: signature, paidAt: new Date() } },
    { new: true }
  )
  if (!claimed) {
    const fresh = await Purchase.findById(purchase._id)
    return res.json({ ok: true, licenseId: fresh?.licenseId, alreadyProcessed: true })
  }

  const { license, token } = await finalizePurchase(claimed, content)
  audit(req, 'payment.verify', { targetType: 'Purchase', targetId: claimed._id, meta: { licenseId: license._id } })
  res.json({ ok: true, licenseId: license._id, token, expiresAt: license.expiresAt })
})

// POST /payments/wallet { contentId, couponCode? } — pay from wallet balance.
export const walletPaySchema = z.object({ contentId: z.string().length(24), couponCode: z.string().trim().optional() })

export const walletPay = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.body.contentId)
  if (!content || !content.published) throw notFound('Content not found')
  if (!content.isPaid) throw badRequest('This content is free — no purchase needed')
  if (await hasActiveLicense(req.user.id, content._id)) throw conflict('You already own this content')

  const pricing = await resolvePricing(content, req.body.couponCode)
  const user = await User.findById(req.user.id)
  try {
    await debitWallet(user, pricing.finalAmount, { note: `Purchase: ${content.title}` })
  } catch (e) {
    if (e.code === 'INSUFFICIENT') throw paymentRequired('Insufficient wallet balance')
    throw e
  }

  const purchase = await Purchase.create({
    userId: user._id,
    contentId: content._id,
    listPrice: pricing.listPrice,
    discount: pricing.discount,
    couponCode: pricing.coupon?.code,
    amount: pricing.finalAmount,
    provider: 'wallet',
    status: 'paid',
    paidAt: new Date(),
  })
  const { license, token } = await finalizePurchase(purchase, content)
  audit(req, 'payment.wallet', { targetType: 'Purchase', targetId: purchase._id, meta: { licenseId: license._id } })
  res.json({ ok: true, licenseId: license._id, token, balance: user.walletBalance })
})

/**
 * POST /payments/webhook — Razorpay server-to-server confirmation.
 * Mounted with a raw-body parser so the signature can be verified. Idempotent.
 */
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  const raw = req.body
  if (!verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid webhook signature' } })
  }
  const event = JSON.parse(raw.toString('utf8'))
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || {}
    const orderId = entity.order_id || entity.id
    const claimed = await Purchase.findOneAndUpdate(
      { razorpayOrderId: orderId, status: { $ne: 'paid' } },
      { $set: { status: 'paid', razorpayPaymentId: entity.id, paidAt: new Date() } },
      { new: true }
    )
    if (claimed) {
      const content = await Content.findById(claimed.contentId)
      if (content) await finalizePurchase(claimed, content)
    }
  }
  res.json({ received: true })
})

// GET /payments/mine — purchase history / receipts.
export const myPurchases = asyncHandler(async (req, res) => {
  const purchases = await Purchase.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .populate('contentId', 'title type')
    .lean()
  res.json({ purchases })
})

// GET /payments/:id/invoice — PDF receipt for a paid/refunded purchase.
export const invoice = asyncHandler(async (req, res) => {
  const purchase = await Purchase.findOne({ _id: req.params.id, userId: req.user.id })
  if (!purchase) throw notFound('Purchase not found')
  if (!['paid', 'refunded'].includes(purchase.status)) throw badRequest('No invoice for an unpaid order')
  const content = await Content.findById(purchase.contentId)
  const user = await User.findById(req.user.id)
  const buffer = await invoicePdf({ purchase, content, user })
  res.set('Content-Type', 'application/pdf')
  res.set('Content-Disposition', `attachment; filename="invoice-${purchase._id}.pdf"`)
  res.send(buffer)
})
