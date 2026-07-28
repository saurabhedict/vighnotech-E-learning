import api from './axiosClient'

// Payments (Razorpay or the dev mock gateway). The buy flow:
//   1. createOrder(contentId, couponCode?) → order details
//   2. (real) open Razorpay checkout → get {payment_id, signature}
//      (mock) the order already includes mockPaymentId + mockSignature
//   3. verify(...) → license issued, content unlocks
// Or pay instantly from wallet balance via walletPay().
export const paymentsApi = {
  async createOrder(contentId, couponCode) {
    const { data } = await api.post('/payments/order', { contentId, ...(couponCode ? { couponCode } : {}) })
    return data
  },
  async createCourseOrder(courseSlug, couponCode) {
    const { data } = await api.post('/payments/order-course', { courseSlug, ...(couponCode ? { couponCode } : {}) })
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
  async verifyCourse({ orderId, paymentId, signature }) {
    const { data } = await api.post('/payments/verify-course', {
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
    })
    return data
  },
  async walletPay(contentId, couponCode) {
    const { data } = await api.post('/payments/wallet', { contentId, ...(couponCode ? { couponCode } : {}) })
    return data
  },
  async walletPayCourse(courseSlug, couponCode) {
    const { data } = await api.post('/payments/wallet-course', { courseSlug, ...(couponCode ? { couponCode } : {}) })
    return data
  },
  // Wallet top-up: order → (checkout) → verify → balance credited.
  async createTopupOrder(amount) {
    const { data } = await api.post('/payments/topup/order', { amount })
    return data
  },
  async verifyTopup({ orderId, paymentId, signature }) {
    const { data } = await api.post('/payments/topup/verify', {
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
  async downloadInvoice(purchaseId) {
    const res = await api.get(`/payments/${purchaseId}/invoice`, { responseType: 'blob' })
    const url = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = url
    a.download = `invoice-${purchaseId}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  },
}
