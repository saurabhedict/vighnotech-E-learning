import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth, blockRole } from '../middleware/auth.js'
import * as pay from '../controllers/payments.controller.js'

const router = Router()

// Clients receive course access via admin grants only — they can never purchase.
const noClients = blockRole('client')

router.post('/order', requireAuth, noClients, validate({ body: pay.orderSchema }), pay.createOrderHandler)
router.post('/verify', requireAuth, noClients, validate({ body: pay.verifySchema }), pay.verifyPayment)
router.post('/wallet', requireAuth, noClients, validate({ body: pay.walletPaySchema }), pay.walletPay)
router.post('/wallet-course', requireAuth, noClients, validate({ body: pay.walletPayCourseSchema }), pay.walletPayCourse)
router.post('/order-course', requireAuth, noClients, validate({ body: pay.courseOrderSchema }), pay.createCourseOrder)
router.post('/verify-course', requireAuth, noClients, validate({ body: pay.verifySchema }), pay.verifyCoursePayment)
// Wallet top-up (Razorpay order → verify → credit). Verify reuses verifySchema.
router.post('/topup/order', requireAuth, validate({ body: pay.createTopupOrderSchema }), pay.createTopupOrder)
router.post('/topup/verify', requireAuth, validate({ body: pay.verifySchema }), pay.verifyTopup)
router.get('/mine', requireAuth, pay.myPurchases)
router.get('/:id/invoice', requireAuth, pay.invoice)
// NOTE: /payments/webhook is mounted separately in app.js with a raw body parser.

export default router
