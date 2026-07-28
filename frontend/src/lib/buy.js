import { paymentsApi } from '../api/paymentsApi'
import { queryClient } from './queryClient'
import { SITE_SETTINGS_KEY } from '../hooks/useSiteSettings'

// Brand name shown in the Razorpay checkout modal — read from cached settings.
function brandName() {
  return queryClient.getQueryData(SITE_SETTINGS_KEY)?.brand?.name || 'Aerolearn'
}

// Lazily load the Razorpay checkout script (only needed for live payments).
function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve()
    const s = document.createElement('script')
    s.src = 'https://checkout.razorpay.com/v1/checkout.js'
    s.onload = () => resolve()
    s.onerror = () => reject(new Error('Failed to load Razorpay checkout'))
    document.body.appendChild(s)
  })
}

/**
 * Run the full purchase flow for a piece of content and return the verify
 * result ({ licenseId, token, ... }). Works in two modes:
 *  - MOCK (dev): the order carries a mockPaymentId + mockSignature, so we
 *    verify immediately — no external modal.
 *  - LIVE: open the Razorpay checkout modal, then verify the signed response.
 */
export async function purchaseContent(contentId, user, couponCode) {
  const order = await paymentsApi.createOrder(contentId, couponCode)

  // ₹0 (e.g. 100%-off coupon) — already unlocked server-side, no gateway needed.
  if (order.free) return order

  if (order.mock) {
    return paymentsApi.verify({
      orderId: order.orderId,
      paymentId: order.mockPaymentId,
      signature: order.mockSignature,
    })
  }

  await loadRazorpayScript()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: brandName(),
      description: 'Course content license',
      order_id: order.orderId,
      prefill: { email: user?.email },
      theme: { color: '#e67e22' },
      handler: (resp) => {
        paymentsApi
          .verify({
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          })
          .then(resolve)
          .catch(reject)
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    rzp.open()
  })
}

export async function purchaseCourse(courseSlug, user, couponCode) {
  const order = await paymentsApi.createCourseOrder(courseSlug, couponCode)

  if (order.free) return order

  if (order.mock) {
    return paymentsApi.verifyCourse({
      orderId: order.orderId,
      paymentId: order.mockPaymentId,
      signature: order.mockSignature,
    })
  }

  await loadRazorpayScript()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: brandName(),
      description: 'Course license',
      order_id: order.orderId,
      prefill: { email: user?.email },
      theme: { color: '#e67e22' },
      handler: (resp) => {
        paymentsApi
          .verifyCourse({
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          })
          .then(resolve)
          .catch(reject)
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    rzp.open()
  })
}

/**
 * Top up the wallet through the payment gateway. Same two modes as a purchase:
 * MOCK verifies instantly; LIVE opens the Razorpay checkout. Resolves with the
 * verify result ({ ok, balance }).
 */
export async function topupWallet(amount, user) {
  const order = await paymentsApi.createTopupOrder(amount)

  if (order.mock) {
    return paymentsApi.verifyTopup({
      orderId: order.orderId,
      paymentId: order.mockPaymentId,
      signature: order.mockSignature,
    })
  }

  await loadRazorpayScript()
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: brandName(),
      description: `Wallet top-up ₹${amount}`,
      order_id: order.orderId,
      prefill: { email: user?.email },
      theme: { color: '#e67e22' },
      handler: (resp) => {
        paymentsApi
          .verifyTopup({
            orderId: resp.razorpay_order_id,
            paymentId: resp.razorpay_payment_id,
            signature: resp.razorpay_signature,
          })
          .then(resolve)
          .catch(reject)
      },
      modal: { ondismiss: () => reject(new Error('Payment cancelled')) },
    })
    rzp.open()
  })
}
