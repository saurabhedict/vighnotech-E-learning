import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import { authLimiter } from '../middleware/rateLimit.js'
import * as auth from '../controllers/auth.controller.js'
import * as twoFA from '../controllers/twoFactor.controller.js'

const router = Router()

// ── Core auth ────────────────────────────────────────────────────────────────
router.post('/signup', authLimiter, validate({ body: auth.signupSchema }), auth.signup)
router.post('/login', authLimiter, validate({ body: auth.loginSchema }), auth.login)
router.post('/2fa/verify', authLimiter, validate({ body: auth.verify2faSchema }), auth.verify2fa)
router.post('/refresh', authLimiter, auth.refresh)
router.post('/logout', auth.logout)

router.get('/me', requireAuth, auth.me)
router.post('/logout-all', requireAuth, auth.logoutAll)
router.post('/change-password', requireAuth, validate({ body: auth.changePasswordSchema }), auth.changePassword)

// ── Email verification ───────────────────────────────────────────────────────
router.post('/send-verification', requireAuth, authLimiter, auth.sendEmailVerification)
router.post('/verify-email', requireAuth, authLimiter, validate({ body: auth.verifyEmailSchema }), auth.verifyEmail)

// ── Password reset ───────────────────────────────────────────────────────────
router.post('/forgot-password', authLimiter, validate({ body: auth.forgotPasswordSchema }), auth.forgotPassword)
router.post('/reset-password', authLimiter, validate({ body: auth.resetPasswordSchema }), auth.resetPassword)

// ── Two-factor authentication ────────────────────────────────────────────────
router.get('/2fa/status', requireAuth, twoFA.status)
router.post('/2fa/totp/setup', requireAuth, twoFA.setupTotp)
router.post('/2fa/totp/enable', requireAuth, validate({ body: twoFA.enableSchema }), twoFA.enableTotp)
router.post('/2fa/email/enable', requireAuth, twoFA.enableEmail2fa)
router.post('/2fa/disable', requireAuth, validate({ body: twoFA.disableSchema }), twoFA.disable2fa)
router.post('/2fa/backup-codes', requireAuth, validate({ body: twoFA.disableSchema }), twoFA.regenerateBackupCodes)

export default router
