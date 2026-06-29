import api from './axiosClient'

// Wallet + coupon validation.
export const commerceApi = {
  wallet() {
    return api.get('/wallet').then((r) => r.data)
  },
  validateCoupon(code, contentId) {
    return api.post('/coupons/validate', { code, contentId }).then((r) => r.data)
  },
  validateCourseCoupon(code, courseSlug) {
    return api.post('/coupons/validate-course', { code, courseSlug }).then((r) => r.data)
  },
}
