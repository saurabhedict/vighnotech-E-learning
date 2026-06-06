import { paymentsApi } from '../api/paymentsApi'

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
      name: 'AeroLearn',
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
