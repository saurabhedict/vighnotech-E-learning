import { Router } from 'express'
import { requireAuth, blockRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import * as profile from '../controllers/profile.controller.js'

const router = Router()

router.post('/avatar', requireAuth, validate({ body: profile.avatarSchema }), profile.uploadAvatar)
router.delete('/avatar', requireAuth, profile.removeAvatar)
router.patch('/phone', requireAuth, validate({ body: profile.setPhoneSchema }), profile.setPhone)
// Clients can't delete their own account — provider/admin manages their access.
router.delete('/account', requireAuth, blockRole('client'), validate({ body: profile.deleteAccountSchema }), profile.deleteAccount)

export default router
