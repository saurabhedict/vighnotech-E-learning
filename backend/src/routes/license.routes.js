import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { verifyLimiter } from '../middleware/rateLimit.js'
import * as lic from '../controllers/license.controller.js'

const router = Router()

router.get('/mine', requireAuth, lic.mine)
router.post('/verify', verifyLimiter, validate({ body: lic.verifySchema }), lic.verify)
router.post('/:jti/refresh', requireAuth, lic.refresh)

export default router
