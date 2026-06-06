import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import * as pay from '../controllers/payments.controller.js'

const router = Router()

router.post('/order', requireAuth, validate({ body: pay.orderSchema }), pay.createOrderHandler)
router.post('/verify', requireAuth, validate({ body: pay.verifySchema }), pay.verifyPayment)
router.post('/wallet', requireAuth, validate({ body: pay.walletPaySchema }), pay.walletPay)
router.get('/mine', requireAuth, pay.myPurchases)
router.get('/:id/invoice', requireAuth, pay.invoice)
// NOTE: /payments/webhook is mounted separately in app.js with a raw body parser.

export default router
