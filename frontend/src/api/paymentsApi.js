import api from './axiosClient'

// Payments (Razorpay or the dev mock gateway). The buy flow:
//   1. createOrder(contentId) → order details
//   2. (real) open Razorpay checkout → get {payment_id, signature}
//      (mock) the order already includes mockPaymentId + mockSignature
//   3. verify(...) → license issued, content unlocks
export const paymentsApi = {
  async createOrder(contentId) {
    const { data } = await api.post('/payments/order', { contentId })
    return data
  },
  async verify({ orderId, paymentId, signature }) {
    const { data } = await api.post('/payments/verify', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    })
    return data
  },
  async mine() {
    const { data } = await api.get('/payments/mine')
    return data.purchases
  },
}
