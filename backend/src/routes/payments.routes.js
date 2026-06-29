import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import * as pay from '../controllers/payments.controller.js'

const router = Router()

router.post('/order', requireAuth, validate({ body: pay.orderSchema }), pay.createOrderHandler)
router.post('/verify', requireAuth, validate({ body: pay.verifySchema }), pay.verifyPayment)
router.post('/wallet', requireAuth, validate({ body: pay.walletPaySchema }), pay.walletPay)
router.post('/wallet-course', requireAuth, validate({ body: pay.walletPayCourseSchema }), pay.walletPayCourse)
router.post('/order-course', requireAuth, validate({ body: pay.courseOrderSchema }), pay.createCourseOrder)
router.post('/verify-course', requireAuth, validate({ body: pay.verifySchema }), pay.verifyCoursePayment)
// Wallet top-up (Razorpay order → verify → credit). Verify reuses verifySchema.
router.post('/topup/order', requireAuth, validate({ body: pay.createTopupOrderSchema }), pay.createTopupOrder)
router.post('/topup/verify', requireAuth, validate({ body: pay.verifySchema }), pay.verifyTopup)
router.get('/mine', requireAuth, pay.myPurchases)
router.get('/:id/invoice', requireAuth, pay.invoice)
// NOTE: /payments/webhook is mounted separately in app.js with a raw body parser.

export default router
