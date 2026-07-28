import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { authLimiter, verifyLimiter } from '../middleware/rateLimit.js'
import * as appc from '../controllers/appActivation.controller.js'

// Android (APK) activation API. All PUBLIC — the installed app authenticates via
// the request body (email+password or its cached app token), not a web session.
const router = Router()

// Log in + prove purchase + lock to a single device → returns a reusable app token.
router.post('/activateapp', authLimiter, validate({ body: appc.activateAppSchema }), appc.activateApp)
// Launch/heartbeat check using the app token (no password re-send).
router.post('/verifyapp', verifyLimiter, validate({ body: appc.verifyAppSchema }), appc.verifyApp)
// Release the bound device so the app can be activated on a new one.
router.post('/deregisterapp', authLimiter, validate({ body: appc.deregisterAppSchema }), appc.deregisterApp)

export default router
