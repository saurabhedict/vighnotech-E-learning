import { Router } from 'express'
import { validate } from '../middleware/validate.js'
import { requireAuth } from '../middleware/auth.js'
import * as devices from '../controllers/devices.controller.js'

const router = Router()

router.post('/register', requireAuth, validate({ body: devices.registerSchema }), devices.registerDevice)
router.get('/mine', requireAuth, devices.myDevices)

export default router
