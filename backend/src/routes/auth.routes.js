import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import * as auth from '../controllers/auth.controller.js'

const router = Router()

router.post('/signup', authLimiter, validate({ body: auth.signupSchema }), auth.signup)
router.post('/login', authLimiter, validate({ body: auth.loginSchema }), auth.login)
router.post('/refresh', authLimiter, auth.refresh)
router.post('/logout', auth.logout)

router.get('/me', requireAuth, auth.me)
router.post('/logout-all', requireAuth, auth.logoutAll)
router.post(
  '/change-password',
  requireAuth,
  validate({ body: auth.changePasswordSchema }),
  auth.changePassword
)

export default router
