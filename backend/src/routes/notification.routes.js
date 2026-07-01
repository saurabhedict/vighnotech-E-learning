import { Router } from 'express'
import { requireAuth } from '../middleware/auth.js'
import * as notif from '../controllers/notification.controller.js'

const router = Router()

// The notification bell — any signed-in user.
router.get('/', requireAuth, notif.mine)
router.post('/seen', requireAuth, notif.markSeen)

export default router
