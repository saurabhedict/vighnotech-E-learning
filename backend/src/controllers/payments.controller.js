import { z } from 'zod'
import { asyncHandler } from '../utils/asyncHandler.js'
import { audit } from '../utils/audit.js'
import { badRequest, notFound, conflict } from '../utils/ApiError.js'
import { env } from '../config/env.js'
import { Content } from '../models/Content.js'
import { Purchase } from '../models/Purchase.js'
import {
  createOrder,
  verifyPaymentSignature,
  verifyWebhookSignature,
  isMock,
  mockSignature,
} from '../services/payments.js'
import { issueLicense, hasActiveLicense } from '../services/licenseAuthority.js'

// POST /payments/order { contentId }
export const orderSchema = z.object({ contentId: z.string().length(24) })

export const createOrderHandler = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.body.contentId)
  if (!content || !content.published) throw notFound('Content not found')
  if (!content.isPaid) throw badRequest('This content is free — no purchase needed')
  if (await hasActiveLicense(req.user.id, content._id)) throw conflict('You already own this content')

  const order = await createOrder({ amountInr: content.price, receipt: `rcpt_${content._id}_${req.user.id}` })

  await Purchase.create({
    userId: req.user.id,
    contentId: content._id,
    amount: content.price,
    provider: isMock() ? 'mock' : 'razorpay',
    razorpayOrderId: order.id,
    status: 'created',
  })

  audit(req, 'payment.order', { targetType: 'Content', targetId: content._id, meta: { orderId: order.id } })
  res.status(201).json({
    orderId: order.id,
    amount: order.amount, // paise
    currency: order.currency,
    keyId: env.razorpay.keyId || null,
    mock: isMock(),
    // In mock mode we hand back a paymentId + valid signature so the frontend
    // can complete the flow without a real Razorpay modal.
    ...(isMock()
      ? (() => {
          const paymentId = `pay_mock_${order.id.slice(-8)}`
          return { mockPaymentId: paymentId, mockSignature: mockSignature(order.id, paymentId) }
        })()
      : {}),
  })
})

// POST /payments/verify — confirm payment then mint the license.
export const verifySchema = z.object({
  razorpay_order_id: z.string().min(3),
  razorpay_payment_id: z.string().min(3),
  razorpay_signature: z.string().min(3),
})

export const verifyPayment = asyncHandler(async (req, res) => {
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = req.body

  const ok = verifyPaymentSignature({ orderId, paymentId, signature })
  if (!ok) {
    audit(req, 'payment.verify.fail', { meta: { orderId } })
    throw badRequest('Payment signature verification failed')
  }

  const purchase = await Purchase.findOne({ razorpayOrderId: orderId, userId: req.user.id })
  if (!purchase) throw notFound('Order not found')

  // Idempotency: if already paid, return the existing license.
  if (purchase.status === 'paid' && purchase.licenseId) {
    return res.json({ ok: true, licenseId: purchase.licenseId, alreadyProcessed: true })
  }

  const content = await Content.findById(purchase.contentId)
  if (!content) throw notFound('Content not found')

  // Atomically claim the order so a concurrent verify/webhook can't double-issue.
  const claimed = await Purchase.findOneAndUpdate(
    { _id: purchase._id, status: { $ne: 'paid' } },
    { $set: { status: 'paid', razorpayPaymentId: paymentId, razorpaySignature: signature, paidAt: new Date() } },
    { new: true }
  )
  if (!claimed) {
    const fresh = await Purchase.findById(purchase._id)
    return res.json({ ok: true, licenseId: fresh?.licenseId, alreadyProcessed: true })
  }

  const { license, token } = await issueLicense({ userId: claimed.userId, content })
  claimed.licenseId = license._id
  await claimed.save()

  audit(req, 'payment.verify', { targetType: 'Purchase', targetId: claimed._id, meta: { licenseId: license._id } })
  res.json({ ok: true, licenseId: license._id, token, expiresAt: license.expiresAt })
})

/**
 * POST /payments/webhook — Razorpay server-to-server confirmation.
 * Mounted with a raw-body parser so the signature can be verified. Idempotent.
 */
export const webhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature']
  const raw = req.body // Buffer (express.raw)
  if (!verifyWebhookSignature(raw, signature)) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid webhook signature' } })
  }

  const event = JSON.parse(raw.toString('utf8'))
  if (event.event === 'payment.captured' || event.event === 'order.paid') {
    const entity = event.payload?.payment?.entity || event.payload?.order?.entity || {}
    const orderId = entity.order_id || entity.id
    // Atomically claim — webhook may race the client-side verify.
    const claimed = await Purchase.findOneAndUpdate(
      { razorpayOrderId: orderId, status: { $ne: 'paid' } },
      { $set: { status: 'paid', razorpayPaymentId: entity.id, paidAt: new Date() } },
      { new: true }
    )
    if (claimed) {
      const content = await Content.findById(claimed.contentId)
      if (content) {
        const { license } = await issueLicense({ userId: claimed.userId, content })
        claimed.licenseId = license._id
        await claimed.save()
      }
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
