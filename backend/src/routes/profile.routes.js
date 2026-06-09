import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import * as profile from '../controllers/profile.controller.js'

const router = Router()

router.post('/avatar', requireAuth, validate({ body: profile.avatarSchema }), profile.uploadAvatar)
router.delete('/avatar', requireAuth, profile.removeAvatar)
router.delete('/account', requireAuth, validate({ body: profile.deleteAccountSchema }), profile.deleteAccount)

export default router
