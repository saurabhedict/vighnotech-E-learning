import api from './axiosClient'

// Wallet + coupon validation.
export const commerceApi = {
  wallet() {
    return api.get('/wallet').then((r) => r.data)
  },
  validateCoupon(code, contentId) {
    return api.post('/coupons/validate', { code, contentId }).then((r) => r.data)
  },
}
