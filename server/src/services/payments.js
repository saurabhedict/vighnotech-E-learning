import crypto from 'node:crypto'
import { customAlphabet } from 'nanoid'
import { env } from '../config/env.js'

/**
 * Payment gateway wrapper (Doc 2 §1, §5). Uses real Razorpay when keys are
 * configured; otherwise a deterministic in-process MOCK so the full
 * pay → license flow works end-to-end in dev with no external account.
 */

const mockId = customAlphabet('0123456789abcdefghijklmnopqrstuvwxyz', 14)

let rzpClient = null
async function getClient() {
  if (rzpClient) return rzpClient
  const { default: Razorpay } = await import('razorpay')
  rzpClient = new Razorpay({ key_id: env.razorpay.keyId, key_secret: env.razorpay.keySecret })
  return rzpClient
}

export const isMock = () => env.razorpay.mock

// Create an order. Amount is in INR (rupees); Razorpay expects paise.
export async function createOrder({ amountInr, receipt }) {
  if (isMock()) {
    return {
      id: `order_mock_${mockId()}`,
      amount: Math.round(amountInr * 100),
      currency: 'INR',
      receipt,
      mock: true,
    }
  }
  const client = await getClient()
  return client.orders.create({ amount: Math.round(amountInr * 100), currency: 'INR', receipt })
}

// HMAC the way Razorpay does: sha256(order_id + "|" + payment_id, key_secret).
function expectedPaymentSignature(orderId, paymentId) {
  const secret = isMock() ? 'mock_secret' : env.razorpay.keySecret
  return crypto.createHmac('sha256', secret).update(`${orderId}|${paymentId}`).digest('hex')
}

// Helper the client/dev can use to produce a valid mock signature.
export function mockSignature(orderId, paymentId) {
  return expectedPaymentSignature(orderId, paymentId)
}

export function verifyPaymentSignature({ orderId, paymentId, signature }) {
  const expected = expectedPaymentSignature(orderId, paymentId)
  try {
    return (
      signature &&
      signature.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
    )
  } catch {
    return false
  }
}

// Verify a Razorpay webhook body signature (X-Razorpay-Signature header).
export function verifyWebhookSignature(rawBody, signature) {
  const secret = env.razorpay.webhookSecret || (isMock() ? 'mock_webhook_secret' : '')
  if (!secret) return false
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature || ''), Buffer.from(expected))
  } catch {
    return false
  }
}
