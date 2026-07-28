import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import * as c from '../controllers/commerce.controller.js'

// Mounted at /api. Wallet + coupon validation (all require auth).
const router = Router()

router.get('/wallet', requireAuth, c.getWallet)
router.post('/wallet/topup', requireAuth, validate({ body: c.topupSchema }), c.topupWallet)
router.post('/coupons/validate', requireAuth, validate({ body: c.validateCouponSchema }), c.validateCoupon)
router.post('/coupons/validate-course', requireAuth, validate({ body: c.validateCourseCouponSchema }), c.validateCourseCoupon)

export default router
